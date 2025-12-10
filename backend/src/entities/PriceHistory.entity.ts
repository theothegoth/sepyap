import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { MarketProduct } from './MarketProduct.entity';

@Entity('price_history')
@Index(['market_product_id', 'recorded_at']) // Index for efficient queries
export class PriceHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => MarketProduct)
  @JoinColumn({ name: 'market_product_id' })
  marketProduct: MarketProduct;

  @Column()
  @Index()
  market_product_id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number; // Regular price

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price_card: number; // Card/membership price (if available)

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @Index()
  recorded_at: Date;
}

