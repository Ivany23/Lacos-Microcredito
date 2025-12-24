import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { ClientesModule } from './clientes/clientes.module';
import { DocumentosModule } from './documentos/documentos.module';
import { LocalizacaoModule } from './localizacao/localizacao.module';
import { OcupacoesModule } from './ocupacoes/ocupacoes.module';
import { EmprestimosModule } from './emprestimos/emprestimos.module';
import { PenhorModule } from './penhor/penhor.module';
import { TestemunhasModule } from './testemunhas/testemunhas.module';
import { Cliente } from './entities/cliente.entity';
import { AutenticacaoCliente } from './entities/autenticacao-cliente.entity';
import { Documento } from './entities/documento.entity';
import { Localizacao } from './entities/localizacao.entity';
import { Ocupacao } from './entities/ocupacao.entity';
import { Emprestimo } from './entities/emprestimo.entity';
import { Penhor } from './entities/penhor.entity';
import { Testemunha } from './entities/testemunha.entity';
import { Pagamento } from './entities/pagamento.entity';
import { Penalizacao } from './entities/penalizacao.entity';
import { Notificacao } from './entities/notificacao.entity';
import { Funcionario } from './entities/funcionario.entity';

import { AppController } from './app.controller';
import { PagamentosModule } from './pagamentos/pagamentos.module';
import { NotificacoesModule } from './notificacoes/notificacoes.module';
import { PenalizacoesModule } from './penalizacoes/penalizacoes.module';
import { TasksModule } from './tasks/tasks.module';
import { RelatoriosModule } from './relatorios/relatorios.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { FuncionariosModule } from './funcionarios/funcionarios.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        TypeOrmModule.forRoot({
            type: 'postgres',
            url: process.env.DATABASE_URL,
            entities: [
                Cliente,
                AutenticacaoCliente,
                Documento,
                Localizacao,
                Ocupacao,
                Emprestimo,
                Penhor,
                Testemunha,
                Pagamento,
                Penalizacao,
                Notificacao,
                Funcionario,
            ],
            synchronize: false,
            ssl: {
                rejectUnauthorized: false,
            },
            logging: false,
        }),
        AuthModule,
        ClientesModule,
        DocumentosModule,
        LocalizacaoModule,
        OcupacoesModule,
        EmprestimosModule,
        PenhorModule,
        TestemunhasModule,
        PagamentosModule,
        NotificacoesModule,
        PenalizacoesModule,
        TasksModule,
        RelatoriosModule,
        DashboardModule,
        FuncionariosModule,
    ],
    controllers: [AppController],
})
export class AppModule { }
