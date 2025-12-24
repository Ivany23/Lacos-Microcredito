import { Controller, Post, Body, Get, UseGuards, Request, Put, Delete, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/auth.dto';
import { CreateAutenticacaoDto, UpdateAutenticacaoDto } from './dto/autenticacao-crud.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    @Post('login/funcionario')
    @ApiOperation({ summary: 'Login do funcionário (Admin/Gestor/Operador)' })
    async loginFuncionario(@Body() loginDto: LoginDto) {
        return this.authService.loginFuncionario(loginDto);
    }

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Obter perfil do usuário autenticado' })
    async getProfile(@Request() req) {
        return this.authService.getProfile(req.user.userId, req.user.type);
    }

    @Post('register')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Criar nova autenticação (Cliente ID, Username, Password)' })
    async create(@Body() createDto: CreateAutenticacaoDto) {
        return this.authService.create(createDto);
    }

    @UseGuards(JwtAuthGuard)
    @Get('users')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Listar todas as autenticações' })
    async findAll() {
        return this.authService.findAll();
    }

    @UseGuards(JwtAuthGuard)
    @Get('users/:id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Buscar autenticação por ID' })
    @ApiParam({ name: 'id', description: 'ID da autenticação' })
    async findOne(@Param('id') id: string) {
        return this.authService.findOne(id);
    }

    @UseGuards(JwtAuthGuard)
    @Put('users/:id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Atualizar autenticação (username e/ou password)' })
    @ApiParam({ name: 'id', description: 'ID da autenticação' })
    async update(@Param('id') id: string, @Body() updateDto: UpdateAutenticacaoDto) {
        return this.authService.update(id, updateDto);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('users/:id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Remover autenticação' })
    @ApiParam({ name: 'id', description: 'ID da autenticação' })
    async remove(@Param('id') id: string) {
        return this.authService.remove(id);
    }
}
