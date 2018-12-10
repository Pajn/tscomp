const babelOptions = {
  presets: [['react-app', { allowESModules: false, flow: false }]],
};

module.exports = require('babel-jest').createTransformer(babelOptions);
