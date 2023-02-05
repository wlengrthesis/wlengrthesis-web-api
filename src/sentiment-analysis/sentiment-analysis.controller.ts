import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { GetCurrentUser } from '../auth/decorators';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SentimentAnalysisService } from './sentiment-analysis.service';
import { IPrediction, AnalysisDto } from './sentiment-analysis.types';

@UseGuards(RolesGuard)
@Controller('sentiment-analysis')
export class SentimentAnalysisController {
  constructor(private sentimentAnalysisService: SentimentAnalysisService) {}

  @ApiBearerAuth('token')
  @Roles('SUPERADMIN', 'ADMIN', 'USER')
  @Post('predict')
  async predict(@GetCurrentUser('sub') userId: number, @Body() { text, modelType }: AnalysisDto): Promise<IPrediction> {
    const prediction = await this.sentimentAnalysisService.predictSentiment(text, modelType);
    this.sentimentAnalysisService.saveTextWithPrediction(userId, text, prediction);
    return prediction;
  }

  @ApiBearerAuth('token')
  @Roles('SUPERADMIN', 'USER') // TODO: temporary for USER
  @Get('train')
  train(): Promise<boolean> {
    return this.sentimentAnalysisService.runModelTraining();
  }
}
