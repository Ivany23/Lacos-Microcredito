import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TipoDocumento {
    BI = 'BI',
    PASSAPORTE = 'Passaporte',
    CARTA_CONDUCAO = 'Carta de Conducao',
    NUIT = 'NUIT',
    CONTRATO_MICROCREDITO = 'Contrato Microcredito',
    LIVRETE = 'Livrete',
    DIRE = 'DIRE',
    CERTIDAO_NASCIMENTO = 'Certidao de Nascimento',
    CERTIFICADO_HABILITACOES = 'Certificado de Habilitacoes',
    COMPROVATIVO_RESIDENCIA = 'Comprovativo de Residencia',
    TALAO_DEPOSITO = 'Talao de Deposito',
    DUAT = 'DUAT',
    OUTRO = 'Outro'
}

export class CreateDocumentoDto {
    @ApiProperty({ example: '1', description: 'ID do Cliente' })
    @IsNotEmpty()
    @IsString()
    clienteId: string;

    @ApiProperty({
        description: 'Tipo de documento',
        enum: TipoDocumento,
        example: TipoDocumento.BI
    })
    @IsNotEmpty()
    @IsEnum(TipoDocumento)
    tipoDocumento: TipoDocumento;

    @ApiProperty({ example: '123456789XYZ', description: 'Número do documento (ÚNICO no sistema)' })
    @IsNotEmpty()
    @IsString()
    numeroDocumento: string;

    @ApiProperty({ type: 'string', format: 'binary', description: 'Arquivo do documento (Upload)' })
    @IsOptional()
    arquivo?: any;
}

export class UpdateDocumentoDto {
    @ApiPropertyOptional({
        description: 'Tipo de documento',
        enum: TipoDocumento,
        example: TipoDocumento.BI
    })
    @IsOptional()
    @IsEnum(TipoDocumento)
    tipoDocumento?: TipoDocumento;

    @ApiPropertyOptional({ example: '987654321ABC', description: 'Número do documento (Deve ser ÚNICO se alterado)' })
    @IsOptional()
    @IsString()
    numeroDocumento?: string;

    @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Novo arquivo (opcional)' })
    @IsOptional()
    arquivo?: any;
}
