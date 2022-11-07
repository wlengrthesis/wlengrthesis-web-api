import { ForbiddenException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { Request } from 'express'
import { JwtPayload, JwtPayloadWithRefreshToken } from '../auth.model'

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_REFRESH_TOKEN_SECRET'),
      ignoreExpiration: false,
      passReqToCallback: true,
    })
  }

  validate(req: Request, payload: JwtPayload): JwtPayloadWithRefreshToken {
    const refresh_token = req?.get('authorization')?.replace('Bearer', '').trim()

    if (!refresh_token) throw new ForbiddenException('Refresh token malformed')

    return {
      ...payload,
      refresh_token,
    }
  }
}
