import { Injectable, MethodNotAllowedException } from '@nestjs/common';
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
  data,
} from '@tensorflow/tfjs-node';
import { createReadStream, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse';
import { ICsvDataset, IPrediction } from './sentiment-analysis.types';
import { Tokenizer, Vocabulary } from '../common/helpers/tokenizer';
import { TextProcessingHelper } from '../common/helpers/text-processing.helper';
import { PrismaClientService } from '../prisma-client/prisma-client.service';
import v8 from 'node:v8';

@Injectable()
export class SentimentAnalysisService {
  private config = {
    datasetUrl: 'dist/assets/dataset/fixedTrain/fixed_train2.csv',
    validation: 'dist/assets/dataset/fixed_train1.csv',
    trainedModelUrl: 'dist/assets/trained-model',
    maxSequenceLength: 32,
  } as const;

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
    console.log(v8.getHeapStatistics().heap_size_limit / (1024 * 1024));
    this.runModelTraining();
  }

  async runModelTraining(modelType = 'RNN') {
    if (process.env.NODE_ENV === 'development') {
      this.processingModelId = modelType;
      let dataset: data.CSVDataset;
      try {
        dataset = await this.prepareCsvDataset();
      } catch (error) {
        console.warn(error);
      }
      const convertedData = await dataset.toArray();
      const sequences = this.tokenizer.fitOnTexts(convertedData.map((data: any) => data.xs.Review));
      this.trainingLabels = oneHot(
        tensor1d(
          convertedData.map((data: any) => (data.ys.Label === 2 ? 1 : 0)),
          'int32'
        ),
        2
      ); // oneHotTensorDepth: number of possible values returned by encodeSentiment func
      this.trainingSamples = tensor2d(this.textProcessing.padSequences(sequences, this.config.maxSequenceLength));
      this.trainingLabels.print();
      this.trainingSamples.print();
      this.saveVocabulary();
      await this.prepareModelTraining();
      await this.trainingModel.fit(this.trainingSamples, this.trainingLabels, {
        epochs: 10,
        validationSplit: 0.2,
      });
      const modelDirectory = join(process.cwd(), `${this.config.trainedModelUrl}/${modelType}`);
      if (!existsSync(modelDirectory)) mkdirSync(modelDirectory, { recursive: true });
      await this.trainingModel.save(`file://${modelDirectory}`);
      this.disposeTensors();
      return true;
    }
    throw new MethodNotAllowedException('Cannot train model on production server. Use localhost instead');
  }

  async predictSentiment(text: string, modelType = 'GRU') {
    this.processingModelId = modelType;
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
    const sentiment = (await predictions.array()).map<IPrediction>(prediction => {
      const label = prediction.indexOf(Math.max(...prediction));
      return {
        sentiment: this.textProcessing.decodeSentiment(label),
        probability: `${(prediction[label] * 100).toFixed(2)}%`,
      };
    })[0];
    predictions.dispose();
    this.disposeTensors();
    return sentiment;
  }

  async saveTextWithPrediction(userId: number, text: string, prediction: IPrediction) {
    await this.prisma.text.create({ data: { userId, text, ...prediction } }).catch(error => {
      if (process.env.NODE_ENV === 'development') console.warn(error);
    });
  }

  private async loadModel() {
    await this.loadDataset();
    this.trainedModel = await loadLayersModel(
      `file://${this.config.trainedModelUrl}/${this.processingModelId}/model.json`
    );
    if (process.env.NODE_ENV === 'development') this.trainedModel.summary();
  }

  private async prepareModelTraining() {
    if (process.env.NODE_ENV === 'development') {
      console.log('Actual tokenizer vocabulary size during model creation: ', this.tokenizer.vocabularyActualSize);
    }
    switch (this.processingModelId) {
      case 'RNN':
        this.createRNNModel();
        break;
      case 'GRU':
        this.createGRUModel();
        break;
      case 'LSTM':
        this.createLSTMModel();
        break;
      default:
        break;
    }
  }

  private async loadDataset() {
    const dataset = await this.prisma.dataset.findUnique({ where: { modelId: this.processingModelId } });
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
    this.trainingModel = sequential();
    this.trainingModel.add(
      layers.embedding({
        inputDim: vocabularySize ? vocabularySize + 1 : this.tokenizer.vocabularyActualSize + 1,
        outputDim: 16,
        inputLength: this.config.maxSequenceLength,
      })
    );
    this.trainingModel.add(layers.bidirectional({ layer: layers.simpleRNN({ units: 64, returnSequences: true }) }));
    this.trainingModel.add(layers.bidirectional({ layer: layers.simpleRNN({ units: 64, returnSequences: true }) }));
    this.trainingModel.add(layers.globalMaxPooling1d());
    this.trainingModel.add(layers.dense({ units: 32, activation: 'relu' }));
    this.trainingModel.add(layers.dropout({ rate: 0.26 }));
    this.trainingModel.add(layers.dense({ units: 32, activation: 'relu' }));
    this.trainingModel.add(layers.dense({ units: 2, activation: 'sigmoid' }));
    this.trainingModel.compile({ optimizer: 'adam', loss: 'binaryCrossentropy', metrics: ['accuracy'] });
    if (process.env.NODE_ENV === 'development') {
      console.log(this.processingModelId);
      this.trainingModel.summary();
    }
  }

  private createLSTMModel(vocabularySize?: number) {
    if (!vocabularySize && !this.tokenizer.vocabularyActualSize) {
      throw Error('Training model creation: size of vocabulary must be greater than zero');
    }
    this.trainingModel = sequential();
    this.trainingModel.add(
      layers.embedding({
        inputDim: vocabularySize ? vocabularySize + 1 : this.tokenizer.vocabularyActualSize + 1,
        outputDim: 16,
        inputLength: this.config.maxSequenceLength,
      })
    );
    this.trainingModel.add(layers.bidirectional({ layer: layers.lstm({ units: 64, returnSequences: true }) }));
    this.trainingModel.add(layers.bidirectional({ layer: layers.lstm({ units: 64, returnSequences: true }) }));
    this.trainingModel.add(layers.globalMaxPooling1d());
    this.trainingModel.add(layers.dense({ units: 32, activation: 'relu' }));
    this.trainingModel.add(layers.dropout({ rate: 0.26 }));
    this.trainingModel.add(layers.dense({ units: 32, activation: 'relu' }));
    this.trainingModel.add(layers.dense({ units: 2, activation: 'sigmoid' }));
    this.trainingModel.compile({ optimizer: 'adam', loss: 'binaryCrossentropy', metrics: ['accuracy'] });
    if (process.env.NODE_ENV === 'development') {
      console.log(this.processingModelId);
      this.trainingModel.summary();
    }
  }

  private createGRUModel(vocabularySize?: number) {
    if (!vocabularySize && !this.tokenizer.vocabularyActualSize) {
      throw Error('Training model creation: size of vocabulary must be greater than zero');
    }
    this.trainingModel = sequential();
    this.trainingModel.add(
      layers.embedding({
        inputDim: vocabularySize ? vocabularySize + 1 : this.tokenizer.vocabularyActualSize + 1,
        outputDim: 16,
        inputLength: this.config.maxSequenceLength,
      })
    );
    this.trainingModel.add(layers.bidirectional({ layer: layers.gru({ units: 64, returnSequences: true }) }));
    this.trainingModel.add(layers.bidirectional({ layer: layers.gru({ units: 64, returnSequences: true }) }));
    this.trainingModel.add(layers.globalAveragePooling1d());
    this.trainingModel.add(layers.dense({ units: 32, activation: 'relu' }));
    this.trainingModel.add(layers.dropout({ rate: 0.26 }));
    this.trainingModel.add(layers.dense({ units: 32, activation: 'relu' }));
    this.trainingModel.add(layers.dense({ units: 2, activation: 'sigmoid' }));
    this.trainingModel.compile({ optimizer: 'adam', loss: 'binaryCrossentropy', metrics: ['accuracy'] });
    if (process.env.NODE_ENV === 'development') {
      console.log(this.processingModelId);
      this.trainingModel.summary();
    }
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
          const dataset = records.map(record =>
            record.reduce<ICsvDataset>((accumulator, value, index) => {
              return { ...accumulator, [keys[index]]: value };
            }, {} as ICsvDataset)
          );
          console.log(dataset.length);
          resolve(this.prepareCsvDataset());
        })
        .on('error', error => {
          reject(error);
        });
    });
  }

  private async prepareCsvDataset(): Promise<data.CSVDataset> {
    const datasetDirectory = join(process.cwd(), this.config.datasetUrl);
    const validationDirectory = join(process.cwd(), this.config.validation);
    console.log(validationDirectory);
    return new Promise((resolve, reject) => {
      const dataset = data.csv(`file://${datasetDirectory}`, {
        hasHeader: true,
        columnConfigs: {
          Review: { required: true, dtype: 'string' },
          Label: { required: true, isLabel: true, dtype: 'int32' },
        },
      });
      try {
        resolve(dataset);
      } catch (error) {
        reject(error);
      }
    });
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
        if (process.env.NODE_ENV === 'development') console.warn(error);
      });
  }

  private disposeTensors() {
    if (this.trainingSamples) this.trainingSamples.dispose();
    if (this.trainingLabels) this.trainingLabels.dispose();
  }
}
