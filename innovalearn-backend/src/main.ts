import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  // 👇 Tell Nest this is an Express-based app
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 🔹 Enable CORS so React frontend can call backend
  app.enableCors({
    origin: 'http://localhost:5173', // your React dev server URL
    credentials: true,               // allow cookies (optional)
  });

  // 🔹 Serve uploads folder statically
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads', // optional: access via /uploads/filename
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Backend running on port ${process.env.PORT ?? 3000}`);
}
bootstrap();
