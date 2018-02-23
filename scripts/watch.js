// @remove-on-eject-begin
/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */
// @remove-on-eject-end
'use strict';

process.env.NODE_ENV = 'development';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err;
});

// Load environment variables from .env file. Suppress warnings using silent
// if this file is missing. dotenv will never modify any environment variables
// that have already been set.
// https://github.com/motdotla/dotenv
require('dotenv').config({ silent: true });

const chalk = require('chalk');
const gulp = require('../config/gulp');
const paths = require('../config/paths');

const checkRequiredFiles = require('./utils/common').checkRequiredFiles;
const getMode = require('./utils/common').getMode;
const printErrors = require('./utils/common').printErrors;

const mode = getMode(paths.appPackageJson);

// Warn and crash if required files are missing
checkRequiredFiles(mode, paths);

if (mode === 'browser') {
  console.log(
    chalk.red(
      `Browser projects can not be watched, please use tscomp start instead`
    )
  );
  process.exit(1);
} else {
  gulp.build(paths.appPath, mode)
    .catch(err => {
      printErrors('Failed to compile.', [err]);
      return true;
    })
    .then(isError => {
      if (!isError) {
        console.log(chalk.green('Compiled successfully.'));
      }
      gulp.watch(paths.appPath, mode, err => {
        if (err) {
          printErrors('Failed to compile.', [err]);
        } else {
          console.log(chalk.green('Compiled successfully.'));
        }
      });
    });
}
