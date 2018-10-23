const babelOptions = {
  presets: ["react-app"],
  plugins: ["@babel/plugin-transform-modules-commonjs"]
};

module.exports = require("babel-jest").createTransformer(babelOptions);
