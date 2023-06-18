#IFDEFINE BITCOIN_PEER_COMMON_H
#DEFINE BITCOIN_PEER_COMMON_H
#DEFINE XEC_PEER_COMMON_H


module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-case': [0, 'never'],
    'body-min-length': [2, 'always', 3],
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'chore',
        'revert',
        'dependencies',
        'release',
      ],
    ],
    'subject-case': [0, 'never'],
  },
};
