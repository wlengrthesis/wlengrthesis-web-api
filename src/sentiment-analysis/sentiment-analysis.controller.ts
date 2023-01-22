import { Body, Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { SentimentAnalysisService } from './sentiment-analysis.service';
import { PredictionDto } from './sentiment-analysis.types';

@Controller('sentiment-analysis')
export class SentimentAnalysisController {
  constructor(private sentimentAnalysisService: SentimentAnalysisService) {}

  @Get('predict')
  @HttpCode(HttpStatus.OK)
  predict(@Body() { text }: PredictionDto): Promise<'negative' | 'positive'> {
    return this.sentimentAnalysisService.predictSentiment(text);
  }

  @Get('train')
  @HttpCode(HttpStatus.OK)
  train(): Promise<boolean> {
    return this.sentimentAnalysisService.runModelTraining();
  }
}
