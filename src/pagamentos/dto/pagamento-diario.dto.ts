import { IsNotEmpty, IsString, IsNumber, IsDateString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegistrarPagamentoDiarioDto {
    @ApiProperty({
        description: 'ID do empréstimo',
        example: '123456789'
    })
    @IsNotEmpty({ message: 'O ID do empréstimo é obrigatório' })
    @IsString()
    emprestimoId: string;

    @ApiProperty({
        description: 'Valor pago pelo cliente neste dia',
        example: 500.00,
        minimum: 0.01
    })
    @IsNotEmpty({ message: 'O valor pago é obrigatório' })
    @IsNumber({}, { message: 'O valor deve ser um número válido' })
    @Min(0.01, { message: 'O valor mínimo é 0.01' })
    valorPago: number;

    @ApiProperty({
        description: 'Data do pagamento (formato: YYYY-MM-DD)',
        example: '2024-01-20'
    })
    @IsNotEmpty({ message: 'A data do pagamento é obrigatória' })
    @IsDateString({}, { message: 'Formato de data inválido. Use YYYY-MM-DD' })
    dataPagamento: string;

    @ApiProperty({
        description: 'Método de pagamento utilizado',
        example: 'M-Pesa',
        required: false
    })
    @IsString()
    metodoPagamento?: string;

    @ApiProperty({
        description: 'Referência do pagamento',
        example: 'REF123456',
        required: false
    })
    @IsString()
    referenciaPagamento?: string;
}
