import { Injectable } from '@nestjs/common'
import { oneHot, tensor1d } from '@tensorflow/tfjs-node'
import { createReadStream } from 'fs'
import { parse } from 'csv-parse'
import { Dataset, ICsvDataset, ObligatoryKeys } from './sentiment-analysis.types'
import { join } from 'path'
import tokeniser from '../common/helpers/tokeniser'

@Injectable()
export class SentimentAnalysisService {
  private datasetConfig = {
    url: 'dist/assets/dataset/amazon_products_consumer_reviews_dataset.csv',
    oneHotTensorDepth: 3, // based on number of possible values returned by encodeSentiment func
  } as const

  private dataset: Dataset[] = []

  constructor() {
    this.loadDataset()
  }

  private loadDataset() {
    const records: string[][] = []

    createReadStream(join(process.cwd(), this.datasetConfig.url))
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

  private prepareDataset() {
    const filteredDataset = this.dataset.map(record =>
      Object.fromEntries(
        Object.entries(record)
          .filter(([key]) =>
            (
              ['reviews.text', 'reviews.rating', 'reviews.doRecommend', 'reviews.title', 'reviews.numHelpful'] as Array<
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
    ) as Dataset[]
    this.dataset = filteredDataset

    const sentiments = this.dataset.map(value => {
      const sentiment = this.determineSentiment(
        value['reviews.rating'],
        value['reviews.doRecommend'],
        value['reviews.numHelpful']
      )
      const encodedSentiment = this.encodeSentiment(sentiment)
      return encodedSentiment
    })
    oneHot(tensor1d(sentiments, 'int32'), this.datasetConfig.oneHotTensorDepth).print()
    const tokens = tokeniser(filteredDataset.map(dataset => this.cleanText(dataset['reviews.text'])))
    //writeFileSync(join(process.cwd(), 'tokens.txt'), JSON.stringify(tokens, null, 2))
  }

  private determineSentiment(
    rating: Dataset['reviews.rating'],
    doRecommend: Dataset['reviews.doRecommend'],
    numHelpful: Dataset['reviews.numHelpful']
  ) {
    if (Number(rating) >= 4) return 'positive'
    if (rating === '3' && doRecommend === 'TRUE' && Number(numHelpful) > 1) return 'neutral'
    if (rating === '3' && doRecommend === '' && Number(numHelpful) > 1) return 'negative'
    if (rating === '3') return 'neutral'
    if (Number(rating) <= 2) return 'negative'
    throw Error('Rating must be a number')
  }

  private encodeSentiment(sentiment: 'positive' | 'neutral' | 'negative') {
    switch (sentiment) {
      case 'negative':
        return 0
      case 'neutral':
        return 1
      case 'positive':
        return 2
      default:
        throw Error('Sentiment must be specified')
    }
  }

  cleanText(text: string) {
    const cleanedText = text
      .replaceAll(/[^A-Za-z]+/gi, ' ') // remove any character other than letter
      .replaceAll(/\s+/gi, ' ') //remove extra spaces between words
      .replaceAll(/http\S+/gi, ' ') //remove hyperlinks

      .replaceAll(/won\'t/gi, 'will not') //expand contracted words
      .replaceAll(/can\'t/gi, 'can not')
      .replaceAll(/n\'t/gi, 'not')
      .replaceAll(/\'t/gi, 'not')
      .replaceAll(/\'re/gi, 'are')
      .replaceAll(/\'s/gi, 'is')
      .replaceAll(/\'d/gi, 'would')
      .replaceAll(/\'ll/gi, 'will')
      .replaceAll(/\'ve/gi, 'have')
      .replaceAll(/\'m/gi, 'am')

      .trim()
      .toLowerCase()

    return cleanedText
  }
}
