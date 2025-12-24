import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Exclude } from 'class-transformer';

export enum FuncionarioRole {
    ADMIN = 'admin',
    GESTOR = 'gestor',
    FINANCEIRO = 'financeiro',
    OPERADOR = 'operador',
    SUPORTE = 'suporte',
}

@Entity('funcionarios')
export class Funcionario {
    @PrimaryGeneratedColumn({ name: 'funcionario_id', type: 'bigint' })
    funcionarioId: string;

    @Column()
    nome: string;

    @Column({ unique: true })
    email: string;

    @Column({ unique: true })
    username: string;

    @Column({ name: 'password_hash' })
    @Exclude()
    passwordHash: string;

    @Column({
        type: 'text',
    })
    role: string;

    @CreateDateColumn({ name: 'data_criacao', type: 'timestamptz' })
    dataCriacao: Date;

    @Column({ name: 'ultimo_login', type: 'timestamptz', nullable: true })
    ultimoLogin: Date;

    @Column({ name: 'tentativas_login', default: 0 })
    tentativasLogin: number;

    @Column({ default: false })
    bloqueado: boolean;

    @Column({ name: 'data_bloqueio', type: 'timestamptz', nullable: true })
    dataBloqueio: Date;
}
