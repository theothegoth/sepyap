import { Controller, Post, Get, Body, Param, Logger, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { OptimizationService } from './optimization.service';
import { OptimizeCartDto } from './dto/optimize-cart.dto';
import { AdminCheckDto } from './dto/admin-check.dto';

@Controller('api/optimize')
@UseGuards(ThrottlerGuard) // Rate limiting
export class OptimizationController {
  private readonly logger = new Logger(OptimizationController.name);

  constructor(private readonly optimizationService: OptimizationService) {}

  @Post()
  async optimizeCart(@Body() payload: OptimizeCartDto) {
    this.logger.log(`Optimizing cart with ${payload.items.length} items.`);
    const includeBrands = payload.includeBrands || [];
    const excludeBrands = payload.excludeBrands || [];
    const allowedMarkets = payload.allowedMarkets || [];

    const result = await this.optimizationService.findCheapestCart(
      payload.items,
      includeBrands,
      excludeBrands,
      allowedMarkets,
    );
    return result;
  }
}

@Controller('api/products')
export class ProductComparisonController {
  private readonly logger = new Logger(ProductComparisonController.name);

  constructor(private readonly optimizationService: OptimizationService) {}

  @Get(':productId/compare')
  @UseGuards(ThrottlerGuard) // Rate limiting
  async compareProduct(@Param('productId', ParseIntPipe) productId: number) {
    this.logger.log(`Comparing prices for Product ID ${productId}`);
    return this.optimizationService.compareProductPrices(productId);
  }
}

@Controller('api/markets')
@UseGuards(ThrottlerGuard) // Rate limiting
export class MarketsController {
  private readonly logger = new Logger(MarketsController.name);

  constructor(private readonly optimizationService: OptimizationService) {}

  @Get()
  async getAll() {
    this.logger.log('Fetching all markets');
    return this.optimizationService.getAllMarkets();
  }
}

@Controller('api/admin')
@UseGuards(ThrottlerGuard) // Rate limiting
export class AdminController {
  private readonly logger = new Logger(AdminController.name);
  private readonly adminSecret = process.env.ADMIN_SECRET || 'change-this-secret-key';

  @Post('check')
  async checkAdmin(@Body() body: AdminCheckDto) {
    const isValid = body.secret === this.adminSecret;
    if (isValid) {
      this.logger.log('Admin access granted');
      return { valid: true, token: this.generateAdminToken() };
    }
    this.logger.warn('Invalid admin secret attempt');
    return { valid: false };
  }

  private generateAdminToken(): string {
    // Generate a time-limited token (valid for 24 hours)
    const timestamp = Date.now();
    const token = Buffer.from(`${this.adminSecret}_${timestamp}`).toString('base64').substring(0, 32);
    return token;
  }
}