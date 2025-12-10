import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Product } from './Product.entity';

@Entity('watchlist')
@Index(['user_id', 'product_id']) // Index for user's watchlist queries
export class Watchlist {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  user_id: string; // User identifier (can be email, UUID, etc.)

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column()
  @Index()
  product_id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  target_price: number | null; // Alert when price drops below this

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  target_percent: number | null; // Alert when price drops by this percent

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @Column({ default: true })
  is_active: boolean; // User can disable alerts without deleting
}

