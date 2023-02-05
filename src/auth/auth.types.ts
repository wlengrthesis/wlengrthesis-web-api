import { IsNotEmpty, IsString, ValidateIf } from 'class-validator';

export type Role = 'SUPERADMIN' | 'ADMIN' | 'USER';
export class UserDto {
  @IsNotEmpty()
  @IsString()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsString()
  @ValidateIf((_object, value) => value !== null)
  firstName: string | null = null;
  @IsString()
  @ValidateIf((_object, value) => value !== null)
  lastName: string | null = null;
}

export type Tokens = {
  access_token: string;
  refresh_token: string;
};

export type UserSignIn = {
  id: number;
  firstName: string;
  lastName: string;
} & Tokens;

export type UserSignUp = {
  id: number;
} & Tokens;

export type JwtPayload = {
  sub: number;
  email: string;
  role: Role;
};

export type JwtPayloadWithRefreshToken = JwtPayload & Pick<Tokens, 'refresh_token'>;
