import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Không throw nếu không có token — guest checkout vẫn được phép
  handleRequest<TUser>(_err: unknown, user: TUser): TUser {
    return user;
  }
}
