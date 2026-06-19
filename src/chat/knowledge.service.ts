import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { Faq, FaqDocument } from './schemas/faq.schema';

@Injectable()
export class KnowledgeService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Faq.name) private readonly faqModel: Model<FaqDocument>,
  ) {}

  async buildSystemPrompt(userContext?: string, orderContext?: string): Promise<string> {
    const [products, faqs] = await Promise.all([
      this.productModel
        .find({ isAvailable: true })
        .select('name category basePrice sizeOptions toppingOptions description tag rating')
        .sort({ soldCount: -1 })
        .limit(50)
        .lean()
        .exec(),
      this.faqModel.find({ isActive: true }).select('question answer').lean().exec(),
    ]);

    const productList = products
      .map((p) => {
        const sizes = p.sizeOptions
          ?.map((s) => `${s.name}(+${s.extraPrice.toLocaleString('vi-VN')}đ)`)
          .join(', ');
        const toppings = p.toppingOptions
          ?.map((t) => `${t.name}(${t.price.toLocaleString('vi-VN')}đ)`)
          .join(', ');
        const baseInfo = `• ${p.name} [${p.category}] — Giá từ: ${p.basePrice.toLocaleString('vi-VN')}đ`;
        const sizeInfo = sizes ? `  Kích cỡ: ${sizes}` : '';
        const toppingInfo = toppings ? `  Topping: ${toppings}` : '';
        const tagInfo = p.tag ? `  Tag: ${p.tag}` : '';
        return [baseInfo, sizeInfo, toppingInfo, tagInfo].filter(Boolean).join('\n');
      })
      .join('\n');

    const faqList =
      faqs.length > 0
        ? faqs.map((f) => `Hỏi: ${f.question}\nĐáp: ${f.answer}`).join('\n\n')
        : 'Chưa có FAQ được cấu hình.';

    return `Bạn là trợ lý AI của cửa hàng đồ uống SummerSips. Hãy hỗ trợ khách hàng một cách thân thiện, ngắn gọn và chuyên nghiệp.

NGUYÊN TẮC:
- Chỉ trả lời dựa trên thông tin được cung cấp bên dưới. Không tự bịa thông tin.
- Trả lời bằng tiếng Việt, xưng "tôi" với khách hàng.
- Nếu không có thông tin phù hợp, hãy nói thật và đề nghị khách liên hệ cửa hàng.
- Câu trả lời ngắn gọn, tối đa 3-4 câu trừ khi cần liệt kê sản phẩm.
- Đừng lặp lại câu hỏi của khách.

THÔNG TIN CỬA HÀNG:
- Tên: SummerSips
- Chuyên: Cà Phê, Trà Sữa, Trà Trái Cây, Sinh Tố, Nước Ép
- Phí giao hàng: 20.000đ (miễn phí khi dùng coupon freeship)
- Thanh toán: COD khi nhận hàng
- Đổi trả: Liên hệ trong 30 phút sau khi nhận hàng nếu sản phẩm có vấn đề

DANH SÁCH SẢN PHẨM ĐANG BÁN:
${productList}

CÂU HỎI THƯỜNG GẶP (FAQ):
${faqList}

${userContext ? `THÔNG TIN KHÁCH HÀNG:\n${userContext}\n` : ''}
${orderContext ? `ĐƠN HÀNG CỦA KHÁCH:\n${orderContext}\n` : ''}`;
  }
}
