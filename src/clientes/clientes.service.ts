import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cliente } from '../entities/cliente.entity';
import { Emprestimo } from '../entities/emprestimo.entity';
import { Pagamento } from '../entities/pagamento.entity';
import { Penalizacao } from '../entities/penalizacao.entity';
import { CreateClienteDto, UpdateClienteDto } from './dto/cliente.dto';

@Injectable()
export class ClientesService {
    constructor(
        @InjectRepository(Cliente)
        private clienteRepository: Repository<Cliente>,
        @InjectRepository(Emprestimo)
        private emprestimoRepository: Repository<Emprestimo>,
        @InjectRepository(Pagamento)
        private pagamentoRepository: Repository<Pagamento>,
        @InjectRepository(Penalizacao)
        private penalizacaoRepository: Repository<Penalizacao>,
    ) { }

    async create(createClienteDto: CreateClienteDto) {
        const cliente = this.clienteRepository.create({
            ...createClienteDto,
            dataNascimento: new Date(createClienteDto.dataNascimento),
        });
        return await this.clienteRepository.save(cliente);
    }

    async findAll() {
        return await this.clienteRepository.find({
            relations: ['documentos', 'localizacao', 'ocupacoes', 'emprestimos', 'penhores', 'testemunhas'],
        });
    }

    async findOne(id: string) {
        const cliente = await this.clienteRepository.findOne({
            where: { clienteId: id },
            relations: ['documentos', 'localizacao', 'ocupacoes', 'emprestimos', 'penhores', 'testemunhas'],
        });

        if (!cliente) {
            throw new NotFoundException('Cliente não encontrado');
        }

        return cliente;
    }

    async getClientDashboard(id: string) {
        const cliente = await this.findOne(id); // Garante que o cliente existe

        // Buscar dados financeiros
        const emprestimos = await this.emprestimoRepository.find({ where: { clienteId: id } });
        const pagamentos = await this.pagamentoRepository.find({
            where: { emprestimo: { clienteId: id } },
            relations: ['emprestimo']
        });
        const penalizacoes = await this.penalizacaoRepository.find({ where: { clienteId: id } });

        // 1. Cálculos Financeiros Básicos
        const totalPrincipal = emprestimos.reduce((acc, curr) => acc + Number(curr.valor || 0), 0);
        const totalPago = pagamentos.reduce((acc, curr) => acc + Number(curr.valorPago || 0), 0);
        const totalPenalizacoes = penalizacoes.reduce((acc, curr) => acc + Number(curr.valor || 0), 0);
        const dividaTotal = Math.max(0, (totalPrincipal + totalPenalizacoes) - totalPago);

        // 2. Status do Próximo Pagamento (ou Vencido)
        // Normalização de status para garantir compatibilidade com diferentes convenções (Legacy vs New)
        const activeStatuses = ['Ativo', 'Inadimplente', 'APROVADO', 'EM_ANDAMENTO', 'ATRASADO'];
        const ativos = emprestimos.filter(e => activeStatuses.includes(e.status));

        const hoje = new Date();
        let nextPayment = null;

        if (ativos.length > 0) {
            const futuros = ativos
                .map(e => ({
                    id: e.emprestimoId,
                    data: new Date(e.dataVencimento),
                    valor: Number(e.valor),
                    atrasado: false
                }))
                .filter(v => v.data >= hoje)
                .sort((a, b) => a.data.getTime() - b.data.getTime());

            if (futuros.length > 0) {
                nextPayment = futuros[0];
            } else {
                const vencidos = ativos
                    .map(e => ({
                        id: e.emprestimoId,
                        data: new Date(e.dataVencimento),
                        valor: Number(e.valor),
                        atrasado: true
                    }))
                    .filter(v => v.data < hoje)
                    .sort((a, b) => b.data.getTime() - a.data.getTime());

                if (vencidos.length > 0) {
                    nextPayment = vencidos[0];
                }
            }
        }

        // 3. Score de Crédito
        const contratosAtrasados = emprestimos.filter(e =>
            ['Inadimplente', 'ATRASADO'].includes(e.status) ||
            (new Date(e.dataVencimento) < hoje && activeStatuses.includes(e.status))
        );
        const pagamentosEmDia = pagamentos.filter(p => {
            // Simplificação: se pagou, ok. Na lógica complexa compararia com vencimento.
            // Assumindo que o pagamento tem data.
            const emprestimo = emprestimos.find(e => e.emprestimoId === p.emprestimo.emprestimoId);
            if (!emprestimo) return true;
            return new Date(p.dataPagamento) <= new Date(emprestimo.dataVencimento);
        }).length;

        let calcScore = 50 + (pagamentosEmDia * 5) - (contratosAtrasados.length * 10) - (penalizacoes.length * 5);
        const score = Math.max(0, Math.min(100, calcScore));

        // 4. Gráfico Histórico (Últimos 6 meses)
        const chartData = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
            const monthIdx = d.getMonth();
            const year = d.getFullYear();
            const label = d.toLocaleString('pt-PT', { month: 'short' }).replace('.', '');

            const pagoMes = pagamentos
                .filter(p => {
                    const pd = new Date(p.dataPagamento);
                    return pd.getMonth() === monthIdx && pd.getFullYear() === year;
                })
                .reduce((acc, cur) => acc + Number(cur.valorPago || 0), 0);

            const emprestadoMes = emprestimos
                .filter(e => {
                    const ed = new Date(e.dataEmprestimo);
                    return ed.getMonth() === monthIdx && ed.getFullYear() === year;
                })
                .reduce((acc, cur) => acc + Number(cur.valor || 0), 0);

            chartData.push({ label, valorPago: pagoMes, valorEmprestado: emprestadoMes });
        }

        return {
            financeiro: {
                totalPrincipal,
                totalPago,
                totalPenalizacoes,
                dividaTotal
            },
            status: {
                ativos: ativos.length,
                atrasados: contratosAtrasados.length,
                nextPayment,
                score
            },
            grafico: chartData
        };
    }

    async update(id: string, updateClienteDto: UpdateClienteDto) {
        const cliente = await this.findOne(id);

        if (updateClienteDto.dataNascimento) {
            updateClienteDto.dataNascimento = new Date(updateClienteDto.dataNascimento) as any;
        }

        Object.assign(cliente, updateClienteDto);
        return await this.clienteRepository.save(cliente);
    }

    async remove(id: string) {
        const cliente = await this.findOne(id);
        await this.clienteRepository.remove(cliente);
        return { message: 'Cliente removido com sucesso' };
    }
}
