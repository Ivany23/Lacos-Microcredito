import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
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

    /**
     * ========================================================================
     * PAGAMENTO DIÁRIO COM RECALCULAÇÃO AUTOMÁTICA
     * ========================================================================
     * Sistema inteligente que:
     * 1. Verifica quanto já foi pago
     * 2. Calcula quantos dias faltam até o vencimento
     * 3. Se o cliente falhou dias, recalcula o valor diário restante
     * 4. Garante que o total seja pago até a data de vencimento
     */
    async registrarPagamentoDiario(dto: RegistrarPagamentoDiarioDto) {
        // 1. Validar Empréstimo
        const emprestimo = await this.emprestimoRepository.findOne({
            where: { emprestimoId: dto.emprestimoId }
        });

        if (!emprestimo) {
            throw new NotFoundException('Empréstimo não encontrado');
        }

        if (emprestimo.status === 'Pago') {
            throw new ConflictException('Este empréstimo já foi totalmente pago');
        }

        // 2. Calcular Valores Base (Principal + 20% Lucro)
        const valorPrincipal = Number(emprestimo.valor);
        const valorLucro = valorPrincipal * 0.20;
        const valorTotalEmprestimo = valorPrincipal + valorLucro;

        // 3. Buscar Penalizações Ativas
        const penalizacoes = await this.penalizacaoRepository.find({
            where: [
                { emprestimoId: emprestimo.emprestimoId, status: StatusPenalizacao.PENDENTE },
                { emprestimoId: emprestimo.emprestimoId, status: StatusPenalizacao.APLICADA }
            ]
        });
        const totalPenalizacoes = penalizacoes.reduce((sum, p) => sum + Number(p.valor), 0);
        const valorTotalComPenalizacoes = valorTotalEmprestimo + totalPenalizacoes;

        // 4. Calcular Total Já Pago (Histórico)
        const planosPagos = await this.planoPagamentoDiarioRepository.find({
            where: { emprestimoId: emprestimo.emprestimoId }
        });
        const totalJaPago = planosPagos.reduce((sum, p) => sum + Number(p.valorPago), 0);

        // 5. Calcular Saldo Devedor Atual
        const saldoDevedor = valorTotalComPenalizacoes - totalJaPago;

        if (saldoDevedor <= 0) {
            throw new ConflictException('Empréstimo já está totalmente pago');
        }

        // 6. Calcular Dias Restantes até Vencimento
        const hoje = new Date(dto.dataPagamento);
        const dataVencimento = new Date(emprestimo.dataVencimento);
        const diasRestantes = Math.ceil((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

        if (diasRestantes < 0) {
            throw new BadRequestException('A data de vencimento já passou. Use o sistema de pagamento regular.');
        }

        if (diasRestantes === 0) {
            throw new BadRequestException('Hoje é o último dia. O valor total deve ser pago.');
        }

        // 7. RECALCULAR VALOR DIÁRIO (Inteligência do Sistema)
        // Se o cliente falhou dias, o sistema redistribui o saldo pelos dias restantes
        const valorDiarioRecalculado = saldoDevedor / diasRestantes;

        // 8. Validar Valor Pago
        const valorPago = Number(dto.valorPago);

        // Tolerância de 1 MZN para variações de arredondamento
        if (valorPago < (valorDiarioRecalculado - 1)) {
            return {
                sucesso: false,
                erro: 'VALOR_INSUFICIENTE',
                mensagem: `Valor insuficiente. O valor diário recalculado é ${valorDiarioRecalculado.toFixed(2)} MZN`,
                detalhes: {
                    valorMinimoDiario: Number(valorDiarioRecalculado.toFixed(2)),
                    valorPagoRecebido: valorPago,
                    saldoDevedor: Number(saldoDevedor.toFixed(2)),
                    diasRestantes,
                    explicacao: diasRestantes < this.calcularDiasTotais(emprestimo)
                        ? 'O valor diário aumentou porque você pulou alguns dias de pagamento'
                        : 'Valor diário padrão'
                }
            };
        }

        // 9. Registrar Pagamento no Plano Diário
        const novoPlanoPagamento = this.planoPagamentoDiarioRepository.create({
            emprestimoId: emprestimo.emprestimoId,
            dataReferencia: hoje,
            valorPrevisto: valorDiarioRecalculado,
            valorPago: valorPago,
            status: 'Pago',
            dataCalculo: new Date()
        });
        await this.planoPagamentoDiarioRepository.save(novoPlanoPagamento);

        // 10. Registrar no Sistema de Pagamentos Principal
        const pagamentoGeral = this.pagamentoRepository.create({
            emprestimoId: emprestimo.emprestimoId,
            clienteId: emprestimo.clienteId,
            valorPago: valorPago,
            dataPagamento: hoje,
            metodoPagamento: dto.metodoPagamento || 'Pagamento Diário',
            referenciaPagamento: dto.referenciaPagamento || `DIARIO-${Date.now()}`
        });
        await this.pagamentoRepository.save(pagamentoGeral);

        // 11. Atualizar Saldo e Verificar Status
        const novoSaldoDevedor = saldoDevedor - valorPago;
        const emprestimoQuitado = novoSaldoDevedor <= 1; // Tolerância de 1 MZN

        if (emprestimoQuitado) {
            emprestimo.status = 'Pago';
            await this.emprestimoRepository.save(emprestimo);

            // Notificar Quitação
            await this.notificacoesService.create({
                clienteId: emprestimo.clienteId,
                tipo: TipoNotificacao.CONFIRMACAO_PAGAMENTO,
                mensagem: `🎉 Parabéns! Empréstimo #${emprestimo.emprestimoId} totalmente quitado!`,
                status: 'Pendente'
            });
        } else {
            // Notificar Pagamento Diário
            await this.notificacoesService.create({
                clienteId: emprestimo.clienteId,
                tipo: TipoNotificacao.CONFIRMACAO_PAGAMENTO,
                mensagem: `Pagamento diário de ${valorPago.toFixed(2)} MZN recebido. Saldo restante: ${novoSaldoDevedor.toFixed(2)} MZN`,
                status: 'Pendente'
            });
        }

        // 12. Recalcular Plano para Dias Futuros
        const diasFuturosRestantes = diasRestantes - 1;
        const novoValorDiario = diasFuturosRestantes > 0 ? novoSaldoDevedor / diasFuturosRestantes : 0;

        return {
            sucesso: true,
            mensagem: emprestimoQuitado
                ? '✅ Empréstimo totalmente quitado!'
                : '✅ Pagamento diário registrado com sucesso',

            pagamento: {
                id: novoPlanoPagamento.planoId,
                data: hoje,
                valorPago: Number(valorPago.toFixed(2)),
                valorPrevisto: Number(valorDiarioRecalculado.toFixed(2))
            },

            situacaoEmprestimo: {
                status: emprestimo.status,
                valorTotalEmprestimo: Number(valorTotalComPenalizacoes.toFixed(2)),
                totalJaPago: Number((totalJaPago + valorPago).toFixed(2)),
                saldoDevedor: Number(Math.max(0, novoSaldoDevedor).toFixed(2)),
                quitado: emprestimoQuitado
            },

            proximosPagamentos: emprestimoQuitado ? null : {
                diasRestantes: diasFuturosRestantes,
                valorDiarioRecalculado: Number(novoValorDiario.toFixed(2)),
                dataVencimento: dataVencimento.toISOString().split('T')[0],
                observacao: diasFuturosRestantes < this.calcularDiasTotais(emprestimo)
                    ? '⚠️ Valor diário aumentou devido a dias não pagos anteriormente'
                    : '✅ Pagamento em dia'
            }
        };
    }

    /**
     * Calcular total de dias do empréstimo (da data de início até vencimento)
     */
    private calcularDiasTotais(emprestimo: Emprestimo): number {
        const dataInicio = new Date(emprestimo.dataEmprestimo);
        const dataVencimento = new Date(emprestimo.dataVencimento);
        return Math.ceil((dataVencimento.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));
    }

    /**
     * Obter histórico de pagamentos diários de um empréstimo
     */
    async obterHistoricoPagamentosDiarios(emprestimoId: string) {
        const emprestimo = await this.emprestimoRepository.findOne({
            where: { emprestimoId }
        });

        if (!emprestimo) {
            throw new NotFoundException('Empréstimo não encontrado');
        }

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
                valorPrincipal: Number(valorPrincipal.toFixed(2)),
                valorTotal: Number(valorTotal.toFixed(2)),
                dataInicio: emprestimo.dataEmprestimo,
                dataVencimento: emprestimo.dataVencimento,
                status: emprestimo.status
            },
            resumo: {
                totalDias: planos.length,
                totalPago: Number(totalPago.toFixed(2)),
                saldoDevedor: Number(Math.max(0, valorTotal - totalPago).toFixed(2))
            },
            historico: planos.map(p => ({
                data: p.dataReferencia,
                valorPrevisto: Number(p.valorPrevisto),
                valorPago: Number(p.valorPago),
                status: p.status
            }))
        };
    }

    async obterCalendarioFinanceiro(emprestimoId: string) {
        try {
            const emprestimo = await this.emprestimoRepository.findOne({
                where: { emprestimoId }
            });

            if (!emprestimo) {
                throw new NotFoundException('Empréstimo não encontrado');
            }

            // Validar datas essenciais
            if (!emprestimo.dataEmprestimo || !emprestimo.dataVencimento) {
                throw new BadRequestException('Cadastro do empréstimo incompleto (datas ausentes).');
            }

            // Buscar TODOS os pagamentos reais (Tabela Pagamento é a fonte da verdade financeira)
            const todosPagamentos = await this.pagamentoRepository.find({
                where: { emprestimoId },
                order: { dataPagamento: 'ASC' }
            });

            // Cálculos Financeiros
            const valorPrincipal = Number(emprestimo.valor);
            const valorLucro = valorPrincipal * 0.20;
            const valorTotalOriginal = valorPrincipal + valorLucro;

            const penalizacoes = await this.penalizacaoRepository.find({
                where: { emprestimoId }
            });
            const totalPenalizacoes = penalizacoes
                .filter(p => p.status !== StatusPenalizacao.CANCELADA)
                .reduce((sum, p) => sum + Number(p.valor), 0);

            const valorTotalComPenalizacoes = valorTotalOriginal + totalPenalizacoes;
            const totalJaPago = todosPagamentos.reduce((sum, p) => sum + Number(p.valorPago), 0);
            const saldoDevedor = Math.max(0, valorTotalComPenalizacoes - totalJaPago);

            const calendario = [];

            // Tratamento seguro de datas
            const dataInicio = new Date(emprestimo.dataEmprestimo);
            const dataVencimento = new Date(emprestimo.dataVencimento);
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            // Se as datas forem inválidas, retornar erro amigável ao invés de 500
            if (isNaN(dataInicio.getTime()) || isNaN(dataVencimento.getTime())) {
                throw new BadRequestException('Datas do empréstimo inválidas no banco de dados.');
            }

            // Calcular dias totais e restantes
            let diasRestantes = 0;
            let tempDate = new Date(hoje);
            // Se hoje for antes do inicio, consideramos a partir do inicio
            if (tempDate < dataInicio) tempDate = new Date(dataInicio);

            while (tempDate <= dataVencimento) {
                diasRestantes++;
                tempDate.setDate(tempDate.getDate() + 1);
            }
            if (diasRestantes <= 0 && saldoDevedor > 0) diasRestantes = 1; // Evitar divisão por zero se venceu hoje/ontem

            const valorSugeridoDiario = saldoDevedor > 0 ? (saldoDevedor / diasRestantes) : 0;

            // Agrupar pagamentos por dia
            const pagamentosMap = new Map();
            todosPagamentos.forEach(p => {
                const d = new Date(p.dataPagamento).toISOString().split('T')[0];
                if (!pagamentosMap.has(d)) {
                    pagamentosMap.set(d, { valorPago: 0 });
                }
                const current = pagamentosMap.get(d);
                current.valorPago += Number(p.valorPago);
            });

            let currentDate = new Date(dataInicio);
            // Limite de segurança para loop infinito (anos bissextos, erros de data, etc)
            let safetyCounter = 0;
            const SAFETY_LIMIT = 365 * 2;

            while (currentDate <= dataVencimento && safetyCounter < SAFETY_LIMIT) {
                safetyCounter++;
                const dateStr = currentDate.toISOString().split('T')[0];
                const infoPagamentoDia = pagamentosMap.get(dateStr);
                const isPast = currentDate < hoje;
                const isToday = currentDate.getTime() === hoje.getTime();

                let diaInfo = {
                    data: dateStr,
                    status: '',
                    valor: 0,
                    cor: ''
                };

                if (infoPagamentoDia && infoPagamentoDia.valorPago > 0) {
                    diaInfo.valor = infoPagamentoDia.valorPago;
                    diaInfo.status = 'PAGO';
                    diaInfo.cor = 'verde';
                } else if (isPast) {
                    diaInfo.status = 'SEM PAGAMENTO';
                    diaInfo.valor = 0;
                    diaInfo.cor = 'vermelho';
                } else if (isToday) {
                    diaInfo.status = 'HOJE';
                    diaInfo.valor = Number(valorSugeridoDiario.toFixed(2));
                    diaInfo.cor = 'azul';
                } else {
                    diaInfo.status = 'FUTURO';
                    diaInfo.valor = Number(valorSugeridoDiario.toFixed(2));
                    diaInfo.cor = 'cinza';
                }

                // Se já pagou tudo, dias futuros ficam verdes/isentos
                if (saldoDevedor < 1 && !isPast && (!infoPagamentoDia || infoPagamentoDia.valorPago === 0)) {
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
                    diasRestantes: diasRestantes,
                    saldoDevedor: Number(saldoDevedor.toFixed(2)),
                    valorTotal: Number(valorTotalComPenalizacoes.toFixed(2)),
                    percentualPago: ((totalJaPago / valorTotalComPenalizacoes) * 100).toFixed(1) + '%'
                },
                calendario
            };
        } catch (error) {
            console.error("Erro ao gerar calendário:", error);
            throw new BadRequestException("Erro ao processar calendário financeiro: " + error.message);
        }
    }

    private gerarReferenciaAleatoria(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `REF-${result}`;
    }

    async create(createPagamentoDto: CreatePagamentoDto) {
        const emprestimo = await this.emprestimoRepository.findOne({
            where: { emprestimoId: createPagamentoDto.emprestimoId },
            relations: ['cliente']
        });

        if (!emprestimo) throw new NotFoundException('Empréstimo não encontrado');
        if (emprestimo.status === 'Pago') throw new ConflictException('Este empréstimo já consta como Pago.');

        // 1. Gerar Referência se não existir
        if (!createPagamentoDto.referenciaPagamento) {
            createPagamentoDto.referenciaPagamento = this.gerarReferenciaAleatoria();
        }

        // 2. Definição dos Valores Base (Regra de 20% de lucro fixo)
        const valorPrincipalBase = Number(emprestimo.valor);
        const valorLucroFixo = valorPrincipalBase * 0.20;

        // 3. Buscar histórico para cálculos lógicos
        const todosPagamentos = await this.pagamentoRepository.find({ where: { emprestimoId: emprestimo.emprestimoId } });
        const totalPagoAnteriormente = todosPagamentos.reduce((sum, p) => sum + Number(p.valorPago), 0);
        const valorDestePagamento = Number(createPagamentoDto.valorPago);
        const totalPagoAcumulado = totalPagoAnteriormente + valorDestePagamento;

        // 4. Buscar todas as Penalizações ativas (Pendente ou Aplicada)
        const penalizacoesAtivas = await this.penalizacaoRepository.find({
            where: [
                { emprestimoId: emprestimo.emprestimoId, status: StatusPenalizacao.PENDENTE },
                { emprestimoId: emprestimo.emprestimoId, status: StatusPenalizacao.APLICADA }
            ],
            order: { dataAplicacao: 'ASC' }
        });

        const todasPenalizacoes = await this.penalizacaoRepository.find({
            where: { emprestimoId: emprestimo.emprestimoId }
        });
        const totalPenalizacoesHistorico = todasPenalizacoes
            .filter(p => p.status !== StatusPenalizacao.CANCELADA)
            .reduce((sum, p) => sum + Number(p.valor), 0);

        // 5. Ordem de Aplicação Lógica (Penalizações -> Lucro -> Capital)
        let valorParaAlocar = totalPagoAcumulado;

        // Alocação para Penalizações
        const totalAlocadoPenalizacoes = Math.min(valorParaAlocar, totalPenalizacoesHistorico);
        valorParaAlocar -= totalAlocadoPenalizacoes;

        // Alocação para Lucro
        const totalAlocadoLucro = Math.min(valorParaAlocar, valorLucroFixo);
        valorParaAlocar -= totalAlocadoLucro;

        // Alocação para Capital (Principal)
        const totalAlocadoPrincipal = Math.min(valorParaAlocar, valorPrincipalBase);
        valorParaAlocar -= totalAlocadoPrincipal;

        const saldoDevedorTotal = (totalPenalizacoesHistorico + valorLucroFixo + valorPrincipalBase) - totalPagoAcumulado;

        // 6. Atualizar Status das Penalizações no Banco (Efetivar pagamento das multas)
        let acumuladoParaMultas = totalPagoAcumulado;
        for (const multa of penalizacoesAtivas) {
            const valorMulta = Number(multa.valor);
            if (acumuladoParaMultas >= valorMulta) {
                multa.status = 'Paga';
                multa.observacoes = (multa.observacoes || '') + ` | Liquidada em ${new Date().toISOString()} via Pagamento Normal`;
                await this.penalizacaoRepository.save(multa);
                acumuladoParaMultas -= valorMulta;
            }
        }

        // 7. Registrar o Novo Pagamento
        const novoPagamento = this.pagamentoRepository.create({
            ...createPagamentoDto,
            dataPagamento: new Date(),
        });
        await this.pagamentoRepository.save(novoPagamento);

        // --- INTEGRAÇÃO: Sincronizar com Plano Diário ---
        const planoDiarioSync = this.planoPagamentoDiarioRepository.create({
            emprestimoId: emprestimo.emprestimoId,
            dataReferencia: new Date(),
            valorPrevisto: 0,
            valorPago: valorDestePagamento,
            status: 'Pago',
            dataCalculo: new Date()
        });
        await this.planoPagamentoDiarioRepository.save(planoDiarioSync);
        // ------------------------------------------------

        // 8. Determinar Novo Status do Empréstimo
        let novoStatus = 'Ativo';
        const hoje = new Date();
        const temAtraso = new Date(emprestimo.dataVencimento) < hoje;
        const temMultasPendentes = penalizacoesAtivas.some(p => p.status !== 'Paga');

        if (saldoDevedorTotal <= 1) {
            novoStatus = 'Pago';
        } else if (temAtraso || temMultasPendentes) {
            novoStatus = 'Inadimplente';
        }

        emprestimo.status = novoStatus;
        await this.emprestimoRepository.save(emprestimo);

        // 9. Notificações
        await this.notificacoesService.create({
            clienteId: emprestimo.clienteId,
            tipo: TipoNotificacao.CONFIRMACAO_PAGAMENTO,
            mensagem: novoStatus === 'Pago'
                ? `Empréstimo #${emprestimo.emprestimoId} QUITADO (Via Pagamento Normal)!`
                : `Recebemos seu pagamento de ${valorDestePagamento}. Saldo: ${saldoDevedorTotal.toFixed(2)}.`,
            status: 'Pendente'
        });

        // 10. Calcular dias de atraso totais e resumo
        const diasAtrasoTotal = penalizacoesAtivas.length > 0
            ? Math.max(...penalizacoesAtivas.map(p => Number(p.diasAtraso) || 0))
            : 0;

        const penalizacoesPendentesValor = totalPenalizacoesHistorico - totalAlocadoPenalizacoes;

        return {
            sucesso: true,
            mensagem: novoStatus === 'Pago' ? '✅ Quitado!' : '✅ Pagamento registrado.',
            pagamento: {
                id: novoPagamento.pagamentoId,
                valorPago: Number(valorDestePagamento).toFixed(2),
                dataPagamento: novoPagamento.dataPagamento,
                metodoPagamento: createPagamentoDto.metodoPagamento
            },
            emprestimo: {
                id: emprestimo.emprestimoId,
                clienteId: emprestimo.clienteId,
                status: novoStatus,
                dataVencimento: emprestimo.dataVencimento
            },
            saldoDevedor: Number(saldoDevedorTotal).toFixed(2),
            // Resumo Financeiro Detalhado
            resumoFinanceiro: {
                valorPrincipal: Number(valorPrincipalBase).toFixed(2),
                lucro20Porcento: Number(valorLucroFixo).toFixed(2),
                valorTotalEmprestimo: Number(valorPrincipalBase + valorLucroFixo).toFixed(2),
                totalPenalizacoes: Number(totalPenalizacoesHistorico).toFixed(2),
                valorTotalDevido: Number(totalPenalizacoesHistorico + valorLucroFixo + valorPrincipalBase).toFixed(2),
                totalPagoAcumulado: Number(totalPagoAcumulado).toFixed(2),
                saldoDevedor: Number(Math.max(0, saldoDevedorTotal)).toFixed(2)
            }
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
