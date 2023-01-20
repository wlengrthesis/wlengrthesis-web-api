import { Injectable } from '@nestjs/common';

@Injectable()
export class TextProcessingHelper {
  encodeSentiment(sentiment: 'positive' | 'neutral' | 'negative') {
    switch (sentiment) {
      case 'negative':
        return 0;
      case 'neutral':
        return 1;
      case 'positive':
        return 2;
      default:
        throw Error('Sentiment must be specified');
    }
  }

  decodeSentiment(label: number) {
    switch (label) {
      case 0:
        return 'negative';
      case 1:
        return 'neutral';
      case 2:
        return 'positive';
      default:
        throw Error('Label must be specified');
    }
  }

  cleanText(text: string) {
    const cleanedText = text
      .replaceAll(/[^A-Za-z]+/gi, ' ') // remove any character other than letter
      .replaceAll(/http\S+/gi, ' ') //remove hyperlinks

      .replaceAll(/(do|did|won|wouldn|shouldn|couldn|can|n)('| )*t/gi, 'not') //expand contracted words
      .replaceAll(/\'re/gi, ' are')
      .replaceAll(/\'s/gi, ' is')
      .replaceAll(/\'d/gi, ' would')
      .replaceAll(/\'ll/gi, ' will')
      .replaceAll(/\'ve/gi, ' have')
      .replaceAll(/\'m/gi, ' am')

      .replaceAll(/\s+/gi, ' ') //remove extra spaces between words

      .trim()
      .toLowerCase();

    return cleanedText;
  }

  padSequences(sequences: number[][], maxLength: number) {
    sequences.forEach(sequence => {
      if (sequence.length < maxLength) {
        while (sequence.length < maxLength) {
          sequence.push(0);
        }
      } else if (sequence.length > maxLength) {
        sequence.length = maxLength;
      }
    });
    return sequences;
  }
}
