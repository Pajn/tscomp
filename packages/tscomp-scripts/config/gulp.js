'use strict';

const chalk = require('chalk');
const gulp = require('gulp');
const babel = require('gulp-babel');
const changedInPlace = require('gulp-changed-in-place');
const clone = require('gulp-clone');
const plumber = require('gulp-plumber');
const sourcemaps = require('gulp-sourcemaps');
const ts = require('gulp-typescript');
const merge = require('merge2');
const path = require('path');

const appPaths = require('./paths');

const typescript = (() => {
  try {
    return require(path.join(appPaths.appNodeModules, 'typescript'));
  } catch (_) {
    return require('typescript');
  }
})();

const src = appPaths.appSrc;
const outDir = appPaths.appBuild;
const projectRelativeOutDir = appPaths.getAppBuildFolder(appPaths.appTsConfig);

const tsPaths = [
  `${src}/**/*.ts`,
  `${src}/**/*.tsx`,
  `${appPaths.appTypings}/**/*.d.ts`,
];

const jsPaths = [`${src}/**/*.js`, `${src}/**/*.jsx`];

const baseCompilerOptions = {
  module: 'es2015',
  target: 'es2015',
  outDir: appPaths.appBuild,
  rootDir: '.',
  forceConsistentCasingInFileNames: true,
  jsx: 'preserve',
  sourceMap: true,
  moduleResolution: 'node',
  typescript: typescript,
};

let tsProject;

function build(mode) {
  console.log(chalk.green(`Using typescript@${typescript.version}`));
  return buildTs(mode);
}

function buildTs(mode) {
  const appTsConfig = require(appPaths.appTsConfig);
  return new Promise((resolve, reject) => {
    function errorHandler(e) {
      reject(e);
      this.emit('end');
    }
    const tsStream = gulp
      .src(
        appTsConfig.compilerOptions.allowJs ? tsPaths.concat(jsPaths) : tsPaths
      )
      .pipe(plumber())
      .pipe(sourcemaps.init())
      .pipe(
        (tsProject ||
          (tsProject = ts.createProject(
            Object.assign({}, baseCompilerOptions, appTsConfig.compilerOptions)
          )))()
      );

    const babelPipe = tsStream.js
      .pipe(changedInPlace({ firstPass: true }))
      .pipe(
        babel({
          babelrc: false,
          filename: path,
          presets: [
            [
              require.resolve('babel-preset-react-app'),
              {
                useESModules: false,
                absoluteRuntime: false,
              },
            ],
          ],
          plugins:
            mode === 'lib'
              ? []
              : [
                  require.resolve('babel-plugin-dynamic-import-node'),
                  require.resolve('@babel/plugin-transform-modules-commonjs'),
                ],
        })
      )
      .on('error', errorHandler);

    const primaryStream = merge([
      babelPipe
        .pipe(
          sourcemaps.mapSources(sourcePath =>
            path.relative(
              path.resolve(
                projectRelativeOutDir,
                sourcePath.replace(/^..\/src/, '..')
              ),
              path.resolve(projectRelativeOutDir, sourcePath)
            )
          )
        )
        .pipe(sourcemaps.write('.')),
      tsStream.dts,
    ]).pipe(gulp.dest(outDir));

    const primaryPromise = new Promise((resolve, reject) => {
      primaryStream.on('end', resolve);
      primaryStream.on('error', reject);
    });

    const cjsPromise =
      mode === 'lib'
        ? new Promise((resolve, reject) => {
            const cjsStream = merge([
              babelPipe
                .pipe(clone())
                .pipe(
                  babel({
                    babelrc: false,
                    filename: path,
                    presets: [],
                    plugins: [
                      require.resolve('babel-plugin-dynamic-import-node'),
                      require.resolve(
                        '@babel/plugin-transform-modules-commonjs'
                      ),
                    ],
                  })
                )
                .pipe(sourcemaps.write('.')),
              tsStream.dts.pipe(clone()),
            ]).pipe(gulp.dest(appPaths.appBuildCjs));

            cjsStream.on('end', resolve);
            cjsStream.on('error', reject);
          })
        : Promise.resolve();

    return Promise.all([primaryPromise, cjsPromise]).then(resolve, reject);
  });
}

function watch(mode, cb) {
  const appTsConfig = require(appPaths.appTsConfig);
  gulp.watch(
    appTsConfig.compilerOptions.allowJs ? tsPaths.concat(jsPaths) : tsPaths,
    () => {
      console.info(chalk.blue('changes detected, rebuilding...'));
      return buildTs(mode)
        .then(() => cb())
        .catch(err => cb(err || true));
    }
  );
}

module.exports.build = build;
module.exports.watch = watch;
