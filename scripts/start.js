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

// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = 'development';
process.env.NODE_ENV = 'development';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err;
});

// Ensure environment variables are read.
require('../config/env');

const fs = require('fs');
const chalk = require('chalk');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const clearConsole = require('react-dev-utils/clearConsole');
const {
  choosePort,
  createCompiler,
  prepareProxy,
  prepareUrls,
} = require('react-dev-utils/WebpackDevServerUtils');
const openBrowser = require('react-dev-utils/openBrowser');
const gulp = require('../config/gulp');
const paths = require('../config/paths');
const config = require('../config/webpack.config.dev');
const createDevServerConfig = require('../config/webpackDevServer.config');

const checkRequiredFiles = require('./utils/common').checkRequiredFiles;
const getMode = require('./utils/common').getMode;
const printErrors = require('./utils/common').printErrors;

const useYarn = fs.existsSync(paths.yarnLockFile);
const isInteractive = process.stdout.isTTY;
let argv = process.argv.slice(2);

const mode = getMode(paths.appPackageJson);

// Warn and crash if required files are missing
checkRequiredFiles(mode, paths);

// Tools like Cloud9 rely on this.
const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

function startWebpack() {
// We attempt to use the default port but if it is busy, we offer the user to
// run on a different port. `detect()` Promise resolves to the next free port.
choosePort(HOST, DEFAULT_PORT)
  .then(port => {
    if (port == null) {
      // We have not found a port.
      return;
    }
    const protocol = process.env.HTTPS === 'true' ? 'https' : 'http';
    const appName = require(paths.appPackageJson).name;
    const urls = prepareUrls(protocol, HOST, port);
    // Create a webpack compiler that is configured with custom messages.
    const compiler = createCompiler(webpack, config, appName, urls, useYarn);
    // Load proxy config
    const proxySetting = require(paths.appPackageJson).proxy;
    const proxyConfig = prepareProxy(proxySetting, paths.appPublic);
    // Serve webpack assets generated by the compiler over a web sever.
    const serverConfig = createDevServerConfig(
      proxyConfig,
      urls.lanUrlForConfig
    );
    const devServer = new WebpackDevServer(compiler, serverConfig);
    // Launch WebpackDevServer.
    devServer.listen(port, HOST, err => {
      if (err) {
        return console.log(err);
      }
      if (isInteractive) {
        clearConsole();
      }
      console.log(chalk.cyan('Starting the development server...\n'));
      openBrowser(urls.localUrlForBrowser);
    });

    ['SIGINT', 'SIGTERM'].forEach(function(sig) {
      process.on(sig, function() {
        devServer.close();
        process.exit();
      });
    });
  })
  .catch(err => {
    if (err && err.message) {
      console.log(err.message);
    }
    process.exit(1);
  });
}

if (mode === 'browser') {
  startWebpack();
} else if (mode === 'server') {
  const isSmokeTest = process.argv.some(
    arg => arg.indexOf('--smoke-test') > -1
  );
  if (isSmokeTest) {
    argv = argv.filter(arg => arg.indexOf('--smoke-test') === -1);
    // argv.push(
    //   '--no-restart-on',
    //   'exit',
    //   '--non-interactive',
    //   '--quiet',
    //   '--ignore',
    //   '.'
    // );
  }

  console.log(chalk.blue('Building app...'));
  gulp.build(paths.appPath, mode)
    .catch(err => {
      printErrors('Failed to compile.', [err]);
      process.exit(1);
    })
    .then(() => {
      console.log(chalk.green('Compiled successfully.'), argv);

      let nodeArgs = [];
      let isNodeArgs = false;

      argv.forEach((arg, i) => {
        if (arg === '--') {
          isNodeArgs = !isNodeArgs;
          argv[i] = undefined;
        } else if (isNodeArgs) {
          nodeArgs.push(arg);
          argv[i] = undefined;
        }
      });

      const nodemon = require('nodemon');

      nodemon({
        script: paths.appBuildIndexJs,
        args: argv.filter(arg => arg !== undefined),
        nodeArgs: nodeArgs,
        delay: 400,
        watch: [paths.appBuild],
        ext: 'js jsx json ts tsx',
        ignore: ['*.test.js', '*.map'],
        env: Object.assign({}, process.env, {NODE_ENV: process.env.NODE_ENV || 'development'}),
      });

      nodemon
        .on('quit', function () {
          process.exit();
        })
        .on('crash', function () {
          console.error(chalk.red('App crashed, change a file or type rs to restart'));
        })
        .on('restart', function (files) {
          if (files) {
            console.log(chalk.green('App restarted due to: ' + files.map(file => chalk.blue(file)).join(', ')));
          } else {
            console.log(chalk.green('App restarted'));
          }
        });

      if (!isSmokeTest) {
        gulp.watch(paths.appPath, mode, err => {
          if (err) {
            printErrors('Failed to compile.', [err]);
          } else {
            console.log(chalk.green('Compiled successfully.'));
          }
        });
      }
    })
} else {
  console.log(chalk.red(`Can only start a browser or a server app project`));
  process.exit(1);
}
