import { MinLength } from 'class-validator';
export class TextDTO {
  @MinLength(200, {
    message: 'The provided text is too short for the model to make an effective prediction',
  })
  text: string;
}
