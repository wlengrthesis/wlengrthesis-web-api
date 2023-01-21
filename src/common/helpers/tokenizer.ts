import { Injectable } from '@nestjs/common';
import _, { Dictionary } from 'lodash';

@Injectable()
export class Tokenizer {
  private readonly FILTER_REGEX = /[\\.,/#!$£%"@+-^&*;:{}=\-_.`~()]/g;
  private readonly SEPARATOR = ' ';

  wordTokens: string[][] = [];
  wordCounts: Record<string, number>;
  indexWord: Dictionary<string>;
  wordIndex: Dictionary<string>;
  sequences: number[][] = [];
  vocabularyActualSize: number;

  private vocabularySize: number;
  private oovToken: string;

  constructor(vocabularySize: number, oovToken: string) {
    this.vocabularySize = vocabularySize;
    this.oovToken = oovToken;
  }

  private splitText = (text: string) =>
    _.compact(_.split(_.toLower(_.trim(_.replace(text, this.FILTER_REGEX, ''))), this.SEPARATOR));

  fitOnTexts(texts: string[]) {
    this.wordTokens = _.memoize((texts: string[]) => _.map(texts, text => this.splitText(text)))(texts);

    this.wordCounts = _.countBy(_.flatten(this.wordTokens));

    this.indexWord = _.fromPairs(
      _.concat(
        [[1, this.oovToken]],
        _.map(
          _.slice(
            _.sortBy(_.entries(this.wordCounts), ([_word], count) => count),
            0,
            this.vocabularySize
          ),
          ([word], index) => [index === 0 ? index + 2 : index + 1, word]
        )
      )
    );

    this.wordIndex = _.invert(this.indexWord);

    this.sequences = _.map(this.wordTokens, tokens =>
      _.map(tokens, token => _.toNumber(_.get(this.wordIndex, token, this.wordIndex[this.oovToken])))
    );

    this.vocabularyActualSize = _.size(this.wordIndex);

    return {
      sequences: this.sequences,
      vocabularyActualSize: this.vocabularyActualSize,
    };
  }

  textToSequence(text: string) {
    if (this.vocabularyActualSize <= 1) throw Error('Tokenizer: vocabulary is not defined');
    return _.map(this.splitText(text), token =>
      _.toNumber(_.get(this.wordIndex, token, this.wordIndex[this.oovToken]))
    );
  }
}
