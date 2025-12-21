
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MeiliSearch, Index } from 'meilisearch';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/Product.entity';
import { MarketProduct } from '../entities/MarketProduct.entity';

@Injectable()
export class SearchService implements OnModuleInit {
    private client: MeiliSearch;
    private readonly logger = new Logger(SearchService.name);
    private MASTER_INDEX = 'products_master';
    private MARKET_INDEX = 'market_products';

    constructor(
        @InjectRepository(Product)
        private productRepo: Repository<Product>,
        @InjectRepository(MarketProduct)
        private marketProductRepo: Repository<MarketProduct>,
    ) {
        this.client = new MeiliSearch({
            host: process.env.MEILI_HOST || 'http://meilisearch:7700',
            apiKey: process.env.MEILI_MASTER_KEY || 'masterKey',
        });
    }

    async onModuleInit() {
        await this.initIndexes();
        // Give MeiliSearch a moment to initialize
        setTimeout(() => this.syncDataIfNeeded(), 2000);
    }

    private async syncDataIfNeeded() {
        try {
            const masterStats = await this.client.index(this.MASTER_INDEX).getStats();
            if (masterStats.numberOfDocuments === 0) {
                this.logger.log('Master index empty, syncing from DB...');
                await this.syncMasterProducts();
            }

            const marketStats = await this.client.index(this.MARKET_INDEX).getStats();
            if (marketStats.numberOfDocuments === 0) {
                this.logger.log('Market index empty, syncing from DB...');
                await this.syncMarketProducts();
            }
        } catch (e) {
            this.logger.warn(`Auto-sync check failed: ${e.message}`);
        }
    }

    private async initIndexes() {
        try {
            // Create or update Master Products Index
            await this.client.createIndex(this.MASTER_INDEX, { primaryKey: 'id' });
            await this.client.index(this.MASTER_INDEX).updateSettings({
                searchableAttributes: ['canonical_title', 'category'],
                filterableAttributes: ['category'],
                sortableAttributes: ['id'],
                // MeiliSearch handles Turkish characters automatically (normalization),
                // but we disable typo tolerance explicitly as requested for precision.
                typoTolerance: {
                    enabled: false
                }
            });

            // Create or update Market Products Index
            await this.client.createIndex(this.MARKET_INDEX, { primaryKey: 'id' });
            await this.client.index(this.MARKET_INDEX).updateSettings({
                searchableAttributes: ['title', 'market_name'],
                filterableAttributes: ['market_name', 'product_master_id'],
                sortableAttributes: ['price', 'updated_at'],
                typoTolerance: {
                    enabled: false
                }
            });

            this.logger.log('MeiliSearch indexes initialized.');
        } catch (error) {
            this.logger.warn('Failed to initialize MeiliSearch indexes (service might be down): ' + error.message);
        }
    }

    /**
     * Sync all master products from DB to MeiliSearch
     */
    async syncMasterProducts() {
        const products = await this.productRepo.find();
        if (products.length === 0) return;

        const documents = products.map((p) => ({
            id: p.id,
            canonical_title: p.canonical_title,
            category: p.category,
            image_url: p.image_url,
        }));

        await this.client.index(this.MASTER_INDEX).addDocuments(documents);
        this.logger.log(`Synced ${products.length} master products to MeiliSearch.`);
    }

    /**
     * Sync all market products from DB to MeiliSearch
     */
    async syncMarketProducts() {
        // Fetch in batches to avoid memory issues
        const BATCH_SIZE = 1000;
        let skip = 0;
        let hasMore = true;

        while (hasMore) {
            const products = await this.marketProductRepo.find({
                relations: ['market'],
                skip,
                take: BATCH_SIZE
            });

            if (products.length === 0) {
                hasMore = false;
                break;
            }

            const documents = products.map((p) => ({
                id: p.id,
                title: p.title,
                price: p.price,
                market_name: p.market?.name,
                product_master_id: p.product_master_id,
                url: p.url,
                image_url: p.image_url,
                updated_at: p.last_updated,
            }));

            await this.client.index(this.MARKET_INDEX).addDocuments(documents);
            this.logger.log(`Synced batch of ${products.length} market products...`);

            skip += BATCH_SIZE;
        }
        this.logger.log('Synced all market products to MeiliSearch.');
    }

    /**
     * Add or update a single master product
     */
    async indexMasterProduct(product: Product) {
        await this.client.index(this.MASTER_INDEX).addDocuments([{
            id: product.id,
            canonical_title: product.canonical_title,
            category: product.category,
            image_url: product.image_url,
        }]);
    }

    /**
     * Add or update a single market product
     */
    async indexMarketProduct(marketProduct: MarketProduct) {
        if (!marketProduct || !marketProduct.market) return;

        await this.client.index(this.MARKET_INDEX).addDocuments([{
            id: marketProduct.id,
            title: marketProduct.title,
            price: marketProduct.price,
            market_name: marketProduct.market.name,
            product_master_id: marketProduct.product_master_id,
            url: marketProduct.url,
            image_url: marketProduct.image_url,
            updated_at: marketProduct.last_updated,
        }]);
    }

    /**
     * Search for Master Products (High performance, typo-tolerant)
     */
    async searchMasterProducts(query: string, limit: number = 20) {
        const result = await this.client.index(this.MASTER_INDEX).search(query, {
            limit,
        });
        return result.hits;
    }

    /**
     * Find potential Match for a new Market Product
     * Used during ingestion to link new items to master products
     */
    async findPotentialLink(marketProductTitle: string): Promise<{ id: number; score: number } | null> {
        // Search in master index
        const result = await this.client.index(this.MASTER_INDEX).search(marketProductTitle, {
            limit: 1,
            showRankingScore: true
        });

        if (result.hits.length > 0) {
            // @ts-ignore
            const score = result.hits[0]._rankingScore || 0; // MeiliSearch v1.3+ returns _rankingScore
            // Also check older _rankingScore if needed or rely on manual check
            // Ideally we trust high scores. For now, let's return it.
            return { id: result.hits[0].id as number, score };
        }

        return null;
    }
}
