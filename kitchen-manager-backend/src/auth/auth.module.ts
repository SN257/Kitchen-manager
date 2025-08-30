import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || '85bcefb58a118fb044a5a88f867afa083a024d21ac15aa2678d6dd13ad98f255460688cbd263d75e8614e2a2ee818c02ff9fa93b50b99b74dd170d120ba9d7e4', // Prefer env in production
      signOptions: { expiresIn: '30d' },
    }),
  ],
  providers: [AuthService],
  exports: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
