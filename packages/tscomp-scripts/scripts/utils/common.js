'use strict';

const chalk = require('react-dev-utils/chalk');
const utilCheckRequiredFiles = require('react-dev-utils/checkRequiredFiles');

// Print out errors
module.exports.printErrors = function printErrors(summary, errors) {
  console.log(chalk.red(summary));
  console.log();
  errors.forEach(err => {
    console.log(err.message || err);
    console.log();
  });
};

module.exports.getMode = function getMode(packageJsonPath) {
  const mode = (require(packageJsonPath).tscomp || {}).mode;

  if (['browser', 'server', 'lib'].indexOf(mode) === -1) {
    console.error(
      'No or invalid mode specified. Specify a mode by adding "tscomp": {"mode": "browser"} to your package.json'
    );
    process.exit(1);
  }

  return mode;
};

module.exports.checkRequiredFiles = function checkRequiredFiles(mode, paths) {
  // Warn and crash if required files are missing
  if (!utilCheckRequiredFiles([paths.appIndexJs])) {
    process.exit(1);
  }
  if (mode === 'browser') {
    if (!utilCheckRequiredFiles([paths.appHtml])) {
      process.exit(1);
    }
  }
};
