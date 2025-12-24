import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FuncionariosService } from './funcionarios.service';
import { FuncionariosController } from './funcionarios.controller';
import { Funcionario } from '../entities/funcionario.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Funcionario])],
    controllers: [FuncionariosController],
    providers: [FuncionariosService],
    exports: [FuncionariosService],
})
export class FuncionariosModule { }
