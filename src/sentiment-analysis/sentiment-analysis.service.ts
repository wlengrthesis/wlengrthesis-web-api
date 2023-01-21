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
  tidy,
} from '@tensorflow/tfjs-node';
import { createReadStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { parse } from 'csv-parse';
import { ProcessingDataset, ICsvDataset, RequiredKeys } from './sentiment-analysis.types';
import { Tokenizer, Vocabulary } from '../common/helpers/tokenizer';
import { TextProcessingHelper } from '../common/helpers/text-processing.helper';
import { PrismaClientService } from '../prisma-client/prisma-client.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';

@Injectable()
export class SentimentAnalysisService {
  private config = {
    datasetUrl: 'dist/assets/dataset/amazon_products_consumer_reviews_dataset.csv',
    trainedModelUrl: 'dist/assets/trained-model',
    oneHotTensorDepth: 3, // based on number of possible values returned by encodeSentiment func
    maxSequenceLength: 32,
  } as const;

  private processingDataset: ProcessingDataset[] = [];
  private processingModelId = 'RNN';

  private trainingLabels: Tensor<Rank>;
  private trainingSamples: Tensor2D;

  private trainingModel: Sequential;
  private trainedModel: LayersModel;

  constructor(
    private tokenizer: Tokenizer,
    private textProcessing: TextProcessingHelper,
    private prisma: PrismaClientService
  ) {
    // this.predictSentiment(
    //   'if ads dont bother you then this may be a decent device purchased this \
    // for my kid and it was loaded down with so much spam it kept loading it up making \
    // it slow and laggy plus the carrasoul loadout makes it hard to navigate for kids \
    // not very kid friendly oh you can pay to remove the ads but it wont remove them all \
    // buy the samsung better everything'
    // ).then(data => console.log(data));
    this.runModelTraining();
  }

  async predictSentiment(text: string) {
    await this.loadModel();
    if (process.env.NODE_ENV === 'development') {
      console.log('Tokenizer size vocabulary when predicts sentiment: ', this.tokenizer.vocabularyActualSize);
    }
    const sequence = this.textProcessing.padSequences(
      [this.tokenizer.textToSequence(this.textProcessing.cleanText(text))],
      this.config.maxSequenceLength
    );
    if (process.env.NODE_ENV === 'development') {
      tidy(() => {
        tensor2d(sequence).print();
      });
    }
    const predictions = this.trainedModel.predict(tensor2d(sequence)) as Tensor2D;
    if (process.env.NODE_ENV === 'development') predictions.print();
    const sentiment = (await predictions.array()).map(prediction =>
      this.textProcessing.decodeSentiment(prediction.indexOf(Math.max(...prediction)))
    )[0];
    predictions.dispose();
    this.disposeTensors();
    return sentiment;
  }

  private async loadModel() {
    await this.loadDataset();
    this.trainedModel = await loadLayersModel(
      `file://${this.config.trainedModelUrl}/${this.processingModelId}/model.json`
    );
    if (process.env.NODE_ENV === 'development') this.trainedModel.summary();
  }

  async runModelTraining(modelType = 'RNN') {
    this.processingModelId = modelType;
    await this.prepareModelTraining();
    if (process.env.NODE_ENV === 'development') {
      this.trainingSamples.print();
      this.trainingLabels.print();
    }
    await this.trainingModel.fit(this.trainingSamples, this.trainingLabels, {
      epochs: 10,
      validationSplit: 0.2,
    });
    const modelDirectory = join(process.cwd(), `${this.config.trainedModelUrl}/${modelType}`);
    if (!existsSync(modelDirectory)) mkdirSync(modelDirectory, { recursive: true });
    await this.trainingModel.save(`file://${modelDirectory}`);
    this.disposeTensors();
  }

  private async prepareModelTraining() {
    try {
      await this.loadCsvDataset();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(error);
        return;
      }
      throw Error('Error in processing csv: ', error);
    }
    switch (this.processingModelId) {
      case 'RNN':
        this.createRNNModel();
        break;
      // TODO: create more models
      default:
        break;
    }
  }

  private async loadDataset() {
    const dataset = await this.prisma.dataset.findUnique({
      where: { modelId: this.processingModelId },
    });
    if (dataset && dataset.vocabulary && dataset.vocabularyActualSize) {
      const parsedVocabulary = JSON.parse(dataset.vocabulary) as Vocabulary;
      this.tokenizer.synchronizeVocabulary(parsedVocabulary, dataset.vocabularyActualSize);
      return;
    }
    try {
      await this.loadCsvDataset();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(error);
        return;
      }
      throw Error('Error in processing csv: ', error);
    }
  }

  private createRNNModel(vocabularySize?: number) {
    if (!vocabularySize && !this.tokenizer.vocabularyActualSize) {
      throw Error('Training model creation: size of vocabulary must be greater than zero');
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('Actual tokenizer vocabulary size during model creation: ', this.tokenizer.vocabularyActualSize);
    }
    this.trainingModel = sequential();
    this.trainingModel.add(
      layers.embedding({
        inputDim: vocabularySize ? vocabularySize : this.tokenizer.vocabularyActualSize + 1,
        outputDim: 16,
        inputLength: this.config.maxSequenceLength,
      })
    );
    this.trainingModel.add(layers.bidirectional({ layer: layers.simpleRNN({ units: 64, returnSequences: true }) }));
    this.trainingModel.add(layers.bidirectional({ layer: layers.simpleRNN({ units: 64, returnSequences: true }) }));
    this.trainingModel.add(layers.globalAveragePooling1d());
    this.trainingModel.add(layers.dense({ units: 32, activation: 'relu' }));
    this.trainingModel.add(layers.dense({ units: 3, activation: 'softmax' }));
    this.trainingModel.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy', metrics: ['accuracy'] });
    if (process.env.NODE_ENV === 'development') this.trainingModel.summary();
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

  private prepareCsvDataset() {
    const dataset = this.processingDataset
      .map(record =>
        Object.fromEntries(
          Object.entries(record)
            .filter(([key]) =>
              (
                ['reviews.text', 'reviews.rating', 'reviews.doRecommend', 'reviews.numHelpful'] as Array<
                  keyof RequiredKeys
                >
              ).includes(key as keyof RequiredKeys)
            )
            .filter(
              ([key, value]) =>
                ((key as keyof RequiredKeys) === 'reviews.rating' && value !== '') ||
                ((key as keyof RequiredKeys) === 'reviews.text' && value !== '') ||
                (key as keyof RequiredKeys) !== 'reviews.rating' ||
                (key as keyof RequiredKeys) !== 'reviews.text'
            )
        )
      )
      .map(record => ({
        ...record,
        'reviews.text': this.textProcessing.cleanText(record['reviews.text']),
      })) as ProcessingDataset[];
    const sentiments = dataset.map(value => {
      const sentiment = this.determineSentiment(
        value['reviews.rating'],
        value['reviews.doRecommend'],
        value['reviews.numHelpful']
      );
      return this.textProcessing.encodeSentiment(sentiment);
    });
    const sequences = this.tokenizer.fitOnTexts(dataset.map(record => record['reviews.text']));
    this.trainingLabels = oneHot(tensor1d(sentiments, 'int32'), this.config.oneHotTensorDepth);
    this.trainingSamples = tensor2d(this.textProcessing.padSequences(sequences, this.config.maxSequenceLength));
    this.saveVocabulary();
  }

  private async saveVocabulary() {
    await this.prisma.dataset
      .create({
        data: {
          modelId: this.processingModelId,
          vocabulary: JSON.stringify(this.tokenizer.vocabulary),
          vocabularyActualSize: this.tokenizer.vocabularyActualSize,
        },
      })
      .catch(error => {
        if (error instanceof PrismaClientKnownRequestError) {
          // Error code P2002: Unique constraint failed - https://www.prisma.io/docs/reference/api-reference/error-reference#p2002
          if (error.code === 'P2002') {
            if (process.env.NODE_ENV === 'development') console.warn(error);
            return;
          }
        }
        throw error;
      });
  }

  private determineSentiment(
    rating: ProcessingDataset['reviews.rating'],
    doRecommend: ProcessingDataset['reviews.doRecommend'],
    numHelpful: ProcessingDataset['reviews.numHelpful']
  ) {
    if (Number(rating) >= 4) return 'positive';
    if (rating === '3' && !!doRecommend && Number(numHelpful) > 1) return 'neutral';
    if (rating === '3' && !doRecommend && Number(numHelpful) > 1) return 'negative';
    if (rating === '3') return 'neutral';
    if (Number(rating) <= 2) return 'negative';
    throw Error('Rating must be a number');
  }

  private disposeTensors() {
    if (this.trainingSamples) this.trainingSamples.dispose();
    if (this.trainingLabels) this.trainingLabels.dispose();
  }
}
