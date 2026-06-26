import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { OrderStatus } from './schemas/order.schema';

export interface OrderStatusUpdatedPayload {
  orderId: string;
  userId: string;
  oldStatus: OrderStatus;
  newStatus: OrderStatus;
  message: string;
  updatedAt: string;
}

export interface NewOrderPayload {
  orderId: string;
  customerName: string;
  totalPrice: number;
  itemCount: number;
  createdAt: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrdersGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth as { token?: string })?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.debug(`Client ${client.id} connected as guest (no token)`);
        return;
      }

      const payload = this.jwtService.verify<{
        sub: string;
        email: string;
        role?: string;
      }>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      client.data.userId = payload.sub;
      await client.join(`user_${payload.sub}`);
      this.logger.log(
        `Client ${client.id} authenticated → room user_${payload.sub}`,
      );

      // Admin join thêm room "admin" để nhận new_order events
      if (payload.role === 'admin') {
        await client.join('admin');
        this.logger.log(`Admin ${client.id} joined admin room`);
      }
    } catch {
      this.logger.warn(`Client ${client.id} sent invalid token`);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  /** Emit order_status_updated to the specific user's room */
  emitOrderStatusUpdated(
    userId: string,
    payload: OrderStatusUpdatedPayload,
  ): void {
    this.server.to(`user_${userId}`).emit('order_status_updated', payload);
  }

  /** Emit new_order đến tất cả admin đang online */
  emitNewOrder(payload: NewOrderPayload): void {
    this.server.to('admin').emit('new_order', payload);
  }
}
