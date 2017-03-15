'use strict';

const gulp = require('gulp')
const babel = require('gulp-babel')
const plumber = require('gulp-plumber')
const sourcemaps = require('gulp-sourcemaps')
const ts = require('gulp-typescript')
const merge = require('merge2')
const path = require('path')

const appPaths = require('./paths')

const src = appPaths.appSrc
const outDir = appPaths.appBuild

const paths = [
  `${src}/**/*.js`,
  `${src}/**/*.jsx`,
  `${src}/**/*.ts`,
  `${src}/**/*.tsx`,
  'typings/**/*.d.ts'
]

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
}

function build(dir, cb) {
  buildTs(dir, err => {
    if (err) {
      cb(err)
    } else {
      cb()
    }
  })
}

function buildTs(dir, cb) {
  const appTsConfig = require(path.join(dir, 'tsconfig.json'))
  const tsStream = gulp.src(paths)
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(ts.createProject(Object.assign({}, baseCompilerOptions, appTsConfig.compilerOptions))())

  const merged = merge([
    tsStream.js.pipe(babel({
      babelrc: false,
      filename: path,
      presets: [require.resolve('babel-preset-react-app')],
    }))
      .pipe(sourcemaps.write('.')),
    tsStream.dts,
  ])
    .pipe(gulp.dest(outDir))

  merged.on('end', () => cb())
  merged.on('error', err => cb(err))
}

function watch(dir, cb) {
  gulp.watch(paths, () => {
    console.info('changes detected, rebuilding...')
    buildTs(dir, cb)
  })
}

module.exports.build = build
module.exports.watch = watch
