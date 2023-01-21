import { Injectable } from '@nestjs/common';
import _, { Dictionary } from 'lodash';

export type Vocabulary = Dictionary<string>;

@Injectable()
export class Tokenizer {
  private readonly FILTER_REGEX = /[\\.,/#!$£%"@+-^&*;:{}=\-_.`~()]/g;
  private readonly SEPARATOR = ' ';

  words: string[][] = [];
  wordCounts: Record<string, number>;
  indexedWords: Dictionary<string>;
  vocabulary: Vocabulary;
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
    this.words = _.memoize((texts: string[]) => _.map(texts, text => this.splitText(text)))(texts);

    this.wordCounts = _.countBy(_.flatten(this.words));

    this.indexedWords = _.fromPairs(
      _.concat(
        [[1, this.oovToken]],
        _.map(
          _.slice(
            _.sortBy(_.entries(this.wordCounts), ([_word], count) => count),
            0,
            this.vocabularySize
          ),
          ([word], index) => [index + 2, word]
        )
      )
    );

    this.vocabulary = _.invert(this.indexedWords);

    this.sequences = _.map(this.words, tokens =>
      _.map(tokens, token => _.toNumber(_.get(this.vocabulary, token, this.vocabulary[this.oovToken])))
    );

    this.vocabularyActualSize = _.size(this.vocabulary);

    return {
      sequences: this.sequences,
      vocabularyActualSize: this.vocabularyActualSize,
    };
  }

  textToSequence(text: string) {
    if (this.vocabularyActualSize <= 1) throw Error('Tokenizer: vocabulary is not defined');
    return _.map(this.splitText(text), token =>
      _.toNumber(_.get(this.vocabulary, token, this.vocabulary[this.oovToken]))
    );
  }

  synchronizeVocabulary(vocabulary: Vocabulary, vocabularyActualSize: number) {
    this.vocabulary = vocabulary;
    this.vocabularyActualSize = vocabularyActualSize;
  }
}
