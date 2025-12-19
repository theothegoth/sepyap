import { Controller, Post, Get, Body, Query, Logger, BadRequestException, Options, Header, Res, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response, Request } from 'express';
import { IngestService } from './ingest.service';

@Controller('api/ingest')
export class IngestController {
  private readonly logger = new Logger(IngestController.name);

  constructor(private readonly ingestService: IngestService) {}

  @Options()
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS')
  @Header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Requested-With')
  @Header('Access-Control-Max-Age', '86400')
  handleOptions(@Res() res: Response) {
    return res.status(204).send();
  }

  @Post()
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS')
  @Header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Requested-With')
  @Header('Access-Control-Allow-Credentials', 'true')
  @Throttle({ default: { limit: 100, ttl: 60000 } }) // Max 100 requests per minute per IP
  async ingest(@Body() payload: { market: string; items: any[] }, @Req() req: Request) {
    const { market, items } = payload;
    
    if (!items || !Array.isArray(items)) {
       this.logger.warn('Invalid payload received');
       throw new BadRequestException('No items provided');
    }

    // Limit batch size to prevent abuse (raised to handle large product pages)
    const MAX_BATCH_SIZE = 2000;
    if (items.length > MAX_BATCH_SIZE) {
      this.logger.warn(`Batch size ${items.length} exceeds maximum ${MAX_BATCH_SIZE}`);
      throw new BadRequestException(`Batch size cannot exceed ${MAX_BATCH_SIZE} items`);
    }

    this.logger.log(`Received ${items.length} products from ${market}`);
    
    const result = await this.ingestService.processIngestedProducts(items);
    
    return { success: true, count: items.length, result };
  }

  @Get('debug')
  async debug(@Query('limit') limit?: string, @Query('market') market?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 5000; // Increased to 5000
    return this.ingestService.getRecentProducts(limitNum, market);
  }

  @Get('stats')
  async stats() {
    return this.ingestService.getProductStats();
  }
}
