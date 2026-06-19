import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(
    name: string,
    email: string,
    password: string,
  ): Promise<UserDocument> {
    const exists = await this.userModel.findOne({ email });
    if (exists) throw new ConflictException('Email already in use');

    const hashed = await bcrypt.hash(password, 10);
    return this.userModel.create({ name, email, password: hashed });
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email });
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('-password').exec();
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(id, { $set: dto }, { returnDocument: 'after' })
      .select('-password')
      .exec();
  }
}
