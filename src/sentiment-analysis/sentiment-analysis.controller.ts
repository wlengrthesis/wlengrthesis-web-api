import { Body, Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { SentimentAnalysisService } from './sentiment-analysis.service';
import { SentimentAnalysisDto } from './sentiment-analysis.types';

@Controller('sentiment-analysis')
export class SentimentAnalysisController {
  constructor(private sentimentAnalysisService: SentimentAnalysisService) {}

  @Get('predict')
  @HttpCode(HttpStatus.OK)
  predict(@Body() dto: SentimentAnalysisDto): Promise<string> {
    return this.sentimentAnalysisService.predictSentiment(dto.text);
  }

  @Get('train')
  @HttpCode(HttpStatus.OK)
  train(): Promise<void> {
    return this.sentimentAnalysisService.runModelTraining();
  }
}
