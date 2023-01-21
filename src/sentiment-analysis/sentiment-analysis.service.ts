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
  ) {
    this.predictSentiment(
      'if ads dont bother you then this may be a decent device purchased this \
    for my kid and it was loaded down with so much spam it kept loading it up making \
    it slow and laggy plus the carrasoul loadout makes it hard to navigate for kids \
    not very kid friendly oh you can pay to remove the ads but it wont remove them all \
    buy the samsung better everything'
    ).then(data => console.log(data));
  }

  async predictSentiment(text: string) {
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
    await this.loadDataset();
    this.trainedModel = await loadLayersModel(`file://${this.config.trainedModelUrl}/model.json`);
    if (printSummary) this.trainedModel.summary();
  }

  async runModelTraining(samples?: Tensor2D, labels?: Tensor<Rank>, modelType = 'RNN') {
    await this.prepareModelTraining(modelType);
    await this.trainingModel.fit(samples ? samples : this.trainingSamples, labels ? labels : this.trainingLabels, {
      epochs: 10,
      validationSplit: 0.2,
    });
    await this.trainingModel.save(`file://${this.config.trainedModelUrl}/${modelType}`);
    this.disposeTensors();
  }

  private async prepareModelTraining(modelType: string) {
    await this.loadDataset();
    switch (modelType) {
      case 'RNN':
        this.createRNNModel();
        break;
      // TODO: create more models
      default:
        break;
    }
  }

  private async loadDataset() {
    const dbDataset = await this.prisma.dataset.findMany();
    if (dbDataset.length > 1) {
      this.fillData(dbDataset);
      return;
    }
    try {
      await this.loadCsvDataset();
    } catch (error) {
      console.warn(error);
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

  private async loadCsvDataset() {
    return new Promise((resolve, reject) => {
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
          resolve(this.prepareCsvDataset());
        })
        .on('error', error => {
          reject(error);
        });
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

    this.fillData(data as Dataset[]);
    await this.prisma.dataset.createMany({ data });
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
    if (rating === '3' && !!doRecommend === true && Number(numHelpful) > 1) return 'neutral';
    if (rating === '3' && !doRecommend && Number(numHelpful) > 1) return 'negative';
    if (rating === '3') return 'neutral';
    if (Number(rating) <= 2) return 'negative';
    throw Error('Rating must be a number');
  }

  private disposeTensors() {
    this.trainingSamples.dispose();
    this.trainingLabels.dispose();
  }
}
