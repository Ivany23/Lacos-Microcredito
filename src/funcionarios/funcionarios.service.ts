import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Funcionario } from '../entities/funcionario.entity';
import { CreateFuncionarioDto, UpdateFuncionarioDto, UpdatePasswordDto } from './dto/funcionario.dto';

@Injectable()
export class FuncionariosService {
    constructor(
        @InjectRepository(Funcionario)
        private funcionarioRepository: Repository<Funcionario>,
    ) { }

    async create(createDto: CreateFuncionarioDto) {
        const existing = await this.funcionarioRepository.findOne({
            where: [{ email: createDto.email }, { username: createDto.username }]
        });

        if (existing) {
            throw new ConflictException('Email ou Username já cadastrado');
        }

        const passwordHash = await bcrypt.hash(createDto.password, 10);

        const funcionario = this.funcionarioRepository.create({
            ...createDto,
            passwordHash,
            dataUltimaSenha: new Date(),
        });

        return await this.funcionarioRepository.save(funcionario);
    }

    async findAll() {
        return await this.funcionarioRepository.find();
    }

    async findOne(id: string) {
        const funcionario = await this.funcionarioRepository.findOne({ where: { funcionarioId: id } });
        if (!funcionario) throw new NotFoundException('Funcionário não encontrado');
        return funcionario;
    }

    async findByUsername(username: string) {
        return await this.funcionarioRepository.findOne({ where: { username } });
    }

    async update(id: string, updateDto: UpdateFuncionarioDto) {
        const funcionario = await this.findOne(id);

        if (updateDto.email || updateDto.username) {
            const existing = await this.funcionarioRepository.findOne({
                where: [
                    updateDto.email ? { email: updateDto.email } : {},
                    updateDto.username ? { username: updateDto.username } : {}
                ].filter(obj => Object.keys(obj).length > 0)
            });

            if (existing && existing.funcionarioId !== id) {
                throw new ConflictException('Email ou Username já está em uso');
            }
        }

        Object.assign(funcionario, updateDto);
        return await this.funcionarioRepository.save(funcionario);
    }

    async updatePassword(id: string, passwordDto: UpdatePasswordDto) {
        const funcionario = await this.findOne(id);

        const isMatch = await bcrypt.compare(passwordDto.oldPassword, funcionario.passwordHash);
        if (!isMatch) throw new ForbiddenException('Senha atual incorreta');

        funcionario.passwordHash = await bcrypt.hash(passwordDto.newPassword, 10);
        funcionario.dataUltimaSenha = new Date();

        await this.funcionarioRepository.save(funcionario);
        return { message: 'Senha atualizada com sucesso' };
    }

    async remove(id: string) {
        const funcionario = await this.findOne(id);
        await this.funcionarioRepository.remove(funcionario);
        return { message: 'Funcionário removido com sucesso' };
    }

    /**
     * Atualiza o timestamp de último login
     */
    async updateLoginStats(id: string) {
        await this.funcionarioRepository.update(id, {
            ultimoLogin: new Date(),
            tentativasLogin: 0
        });
    }

    /**
     * Incrementa tentativas de login e bloqueia se necessário
     */
    async updateTentativasLogin(username: string) {
        const funcionario = await this.findByUsername(username);
        if (funcionario) {
            funcionario.tentativasLogin += 1;
            if (funcionario.tentativasLogin >= 5) {
                funcionario.bloqueado = true;
                funcionario.dataBloqueio = new Date();
            }
            await this.funcionarioRepository.save(funcionario);
        }
    }

    /**
     * Verifica se a senha expirou (6 meses)
     */
    isPasswordExpired(funcionario: Funcionario): boolean {
        if (!funcionario || !funcionario.dataUltimaSenha) {
            return false;
        }

        const seisMesesEmMs = 6 * 30 * 24 * 60 * 60 * 1000;
        // Garante que é um objeto Date, pois do banco pode vir como string
        const dataUltimaSenha = new Date(funcionario.dataUltimaSenha);
        const dataExpiracao = new Date(dataUltimaSenha.getTime() + seisMesesEmMs);

        return new Date() > dataExpiracao;
    }
}
