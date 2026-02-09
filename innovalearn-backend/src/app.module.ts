import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { TestController } from './test/test.controller';
import { FormationModule } from './formation/formation.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 👈 THIS is important
    }),
    PrismaModule,
    UserModule,
    AuthModule,
    FormationModule,
    AdminModule,
  ],
  controllers: [TestController],
  providers: [AppService],
})
export class AppModule {}
