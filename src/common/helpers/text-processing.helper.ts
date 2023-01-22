import { Injectable } from '@nestjs/common';

@Injectable()
export class TextProcessingHelper {
  encodeSentiment(sentiment: 'positive' | 'negative') {
    switch (sentiment) {
      case 'negative':
        return 0;
      case 'positive':
        return 1;
      default:
        throw Error('Sentiment must be specified');
    }
  }

  decodeSentiment(label: number) {
    switch (label) {
      case 0:
        return 'negative';
      case 1:
        return 'positive';
      default:
        throw Error('Label must be specified');
    }
  }

  cleanText(text: string) {
    const cleanedText = text
      .replaceAll(/[^A-Za-z]+/gi, ' ') // remove any character other than letter
      .replaceAll(/http\S+/gi, ' ') //remove hyperlinks
      .replaceAll(/\s(don|doesn|didn|isn|aren|wasn|weren|n|)('| )*t(?!\S+)/gi, ' not ') //expand contracted words
      .replaceAll(/\'n\'/gi, ' and ')
      .replaceAll(/\'re/gi, ' are ')
      .replaceAll(/\'s/gi, ' is ')
      .replaceAll(/\'d/gi, ' would ')
      .replaceAll(/\'ll/gi, ' will ')
      .replaceAll(/\'ve/gi, ' have ')
      .replaceAll(/\'m/gi, ' am ')

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
