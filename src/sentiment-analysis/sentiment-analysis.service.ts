import { Injectable } from '@nestjs/common';
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
  loadLayersModel,
  LayersModel,
} from '@tensorflow/tfjs-node';
import { Dataset, Prisma } from '@prisma/client';
import { createReadStream } from 'fs';
import { join } from 'path';
import { parse } from 'csv-parse';
import { ProcessingDataset, ICsvDataset, ObligatoryKeys } from './sentiment-analysis.types';
import { Tokenizer } from '../common/helpers/tokenizer';
import { TextProcessingHelper } from '../common/helpers/text-processing.helper';
import { PrismaClientService } from '../prisma-client/prisma-client.service';

@Injectable()
export class SentimentAnalysisService {
  private config = {
    datasetUrl: 'dist/assets/dataset/amazon_products_consumer_reviews_dataset.csv',
    trainedModelUrl: 'dist/assets/trained-model',
    oneHotTensorDepth: 3, // based on number of possible values returned by encodeSentiment func
    maxSequenceLength: 32,
  } as const;

  private processingDataset: ProcessingDataset[] = [];

  private vocabularyActualSize: number;
  private trainingLabels: Tensor<Rank>;
  private trainingSamples: Tensor2D;

  private trainingModel: Sequential;
  private trainedModel: LayersModel;

  constructor(
    private tokenizer: Tokenizer,
    private textProcessing: TextProcessingHelper,
    private prisma: PrismaClientService
  ) {}

  async runModelTraining(
    samples: Tensor2D = this.trainingSamples,
    labels: Tensor<Rank> = this.trainingLabels,
    modelType = 'RNN'
  ) {
    this.prepareModelTraining(modelType);
    await this.trainingModel.fit(samples, labels, { epochs: 10, validationSplit: 0.2 });
    await this.trainingModel.save(`file://${this.config.trainedModelUrl}/${modelType}`);
    this.disposeTensors();
  }

  async predict(text: string) {
    await this.loadModel();
    const sequence = this.textProcessing.padSequences(
      [this.tokenizer.textToSequence(this.textProcessing.cleanText(text))],
      this.config.maxSequenceLength
    );
    const predictions = this.trainedModel.predict(tensor2d(sequence)) as Tensor2D;
    const sentiment = (await predictions.array()).map(prediction =>
      this.textProcessing.decodeSentiment(prediction.indexOf(Math.max(...prediction)))
    )[0];
    predictions.dispose();
    return sentiment;
  }

  private async loadModel(printSummary = false) {
    this.loadDataset();
    this.trainedModel = await loadLayersModel(`file://${this.config.trainedModelUrl}/model.json`);
    if (printSummary) this.trainedModel.summary();
  }

  private prepareModelTraining(modelType: string) {
    this.loadDataset();
    switch (modelType) {
      case 'RNN':
        this.createRNNModel();
        break;
      // TODO: create more models
      default:
        break;
    }
  }

  private createRNNModel(vocabularySize: number = this.vocabularyActualSize, printSummary = false) {
    this.trainingModel = sequential();

    this.trainingModel.add(
      layers.embedding({ inputDim: vocabularySize, outputDim: 16, inputLength: this.config.maxSequenceLength })
    );
    this.trainingModel.add(layers.bidirectional({ layer: layers.simpleRNN({ units: 64, returnSequences: true }) }));
    this.trainingModel.add(
      layers.bidirectional({ layer: layers.simpleRNN({ units: 64, returnSequences: true }), mergeMode: 'concat' })
    );
    this.trainingModel.add(layers.globalAveragePooling1d());
    this.trainingModel.add(layers.dense({ units: 24, activation: 'relu' }));
    this.trainingModel.add(layers.dense({ units: 3, activation: 'softmax' }));

    this.trainingModel.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy', metrics: ['accuracy'] });

    if (printSummary) this.trainingModel.summary();
  }

  private async loadDataset() {
    const dbDataset = await this.prisma.dataset.findMany();
    if (dbDataset.length > 1) {
      this.fillData(dbDataset);
      return;
    }
    this.loadCsvDataset();
  }

  private loadCsvDataset() {
    const records: string[][] = [];

    createReadStream(join(process.cwd(), this.config.datasetUrl))
      .pipe(parse({ delimiter: ',' }))
      .on('data', (row: string[]) => {
        records.push(row);
      })
      .on('end', () => {
        const keys = records.shift();
        this.processingDataset = records.map(record =>
          record.reduce<ICsvDataset>((accumulator, value, index) => {
            return { ...accumulator, [keys[index]]: value };
          }, {} as ICsvDataset)
        );
        this.prepareCsvDataset();
      })
      .on('error', error => {
        console.warn(error.message);
      });
  }

  private async prepareCsvDataset() {
    const data = (
      this.processingDataset.map(record =>
        Object.fromEntries(
          Object.entries(record)
            .filter(([key]) =>
              (
                [
                  'reviews.text',
                  'reviews.rating',
                  'reviews.doRecommend',
                  'reviews.title',
                  'reviews.numHelpful',
                ] as Array<keyof Partial<ICsvDataset>>
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
      ) as ProcessingDataset[]
    ).map<Partial<Dataset>>(record => ({
      text: this.textProcessing.cleanText(record['reviews.text']),
      rating: record['reviews.rating'],
      doRecommend: record['reviews.doRecommend'],
      numHeplful: record['reviews.numHelpful'],
    })) as Prisma.DatasetCreateManyInput[];

    this.prisma.dataset.createMany({ data });

    this.fillData(data as Dataset[]);
  }

  private fillData(dataset: Dataset[]) {
    const sentiments = dataset.map(value => {
      const sentiment = this.determineSentiment(value.rating, value.doRecommend, value.numHeplful);
      return this.textProcessing.encodeSentiment(sentiment);
    });

    const { sequences, vocabularyActualSize } = this.tokenizer.fitOnTexts(dataset.map(record => record.text));

    this.trainingLabels = oneHot(tensor1d(sentiments, 'int32'), this.config.oneHotTensorDepth);
    this.trainingSamples = tensor2d(this.textProcessing.padSequences(sequences, this.config.maxSequenceLength));
    this.vocabularyActualSize = vocabularyActualSize;
  }

  private determineSentiment(
    rating: Dataset['rating'],
    doRecommend: Dataset['doRecommend'],
    numHelpful: Dataset['numHeplful']
  ) {
    if (Number(rating) >= 4) return 'positive';
    if (rating === '3' && doRecommend === 'TRUE' && Number(numHelpful) > 1) return 'neutral';
    if (rating === '3' && doRecommend === '' && Number(numHelpful) > 1) return 'negative';
    if (rating === '3') return 'neutral';
    if (Number(rating) <= 2) return 'negative';
    throw Error('Rating must be a number');
  }

  private disposeTensors() {
    this.trainingSamples.dispose();
    this.trainingLabels.dispose();
  }
}
