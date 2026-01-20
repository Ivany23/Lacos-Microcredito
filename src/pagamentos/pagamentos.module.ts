import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagamentosService } from './pagamentos.service';
import { PagamentosController } from './pagamentos.controller';
import { Pagamento } from '../entities/pagamento.entity';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { Emprestimo } from '../entities/emprestimo.entity';
import { Penalizacao } from '../entities/penalizacao.entity';
import { PlanoPagamentoDiario } from '../entities/plano-pagamento-diario.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Pagamento, Emprestimo, Penalizacao, PlanoPagamentoDiario]),
        NotificacoesModule,
    ],
    controllers: [PagamentosController],
    providers: [PagamentosService],
    exports: [PagamentosService],
})
export class PagamentosModule { }
