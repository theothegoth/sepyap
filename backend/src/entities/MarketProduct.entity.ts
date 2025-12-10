import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Market } from './Market.entity';
import { Product } from './Product.entity';

@Entity('market_products')
export class MarketProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Market, (market) => market.marketProducts)
  @JoinColumn({ name: 'market_id' })
  market: Market;

  @Column()
  market_id: number;

  @ManyToOne(() => Product, (product) => product.marketProducts, { nullable: true })
  @JoinColumn({ name: 'product_master_id' })
  product: Product;

  @Column({ nullable: true })
  product_master_id: number;

  @Column({ type: 'text' }) // PostgreSQL text type supports UTF-8 by default
  title: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number; // Regular price (always available)

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price_card: number; // Card/membership price (if available, usually cheaper)

  @Column({ default: 'TRY' })
  currency: string;

  @Column({ nullable: true })
  url: string;

  @Column({ nullable: true })
  image_url: string;

  @Column({ nullable: true })
  market_sku: string;

  @Column({ nullable: true, type: 'text' })
  property: string; // Product property: weight (e.g., "500 g", "1 kg"), quantity (e.g., "1 Adet"), or other info

  @Column({ default: true })
  in_stock: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  last_seen: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  last_updated: Date;
}

