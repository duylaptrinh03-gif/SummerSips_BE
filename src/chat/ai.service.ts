import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: Groq;
  private readonly model = 'llama-3.1-8b-instant';

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'GROQ_API_KEY chưa được cấu hình — chatbot sẽ không hoạt động',
      );
    }
    this.client = new Groq({ apiKey: apiKey ?? '' });
  }

  async chat(systemPrompt: string, messages: AiMessage[]): Promise<string> {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        ],
        max_tokens: 1024,
        temperature: 0.7,
      });

      return (
        completion.choices[0]?.message?.content ??
        'Xin lỗi, tôi chưa thể xử lý yêu cầu này.'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Lỗi gọi Groq API: ${msg}`);
      throw new ServiceUnavailableException(
        'Dịch vụ AI tạm thời không khả dụng, vui lòng thử lại sau.',
      );
    }
  }
}
