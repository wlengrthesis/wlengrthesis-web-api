import _ from 'lodash';

const FILTER_REGEX = /[\\.,/#!$£%"@+-^&*;:{}=\-_.`~()]/g;
const SEPARATOR = ' ';

const splitText = _.memoize(text =>
  _.compact(_.split(_.toLower(_.trim(_.replace(text, FILTER_REGEX, ''))), SEPARATOR))
);

const getIndexWord = _.memoize(texts =>
  _.fromPairs(
    _.map(
      _.entries(getWordCounts(texts)).sort((a, b) => b[1] - a[1]),
      ([word], index) => [index + 1, word]
    )
  )
);

const getWordIndex = _.memoize(texts => _.invert(getIndexWord(texts)));

const getWordCounts = _.memoize(texts => _.countBy(_.compact(_.flatMap(texts, text => splitText(text)))));

const getSequences = _.memoize(texts =>
  _.flatten(_.map(texts, text => _.map(splitText(text), word => _.toNumber(_.get(getWordIndex(texts), word)))))
);

const getWordTokens = _.memoize(texts => _.map(texts, text => splitText(text)));

const getWordTokenIndex = _.memoize(texts =>
  _.map(getWordTokens(texts), wordTokens => _.map(wordTokens, word => _.toNumber(_.get(getWordIndex(texts), word))))
);

const tokeniser = _.memoize(texts => ({
  indexWord: getIndexWord(texts),
  wordIndex: getWordIndex(texts),
  wordCounts: getWordCounts(texts),
  sequences: getSequences(texts),
  wordTokens: getWordTokens(texts),
  wordTokenIndex: getWordTokenIndex(texts),
}));

export default tokeniser;
