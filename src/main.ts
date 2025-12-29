import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.enableCors({
        origin: '*',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: false,
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
        .setDescription('Documentação completa da API')
        .setVersion('3.1.0')
        .addBearerAuth()
        .addServer('https://lacos-microcredito-api.vercel.app', 'Produção')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    document.servers = [{ url: 'https://lacos-microcredito-api.vercel.app' }];

    // Mudamos de 'api' para 'docs' para evitar o erro de /api/api/
    SwaggerModule.setup('docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
        },
    });

    const port = process.env.PORT || 3000;
    await app.listen(port);
}

bootstrap();
