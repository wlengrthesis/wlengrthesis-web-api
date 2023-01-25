import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { UserDto, Tokens } from './auth.types';
import { AuthService } from './auth.service';
import { AllowUnauthorizedRequest, GetCurrentUser } from './decorators';
import { RefreshTokenGuard } from './guards';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @AllowUnauthorizedRequest()
  @Post('local/signup')
  @HttpCode(HttpStatus.CREATED)
  signUpLocal(@Body() dto: UserDto): Promise<Tokens> {
    return this.authService.signUpLocal(dto);
  }

  @AllowUnauthorizedRequest()
  @Post('local/signin')
  @HttpCode(HttpStatus.OK)
  signInLocal(@Body() dto: UserDto): Promise<Tokens> {
    return this.authService.signInLocal(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@GetCurrentUser('sub') userId: number): Promise<boolean> {
    return this.authService.logout(userId);
  }

  @AllowUnauthorizedRequest() // bypass global guard - AccessTokenGuard
  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refreshTokens(
    @GetCurrentUser('sub') userId: number,
    @GetCurrentUser('refresh_token') refreshToken: string
  ): Promise<Tokens> {
    return this.authService.refreshTokens(userId, refreshToken);
  }
}
