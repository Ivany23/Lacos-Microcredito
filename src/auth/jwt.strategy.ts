import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutenticacaoCliente } from '../entities/autenticacao-cliente.entity';
import { AuthConstants } from './constants';
import { FuncionariosService } from '../funcionarios/funcionarios.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        @InjectRepository(AutenticacaoCliente)
        private autenticacaoRepository: Repository<AutenticacaoCliente>,
        private funcionariosService: FuncionariosService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: AuthConstants.jwtSecret,
        });
    }

    async validate(payload: any) {
        if (payload.type === 'funcionario') {
            const funcionario = await this.funcionariosService.findOne(payload.sub);
            if (!funcionario || funcionario.bloqueado) {
                throw new UnauthorizedException();
            }
            return {
                userId: payload.sub,
                username: payload.username,
                role: payload.role,
                type: 'funcionario'
            };
        }

        const auth = await this.autenticacaoRepository.findOne({
            where: { autenticacaoId: String(payload.sub) },
        });

        if (!auth || auth.bloqueado) {
            throw new UnauthorizedException();
        }

        return {
            userId: payload.sub,
            username: payload.username,
            clienteId: auth.clienteId,
            type: 'cliente'
        };
    }
}
