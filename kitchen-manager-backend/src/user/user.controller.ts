import { Controller, Post, Body, Req, UnauthorizedException, Get } from '@nestjs/common';
import { Request } from 'express';
import { UserService } from './user.service';
import { AuthService } from '../auth/auth.service';
import { Session } from 'express-session'; // Add this import

interface CustomSession extends Session {
  userId?: number;
  username?: string;
  role?: string;
  center?: string;
}

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) { }

  @Post('login')
  async login(
    @Body() body: { username: string; password: string },
    @Req() req: Request & { session: CustomSession },
  ) {
    const user = await this.userService.validateUser(body.username, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    req.session.center = user.center;
    const result = await this.authService.login(user);
    return {
      ...result,
      username: user.username,
      user: {
        id: user.id,
        username: user.username,
        center: user.center,
        role: user.role,
      }
    };
  }

  @Post('register')
  async register(
    @Body()
    body: {
      username: string;
      password: string;
      role: string;
      center: string;
    },
  ) {
    return this.userService.create(body);
  }

  @Post('logout')
  async logout(@Req() req: Request) {
    req.session.destroy(() => { });
    return { message: 'Logged out' };
  }

  @Get('me')
  async getMe(@Req() req: Request & { session: CustomSession }) {
    if (!req.session.userId) {
      throw new UnauthorizedException('Not logged in');
    }
    const user = await this.userService.findById(req.session.userId);
    if (!user) throw new UnauthorizedException('User not found');
    return {
      id: user.id,
      username: user.username,
      center: user.center,
      role: user.role,
    };
  }

  @Get('center')
  async getCenters(@Req() req: Request & { session: any }) {
    const { userId, role } = req.session;
    if (!userId || role !== 'sant') throw new UnauthorizedException();

    return this.userService.getAllCenterAdminsCenters();
  }
}