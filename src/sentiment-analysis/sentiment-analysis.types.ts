import { IsString, MinLength } from 'class-validator';

const TEXT_MIN_LENGTH = 100;

export class AnalysisDto {
  @IsString()
  @MinLength(TEXT_MIN_LENGTH, {
    message: `The provided text is too short for the model to make an effective prediction. Min. length: ${TEXT_MIN_LENGTH}`,
  })
  text: string;
}

export interface IPrediction {
  sentiment: 'positive' | 'negative';
  probability: `${string}%`;
}

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
