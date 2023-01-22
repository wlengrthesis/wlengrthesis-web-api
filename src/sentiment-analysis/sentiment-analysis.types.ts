import { MinLength } from 'class-validator';

export interface ICsvDataset {
  id: string;
  name: string;
  asins: string;
  brand: string;
  categories: string;
  keys: string;
  manufacturer: string;
  'reviews.date': string;
  'reviews.dateAdded': string;
  'reviews.dateSeen': string;
  'reviews.didPurchase': string;
  'reviews.doRecommend': 'TRUE' | '';
  'reviews.id': string;
  'reviews.numHelpful': `${number}` | '';
  'reviews.rating': `${number}` | '';
  'reviews.sourceURLs': string;
  'reviews.text': string;
  'reviews.title': string;
  'reviews.userCity': string;
  'reviews.userProvince': string;
  'reviews.username': string;
}

export type RequiredKeys = Pick<
  ICsvDataset,
  'reviews.text' | 'reviews.rating' | 'reviews.doRecommend' | 'reviews.numHelpful'
>;
export type OptionalKeys = Partial<Pick<ICsvDataset, keyof Omit<ICsvDataset, keyof RequiredKeys>>>;

export type ProcessingDataset = RequiredKeys & OptionalKeys;
