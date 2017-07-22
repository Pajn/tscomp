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

const path = require('path');
const fs = require('fs');
const url = require('url');

const extensions = ['', '.tsx', '.ts', '.js', '.jsx'];

function findFileExtension(path) {
  for (let i = 0; i < extensions.length; i++) {
    const extension = extensions[i];
    if (fs.existsSync(path + extension)) {
      return path + extension;
    }
  }

  return path + '.ts';
}

// Make sure any symlinks in the project folder are resolved:
// https://github.com/facebookincubator/create-react-app/issues/637
const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = relativePath => path.resolve(appDirectory, relativePath);

// The user may choose to change the tsconfig.json `outDir` property.
function getAppBuildFolder(appTsConfigPath) {
  try {
    const outDir = require(appTsConfigPath).compilerOptions.outDir || 'build';
    return outDir;
  } catch (_) {
    return 'build';
  }
}
module.exports.getAppBuildFolder = getAppBuildFolder

// The user may choose to change the tsconfig.json `outDir` property.
function resolveAppBuild(appTsConfigPath) {
  const outDir = getAppBuildFolder(appTsConfigPath);
  const buildPath = path.join(path.dirname(appTsConfigPath), outDir);
  return buildPath;
}

const envPublicUrl = process.env.PUBLIC_URL;

function ensureSlash(path, needsSlash) {
  const hasSlash = path.endsWith('/');
  if (hasSlash && !needsSlash) {
    return path.substr(path, path.length - 1);
  } else if (!hasSlash && needsSlash) {
    return `${path}/`;
  } else {
    return path;
  }
}

const getPublicUrl = appPackageJson =>
  envPublicUrl || require(appPackageJson).homepage;

// We use `PUBLIC_URL` environment variable or "homepage" field to infer
// "public path" at which the app is served.
// Webpack needs to know it to put the right <script> hrefs into HTML even in
// single-page apps that may serve index.html for nested URLs like /todos/42.
// We can't use a relative path in HTML because we don't want to load something
// like /todos/42/static/js/bundle.7289d.js. We have to know the root.
function getServedPath(appPackageJson) {
  const publicUrl = getPublicUrl(appPackageJson);
  const servedUrl = envPublicUrl ||
    (publicUrl ? url.parse(publicUrl).pathname : '/');
  return ensureSlash(servedUrl, true);
}

// config after eject: we're in ./config/
module.exports = {
  dotenv: resolveApp('.env'),
  appBuild: resolveAppBuild(resolveApp('tsconfig.json')),
  appBuildCjs: resolveApp('cjs'),
  appPublic: resolveApp('public'),
  appHtml: resolveApp('public/index.html'),
  appIndexJs: findFileExtension(resolveApp('src/index')),
  appBuildIndexJs: resolveApp('build/index.js'),
  appPackageJson: resolveApp('package.json'),
  appTsConfig: resolveApp('tsconfig.json'),
  appSrc: resolveApp('src'),
  appTypings: resolveApp('typings'),
  yarnLockFile: resolveApp('yarn.lock'),
  testsSetup: resolveApp('src/setupTests.js'),
  appNodeModules: resolveApp('node_modules'),
  publicUrl: getPublicUrl(resolveApp('package.json')),
  servedPath: getServedPath(resolveApp('package.json')),
};

// @remove-on-eject-begin
const resolveOwn = relativePath => path.resolve(__dirname, '..', relativePath);

// config before eject: we're in ./node_modules/tscomp/config/
module.exports = {
  dotenv: resolveApp('.env'),
  appPath: resolveApp('.'),
  appBuild: resolveAppBuild(resolveApp('tsconfig.json')),
  appBuildCjs: resolveApp('cjs'),
  appPublic: resolveApp('public'),
  appHtml: resolveApp('public/index.html'),
  appIndexJs: findFileExtension(resolveApp('src/index')),
  appBuildIndexJs: resolveApp('build/index.js'),
  appPackageJson: resolveApp('package.json'),
  appTsConfig: resolveApp('tsconfig.json'),
  appSrc: resolveApp('src'),
  appTypings: resolveApp('typings'),
  yarnLockFile: resolveApp('yarn.lock'),
  testsSetup: resolveApp('src/setupTests.js'),
  appNodeModules: resolveApp('node_modules'),
  publicUrl: getPublicUrl(resolveApp('package.json')),
  servedPath: getServedPath(resolveApp('package.json')),
  // These properties only exist before ejecting:
  ownPath: resolveOwn('.'),
  ownNodeModules: resolveOwn('node_modules'), // This is empty on npm 3
};

const ownPackageJson = require('../package.json');
const reactScriptsPath = resolveApp(`node_modules/${ownPackageJson.name}`);
const reactScriptsLinked = fs.existsSync(reactScriptsPath) &&
  fs.lstatSync(reactScriptsPath).isSymbolicLink();

// config before publish: we're in ./tscomp/config/
if (
  !reactScriptsLinked &&
  __dirname.indexOf(path.join('tscomp', 'config')) !== -1 &&
  __dirname.indexOf(path.join('node_modules', 'tscomp', 'config')) === -1
) {
  module.exports = {
    dotenv: resolveOwn('template/.env'),
    appPath: resolveApp('.'),
    appBuild: resolveOwn('build'),
    appBuildCjs: resolveOwn('cjs'),
    appPublic: resolveOwn('template/public'),
    appHtml: resolveOwn('template/public/index.html'),
    appIndexJs: findFileExtension(resolveOwn('template/src/index')),
    appBuildIndexJs: resolveOwn('build/index.js'),
    appPackageJson: resolveOwn('package.json'),
    appTsConfig: resolveOwn('template/tsconfig.json'),
    appSrc: resolveOwn('template/src'),
    appTypings: resolveApp('template/typings'),
    yarnLockFile: resolveOwn('template/yarn.lock'),
    testsSetup: resolveOwn('template/src/setupTests.js'),
    appNodeModules: resolveOwn('node_modules'),
    publicUrl: getPublicUrl(resolveOwn('package.json')),
    servedPath: getServedPath(resolveOwn('package.json')),
    // These properties only exist before ejecting:
    ownPath: resolveOwn('.'),
    ownNodeModules: resolveOwn('node_modules'),
  };
}
// @remove-on-eject-end
