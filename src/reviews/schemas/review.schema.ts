import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ReviewDocument = HydratedDocument<Review>;

@Schema({ timestamps: true })
export class Review {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  userName: string;

  @Prop({ default: '🧑' })
  userAvatar: string;

  @Prop({ required: true, index: true })
  drinkId: string;

  @Prop({ required: true })
  drinkName: string;

  // orderId là MongoDB _id của Order (string)
  @Prop({ required: true })
  orderId: string;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ default: '', maxlength: 500 })
  comment: string;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

ReviewSchema.index({ drinkId: 1, createdAt: -1 });
ReviewSchema.index({ userId: 1, drinkId: 1, orderId: 1 }, { unique: true });
