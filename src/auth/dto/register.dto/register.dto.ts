import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Tên người dùng' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'user@example.com', description: 'Email của người dùng' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'Mật khẩu (ít nhất 6 ký tự)' })
  @IsString()
  @MinLength(6)
  password: string;
}
