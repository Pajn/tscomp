'use strict';

const gulp = require('gulp');
const babel = require('gulp-babel');
const clone = require('gulp-clone');
const plumber = require('gulp-plumber');
const sourcemaps = require('gulp-sourcemaps');
const ts = require('gulp-typescript');
const merge = require('merge2');
const path = require('path');

const appPaths = require('./paths');

const src = appPaths.appSrc;
const outDir = appPaths.appBuild;

const paths = [
  `${src}/**/*.js`,
  `${src}/**/*.jsx`,
  `${src}/**/*.ts`,
  `${src}/**/*.tsx`,
  `${appPaths.appTypings}/**/*.d.ts`,
];

const baseCompilerOptions = {
  module: 'es2015',
  target: 'es2015',
  outDir: appPaths.appBuild,
  rootDir: '.',
  forceConsistentCasingInFileNames: true,
  jsx: 'preserve',
  sourceMap: true,
  moduleResolution: 'node',
  typescript: require('typescript'),
};

function build(dir, mode) {
  return buildTs(dir, mode);
}

function buildTs(dir, mode) {
  const appTsConfig = require(appPaths.appTsConfig);
  const tsStream = gulp
    .src(paths)
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(
      ts.createProject(
        Object.assign({}, baseCompilerOptions, appTsConfig.compilerOptions)
      )()
    );

  const babelPipe =
    tsStream.js
      .pipe(
        babel({
          babelrc: false,
          filename: path,
          presets: [require.resolve('babel-preset-react-app')],
          plugins: mode === 'lib'
            ? []
            : [require.resolve('babel-plugin-transform-es2015-modules-commonjs')]
          ,
        })
      )

  const primaryStream = merge([babelPipe.pipe(sourcemaps.write('.')), tsStream.dts])
    .pipe(gulp.dest(outDir))

  const primaryPromise = new Promise((resolve, reject) => {
    primaryStream.on('end', resolve)
    primaryStream.on('error', reject)
  })

  const cjsPromise = mode === 'lib'
    ? new Promise((resolve, reject) => {
        const cjsStream = merge([
          babelPipe
            .pipe(clone())
            .pipe(
              babel({
                babelrc: false,
                filename: path,
                presets: [],
                plugins: [require.resolve('babel-plugin-transform-es2015-modules-commonjs')]
                ,
              })
            )
            .pipe(sourcemaps.write('.')),
          tsStream.dts,
        ])
          .pipe(gulp.dest(appPaths.appBuildCjs))

        cjsStream.on('end', resolve)
        cjsStream.on('error', reject)
      })
    : Promise.resolve()

  return Promise.all([primaryPromise, cjsPromise])
}

function watch(dir, mode, cb) {
  gulp.watch(paths, () => {
    console.info('changes detected, rebuilding...');
    buildTs(dir, mode).then(() => cb()).catch(err => cb(err || true))
  });
}

module.exports.build = build;
module.exports.watch = watch;
