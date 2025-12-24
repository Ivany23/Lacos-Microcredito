import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum GrauParentesco {
    PAI = 'Pai',
    MAE = 'Mae',
    FILHO = 'Filho',
    FILHA = 'Filha',
    IRMAO = 'Irmao',
    IRMA = 'Irma',
    CONJUGE = 'Conjuge',
    TIO = 'Tio',
    TIA = 'Tia',
    PRIMO = 'Primo',
    PRIMA = 'Prima',
    SOBRINHO = 'Sobrinho',
    SOBRINHA = 'Sobrinha',
    AVO_M = 'Avô',
    AVO_F = 'Avó',
    CUNHADO = 'Cunhado',
    CUNHADA = 'Cunhada',
    AMIGO = 'Amigo',
    COLEGA_TRABALHO = 'Colega de Trabalho',
    VIZINHO = 'Vizinho'
}

export enum TestemunhaDocumentoTipo {
    BI = 'BI',
    PASSAPORTE = 'Passaporte',
    CARTA_CONDUCAO = 'Carta de Conducao',
    NUIT = 'NUIT',
    CONTRATO_MICROCREDITO = 'Contrato Microcredito',
    LIVRETE = 'Livrete',
    DIRE = 'DIRE',
    CERTIDAO_NASCIMENTO = 'Certidao de Nascimento',
    CERTIFICADO_HABILITACOES = 'Certificado de Habilitacoes',
    DUAT = 'DUAT'
}

export class CreateTestemunhaDto {
    @ApiProperty({ example: '1', description: 'ID do Cliente' })
    @IsNotEmpty()
    @IsString()
    clienteId: string;

    @ApiProperty({ example: 'Carlos Alberto', description: 'Nome da testemunha' })
    @IsNotEmpty()
    @IsString()
    nome: string;

    @ApiProperty({ example: '+258841112223', description: 'Telefone da testemunha' })
    @IsNotEmpty()
    @IsString()
    telefone: string;

    @ApiProperty({
        description: 'Grau de parentesco',
        enum: GrauParentesco,
        example: GrauParentesco.AMIGO
    })
    @IsNotEmpty()
    @IsEnum(GrauParentesco)
    grauParentesco: GrauParentesco;

    @ApiProperty({
        description: 'Tipo de documento da testemunha',
        enum: TestemunhaDocumentoTipo,
        example: TestemunhaDocumentoTipo.BI
    })
    @IsNotEmpty()
    @IsEnum(TestemunhaDocumentoTipo)
    testemunhaDocumento: TestemunhaDocumentoTipo;

    @ApiProperty({ type: 'string', format: 'binary', description: 'Arquivo do documento (Upload)' })
    @IsOptional()
    arquivoDocumento?: any;
}

export class UpdateTestemunhaDto {
    @ApiPropertyOptional({ example: 'Carlos Alberto Junior' })
    @IsOptional()
    @IsString()
    nome?: string;

    @ApiPropertyOptional({ example: '+258849991111' })
    @IsOptional()
    @IsString()
    telefone?: string;

    @ApiPropertyOptional({
        enum: GrauParentesco,
        example: GrauParentesco.PRIMO
    })
    @IsOptional()
    @IsEnum(GrauParentesco)
    grauParentesco?: GrauParentesco;

    @ApiPropertyOptional({
        enum: TestemunhaDocumentoTipo,
        example: TestemunhaDocumentoTipo.PASSAPORTE
    })
    @IsOptional()
    @IsEnum(TestemunhaDocumentoTipo)
    testemunhaDocumento?: TestemunhaDocumentoTipo;

    @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Novo arquivo do documento (Upload)' })
    @IsOptional()
    arquivoDocumento?: any;
}
