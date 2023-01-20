import { Module } from '@nestjs/common';
import { SentimentAnalysisService } from './sentiment-analysis.service';
import { Tokenizer } from '../common/helpers/tokenizer';

@Module({
  providers: [
    SentimentAnalysisService,
    {
      provide: Tokenizer,
      useValue: new Tokenizer(30000, '<OOV>'),
    },
  ],
})
export class SentimentAnalysisModule {}
