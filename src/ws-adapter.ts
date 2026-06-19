import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { INestApplicationContext } from '@nestjs/common';

/**
 * Custom Socket.IO adapter để kiểm soát CORS đúng cách.
 * Lý do: options trong @WebSocketGateway không đảm bảo được apply
 * khi IoAdapter mặc định khởi tạo server trước khi CORS được setup.
 */
export class SocketIoAdapter extends IoAdapter {
  constructor(app: INestApplicationContext) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim());

    return super.createIOServer(port, {
      ...options,
      cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });
  }
}
