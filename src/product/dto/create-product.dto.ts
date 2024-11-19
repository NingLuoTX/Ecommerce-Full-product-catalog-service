import { IsString, IsNumber, IsBoolean, IsUUID } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsNumber()
  price: number;

  @IsString()
  sku: string;

  @IsBoolean()
  inStock: boolean;

  @IsUUID()
  categoryId: string;
}
