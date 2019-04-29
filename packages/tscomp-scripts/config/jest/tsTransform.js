// @remove-file-on-eject
/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const babelJest = require('babel-jest');
const tsJest = require('ts-jest');

const babelJestTransformer = babelJest.createTransformer({
  presets: [require.resolve('babel-preset-react-app')],
  babelrc: false,
  configFile: false,
});

const tsJestTransformer = tsJest.createTransformer({
  presets: [require.resolve('babel-preset-react-app')],
  babelrc: false,
  configFile: false,
});

function getCacheKey(fileData, filePath, configStr, options) {
  const tsJestCacheKey = tsJestTransformer.getCacheKey(
    fileData,
    filePath,
    configStr,
    options
  );
  const babelJestCacheKey = tsJestTransformer.getCacheKey(
    fileData,
    filePath,
    configStr,
    options
  );

  return 'tscomp::' + tsJestCacheKey + '::' + babelJestCacheKey;
}

function process(sourceText, sourcePath, config, transformOptions) {
  const tsResult = tsJestTransformer.process(
    sourceText,
    sourcePath,
    config,
    transformOptions
  );
  const babelResult = babelJestTransformer.process(
    tsResult,
    sourcePath,
    config,
    Object.assign({}, transformOptions, { instrument: false })
  );

  return babelResult;
}

function createTransformer() {
  return {
    canInstrument: false,
    createTransformer,
    getCacheKey,
    process: process,
  };
}

module.exports = createTransformer();
