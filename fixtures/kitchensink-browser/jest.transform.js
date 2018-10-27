const babelOptions = {
  presets: [['react-app', { allowESModules: false }]],
};

module.exports = require('babel-jest').createTransformer(babelOptions);
