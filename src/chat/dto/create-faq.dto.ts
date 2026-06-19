import { IsString, IsNotEmpty, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFaqDto {
  @ApiProperty({ description: 'Câu hỏi', example: 'Cửa hàng giao hàng khu vực nào?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  question: string;

  @ApiProperty({ description: 'Câu trả lời', example: 'Chúng tôi giao hàng toàn nội thành TP.HCM.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  answer: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
