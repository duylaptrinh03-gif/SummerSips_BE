import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';

interface AuthenticatedSocket extends Socket {
  data: {
    userId?: string;
    userEmail?: string;
    userName?: string;
  };
}

@WebSocketGateway({
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly chatService: ChatService,
  ) {}

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const token =
        (client.handshake.auth as { token?: string })?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) return;

      const payload = this.jwtService.verify<{
        sub: string;
        email: string;
        name?: string;
      }>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      client.data.userId = payload.sub;
      client.data.userEmail = payload.email;
      client.data.userName = payload.name;
    } catch {
      // Guest connection — no user data
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    this.logger.debug(`Chat client disconnected: ${client.id}`);
  }

  @SubscribeMessage('chat_message')
  async handleChatMessage(
    @MessageBody() dto: CreateMessageDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    const { userId, userEmail, userName } = client.data;

    // Phát typing indicator
    client.emit('bot_typing', { conversationId: dto.conversationId ?? null });

    try {
      const result = await this.chatService.sendMessage(
        dto,
        userId,
        userEmail,
        userName,
      );

      client.emit('message_received', {
        conversationId: result.conversationId,
        content: result.answer,
        role: 'assistant',
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      client.emit('chat_error', {
        message: 'Có lỗi xảy ra, vui lòng thử lại.',
      });
      this.logger.error('Chat gateway error:', err);
    }
  }
}
