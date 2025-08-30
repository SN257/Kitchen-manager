import {
  Controller,
  Post,
  Body,
  Req,
  UnauthorizedException,
  Get,
  Put,
  Delete,
  Param,
} from '@nestjs/common';
import { Request } from 'express';
import { UserService } from './user.service';
import { AuthService } from '../auth/auth.service';
import { Session } from 'express-session';

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
  ) {}

  @Post('login')
  async login(
    @Body() body: { username: string; password: string },
    @Req() req: Request & { session: CustomSession },
  ) {
    const user = await this.userService.validateUser(
      body.username,
      body.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    // Set session data
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    req.session.center = user.center;

    // Log login activity - create activity log entry directly
    await this.userService.getActivityLogs(user.id); // This will ensure the repository is available
    // Actually log the activity by creating a new entry
    const activityLogRepository = this.userService['activityLogRepository'];
    await activityLogRepository.save({
      userId: user.id,
      action: 'Login',
      details: 'Successful login',
      createdAt: new Date(),
    });

    // Force session save and then issue JWT
    return new Promise((resolve, reject) => {
      req.session.save(async (err) => {
        if (err) {
          console.error('Session save error:', err);
          reject(new Error('Session save failed'));
          return;
        }
        try {
          // Issue JWT after session is persisted
          const result = await this.authService.login(user);
          resolve({
            ...result,
            username: user.username,
            user: {
              id: user.id,
              username: user.username,
              center: user.center,
              role: user.role,
            },
          });
        } catch (e) {
          reject(e);
        }
      });
    });
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
    req.session.destroy(() => {});
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

  @Put('profile')
  async updateProfile(
    @Body() body: { username: string },
    @Req() req: Request & { session: CustomSession },
  ) {
    if (!req.session.userId) {
      throw new UnauthorizedException('Not logged in');
    }

    const updatedUser = await this.userService.updateProfile(
      req.session.userId,
      body,
    );

    // Update session data
    req.session.username = updatedUser.username;

    return {
      id: updatedUser.id,
      username: updatedUser.username,
      center: updatedUser.center,
      role: updatedUser.role,
    };
  }

  @Put('change-password')
  async changePassword(
    @Body() body: { currentPassword: string; newPassword: string },
    @Req() req: Request & { session: CustomSession },
  ) {
    if (!req.session.userId) {
      throw new UnauthorizedException('Not logged in');
    }

    await this.userService.changePassword(
      req.session.userId,
      body.currentPassword,
      body.newPassword,
    );

    return { message: 'Password changed successfully' };
  }

  @Get('activity-logs')
  async getActivityLogs(@Req() req: Request & { session: CustomSession }) {
    if (!req.session.userId) {
      throw new UnauthorizedException('Not logged in');
    }

    return this.userService.getActivityLogs(req.session.userId);
  }

  @Delete('activity-logs/:id')
  async deleteActivityLog(
    @Param('id') id: string,
    @Req() req: Request & { session: CustomSession },
  ) {
    if (!req.session.userId) {
      throw new UnauthorizedException('Not logged in');
    }

    return this.userService.deleteActivityLog(req.session.userId, parseInt(id));
  }

  @Delete('activity-logs')
  async clearAllActivityLogs(@Req() req: Request & { session: CustomSession }) {
    if (!req.session.userId) {
      throw new UnauthorizedException('Not logged in');
    }

    return this.userService.clearAllActivityLogs(req.session.userId);
  }
}
