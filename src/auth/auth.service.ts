import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AutenticacaoCliente } from '../entities/autenticacao-cliente.entity';
import { LoginDto } from './dto/auth.dto';
import { CreateAutenticacaoDto, UpdateAutenticacaoDto } from './dto/autenticacao-crud.dto';
import { FuncionariosService } from '../funcionarios/funcionarios.service';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(AutenticacaoCliente)
        private autenticacaoRepository: Repository<AutenticacaoCliente>,
        private jwtService: JwtService,
        private funcionariosService: FuncionariosService,
    ) { }

    async login(loginDto: LoginDto) {
        const auth = await this.autenticacaoRepository.findOne({
            where: { username: loginDto.username },
            relations: ['cliente'],
        });

        if (!auth) {
            throw new UnauthorizedException('Credenciais inválidas');
        }

        if (auth.bloqueado) {
            throw new UnauthorizedException('Conta bloqueada. Contacte o administrador.');
        }

        const isPasswordValid = await bcrypt.compare(loginDto.password, auth.passwordHash);

        if (!isPasswordValid) {
            auth.tentativasLogin += 1;

            if (auth.tentativasLogin >= 5) {
                auth.bloqueado = true;
                auth.dataBloqueio = new Date();
            }

            await this.autenticacaoRepository.save(auth);

            throw new UnauthorizedException('Credenciais inválidas');
        }

        auth.tentativasLogin = 0;
        auth.ultimoLogin = new Date();
        await this.autenticacaoRepository.save(auth);

        const payload = { username: auth.username, sub: auth.autenticacaoId };
        const token = this.jwtService.sign(payload);

        return {
            access_token: token,
            clienteId: auth.clienteId,
            username: auth.username,
            cliente: auth.cliente ? {
                nome: auth.cliente.nome,
                email: auth.cliente.email,
                telefone: auth.cliente.telefone,
            } : null,
        };
    }

    async loginFuncionario(loginDto: LoginDto) {
        const funcionario = await this.funcionariosService.findByUsername(loginDto.username);

        if (!funcionario) {
            throw new UnauthorizedException('Credenciais inválidas');
        }

        if (funcionario.bloqueado) {
            throw new UnauthorizedException('Conta bloqueada. Contacte o suporte.');
        }

        const isPasswordValid = await bcrypt.compare(loginDto.password, funcionario.passwordHash);

        if (!isPasswordValid) {
            await this.funcionariosService.updateTentativasLogin(loginDto.username);
            throw new UnauthorizedException('Credenciais inválidas');
        }

        const passwordExpired = this.funcionariosService.isPasswordExpired(funcionario);

        await this.funcionariosService.updateLoginStats(funcionario.funcionarioId);

        const payload = {
            username: funcionario.username,
            sub: funcionario.funcionarioId,
            role: funcionario.role,
            type: 'funcionario'
        };
        const token = this.jwtService.sign(payload);

        return {
            access_token: token,
            funcionarioId: funcionario.funcionarioId,
            username: funcionario.username,
            role: funcionario.role,
            nome: funcionario.nome,
            passwordExpired,
            message: passwordExpired ? 'Sua senha expirou. Por favor, atualize-a.' : 'Login bem sucedido'
        };
    }

    async getProfile(userId: string, type: string = 'cliente') {
        if (type === 'funcionario') {
            const funcionario = await this.funcionariosService.findOne(userId);
            return {
                username: funcionario.username,
                nome: funcionario.nome,
                role: funcionario.role,
                type: 'funcionario'
            };
        }

        const auth = await this.autenticacaoRepository.findOne({
            where: { autenticacaoId: userId },
            relations: ['cliente'],
        });

        if (!auth) {
            throw new UnauthorizedException();
        }

        return {
            username: auth.username,
            cliente: auth.cliente,
            type: 'cliente'
        };
    }

    async create(createDto: CreateAutenticacaoDto) {
        const existingAuth = await this.autenticacaoRepository.findOne({
            where: { username: createDto.username },
        });

        if (existingAuth) {
            throw new ConflictException('Username já existe');
        }

        const hashedPassword = await bcrypt.hash(createDto.password, 10);

        const autenticacao = this.autenticacaoRepository.create({
            clienteId: createDto.clienteId,
            username: createDto.username,
            passwordHash: hashedPassword,
            tentativasLogin: 0,
            bloqueado: false,
        });

        const saved = await this.autenticacaoRepository.save(autenticacao);

        return {
            message: 'Autenticação criada com sucesso',
            autenticacaoId: saved.autenticacaoId,
            username: saved.username,
        };
    }

    async findAll() {
        return this.autenticacaoRepository.find({
            select: ['autenticacaoId', 'username', 'dataCriacao', 'ultimoLogin', 'tentativasLogin', 'bloqueado'],
        });
    }

    async findOne(id: string) {
        const autenticacao = await this.autenticacaoRepository.findOne({
            where: { autenticacaoId: id },
            select: ['autenticacaoId', 'username', 'dataCriacao', 'ultimoLogin', 'tentativasLogin', 'bloqueado', 'dataBloqueio'],
        });

        if (!autenticacao) {
            throw new NotFoundException('Autenticação não encontrada');
        }

        return autenticacao;
    }

    async update(id: string, updateDto: UpdateAutenticacaoDto) {
        const autenticacao = await this.autenticacaoRepository.findOne({
            where: { autenticacaoId: id },
        });

        if (!autenticacao) {
            throw new NotFoundException('Autenticação não encontrada');
        }

        if (updateDto.username && updateDto.username !== autenticacao.username) {
            const existingAuth = await this.autenticacaoRepository.findOne({
                where: { username: updateDto.username },
            });

            if (existingAuth) {
                throw new ConflictException('Username já existe');
            }

            autenticacao.username = updateDto.username;
        }

        if (updateDto.password) {
            const hashedPassword = await bcrypt.hash(updateDto.password, 10);
            autenticacao.passwordHash = hashedPassword;
        }

        await this.autenticacaoRepository.save(autenticacao);

        return {
            message: 'Autenticação atualizada com sucesso',
            autenticacaoId: autenticacao.autenticacaoId,
            username: autenticacao.username,
        };
    }

    async remove(id: string) {
        const autenticacao = await this.autenticacaoRepository.findOne({
            where: { autenticacaoId: id },
        });

        if (!autenticacao) {
            throw new NotFoundException('Autenticação não encontrada');
        }

        await this.autenticacaoRepository.remove(autenticacao);

        return {
            message: 'Autenticação removida com sucesso',
            autenticacaoId: id,
        };
    }
}
