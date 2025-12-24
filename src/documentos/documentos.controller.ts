import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentosService } from './documentos.service';
import { CreateDocumentoDto, UpdateDocumentoDto } from './dto/documento.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Documentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documentos')
export class DocumentosController {
    constructor(private readonly documentosService: DocumentosService) { }

    @Post()
    @ApiOperation({ summary: 'Criar documento com upload de arquivo (PDF ou Imagem)' })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('arquivo'))
    create(
        @UploadedFile() file: Express.Multer.File,
        @Body() createDocumentoDto: CreateDocumentoDto
    ) {
        if (file) {
            createDocumentoDto.arquivo = file.buffer;
        }
        return this.documentosService.create(createDocumentoDto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar todos os documentos' })
    findAll() {
        return this.documentosService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Buscar documento por ID' })
    findOne(@Param('id') id: string) {
        return this.documentosService.findOne(id);
    }

    @Get('cliente/:clienteId')
    @ApiOperation({ summary: 'Buscar documentos de um cliente' })
    findByCliente(@Param('clienteId') clienteId: string) {
        return this.documentosService.findByCliente(clienteId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Atualizar documento com upload opcional' })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('arquivo'))
    update(
        @Param('id') id: string,
        @UploadedFile() file: Express.Multer.File,
        @Body() updateDocumentoDto: UpdateDocumentoDto
    ) {
        if (file) {
            updateDocumentoDto.arquivo = file.buffer;
        }
        return this.documentosService.update(id, updateDocumentoDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Remover documento' })
    remove(@Param('id') id: string) {
        return this.documentosService.remove(id);
    }
}
