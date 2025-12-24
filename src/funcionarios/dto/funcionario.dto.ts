import { IsNotEmpty, IsString, IsEmail, IsEnum, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FuncionarioRole } from '../../entities/funcionario.entity';

export class CreateFuncionarioDto {
    @ApiProperty({ example: 'João Silva' })
    @IsNotEmpty()
    @IsString()
    nome: string;

    @ApiProperty({ example: 'joao@lacos.com' })
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'joaosilva' })
    @IsNotEmpty()
    @IsString()
    username: string;

    @ApiProperty({ example: 'Senha@123', minLength: 8 })
    @IsNotEmpty()
    @IsString()
    @MinLength(8)
    password: string;

    @ApiProperty({ enum: FuncionarioRole, example: FuncionarioRole.OPERADOR })
    @IsNotEmpty()
    @IsEnum(FuncionarioRole)
    role: FuncionarioRole;
}

export class UpdateFuncionarioDto {
    @ApiPropertyOptional({ example: 'João Silva' })
    @IsOptional()
    @IsString()
    nome?: string;

    @ApiPropertyOptional({ example: 'joao@lacos.com' })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({ example: 'joaosilva' })
    @IsOptional()
    @IsString()
    username?: string;

    @ApiPropertyOptional({ enum: FuncionarioRole, example: FuncionarioRole.OPERADOR })
    @IsOptional()
    @IsEnum(FuncionarioRole)
    role?: FuncionarioRole;
}

export class UpdatePasswordDto {
    @ApiProperty({ example: 'SenhaAntiga@123' })
    @IsNotEmpty()
    @IsString()
    oldPassword: string;

    @ApiProperty({ example: 'NovaSenha@123', minLength: 8 })
    @IsNotEmpty()
    @IsString()
    @MinLength(8)
    newPassword: string;
}
