import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pagamento } from '../entities/pagamento.entity';
import { CreatePagamentoDto } from './dto/pagamento.dto';
import { RegistrarPagamentoDiarioDto } from './dto/pagamento-diario.dto';
import { Emprestimo } from '../entities/emprestimo.entity';
import { Penalizacao } from '../entities/penalizacao.entity';
import { PlanoPagamentoDiario } from '../entities/plano-pagamento-diario.entity';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { TipoNotificacao } from '../notificacoes/dto/notificacao.dto';
import { StatusPenalizacao } from '../penalizacoes/dto/penalizacao.dto';

@Injectable()
export class PagamentosService {
    constructor(
        @InjectRepository(Pagamento)
        private pagamentoRepository: Repository<Pagamento>,
        @InjectRepository(Emprestimo)
        private emprestimoRepository: Repository<Emprestimo>,
        @InjectRepository(Penalizacao)
        private penalizacaoRepository: Repository<Penalizacao>,
        @InjectRepository(PlanoPagamentoDiario)
        private planoPagamentoDiarioRepository: Repository<PlanoPagamentoDiario>,
        private notificacoesService: NotificacoesService,
    ) { }

    private gerarReferenciaAleatoria(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        const timestamp = Date.now().toString().slice(-4); // Últimos 4 dígitos para unicidade temporal
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `LACM-${result}${timestamp}`;
    }

    /**
     * ========================================================================
     * PAGAMENTO DIÁRIO COM RECALCULAÇÃO AUTOMÁTICA
     * ========================================================================
     */
    async registrarPagamentoDiario(dto: RegistrarPagamentoDiarioDto) {
        // --- CONSTANTES DE CONSISTÊNCIA (Single Source of Truth) ---
        const DATA_REGISTRO = new Date(); // Data exata do servidor
        const VALOR_REGISTRO = Number(dto.valorPago); // Valor numérico exato

        // 1. Gerar Referência se não existir
        if (!dto.referenciaPagamento) {
            dto.referenciaPagamento = this.gerarReferenciaAleatoria();
        }

        const emprestimo = await this.emprestimoRepository.findOne({
            where: { emprestimoId: dto.emprestimoId }
        });

        if (!emprestimo) {
            throw new NotFoundException('Empréstimo não encontrado');
        }

        if (emprestimo.status === 'Pago') {
            throw new ConflictException('Este empréstimo já foi totalmente pago');
        }

        // 2. Calcular Valores Base
        const valorPrincipal = Number(emprestimo.valor);
        const valorLucro = valorPrincipal * 0.20;
        const valorTotalEmprestimo = valorPrincipal + valorLucro;

        const penalizacoes = await this.penalizacaoRepository.find({
            where: [
                { emprestimoId: emprestimo.emprestimoId, status: StatusPenalizacao.PENDENTE },
                { emprestimoId: emprestimo.emprestimoId, status: StatusPenalizacao.APLICADA }
            ]
        });
        const totalPenalizacoes = penalizacoes.reduce((sum, p) => sum + Number(p.valor), 0);
        const valorTotalComPenalizacoes = valorTotalEmprestimo + totalPenalizacoes;

        const planosPagos = await this.planoPagamentoDiarioRepository.find({
            where: { emprestimoId: emprestimo.emprestimoId }
        });
        const totalJaPago = planosPagos.reduce((sum, p) => sum + Number(p.valorPago), 0);
        const saldoDevedor = valorTotalComPenalizacoes - totalJaPago;

        if (saldoDevedor <= 0) {
            throw new ConflictException('Empréstimo já está totalmente pago');
        }

        // 3. Validar Datas e Cálculos
        // Para cálculo de vencimento, usamos a data do registro como base 'Hoje'
        const dataVencimento = new Date(emprestimo.dataVencimento);
        const diasRestantes = Math.ceil((dataVencimento.getTime() - DATA_REGISTRO.getTime()) / (1000 * 60 * 60 * 24));

        if (diasRestantes < 0) {
            throw new BadRequestException('A data de vencimento já passou. Use o sistema de pagamento regular.');
        }

        // Recalcular valor diário sugerido se necessário (apenas informativo aqui)
        const valorDiarioRecalculado = diasRestantes > 0 ? (saldoDevedor / diasRestantes) : saldoDevedor;

        // 4. REGISTRO DUPLO (Calendário + Histórico Geral)
        // Usamos as mesmas constantes DATA_REGISTRO e VALOR_REGISTRO

        // A. Tabela Plano Diário
        const novoPlanoPagamento = this.planoPagamentoDiarioRepository.create({
            emprestimoId: emprestimo.emprestimoId,
            dataReferencia: DATA_REGISTRO,
            valorPrevisto: valorDiarioRecalculado,
            valorPago: VALOR_REGISTRO,
            status: 'Pago',
            dataCalculo: DATA_REGISTRO
        });
        await this.planoPagamentoDiarioRepository.save(novoPlanoPagamento);

        // B. Tabela Pagamento Geral
        const pagamentoGeral = this.pagamentoRepository.create({
            emprestimoId: emprestimo.emprestimoId,
            clienteId: emprestimo.clienteId,
            valorPago: VALOR_REGISTRO,
            dataPagamento: DATA_REGISTRO,
            metodoPagamento: dto.metodoPagamento || 'Pagamento Diário',
            referenciaPagamento: dto.referenciaPagamento
        });
        await this.pagamentoRepository.save(pagamentoGeral);

        // 5. Atualizar Status e Notificações
        const novoSaldoDevedor = saldoDevedor - VALOR_REGISTRO;
        const emprestimoQuitado = novoSaldoDevedor <= 1;

        if (emprestimoQuitado) {
            emprestimo.status = 'Pago';
            await this.emprestimoRepository.save(emprestimo);

            await this.notificacoesService.create({
                clienteId: emprestimo.clienteId,
                tipo: TipoNotificacao.CONFIRMACAO_PAGAMENTO,
                mensagem: `🎉 Parabéns! Empréstimo #${emprestimo.emprestimoId} totalmente quitado!`,
                status: 'Pendente'
            });
        } else {
            await this.notificacoesService.create({
                clienteId: emprestimo.clienteId,
                tipo: TipoNotificacao.CONFIRMACAO_PAGAMENTO,
                mensagem: `Pagamento diário de ${VALOR_REGISTRO.toFixed(2)} MZN recebido. Saldo: ${novoSaldoDevedor.toFixed(2)}`,
                status: 'Pendente'
            });
        }

        return {
            sucesso: true,
            mensagem: emprestimoQuitado ? '✅ Empréstimo quitado!' : '✅ Pagamento diário registrado.',
            pagamento: {
                id: novoPlanoPagamento.planoId,
                referencia: pagamentoGeral.referenciaPagamento,
                valor: VALOR_REGISTRO,
                data: DATA_REGISTRO
            },
            saldoDevedor: Number(novoSaldoDevedor.toFixed(2))
        };
    }

    private calcularDiasTotais(emprestimo: Emprestimo): number {
        const dataInicio = new Date(emprestimo.dataEmprestimo);
        const dataVencimento = new Date(emprestimo.dataVencimento);
        return Math.ceil((dataVencimento.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));
    }

    async obterHistoricoPagamentosDiarios(emprestimoId: string) {
        const emprestimo = await this.emprestimoRepository.findOne({ where: { emprestimoId } });
        if (!emprestimo) throw new NotFoundException('Empréstimo não encontrado');

        const planos = await this.planoPagamentoDiarioRepository.find({
            where: { emprestimoId },
            order: { dataReferencia: 'ASC' }
        });

        const totalPago = planos.reduce((sum, p) => sum + Number(p.valorPago), 0);
        const valorPrincipal = Number(emprestimo.valor);
        const valorTotal = valorPrincipal * 1.20;

        return {
            sucesso: true,
            emprestimo: {
                id: emprestimo.emprestimoId,
                valorTotal: Number(valorTotal.toFixed(2)),
                status: emprestimo.status
            },
            historico: planos.map(p => ({
                data: p.dataReferencia,
                valorPago: Number(p.valorPago),
                status: p.status
            }))
        };
    }

    async obterCalendarioFinanceiro(emprestimoId: string) {
        try {
            const emprestimo = await this.emprestimoRepository.findOne({ where: { emprestimoId } });
            if (!emprestimo) throw new NotFoundException('Empréstimo não encontrado');

            if (!emprestimo.dataEmprestimo || !emprestimo.dataVencimento) {
                throw new BadRequestException('Datas do empréstimo inválidas.');
            }

            const todosPagamentos = await this.pagamentoRepository.find({
                where: { emprestimoId },
                order: { dataPagamento: 'ASC' }
            });

            const valorPrincipal = Number(emprestimo.valor);
            const valorTotalOriginal = valorPrincipal * 1.20;

            const penalizacoes = await this.penalizacaoRepository.find({ where: { emprestimoId } });
            const totalPenalizacoes = penalizacoes
                .filter(p => p.status !== StatusPenalizacao.CANCELADA)
                .reduce((sum, p) => sum + Number(p.valor), 0);

            const valorTotalComPenalizacoes = valorTotalOriginal + totalPenalizacoes;
            const totalJaPago = todosPagamentos.reduce((sum, p) => sum + Number(p.valorPago), 0);
            const saldoDevedor = Math.max(0, valorTotalComPenalizacoes - totalJaPago);

            const calendario = [];
            const dataInicio = new Date(emprestimo.dataEmprestimo);
            const dataVencimento = new Date(emprestimo.dataVencimento);
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            if (isNaN(dataInicio.getTime()) || isNaN(dataVencimento.getTime())) {
                throw new BadRequestException('Datas inválidas no banco.');
            }

            // Calcular pagamentos por dia para o calendário
            const pagamentosMap = new Map();
            todosPagamentos.forEach(p => {
                const d = new Date(p.dataPagamento).toISOString().split('T')[0];
                const current = pagamentosMap.get(d) || { valorPago: 0 };
                current.valorPago += Number(p.valorPago);
                pagamentosMap.set(d, current);
            });

            // Gerar dias
            let currentDate = new Date(dataInicio);
            let safety = 0;

            // Recalculo dinâmico de valor sugerido para dias futuros
            let diasRestantesHoje = 0;
            let tempD = new Date(hoje < dataInicio ? dataInicio : hoje);
            while (tempD <= dataVencimento) { diasRestantesHoje++; tempD.setDate(tempD.getDate() + 1); }
            if (diasRestantesHoje <= 0) diasRestantesHoje = 1;
            const valorSugerido = saldoDevedor > 0 ? (saldoDevedor / diasRestantesHoje) : 0;

            while (currentDate <= dataVencimento && safety < 730) {
                safety++;
                const dateStr = currentDate.toISOString().split('T')[0];
                const info = pagamentosMap.get(dateStr);
                const isPast = currentDate < hoje;
                const isToday = currentDate.getTime() === hoje.getTime();

                let diaInfo = {
                    data: dateStr,
                    status: 'FUTURO',
                    valor: Number(valorSugerido.toFixed(2)),
                    cor: 'cinza'
                };

                if (info && info.valorPago > 0) {
                    diaInfo.status = 'PAGO';
                    diaInfo.valor = info.valorPago;
                    diaInfo.cor = 'verde';
                } else if (isPast) {
                    diaInfo.status = 'SEM PAGAMENTO';
                    diaInfo.valor = 0;
                    diaInfo.cor = 'vermelho';
                } else if (isToday) {
                    diaInfo.status = 'HOJE';
                    diaInfo.cor = 'azul';
                }

                if (saldoDevedor < 1 && !isPast && (!info || info.valorPago === 0)) {
                    diaInfo.status = 'QUITADO';
                    diaInfo.valor = 0;
                    diaInfo.cor = 'verde-claro';
                }

                calendario.push(diaInfo);
                currentDate.setDate(currentDate.getDate() + 1);
            }

            return {
                sucesso: true,
                resumo: {
                    saldoDevedor: Number(saldoDevedor.toFixed(2)),
                    percentualPago: ((totalJaPago / valorTotalComPenalizacoes) * 100).toFixed(1) + '%'
                },
                calendario
            };

        } catch (error) {
            throw new BadRequestException("Erro ao gerar calendário: " + error.message);
        }
    }

    /**
     * ========================================================================
     * PAGAMENTO NORMAL (Endpoint Genérico)
     * ========================================================================
     */
    async create(createPagamentoDto: CreatePagamentoDto) {
        // --- CONSTANTES DE CONSISTÊNCIA ---
        const DATA_REGISTRO = new Date();
        const VALOR_REGISTRO = Number(createPagamentoDto.valorPago);

        // 1. Gerar Referência se não existir (LACM-...)
        if (!createPagamentoDto.referenciaPagamento) {
            createPagamentoDto.referenciaPagamento = this.gerarReferenciaAleatoria();
        }

        const emprestimo = await this.emprestimoRepository.findOne({
            where: { emprestimoId: createPagamentoDto.emprestimoId },
            relations: ['cliente']
        });

        if (!emprestimo) throw new NotFoundException('Empréstimo não encontrado');
        if (emprestimo.status === 'Pago') throw new ConflictException('Empréstimo já pago.');

        // 2. REGISTRO DUPLO OBRIGATÓRIO (Pagamento + Calendário)

        // A. Tabela Principal
        const novoPagamento = this.pagamentoRepository.create({
            ...createPagamentoDto,
            dataPagamento: DATA_REGISTRO,
            valorPago: VALOR_REGISTRO
        });
        await this.pagamentoRepository.save(novoPagamento);

        // B. Tabela Calendário (Plano Diário)
        const planoSync = this.planoPagamentoDiarioRepository.create({
            emprestimoId: emprestimo.emprestimoId,
            dataReferencia: DATA_REGISTRO,
            valorPrevisto: 0,
            valorPago: VALOR_REGISTRO,
            status: 'Pago',
            dataCalculo: DATA_REGISTRO
        });
        await this.planoPagamentoDiarioRepository.save(planoSync);

        // 3. Atualizar Saldos e Status
        const todosPagamentos = await this.pagamentoRepository.find({ where: { emprestimoId: emprestimo.emprestimoId } });
        const totalPago = todosPagamentos.reduce((sum, p) => sum + Number(p.valorPago), 0);

        const valorOriginal = Number(emprestimo.valor) * 1.20;
        const penalizacoes = await this.penalizacaoRepository.find({ where: { emprestimoId: emprestimo.emprestimoId } });
        const totalPenalizacoes = penalizacoes.reduce((sum, p) => sum + Number(p.valor), 0);

        const saldoFinal = (valorOriginal + totalPenalizacoes) - totalPago;

        let novoStatus = 'Ativo';
        if (saldoFinal <= 1) novoStatus = 'Pago';
        else if (new Date(emprestimo.dataVencimento) < new Date()) novoStatus = 'Inadimplente';

        emprestimo.status = novoStatus;
        await this.emprestimoRepository.save(emprestimo);

        // Notificar
        await this.notificacoesService.create({
            clienteId: emprestimo.clienteId,
            tipo: TipoNotificacao.CONFIRMACAO_PAGAMENTO,
            mensagem: novoStatus === 'Pago' ? 'Empréstimo Quitado!' : `Pagamento de ${VALOR_REGISTRO.toFixed(2)} recebido. Saldo: ${saldoFinal.toFixed(2)}`,
            status: 'Pendente'
        });

        return {
            sucesso: true,
            mensagem: novoStatus === 'Pago' ? '✅ Quitado!' : '✅ Pagamento registrado.',
            pagamento: {
                id: novoPagamento.pagamentoId,
                referencia: novoPagamento.referenciaPagamento,
                valor: VALOR_REGISTRO
            },
            saldoRestante: saldoFinal.toFixed(2)
        };
    }

    async findAll() {
        return await this.pagamentoRepository.find({ relations: ['cliente', 'emprestimo'] });
    }

    async findOne(id: string) {
        const pagamento = await this.pagamentoRepository.findOne({
            where: { pagamentoId: id },
            relations: ['cliente', 'emprestimo'],
        });
        if (!pagamento) throw new NotFoundException('Pagamento não encontrado');
        return pagamento;
    }

    async findByCliente(clienteId: string) {
        return await this.pagamentoRepository.find({
            where: { clienteId },
            relations: ['emprestimo'],
            order: { dataPagamento: 'DESC' }
        });
    }

    async findByEmprestimo(emprestimoId: string) {
        return await this.pagamentoRepository.find({
            where: { emprestimoId },
            order: { dataPagamento: 'DESC' }
        });
    }
}
