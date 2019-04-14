const babelOptions = {
  presets: [['react-app', { useESModules: false }]],
  plugins: ['@babel/plugin-transform-modules-commonjs'],
};

module.exports = require('babel-jest').createTransformer(babelOptions);
