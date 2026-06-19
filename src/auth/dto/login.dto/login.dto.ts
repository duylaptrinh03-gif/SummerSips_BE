import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email của người dùng' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'Mật khẩu' })
  @IsString()
  password: string;
}
