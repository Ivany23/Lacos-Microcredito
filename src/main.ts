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
        .setVersion('3.2.0')
        .addBearerAuth()
        .addServer('https://lacos-microcredito-api.vercel.app', 'Produção')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    document.servers = [{ url: 'https://lacos-microcredito-api.vercel.app' }];

    // Usando CDN para evitar erro 404 de assets estáticos no Vercel
    const CDN_URL = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2';

    SwaggerModule.setup('docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
        },
        customCssUrl: `${CDN_URL}/swagger-ui.css`,
        customJs: [
            `${CDN_URL}/swagger-ui-bundle.js`,
            `${CDN_URL}/swagger-ui-standalone-preset.js`,
        ],
    });

    const port = process.env.PORT || 3000;
    await app.listen(port);
}

bootstrap();
