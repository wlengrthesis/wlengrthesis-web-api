import { ForbiddenException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import * as argon from 'argon2'
import { randomBytes } from 'crypto'
import { AuthDto, Tokens, JwtPayload } from './auth.types'
import { UserService } from './../user/user.service'

@Injectable()
export class AuthService {
  private readonly hashingConfig = {
    // based on OWASP recommendations (as of March, 2022)
    parallelism: 1,
    memoryCost: 64000, // 64 mb
    timeCost: 3, // number of iterations
  } as const

  constructor(private config: ConfigService, private jwtService: JwtService, private userService: UserService) {}

  private async getTokens(userId: number, email: string): Promise<Tokens> {
    const jwtPayload: JwtPayload = {
      sub: userId,
      email: email,
    }

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(jwtPayload, {
        secret: this.config.get<string>('JWT_ACCESS_TOKEN_SECRET'),
        expiresIn: '10m',
      }),
      this.jwtService.signAsync(jwtPayload, {
        secret: this.config.get<string>('JWT_REFRESH_TOKEN_SECRET'),
        expiresIn: '2d',
      }),
    ])

    return {
      access_token,
      refresh_token,
    }
  }

  private async updateRefreshTokenHash(userId: number, refreshToken: string): Promise<void> {
    const hashedRefreshToken = await argon.hash(refreshToken, {
      ...this.hashingConfig,
      salt: randomBytes(16),
    })

    await this.userService.updateRefreshToken(userId, hashedRefreshToken)
  }

  async signUpLocal(dto: AuthDto): Promise<Tokens> {
    const hashedPassword = await argon.hash(dto.password, {
      ...this.hashingConfig,
      salt: randomBytes(16),
    })

    const { id, email } = await this.userService.create(dto.email, hashedPassword)

    const tokens = await this.getTokens(id, email)
    await this.updateRefreshTokenHash(id, tokens.refresh_token)

    return tokens
  }

  async signInLocal({ email, password }: AuthDto): Promise<Tokens> {
    const user = await this.userService.getOneByEmail(email)

    if (!user) throw new ForbiddenException('Access Denied')

    const passwordMatches = await argon.verify(user.hashedPassword, password)
    if (!passwordMatches) throw new ForbiddenException('Access Denied')

    const tokens = await this.getTokens(user.id, user.email)
    await this.updateRefreshTokenHash(user.id, tokens.refresh_token)

    return tokens
  }

  async logout(userId: number): Promise<boolean> {
    await this.userService.clearRefreshToken(userId)
    return true
  }

  async refreshTokens(userId: number, refreshToken: string): Promise<Tokens> {
    const user = await this.userService.getOneById(userId)
    if (!user || !user.hashedRefreshToken) throw new ForbiddenException('Access Denied')

    const refreshTokensMatches = await argon.verify(user.hashedRefreshToken, refreshToken)
    if (!refreshTokensMatches) throw new ForbiddenException('Access Denied')

    const tokens = await this.getTokens(user.id, user.email)
    await this.updateRefreshTokenHash(user.id, tokens.refresh_token)

    return tokens
  }
}