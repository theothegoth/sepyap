import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Watchlist } from './Watchlist.entity';
import { MarketProduct } from './MarketProduct.entity';

@Entity('alerts')
@Index(['user_id', 'created_at']) // Index for user's alerts queries
export class Alert {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  user_id: string;

  @ManyToOne(() => Watchlist)
  @JoinColumn({ name: 'watchlist_id' })
  watchlist: Watchlist;

  @Column()
  watchlist_id: number;

  @ManyToOne(() => MarketProduct)
  @JoinColumn({ name: 'market_product_id' })
  marketProduct: MarketProduct;

  @Column()
  market_product_id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  old_price: number; // Price before drop

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  new_price: number; // Price after drop

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price_change: number; // Absolute change

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  price_change_percent: number; // Percentage change

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @Index()
  created_at: Date;

  @Column({ default: false })
  is_read: boolean; // User has seen this alert

  @Column({ default: false })
  is_dismissed: boolean; // User dismissed this alert
}

