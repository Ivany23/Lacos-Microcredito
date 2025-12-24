import { IsNotEmpty, IsString, IsEmail, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ClienteSexo {
    MASCULINO = 'Masculino',
    FEMININO = 'Feminino',
    OUTRO = 'Outro'
}

export enum ClienteNacionalidade {
    MOCAMBICANA = 'Moçambicana',
    ESTRANGEIRA = 'Estrangeira'
}

export class CreateClienteDto {
    @ApiProperty({ example: 'Maria Amélia', description: 'Nome completo do cliente' })
    @IsNotEmpty()
    @IsString()
    nome: string;

    @ApiProperty({
        example: ClienteSexo.FEMININO,
        description: 'Sexo do cliente',
        enum: ClienteSexo
    })
    @IsNotEmpty()
    @IsEnum(ClienteSexo)
    sexo: ClienteSexo;

    @ApiProperty({ example: '+258829876543', description: 'Telefone para contato' })
    @IsNotEmpty()
    @IsString()
    telefone: string;

    @ApiPropertyOptional({ example: 'maria.amelia@email.com', description: 'Email do cliente' })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({
        example: ClienteNacionalidade.MOCAMBICANA,
        description: 'Nacionalidade',
        enum: ClienteNacionalidade,
        default: ClienteNacionalidade.MOCAMBICANA
    })
    @IsOptional()
    @IsEnum(ClienteNacionalidade)
    nacionalidade?: ClienteNacionalidade;

    @ApiProperty({ example: '1985-08-20', description: 'Data de nascimento (ISO 8601)' })
    @IsNotEmpty()
    @IsDateString()
    dataNascimento: string;
}

export class UpdateClienteDto {
    @ApiPropertyOptional({ example: 'Maria Amélia Souza', description: 'Nome atualizado' })
    @IsOptional()
    @IsString()
    nome?: string;

    @ApiPropertyOptional({
        example: ClienteSexo.FEMININO,
        enum: ClienteSexo
    })
    @IsOptional()
    @IsEnum(ClienteSexo)
    sexo?: ClienteSexo;

    @ApiPropertyOptional({ example: '+258849998887' })
    @IsOptional()
    @IsString()
    telefone?: string;

    @ApiPropertyOptional({ example: 'novo.email@email.com' })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({
        example: ClienteNacionalidade.ESTRANGEIRA,
        enum: ClienteNacionalidade
    })
    @IsOptional()
    @IsEnum(ClienteNacionalidade)
    nacionalidade?: ClienteNacionalidade;

    @ApiPropertyOptional({ example: '1985-08-20' })
    @IsOptional()
    @IsDateString()
    dataNascimento?: string;
}
