import { Injectable } from '@nestjs/common'
import * as tf from '@tensorflow/tfjs-node'
import { createReadStream } from 'fs'
import { parse } from 'csv-parse'
import { Dataset, ICsvDataset, ObligatoryKeys } from './sentiment-analysis.types'

@Injectable()
export class SentimentAnalysisService {
  private readonly DATASET_URL = 'dist/assets/dataset/amazon_products_consumer_reviews_dataset.csv'
  dataset: Dataset = []

  constructor() {
    this.loadDataset()
  }

  loadDataset(url: string = this.DATASET_URL) {
    const records: string[][] = []

    createReadStream(url)
      .pipe(parse({ delimiter: ',' }))
      .on('data', (row: string[]) => {
        records.push(row)
      })
      .on('end', () => {
        const keys = records.shift()
        this.dataset = records.map(record =>
          record.reduce<ICsvDataset>((accumulator, values, index) => {
            return { ...accumulator, [keys[index]]: values }
          }, {} as ICsvDataset)
        )
        this.prepareDataset()
      })
      .on('error', error => {
        console.warn(error.message)
      })
  }

  prepareDataset() {
    const filteredDataset = this.dataset.map(record =>
      Object.fromEntries(
        Object.entries(record)
          .filter(([key]) =>
            (
              ['reviews.text', 'reviews.rating', 'reviews.doRecommend', 'reviews.title'] as Array<
                keyof Partial<ICsvDataset>
              >
            ).includes(key as keyof Partial<ICsvDataset>)
          )
          .filter(
            ([key, value]) =>
              ((key as keyof ObligatoryKeys) === 'reviews.rating' && value !== '') ||
              ((key as keyof ObligatoryKeys) === 'reviews.text' && value !== '') ||
              (key as keyof ObligatoryKeys) !== 'reviews.rating' ||
              (key as keyof ObligatoryKeys) !== 'reviews.text'
          )
      )
    ) as Dataset
    this.dataset = filteredDataset
    console.log(this.dataset)
  }

  determineSentiment(rating: ObligatoryKeys['reviews.rating'], doRecommend: ObligatoryKeys['reviews.doRecommend']) {
    if (Number(rating) >= 5) return 'positive'
    if (rating === '4' && doRecommend === 'TRUE') return 'positive'
    if (rating === '4' && doRecommend === '') return 'neutral'
    if (rating === '3' && doRecommend === 'TRUE') return 'neutral'
    if (rating === '3' && doRecommend === '') return 'negative'
    if (Number(rating) <= 2) return 'negative'
  }
}
