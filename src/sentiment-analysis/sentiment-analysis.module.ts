import { Module } from '@nestjs/common';
import { SentimentAnalysisService } from './sentiment-analysis.service';
import { Tokenizer } from '../common/helpers/tokenizer';
import { TextProcessingHelper } from '../common/helpers/text-processing.helper';
import { PrismaClientModule } from '../prisma-client/prisma-client.module';
import { SentimentAnalysisController } from './sentiment-analysis.controller';

@Module({
  imports: [PrismaClientModule],
  providers: [
    SentimentAnalysisService,
    {
      provide: Tokenizer,
      useValue: new Tokenizer(100_000, '<OOV>'),
    },
    TextProcessingHelper,
  ],
  controllers: [SentimentAnalysisController],
})
export class SentimentAnalysisModule {}
