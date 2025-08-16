import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/users.entity';
import { ActivityLog } from '../entities/activity-log.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(ActivityLog)
    private activityLogRepository: Repository<ActivityLog>,
  ) {}

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOneBy({ username });
    if (user && await bcrypt.compare(password, user.password)) {
      return user;
    }
    return null;
  }

  async create(data: Partial<User>) {
    if (!data.password) {
      throw new Error('Password is required');
    }
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = this.userRepository.create({ ...data, password: hashedPassword });
    return this.userRepository.save(user);
  }

  async findById(id: number) {
    return this.userRepository.findOne({ where: { id } });
  }

  async getAllCenterAdminsCenters(): Promise<string[]> {
    const users = await this.userRepository.find({
      where: { role: 'center-admin' },
      select: ['center'],
    });

    // Extract unique centers
    const uniqueCenters = Array.from(new Set(users.map(user => user.center)));
    return uniqueCenters;
  }

  async updateProfile(userId: number, data: { username: string }) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check if username is already taken by another user
    if (data.username !== user.username) {
      const existingUser = await this.userRepository.findOne({ where: { username: data.username } });
      if (existingUser && existingUser.id !== userId) {
        throw new Error('Username already exists');
      }
    }
    
    const oldUsername = user.username;
    
    user.username = data.username;
    
    const updatedUser = await this.userRepository.save(user);
    
    // Log the activity
    if (oldUsername !== data.username) {
      await this.logActivity(userId, 'Profile Updated', `Updated: Username: ${oldUsername} → ${data.username}`);
    }
    
    return updatedUser;
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await this.userRepository.update(userId, { password: hashedNewPassword });

    // Log the activity
    await this.activityLogRepository.save({
      userId,
      action: 'Password Changed',
      details: 'Password updated successfully',
      createdAt: new Date()
    });

    return { message: 'Password changed successfully' };
  }

  async getActivityLogs(userId: number) {
    return this.activityLogRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50 // Limit to last 50 activities
    });
  }

  async logActivity(userId: number, action: string, details: string) {
    return this.activityLogRepository.save({
      userId,
      action,
      details,
      createdAt: new Date()
    });
  }

  async deleteActivityLog(userId: number, logId: number) {
    const log = await this.activityLogRepository.findOne({
      where: { id: logId, userId }
    });
    
    if (!log) {
      throw new NotFoundException('Activity log not found');
    }
    
    await this.activityLogRepository.remove(log);
    return { message: 'Activity log deleted successfully' };
  }

  async clearAllActivityLogs(userId: number) {
    await this.activityLogRepository.delete({ userId });
    return { message: 'All activity logs cleared successfully' };
  }
}
