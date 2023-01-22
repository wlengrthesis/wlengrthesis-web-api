import { TextDTO } from './../text/text.types';
import { Body, Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { SentimentAnalysisService } from './sentiment-analysis.service';

@Controller('sentiment-analysis')
export class SentimentAnalysisController {
  constructor(private sentimentAnalysisService: SentimentAnalysisService) {}

  @Get('predict')
  @HttpCode(HttpStatus.OK)
  predict(@Body() dto: TextDTO): Promise<string> {
    return this.sentimentAnalysisService.predictSentiment(dto.text);
  }

  @Get('train')
  @HttpCode(HttpStatus.OK)
  train(): Promise<void> {
    return this.sentimentAnalysisService.runModelTraining();
  }
}
