import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { MarketProduct } from './MarketProduct.entity';

@Entity('products_master')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', unique: true }) // PostgreSQL text type supports UTF-8
  canonical_title: string;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  image_url: string;

  @OneToMany(() => MarketProduct, (mp) => mp.product)
  marketProducts: MarketProduct[];
}

