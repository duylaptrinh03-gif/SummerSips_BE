import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Conversation,
  ConversationDocument,
} from './schemas/conversation.schema';
import { Message, MessageDocument } from './schemas/message.schema';
import { Faq, FaqDocument } from './schemas/faq.schema';
import { AiService, AiMessage } from './ai.service';
import { KnowledgeService } from './knowledge.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { Order, OrderDocument } from '../orders/schemas/order.schema';

const ORDER_KEYWORDS = [
  'đơn hàng',
  'order',
  'ORD-',
  'đặt hàng',
  'đang giao',
  'trạng thái',
  'shipper',
  'giao chưa',
  'theo dõi',
  'kiểm tra đơn',
];

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    @InjectModel(Faq.name)
    private readonly faqModel: Model<FaqDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    private readonly aiService: AiService,
    private readonly knowledgeService: KnowledgeService,
  ) {}

  // ─── Send message ──────────────────────────────────────────────────────────

  async sendMessage(
    dto: CreateMessageDto,
    userId?: string,
    userEmail?: string,
    userName?: string,
  ): Promise<{ answer: string; conversationId: string }> {
    // 1. Lấy hoặc tạo conversation
    let conversation: ConversationDocument | null = null;

    if (dto.conversationId) {
      conversation = await this.conversationModel
        .findById(dto.conversationId)
        .exec();

      // Bảo mật: nếu conversation thuộc user khác thì từ chối
      if (
        conversation &&
        conversation.userId &&
        userId &&
        conversation.userId !== userId
      ) {
        throw new ForbiddenException('Không có quyền truy cập cuộc hội thoại này');
      }
    }

    if (!conversation) {
      conversation = await this.conversationModel.create({
        userId: userId ?? null,
      });
    }

    const convId = conversation._id.toString();

    // 2. Lưu tin nhắn của user
    await this.messageModel.create({
      conversationId: convId,
      role: 'user',
      content: dto.message,
    });

    // 3. Tải lịch sử hội thoại (tối đa 20 tin nhắn gần nhất)
    const history = await this.messageModel
      .find({ conversationId: convId })
      .sort({ createdAt: 1 })
      .limit(20)
      .lean()
      .exec();

    // 4. Build context
    const userContext = userId
      ? `Khách đã đăng nhập — Tên: ${userName ?? 'N/A'}, Email: ${userEmail ?? 'N/A'}`
      : 'Khách chưa đăng nhập (guest).';

    let orderContext = '';
    if (userId && this.isOrderQuery(dto.message)) {
      const orders = await this.orderModel
        .find({ userId })
        .sort({ orderedAt: -1 })
        .limit(5)
        .lean()
        .exec();

      orderContext = this.buildOrderContext(orders as OrderDocument[]);
    }

    const systemPrompt = await this.knowledgeService.buildSystemPrompt(
      userContext,
      orderContext,
    );

    // 5. Build messages array cho AI (không bao gồm tin nhắn vừa lưu để tránh trùng)
    const aiMessages: AiMessage[] = history.slice(0, -1).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
    aiMessages.push({ role: 'user', content: dto.message });

    // 6. Gọi AI
    const answer = await this.aiService.chat(systemPrompt, aiMessages);

    // 7. Lưu phản hồi của AI
    await this.messageModel.create({
      conversationId: convId,
      role: 'assistant',
      content: answer,
    });

    return { answer, conversationId: convId };
  }

  // ─── Get conversation history ──────────────────────────────────────────────

  async getHistory(
    conversationId: string,
    userId?: string,
  ): Promise<MessageDocument[]> {
    const conversation = await this.conversationModel
      .findById(conversationId)
      .exec();

    if (!conversation) {
      throw new NotFoundException('Cuộc hội thoại không tồn tại');
    }

    if (
      conversation.userId &&
      userId &&
      conversation.userId !== userId
    ) {
      throw new ForbiddenException('Không có quyền truy cập');
    }

    return this.messageModel
      .find({ conversationId })
      .sort({ createdAt: 1 })
      .exec();
  }

  // ─── Get my history (user đang login) ─────────────────────────────────────

  async getMyHistory(
    userId: string,
  ): Promise<{ conversationId: string | null; messages: MessageDocument[] }> {
    const conversation = await this.conversationModel
      .findOne({ userId })
      .sort({ createdAt: -1 })
      .exec();

    if (!conversation) {
      return { conversationId: null, messages: [] };
    }

    const convId = conversation._id.toString();
    const messages = await this.messageModel
      .find({ conversationId: convId })
      .sort({ createdAt: 1 })
      .exec();

    return { conversationId: convId, messages };
  }

  // ─── Admin: list conversations ─────────────────────────────────────────────

  async findAllConversations(): Promise<
    (ConversationDocument & { messageCount: number; lastMessage?: string })[]
  > {
    const conversations = await this.conversationModel
      .find()
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const enriched = await Promise.all(
      conversations.map(async (c) => {
        const convId = c._id.toString();
        const [count, last] = await Promise.all([
          this.messageModel.countDocuments({ conversationId: convId }),
          this.messageModel
            .findOne({ conversationId: convId, role: 'user' })
            .sort({ createdAt: -1 })
            .select('content createdAt')
            .lean(),
        ]);
        return {
          ...c,
          messageCount: count,
          lastMessage: last?.content ?? '',
        };
      }),
    );

    return enriched as (ConversationDocument & {
      messageCount: number;
      lastMessage?: string;
    })[];
  }

  // ─── Admin: get conversation with messages ─────────────────────────────────

  async findConversationWithMessages(
    conversationId: string,
  ): Promise<{
    conversation: ConversationDocument;
    messages: MessageDocument[];
  }> {
    const conversation = await this.conversationModel
      .findById(conversationId)
      .exec();

    if (!conversation) {
      throw new NotFoundException('Cuộc hội thoại không tồn tại');
    }

    const messages = await this.messageModel
      .find({ conversationId })
      .sort({ createdAt: 1 })
      .exec();

    return { conversation, messages };
  }

  // ─── FAQ CRUD ──────────────────────────────────────────────────────────────

  async createFaq(dto: CreateFaqDto): Promise<FaqDocument> {
    return this.faqModel.create(dto);
  }

  async findAllFaqs(): Promise<FaqDocument[]> {
    return this.faqModel.find().sort({ createdAt: -1 }).exec();
  }

  async updateFaq(id: string, dto: UpdateFaqDto): Promise<FaqDocument> {
    const faq = await this.faqModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .exec();
    if (!faq) throw new NotFoundException('FAQ không tồn tại');
    return faq;
  }

  async deleteFaq(id: string): Promise<void> {
    const result = await this.faqModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('FAQ không tồn tại');
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private isOrderQuery(message: string): boolean {
    const lower = message.toLowerCase();
    return ORDER_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  }

  private buildOrderContext(orders: OrderDocument[]): string {
    if (!orders.length) {
      return 'Khách hàng chưa có đơn hàng nào.';
    }

    return orders
      .map((o) => {
        const statusMap: Record<string, string> = {
          pending: 'Chờ xác nhận',
          preparing: 'Đang pha chế',
          delivering: 'Đang giao hàng',
          completed: 'Đã hoàn thành',
          cancelled: 'Đã hủy',
        };
        const items = (o.items ?? [])
          .slice(0, 3)
          .map((i: { name: string; quantity: number }) => `${i.name} x${i.quantity}`)
          .join(', ');
        return `Mã đơn: ${o.orderId} | Trạng thái: ${statusMap[o.status] ?? o.status} | Sản phẩm: ${items} | Tổng: ${o.totalPrice?.toLocaleString('vi-VN')}đ`;
      })
      .join('\n');
  }
}
