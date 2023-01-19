import { Injectable } from '@nestjs/common'
import {
  oneHot,
  sequential,
  tensor1d,
  tensor2d,
  layers,
  Sequential,
  Tensor2D,
  Tensor,
  Rank,
} from '@tensorflow/tfjs-node'
import { createReadStream } from 'fs'
import { parse } from 'csv-parse'
import { Dataset, ICsvDataset, ObligatoryKeys } from './sentiment-analysis.types'
import { join } from 'path'
import tokeniser from '../common/helpers/tokeniser'

@Injectable()
export class SentimentAnalysisService {
  private datasetConfig = {
    url: 'dist/assets/dataset/amazon_products_consumer_reviews_dataset.csv',
    trainedModel: 'dist/assets/trained-model',
    oneHotTensorDepth: 3, // based on number of possible values returned by encodeSentiment func
    maxSequenceLength: 32,
  } as const

  private dataset: Dataset[] = []
  private model: Sequential

  constructor() {
    this.loadDataset()
  }

  private createModel(vocabularySize: number) {
    this.model = sequential()

    this.model.add(
      layers.embedding({ inputDim: vocabularySize, outputDim: 16, inputLength: this.datasetConfig.maxSequenceLength })
    )
    this.model.add(layers.bidirectional({ layer: layers.simpleRNN({ units: 64, returnSequences: true }) }))
    this.model.add(layers.bidirectional({ layer: layers.simpleRNN({ units: 64, returnSequences: true }) }))
    this.model.add(layers.globalAveragePooling1d())
    this.model.add(layers.dense({ units: 24, activation: 'relu' }))
    this.model.add(layers.dense({ units: 3, activation: 'softmax' }))

    this.model.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy', metrics: ['accuracy'] })
    this.model.summary()
  }

  private async trainModel(sequences: Tensor2D, labels: Tensor<Rank>) {
    await this.model.fit(sequences, labels, { epochs: 10, validationSplit: 0.2 })
    this.saveModel()
  }

  private async saveModel() {
    await this.model.save(`file://${this.datasetConfig.trainedModel}`)
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
          record.reduce<ICsvDataset>((accumulator, value, index) => {
            return { ...accumulator, [keys[index]]: value }
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

    const sentiments = filteredDataset.map(value => {
      const sentiment = this.determineSentiment(
        value['reviews.rating'],
        value['reviews.doRecommend'],
        value['reviews.numHelpful']
      )
      return this.encodeSentiment(sentiment)
    })
    const labels = oneHot(tensor1d(sentiments, 'int32'), this.datasetConfig.oneHotTensorDepth)

    const sequences = this.padSequences(
      tokeniser(filteredDataset.map(dataset => this.cleanText(dataset['reviews.text']))).sequences,
      this.datasetConfig.maxSequenceLength
    )

    this.createModel(sequences.length)
    this.trainModel(tensor2d(sequences), labels)
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

  private cleanText(text: string) {
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

  private padSequences(sequences: number[][], maxLength: number) {
    sequences.forEach(sequence => {
      if (sequence.length < maxLength) {
        while (sequence.length < maxLength) {
          sequence.push(0)
        }
      } else if (sequence.length > maxLength) {
        sequence.length = maxLength
      }
      return sequence
    })
    return sequences
  }
}
