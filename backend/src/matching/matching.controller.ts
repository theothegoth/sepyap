import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { MarketProduct } from '../entities/MarketProduct.entity';

@Controller('api/matching')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) { }

  @Get('product/:productId/markets')
  async getProductMarkets(@Param('productId') productId: number) {
    const marketProducts = await this.matchingService.getProductMarketProducts(productId);
    return {
      productId,
      markets: marketProducts.map(mp => ({
        market: mp.market.name,
        title: mp.title,
        price: mp.price,
        priceCard: mp.price_card,
        property: mp.property,
        url: mp.url,
        imageUrl: mp.image_url
      }))
    };
  }

  @Get('search')
  async searchProducts(
    @Query('q') query: string,
    @Query('limit') limit?: string,
    @Query('includeBrands') includeBrands?: string,
    @Query('excludeBrands') excludeBrands?: string,
    @Query('strict') strict?: string,
  ) {
    if (!query) {
      return { products: [] };
    }
    // Decode the query to handle URL encoding properly
    try {
      query = decodeURIComponent(query);
    } catch (e) {
      // If decoding fails, use original query
    }
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const includeBrandsList = includeBrands ? includeBrands.split(',').map(b => b.trim()).filter(Boolean) : [];
    const excludeBrandsList = excludeBrands ? excludeBrands.split(',').map(b => b.trim()).filter(Boolean) : [];
    const isStrict = strict === 'true';
    const products = await this.matchingService.searchProducts(query, limitNum, includeBrandsList, excludeBrandsList, isStrict);
    return { products };
  }

  @Post('match')
  async matchProduct(@Body() marketProduct: MarketProduct) {
    const product = await this.matchingService.matchProduct(marketProduct);
    return { product };
  }
}

