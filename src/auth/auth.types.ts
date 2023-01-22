import { IsNotEmpty, IsString } from 'class-validator';

export class AuthDto {
  @IsNotEmpty()
  @IsString()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}

export type Tokens = {
  access_token: string;
  refresh_token: string;
};

export type JwtPayload = {
  sub: number;
  email: string;
  role: Role;
};

export type JwtPayloadWithRefreshToken = JwtPayload & Pick<Tokens, 'refresh_token'>;

export type Role = 'SUPERADMIN' | 'ADMIN' | 'USER';
