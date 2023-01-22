import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { GetCurrentUser } from '../auth/decorators';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SentimentAnalysisService } from './sentiment-analysis.service';
import { IPrediction, AnalysisDto } from './sentiment-analysis.types';

@UseGuards(RolesGuard)
@Controller('sentiment-analysis')
export class SentimentAnalysisController {
  constructor(private sentimentAnalysisService: SentimentAnalysisService) {}

  @Roles('SUPERADMIN', 'ADMIN', 'USER')
  @Post('predict')
  async predict(@GetCurrentUser('sub') userId: number, @Body() { text }: AnalysisDto): Promise<IPrediction> {
    const prediction = await this.sentimentAnalysisService.predictSentiment(text);
    this.sentimentAnalysisService.saveTextWithPrediction(userId, text, prediction);
    return prediction;
  }

  @Roles('SUPERADMIN')
  @Get('train')
  train(): Promise<boolean> {
    return this.sentimentAnalysisService.runModelTraining();
  }
}
