import { IsNotEmpty, IsString, IsNumber, IsDateString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum EmprestimoStatus {
    ATIVO = 'Ativo',
    PAGO = 'Pago',
    INADIMPLENTE = 'Inadimplente'
}

export class CreateEmprestimoDto {
    @ApiProperty({ example: '1', description: 'ID do Cliente' })
    @IsNotEmpty()
    @IsString()
    clienteId: string;

    @ApiProperty({ example: 5000.00, description: 'Valor do empréstimo' })
    @IsNotEmpty()
    @IsNumber()
    valor: number;

    @ApiProperty({ example: '2023-12-31', description: 'Data de vencimento (YYYY-MM-DD)' })
    @IsNotEmpty()
    @IsDateString()
    dataVencimento: string;

    @ApiPropertyOptional({
        description: 'Status inicial do empréstimo',
        enum: EmprestimoStatus,
        default: EmprestimoStatus.ATIVO,
        example: EmprestimoStatus.ATIVO
    })
    @IsOptional()
    @IsEnum(EmprestimoStatus)
    status?: EmprestimoStatus;
}

export class UpdateEmprestimoDto {
    @ApiPropertyOptional({ example: 6000.00 })
    @IsOptional()
    @IsNumber()
    valor?: number;

    @ApiPropertyOptional({ example: '2024-01-15' })
    @IsOptional()
    @IsDateString()
    dataVencimento?: string;

    @ApiPropertyOptional({
        description: 'Novo status',
        enum: EmprestimoStatus,
        example: EmprestimoStatus.PAGO
    })
    @IsOptional()
    @IsEnum(EmprestimoStatus)
    status?: EmprestimoStatus;
}
