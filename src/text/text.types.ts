import { IsNotEmpty, IsString, IsNumber } from 'class-validator';
export class TextDto {
  @IsNotEmpty()
  @IsNumber()
  textId: number;

  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @IsString()
  text: string;

  @IsString()
  sentiment: string;

  @IsString()
  probability: string;
}
