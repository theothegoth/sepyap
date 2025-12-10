import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { MarketProduct } from './MarketProduct.entity';

@Entity('markets')
export class Market {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', unique: true }) // PostgreSQL text type supports UTF-8
  name: string;

  @Column({ nullable: true })
  base_url: string;

  @Column({ type: 'jsonb', nullable: true })
  delivery_regions: string[];

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  min_order_amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  delivery_fee: number; // Standard delivery fee

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  free_delivery_threshold: number; // Order amount for free delivery (null = no free delivery)

  @OneToMany(() => MarketProduct, (mp) => mp.market)
  marketProducts: MarketProduct[];
}

