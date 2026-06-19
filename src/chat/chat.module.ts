import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { AiService } from './ai.service';
import { KnowledgeService } from './knowledge.service';
import { Conversation, ConversationSchema } from './schemas/conversation.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import { Faq, FaqSchema } from './schemas/faq.schema';
import { AuthModule } from '../auth/auth.module';
import { ProductsModule } from '../products/products.module';
import { Order, OrderSchema } from '../orders/schemas/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
      { name: Faq.name, schema: FaqSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    AuthModule,
    ProductsModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, AiService, KnowledgeService],
})
export class ChatModule {}
