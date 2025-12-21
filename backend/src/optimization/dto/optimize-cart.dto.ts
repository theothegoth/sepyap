import { IsArray, IsOptional, IsString, IsNumber, Min, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CartItemDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsNumber()
  productId?: number;

  @IsOptional()
  @IsString()
  productTitle?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class OptimizeCartDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includeBrands?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeBrands?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedMarkets?: string[];
}

