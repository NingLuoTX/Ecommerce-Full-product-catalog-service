import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KafkaService } from '../kafka/kafka.service';
import { Product } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CustomLoggerService } from '../logging/logging.service';
import { MetricsService } from '../metrics/metrics.service';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class ProductService {
  constructor(
    private prisma: PrismaService,
    private kafkaService: KafkaService,
    @Inject('Logger') private logger: CustomLoggerService,
    private metricsService: MetricsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(data: CreateProductDto): Promise<Product> {
    try {
      const product = await this.prisma.product.create({ data });
      await this.kafkaService.emit('product_created', product);
      this.logger.log(`Product created: ${product.id}`, 'ProductService');
      this.metricsService.incrementProductCreation();

      await this.kafkaService.emit('product_created', {
        id: product.id,
        name: product.name,
      });

      return product;
    } catch (error) {
      this.logger.error(
        `Failed to create product: ${error.message}`,
        error.stack,
        'ProductService',
      );
      throw error;
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ products: Product[]; total: number }> {
    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({ skip, take: limit }),
      this.prisma.product.count(),
    ]);
    return { products, total };
  }

  async findOne(id: string): Promise<Product> {
    const cachedProduct = await this.cacheManager.get<Product>(`product:${id}`);
    if (cachedProduct) {
      return cachedProduct;
    }

    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    await this.cacheManager.set(`product:${id}`, product, 3600); // Cache for 1 hour
    return product;
  }

  async update(id: string, data: UpdateProductDto): Promise<Product> {
    const product = this.prisma.product.update({ where: { id }, data });
    await this.kafkaService.emit('product_updated', product);
    return product;
  }

  async remove(id: string): Promise<Product> {
    return this.prisma.product.delete({ where: { id } });
  }

  async search(
    query: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ products: Product[]; total: number }> {
    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        skip,
        take: limit,
      }),
      this.prisma.product.count({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
      }),
    ]);
    return { products, total };
  }
}
