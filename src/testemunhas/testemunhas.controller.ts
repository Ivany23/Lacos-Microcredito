import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { TestemunhasService } from './testemunhas.service';
import { CreateTestemunhaDto, UpdateTestemunhaDto } from './dto/testemunha.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Testemunhas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('testemunhas')
export class TestemunhasController {
    constructor(private readonly testemunhasService: TestemunhasService) { }

    @Post()
    @ApiOperation({ summary: 'Cadastrar nova testemunha com upload de documento' })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('arquivoDocumento'))
    create(
        @UploadedFile() file: Express.Multer.File,
        @Body() createTestemunhaDto: CreateTestemunhaDto
    ) {
        return this.testemunhasService.create(createTestemunhaDto, file);
    }

    @Get()
    @ApiOperation({ summary: 'Listar todas as testemunhas' })
    findAll() {
        return this.testemunhasService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Buscar testemunha por ID' })
    findOne(@Param('id') id: string) {
        return this.testemunhasService.findOne(id);
    }

    @Get('cliente/:clienteId')
    @ApiOperation({ summary: 'Buscar testemunhas por cliente' })
    findByCliente(@Param('clienteId') clienteId: string) {
        return this.testemunhasService.findByCliente(clienteId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Atualizar testemunha com upload opcional' })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('arquivoDocumento'))
    update(
        @Param('id') id: string,
        @UploadedFile() file: Express.Multer.File,
        @Body() updateTestemunhaDto: UpdateTestemunhaDto
    ) {
        return this.testemunhasService.update(id, updateTestemunhaDto, file);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Remover testemunha' })
    remove(@Param('id') id: string) {
        return this.testemunhasService.remove(id);
    }
}
