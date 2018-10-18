// @remove-on-eject-begin
/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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

// The user may choose to change the tsconfig.json `outDir` property.
function resolveAppBuild(appTsConfigPath) {
  const outDir = getAppBuildFolder(appTsConfigPath);
  const buildPath = path.join(path.dirname(appTsConfigPath), outDir);
  return buildPath;
}

const envPublicUrl = process.env.PUBLIC_URL;

function ensureSlash(inputPath, needsSlash) {
  const hasSlash = inputPath.endsWith('/');
  if (hasSlash && !needsSlash) {
    return inputPath.substr(inputPath, inputPath.length - 1);
  } else if (!hasSlash && needsSlash) {
    return `${inputPath}/`;
  } else {
    return inputPath;
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
  const servedUrl =
    envPublicUrl || (publicUrl ? url.parse(publicUrl).pathname : '/');
  return ensureSlash(servedUrl, true);
}

const envUseAsyncTypechecks = ['true', '1', 'yes', 'y', 't'].includes(process.env.ASYNC_TYPECHECK)
  || (['false', '0', 'no', 'n', 'f'].includes(process.env.ASYNC_TYPECHECK) ? false : undefined);

function getUseAsyncTypechecks(appPackageJson) {
  if (envUseAsyncTypechecks !== undefined) return envUseAsyncTypechecks
  return (require(appPackageJson).tscomp || {}).asyncTypechecks || false;
}

// config after eject: we're in ./config/
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
  proxySetup: resolveApp('src/setupProxy.js'),
  appNodeModules: resolveApp('node_modules'),
  publicUrl: getPublicUrl(resolveApp('package.json')),
  servedPath: getServedPath(resolveApp('package.json')),
  useAsyncTypechecks: getUseAsyncTypechecks(resolveApp('package.json')),
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
  proxySetup: resolveApp('src/setupProxy.js'),
  appNodeModules: resolveApp('node_modules'),
  publicUrl: getPublicUrl(resolveApp('package.json')),
  servedPath: getServedPath(resolveApp('package.json')),
  useAsyncTypechecks: getUseAsyncTypechecks(resolveApp('package.json')),
  // These properties only exist before ejecting:
  ownPath: resolveOwn('.'),
  ownNodeModules: resolveOwn('node_modules'), // This is empty on npm 3
};

// detect if template should be used, ie. when cwd is react-scripts itself
const useTemplate =
  appDirectory === fs.realpathSync(path.join(__dirname, '..'));

if (useTemplate) {
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
    proxySetup: resolveApp('src/setupProxy.js'),
    appNodeModules: resolveOwn('node_modules'),
    publicUrl: getPublicUrl(resolveOwn('package.json')),
    servedPath: getServedPath(resolveOwn('package.json')),
    useAsyncTypechecks: getUseAsyncTypechecks(resolveApp('package.json')),
    // These properties only exist before ejecting:
    ownPath: resolveOwn('.'),
    ownNodeModules: resolveOwn('node_modules'),
  };
}
// @remove-on-eject-end

module.exports.getAppBuildFolder = getAppBuildFolder;

module.exports.srcPaths = [module.exports.appSrc];

module.exports.useYarn = fs.existsSync(
  path.join(module.exports.appPath, 'yarn.lock')
);
