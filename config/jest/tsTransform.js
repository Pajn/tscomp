// @remove-file-on-eject
/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */
'use strict';

const babel = require('babel-core');
const tsc = require('typescript');
const paths = require('../paths');
const tsConfig = require(paths.appTsConfig);

function babelTransform(src, path) {
  return babel
    .transform(src, {
      babelrc: false,
      filename: path,
      presets: [require.resolve('babel-preset-react-app')],
    })
    .code
}

module.exports.process = (src, path) => {
  const isTypeScript = path.endsWith('.ts') || path.endsWith('.tsx')

  if (isTypeScript) {
    src = tsc.transpileModule(
      src,
      {
        compilerOptions: tsConfig.compilerOptions,
        fileName: path
      }
    )
    .outputText
  }
  if (path.endsWith('.js') || path.endsWith('.jsx') || isTypeScript) {
    src = babelTransform(src, path)
  }
  return src
}
