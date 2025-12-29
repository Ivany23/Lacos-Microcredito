import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

let cachedApp: any;

async function bootstrap() {
    if (!cachedApp) {
        const app = await NestFactory.create(AppModule);

        app.enableCors({
            origin: (origin, callback) => {
                // Allow requests with no origin (like mobile apps or curl requests)
                if (!origin) return callback(null, true);
                // Allow any origin
                callback(null, true);
            },
            methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
            credentials: true,
            allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
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
            .addServer('https://lacosmicrocreditoapi.vercel.app/', 'Servidor de Produção')
            .build();

        const document = SwaggerModule.createDocument(app, config);

        // Fix for Vercel: Use CDN for Swagger UI assets
        SwaggerModule.setup('api', app, document, {
            customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
            customJs: [
                'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js',
                'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.js',
            ],
        });

        await app.init();
        cachedApp = app.getHttpAdapter().getInstance();
    }
    return cachedApp;
}

// Export the handler for Vercel
export default async (req: any, res: any) => {
    const app = await bootstrap();
    app(req, res);
};

// Local development
if (process.env.NODE_ENV !== 'production') {
    async function startLocal() {
        const app = await NestFactory.create(AppModule);

        app.enableCors({
            origin: (origin, callback) => {
                if (!origin) return callback(null, true);
                callback(null, true);
            },
            methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
            credentials: true,
            allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
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
            .addServer('https://lacosmicrocreditoapi.vercel.app/', 'Servidor de Produção')
            .addServer('http://localhost:3000', 'Servidor Local')
            .build();

        const document = SwaggerModule.createDocument(app, config);
        // Local setup doesn't strictly need CDN but it doesn't hurt
        SwaggerModule.setup('api', app, document);

        const port = process.env.PORT || 3000;
        await app.listen(port);
        console.log(`API rodando em http://localhost:${port}`);
    }
    // Only run listen if not on Vercel (Vercel sets some env vars, but checking NODE_ENV is common)
    // Actually Vercel environment usually has VERCEL=1
    if (!process.env.VERCEL) {
        startLocal();
    }
}
