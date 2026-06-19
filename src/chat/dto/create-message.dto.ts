import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiProperty({ description: 'Tin nhắn của người dùng', example: 'Cho tôi xem menu trà sữa' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional({ description: 'ID cuộc hội thoại (bỏ trống để tạo mới)' })
  @IsOptional()
  @IsString()
  conversationId?: string;
}
