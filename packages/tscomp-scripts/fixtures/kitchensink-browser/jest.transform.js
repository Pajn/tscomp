const babelOptions = {
  presets: [['tscomp', { useESModules: false, taget: 'node' }]],
  plugins: ['@babel/plugin-transform-modules-commonjs'],
};

module.exports = require('babel-jest').createTransformer(babelOptions);
