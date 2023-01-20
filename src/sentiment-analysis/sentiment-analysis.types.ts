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

export type ObligatoryKeys = Pick<ICsvDataset, 'reviews.text' | 'reviews.rating'>;
export type OptionalKeys = Partial<Pick<ICsvDataset, keyof Omit<ICsvDataset, keyof ObligatoryKeys>>>;

export type Dataset = ObligatoryKeys & OptionalKeys;
