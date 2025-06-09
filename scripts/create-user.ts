import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { UserService } from '../src/user/user.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userService = app.get(UserService);

  // Add your new user here
  await userService.create({
    username: 'Sid_258',
    password: 'SMVS@258',
    role: 'admin',
    center: 'Ghanshyamnagar',
  });

  console.log('User created');
  await app.close();
}
bootstrap();