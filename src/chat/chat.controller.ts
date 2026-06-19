import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/schemas/user.schema';

interface RequestWithUser extends Request {
  user?: { userId: string; email: string; name?: string };
}

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ─── POST /chat/message ────────────────────────────────────────────────────

  @Post('message')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Gửi tin nhắn và nhận phản hồi AI' })
  async sendMessage(
    @Body() dto: CreateMessageDto,
    @Request() req: RequestWithUser,
  ) {
    const user = req.user;
    return this.chatService.sendMessage(
      dto,
      user?.userId,
      user?.email,
      user?.['name'],
    );
  }

  // ─── GET /chat/my-history ─────────────────────────────────────────────────

  @Get('my-history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy conversation mới nhất + messages của user đang login' })
  async getMyHistory(@Request() req: RequestWithUser) {
    return this.chatService.getMyHistory(req.user!.userId);
  }

  // ─── GET /chat/history/:conversationId ────────────────────────────────────

  @Get('history/:conversationId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Lịch sử hội thoại' })
  async getHistory(
    @Param('conversationId') conversationId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.chatService.getHistory(conversationId, req.user?.userId);
  }

  // ─── Admin: GET /chat/conversations ───────────────────────────────────────

  @Get('conversations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Danh sách tất cả cuộc hội thoại' })
  async findAllConversations() {
    return this.chatService.findAllConversations();
  }

  // ─── Admin: GET /chat/conversations/:id ───────────────────────────────────

  @Get('conversations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Chi tiết cuộc hội thoại kèm tin nhắn' })
  async findConversationWithMessages(@Param('id') id: string) {
    return this.chatService.findConversationWithMessages(id);
  }

  // ─── Admin FAQ CRUD ────────────────────────────────────────────────────────

  @Get('faq')
  @ApiOperation({ summary: 'Danh sách FAQ' })
  async findAllFaqs() {
    return this.chatService.findAllFaqs();
  }

  @Post('faq')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Tạo FAQ mới' })
  async createFaq(@Body() dto: CreateFaqDto) {
    return this.chatService.createFaq(dto);
  }

  @Patch('faq/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Cập nhật FAQ' })
  async updateFaq(@Param('id') id: string, @Body() dto: UpdateFaqDto) {
    return this.chatService.updateFaq(id, dto);
  }

  @Delete('faq/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Xóa FAQ' })
  async deleteFaq(@Param('id') id: string) {
    await this.chatService.deleteFaq(id);
    return { message: 'Đã xóa FAQ' };
  }
}
