import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Configuração robusta de CORS para aceitar qualquer origem
    app.enableCors({
        origin: '*', // Permite todas as origens explicitamente
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
    });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

    const config = new DocumentBuilder()
        .setTitle('API de Gestão de Clientes e Empréstimos')
        .setDescription('Documentação completa da API com Suporte a Upload e Extratos')
        .setVersion('1.0')
        .addBearerAuth()
        .addServer('https://lacos-microcredito-api.vercel.app', 'Servidor de Produção')
        .build();

    const document = SwaggerModule.createDocument(app, config);

    // Configuração do Swagger UI
    SwaggerModule.setup('api', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
        },
        customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
        customJs: [
            'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js',
            'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.js',
        ],
    });

    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`API rodando em http://localhost:${port}`);
    console.log(`Swagger disponível em http://localhost:${port}/api`);
}

bootstrap();
