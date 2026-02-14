import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🔹 Enable CORS so React frontend can call backend
  app.enableCors({
    origin: 'http://localhost:5173', // your React dev server URL
    credentials: true,               // allow cookies (optional)
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Backend running on port ${process.env.PORT ?? 3000}`);
}
bootstrap();
