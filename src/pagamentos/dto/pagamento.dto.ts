import { IsNotEmpty, IsString, IsNumber, IsDateString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MetodoPagamento {
    NUMERARIO = 'Numerario',
    TRANSFERENCIA = 'Transferência Bancária',
    MPESA = 'M-Pesa',
    EMOLA = 'E-Mola',
    MKESH = 'MKesh',
    PENHOR = 'Penhor',
    OUTRO = 'Outro'
}

export class CreatePagamentoDto {
    @ApiProperty({ example: '1', description: 'ID do Empréstimo associado ao pagamento' })
    @IsNotEmpty()
    @IsString()
    emprestimoId: string;

    @ApiProperty({ example: '1', description: 'ID do Cliente' })
    @IsNotEmpty()
    @IsString()
    clienteId: string;

    @ApiProperty({ description: 'Valor pago', example: 1500.50 })
    @IsNotEmpty()
    @IsNumber()
    valorPago: number;

    @ApiProperty({
        description: 'Método de pagamento',
        enum: MetodoPagamento,
        example: MetodoPagamento.MPESA
    })
    @IsNotEmpty()
    @IsEnum(MetodoPagamento)
    metodoPagamento: MetodoPagamento;

    @ApiPropertyOptional({ example: '8412345678W', description: 'Referência do pagamento (ex: ID da transação)' })
    @IsOptional()
    @IsString()
    referenciaPagamento?: string;
}
