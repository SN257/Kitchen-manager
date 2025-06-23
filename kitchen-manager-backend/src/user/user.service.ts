import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/users.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
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
}