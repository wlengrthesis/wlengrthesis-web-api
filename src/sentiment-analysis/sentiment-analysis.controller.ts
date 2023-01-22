import { Body, Controller, Get, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { GetCurrentUser } from '../auth/decorators';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SentimentAnalysisService } from './sentiment-analysis.service';
import { PredictionDto } from './sentiment-analysis.types';

@UseGuards(RolesGuard)
@Controller('sentiment-analysis')
export class SentimentAnalysisController {
  constructor(private sentimentAnalysisService: SentimentAnalysisService) {}

  @Roles('SUPERADMIN', 'ADMIN', 'USER')
  @Get('predict')
  @HttpCode(HttpStatus.OK)
  async predict(
    @GetCurrentUser('sub') userId: number,
    @Body() { text }: PredictionDto
  ): Promise<'negative' | 'positive'> {
    const sentiment = await this.sentimentAnalysisService.predictSentiment(text);
    this.sentimentAnalysisService.saveTextWithPrediction(userId, text, sentiment);
    return sentiment;
  }

  @Roles('SUPERADMIN')
  @Get('train')
  @HttpCode(HttpStatus.OK)
  train(): Promise<boolean> {
    return this.sentimentAnalysisService.runModelTraining();
  }
}
