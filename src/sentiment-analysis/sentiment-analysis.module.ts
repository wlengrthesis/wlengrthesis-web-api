import { Module } from '@nestjs/common';
import { SentimentAnalysisService } from './sentiment-analysis.service';

@Module({
  providers: [SentimentAnalysisService],
})
export class SentimentAnalysisModule {}
