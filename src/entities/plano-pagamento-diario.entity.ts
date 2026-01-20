import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Emprestimo } from './emprestimo.entity';

@Entity('plano_pagamento_diario')
export class PlanoPagamentoDiario {
    @PrimaryGeneratedColumn({ type: 'bigint', name: 'plano_id' })
    planoId: string;

    @Column({ type: 'bigint', name: 'emprestimo_id', nullable: false })
    emprestimoId: string;

    @Column({ type: 'date', name: 'data_referencia', nullable: false })
    dataReferencia: Date;

    @Column({ type: 'decimal', precision: 15, scale: 2, name: 'valor_previsto', nullable: false })
    valorPrevisto: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, name: 'valor_pago', default: 0, nullable: false })
    valorPago: number;

    @Column({ type: 'text', default: 'Pendente', nullable: false })
    status: string;

    @Column({ type: 'timestamp with time zone', name: 'data_calculo', default: () => 'now()', nullable: false })
    dataCalculo: Date;

    @ManyToOne(() => Emprestimo)
    @JoinColumn({ name: 'emprestimo_id' })
    emprestimo: Emprestimo;
}
