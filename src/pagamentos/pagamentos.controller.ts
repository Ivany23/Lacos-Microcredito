import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { PagamentosService } from './pagamentos.service';
import { CreatePagamentoDto } from './dto/pagamento.dto';
import { RegistrarPagamentoDiarioDto } from './dto/pagamento-diario.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Pagamentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pagamentos')
export class PagamentosController {
    constructor(private readonly pagamentosService: PagamentosService) { }

    @Post()
    @ApiOperation({ summary: 'Registrar um novo pagamento' })
    @ApiResponse({ status: 201, description: 'Pagamento registrado com sucesso.' })
    create(@Body() createPagamentoDto: CreatePagamentoDto) {
        return this.pagamentosService.create(createPagamentoDto);
    }

    @Post('diario')
    @ApiOperation({
        summary: 'Registrar Pagamento Diário com Recalculação Automática',
        description: `
Sistema inteligente de pagamento diário que:
- ✅ Verifica quanto já foi pago
- ✅ Calcula quantos dias faltam até o vencimento
- ✅ Se o cliente falhou dias, recalcula automaticamente o valor diário
- ✅ Redistribui o saldo restante pelos dias que faltam
- ✅ Garante que o empréstimo seja pago até a data de vencimento

**Exemplo de Funcionamento:**
- Empréstimo: 10.000 MZN + 20% = 12.000 MZN
- Prazo: 30 dias
- Valor diário inicial: 400 MZN/dia
- Se o cliente pular 5 dias e pagar no dia 6:
  - Dias restantes: 25
  - Novo valor diário: 12.000 / 25 = 480 MZN/dia
        `
    })
    @ApiResponse({
        status: 201,
        description: 'Pagamento diário registrado com sucesso e valor recalculado para os próximos dias.'
    })
    @ApiResponse({
        status: 400,
        description: 'Valor insuficiente ou data de vencimento já passou.'
    })
    registrarPagamentoDiario(@Body() dto: RegistrarPagamentoDiarioDto) {
        return this.pagamentosService.registrarPagamentoDiario(dto);
    }

    @Get('diario/:emprestimoId')
    @ApiOperation({
        summary: 'Obter Histórico de Pagamentos Diários',
        description: 'Retorna todo o histórico de pagamentos diários de um empréstimo, incluindo valores previstos vs pagos.'
    })
    @ApiResponse({
        status: 200,
        description: 'Histórico retornado com sucesso.'
    })
    obterHistoricoDiario(@Param('emprestimoId') emprestimoId: string) {
        return this.pagamentosService.obterHistoricoPagamentosDiarios(emprestimoId);
    }

    @Get()
    @ApiOperation({ summary: 'Listar todos os pagamentos (Relatório Geral)' })
    findAll() {
        return this.pagamentosService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Buscar pagamento por ID' })
    findOne(@Param('id') id: string) {
        return this.pagamentosService.findOne(id);
    }

    @Get('cliente/:clienteId')
    @ApiOperation({ summary: 'Extrato de pagamentos de um cliente' })
    findByCliente(@Param('clienteId') clienteId: string) {
        return this.pagamentosService.findByCliente(clienteId);
    }

    @Get('emprestimo/:emprestimoId')
    @ApiOperation({ summary: 'Pagamentos realizados para um empréstimo específico' })
    findByEmprestimo(@Param('emprestimoId') emprestimoId: string) {
        return this.pagamentosService.findByEmprestimo(emprestimoId);
    }
}
