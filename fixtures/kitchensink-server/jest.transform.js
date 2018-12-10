const babelOptions = {
  presets: [['react-app', { allowESModules: false, flow: false }]],
  plugins: ['@babel/plugin-transform-modules-commonjs'],
};

module.exports = require('babel-jest').createTransformer(babelOptions);
