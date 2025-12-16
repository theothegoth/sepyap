import { IsString, IsNotEmpty } from 'class-validator';

export class AdminCheckDto {
  @IsNotEmpty()
  @IsString()
  secret: string;
}

