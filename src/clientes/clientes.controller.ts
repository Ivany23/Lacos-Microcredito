import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClientesService } from './clientes.service';
import { CreateClienteDto, UpdateClienteDto } from './dto/cliente.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Clientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clientes')
export class ClientesController {
    constructor(private readonly clientesService: ClientesService) { }

    @Post()
    @ApiOperation({ summary: 'Cadastrar novo cliente' })
    create(@Body() createClienteDto: CreateClienteDto) {
        return this.clientesService.create(createClienteDto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar todos os clientes' })
    findAll() {
        return this.clientesService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Buscar cliente por ID' })
    findOne(@Param('id') id: string) {
        return this.clientesService.findOne(id);
    }

    @Get(':id/dashboard')
    @ApiOperation({ summary: 'Obter dashboard financeiro e estatísticas do cliente' })
    getDashboard(@Param('id') id: string) {
        return this.clientesService.getClientDashboard(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Atualizar dados do cliente' })
    update(@Param('id') id: string, @Body() updateClienteDto: UpdateClienteDto) {
        return this.clientesService.update(id, updateClienteDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Remover cliente' })
    remove(@Param('id') id: string) {
        return this.clientesService.remove(id);
    }
}
