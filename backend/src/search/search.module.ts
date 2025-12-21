
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchService } from './search.service';
import { Product } from '../entities/Product.entity';
import { MarketProduct } from '../entities/MarketProduct.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Product, MarketProduct]),
    ],
    providers: [SearchService],
    exports: [SearchService],
})
export class SearchModule { }
