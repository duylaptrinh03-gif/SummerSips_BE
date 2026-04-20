import { IsEnum } from 'class-validator';
import { OrderStatus } from '../schemas/order.schema';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus, {
    message: `status phải là một trong các giá trị: ${Object.values(OrderStatus).join(', ')}`,
  })
  status: OrderStatus;
}
