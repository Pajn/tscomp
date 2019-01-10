const babelOptions = {
  presets: [['react-app', { useESModules: false }]],
};

module.exports = require('babel-jest').createTransformer(babelOptions);
