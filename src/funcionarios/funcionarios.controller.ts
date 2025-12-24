import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FuncionariosService } from './funcionarios.service';
import { CreateFuncionarioDto, UpdateFuncionarioDto, UpdatePasswordDto } from './dto/funcionario.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Funcionários')
@ApiBearerAuth()
@Controller('funcionarios')
export class FuncionariosController {
    constructor(private readonly funcionariosService: FuncionariosService) { }

    @Post()
    @ApiOperation({ summary: 'Criar um novo funcionário (Admin)' })
    create(@Body() createFuncionarioDto: CreateFuncionarioDto) {
        return this.funcionariosService.create(createFuncionarioDto);
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    @ApiOperation({ summary: 'Listar todos os funcionários' })
    findAll() {
        return this.funcionariosService.findAll();
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    @ApiOperation({ summary: 'Obter detalhes de um funcionário' })
    findOne(@Param('id') id: string) {
        return this.funcionariosService.findOne(id);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    @ApiOperation({ summary: 'Atualizar dados de um funcionário' })
    update(@Param('id') id: string, @Body() updateFuncionarioDto: UpdateFuncionarioDto) {
        return this.funcionariosService.update(id, updateFuncionarioDto);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/password')
    @ApiOperation({ summary: 'Atualizar senha do funcionário' })
    updatePassword(@Param('id') id: string, @Body() updatePasswordDto: UpdatePasswordDto) {
        return this.funcionariosService.updatePassword(id, updatePasswordDto);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    @ApiOperation({ summary: 'Remover um funcionário' })
    remove(@Param('id') id: string) {
        return this.funcionariosService.remove(id);
    }
}
