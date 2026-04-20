import { IsEnum } from 'class-validator';
import { TrangThaiDonHang } from '../schemas/order.schema';

export class UpdateOrderStatusDto {
  @IsEnum(TrangThaiDonHang, {
    message: `trangThai phải là một trong các giá trị: ${Object.values(TrangThaiDonHang).join(', ')}`,
  })
  trangThai: TrangThaiDonHang;
}
