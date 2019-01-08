// @remove-file-on-eject
/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err;
});

const validateProjectName = require('validate-npm-package-name');
const chalk = require('chalk');
const commander = require('commander');
const fs = require('fs-extra');
const path = require('path');
const execSync = require('child_process').execSync;
const spawn = require('cross-spawn');
const semver = require('semver');
const dns = require('dns');
const tmp = require('tmp');
const unpack = require('tar-pack').unpack;
const hyperquest = require('hyperquest');

let projectType;
let projectName;

let typeNames = {
  browser: 'React app',
  server: 'server app',
  lib: 'library package',
};

const program = commander
  .version(require('../package.json').version)
  .arguments('<type> <project-directory>')
  .usage(`${chalk.green('<type> <project-directory>')} [options]`)
  .action((type, name) => {
    projectType = type;
    projectName = name;
  })
  .option('--verbose', 'print additional logs')
  .option(
    '--scripts-version <alternative-package>',
    'use a non-standard version of tscomp'
  )
  .allowUnknownOption()
  .on('--help', () => {
    console.log(
      `    Only ${chalk.green('<type> <project-directory>')} is required.`
    );
    console.log();
    console.log(`    ${chalk.cyan('<type>')} can be one of:`);
    console.log(`      - browser: A react browser app`);
    console.log(`      - server: A server app`);
    console.log(
      `      - lib: A package that can be used in either a browser or server app`
    );
    console.log();
    console.log(
      `    A custom ${chalk.cyan('--scripts-version')} can be one of:`
    );
    console.log(`      - a specific npm version: ${chalk.green('0.8.2')}`);
    console.log(
      `      - a custom fork published on npm: ${chalk.green('my-tscomp')}`
    );
    console.log(
      `      - a .tgz archive: ${chalk.green(
        'https://mysite.com/my-tscomp-0.8.2.tgz'
      )}`
    );
    console.log(
      `    It is not needed unless you specifically want to use a fork.`
    );
    console.log();
    console.log(
      `    If you have any problems, do not hesitate to file an issue:`
    );
    console.log(
      `      ${chalk.cyan('https://github.com/pajn/tscomp/issues/new')}`
    );
    console.log();
  })
  .parse(process.argv);

if (typeof projectType === 'undefined') {
  console.error('Please specify the project type:');
  console.log(
    `  ${chalk.cyan(program.name())} ${chalk.green(
      '<type> <project-directory>'
    )}`
  );
  console.log();
  console.log('For example:');
  console.log(
    `  ${chalk.cyan(program.name())} ${chalk.green('browser my-react-app')}`
  );
  console.log();
  console.log(
    `Run ${chalk.cyan(`${program.name()} --help`)} to see all options.`
  );
  process.exit(1);
} else if (['browser', 'server', 'lib'].indexOf(projectType) === -1) {
  console.error('Unknown project type: ' + projectType);
  console.log();
  console.log('Must be one of:');
  console.log(`  ${chalk.green('browser server')} and ${chalk.green('lib')}`);
  console.log();
  console.log(
    `Run ${chalk.cyan(`${program.name()} --help`)} to see all options.`
  );
  process.exit(1);
}

if (typeof projectName === 'undefined') {
  console.error('Please specify the project directory:');
  console.log(
    `  ${chalk.cyan(program.name())} ${projectType} ${chalk.green(
      '<project-directory>'
    )}`
  );
  console.log();
  console.log('For example:');
  console.log(
    `  ${chalk.cyan(program.name())} ${projectType} ${chalk.green(
      'my-react-app'
    )}`
  );
  console.log();
  console.log(
    `Run ${chalk.cyan(`${program.name()} --help`)} to see all options.`
  );
  process.exit(1);
}

function printValidationResults(results) {
  if (typeof results !== 'undefined') {
    results.forEach(error => {
      console.error(chalk.red(`  *  ${error}`));
    });
  }
}

const hiddenProgram = new commander.Command()
  .option(
    '--internal-testing-template <path-to-template>',
    '(internal usage only, DO NOT RELY ON THIS) ' +
      'use a non-standard application template'
  )
  .parse(process.argv);

createApp(
  projectName,
  program.verbose,
  program.scriptsVersion,
  hiddenProgram.internalTestingTemplate
);

function createApp(name, verbose, version, template) {
  const root = path.resolve(name);
  const appName = path.basename(root);

  checkAppName(appName);
  fs.ensureDirSync(name);
  if (!isSafeToCreateProjectIn(root, name)) {
    process.exit(1);
  }

  console.log(
    `Creating a new ${typeNames[projectType]} in ${chalk.green(root)}.`
  );
  console.log();

  const packageJson = {
    name: appName,
    version: '0.1.0',
    private: true,
  };
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  const originalDirectory = process.cwd();
  process.chdir(root);

  run(root, appName, version, verbose, originalDirectory, template);
}

function shouldUseYarn() {
  try {
    execSync('yarnpkg --version', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

function install(useYarn, dependencies, verbose, { isOnline, isDev, isExact }) {
  return new Promise((resolve, reject) => {
    let command;
    let args;
    if (useYarn) {
      command = 'yarnpkg';
      args = ['add', isDev ? '--dev' : '', isExact ? '--exact' : ''].filter(
        arg => !!arg
      );
      if (!isOnline) {
        args.push('--offline');
      }
      [].push.apply(args, dependencies);

      if (!isOnline) {
        console.log(chalk.yellow('You appear to be offline.'));
        console.log(chalk.yellow('Falling back to the local Yarn cache.'));
        console.log();
      }
    } else {
      checkNpmVersion();
      command = 'npm';
      args = [
        'install',
        isDev ? '--save-dev' : '--save',
        isExact ? '--save-exact' : '',
      ]
        .filter(arg => !!arg)
        .concat(dependencies);
    }

    if (verbose) {
      args.push('--verbose');
    }

    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('close', code => {
      if (code !== 0) {
        reject({
          command: `${command} ${args.join(' ')}`,
        });
        return;
      }
      resolve();
    });
  });
}

function run(root, appName, version, verbose, originalDirectory, template) {
  const packageToInstall = getInstallPackage(version);
  let dependencies = [];
  let devDependencies = ['@types/jest', 'babel-core@7.0.0-bridge.0'];
  if (projectType === 'browser') {
    dependencies = dependencies.concat([
      'react',
      'react-dom',
      '@types/react',
      '@types/react-dom',
      '@types/webpack-env',
    ]);
  } else if (projectType === 'server') {
    dependencies = dependencies.concat(['@types/node', '@babel/runtime']);
  } else if (projectType === 'lib') {
    dependencies = dependencies.concat(['@babel/runtime']);
  }
  const allDependencies = [].concat(dependencies).concat(devDependencies);

  console.log('Installing packages. This might take a couple minutes.');

  const useYarn = shouldUseYarn();
  getPackageName(packageToInstall)
    .then(packageName =>
      checkIfOnline(useYarn).then(isOnline => ({
        isOnline: isOnline,
        packageName: packageName,
      }))
    )
    .then(info => {
      const isOnline = info.isOnline;
      const packageName = info.packageName;
      console.log(
        `Installing ${allDependencies
          .map(name => chalk.cyan(name))
          .join(', ')}, and ${chalk.cyan(packageName)}...`
      );
      console.log();

      return install(useYarn, [packageToInstall], verbose, {
        isOnline,
        isExact: true,
      })
        .then(() => install(useYarn, dependencies, verbose, { isOnline }))
        .then(() =>
          install(useYarn, devDependencies, verbose, { isOnline, isDev: true })
        )
        .then(() => packageName);
    })
    .then(packageName => {
      checkNodeVersion(packageName);

      // Since tscomp has been installed with --save
      // we need to move it into devDependencies and rewrite package.json
      // also ensure react dependencies have caret version range
      fixDependencies(packageName);

      const scriptsPath = path.resolve(
        process.cwd(),
        'node_modules',
        packageName,
        'scripts',
        'init.js'
      );
      const init = require(scriptsPath);
      init(root, appName, projectType, verbose, originalDirectory, template);
    })
    .catch(reason => {
      console.log();
      console.log('Aborting installation.');
      if (reason.command) {
        console.log(`  ${chalk.cyan(reason.command)} has failed.`);
      } else {
        console.log(chalk.red('Unexpected error. Please report it as a bug:'));
        console.log(reason);
      }
      console.log();

      // On 'exit' we will delete these files from target directory.
      const knownGeneratedFiles = [
        'package.json',
        'npm-debug.log',
        'yarn-error.log',
        'yarn-debug.log',
        'node_modules',
      ];
      const currentFiles = fs.readdirSync(path.join(root));
      currentFiles.forEach(file => {
        knownGeneratedFiles.forEach(fileToMatch => {
          // This will catch `(npm-debug|yarn-error|yarn-debug).log*` files
          // and the rest of knownGeneratedFiles.
          if (
            (fileToMatch.match(/.log/g) && file.indexOf(fileToMatch) === 0) ||
            file === fileToMatch
          ) {
            console.log(`Deleting generated file... ${chalk.cyan(file)}`);
            fs.removeSync(path.join(root, file));
          }
        });
      });
      const remainingFiles = fs.readdirSync(path.join(root));
      if (!remainingFiles.length) {
        // Delete target folder if empty
        console.log(
          `Deleting ${chalk.cyan(`${appName} /`)} from ${chalk.cyan(
            path.resolve(root, '..')
          )}`
        );
        process.chdir(path.resolve(root, '..'));
        fs.removeSync(path.join(root));
      }
      console.log('Done.');
      process.exit(1);
    });
}

function getInstallPackage(version) {
  let packageToInstall = 'tscomp';
  const validSemver = semver.valid(version);
  if (validSemver) {
    packageToInstall += `@${validSemver}`;
  } else if (version) {
    // for tar.gz or alternative paths
    packageToInstall = version;
  }
  return packageToInstall;
}

function getTemporaryDirectory() {
  return new Promise((resolve, reject) => {
    // Unsafe cleanup lets us recursively delete the directory if it contains
    // contents; by default it only allows removal if it's empty
    tmp.dir({ unsafeCleanup: true }, (err, tmpdir, callback) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          tmpdir: tmpdir,
          cleanup: () => {
            try {
              callback();
            } catch (ignored) {
              // Callback might throw and fail, since it's a temp directory the
              // OS will clean it up eventually...
            }
          },
        });
      }
    });
  });
}

function extractStream(stream, dest) {
  return new Promise((resolve, reject) => {
    stream.pipe(
      unpack(dest, err => {
        if (err) {
          reject(err);
        } else {
          resolve(dest);
        }
      })
    );
  });
}

// Extract package name from tarball url or path.
function getPackageName(installPackage) {
  if (installPackage.indexOf('.tgz') > -1) {
    return getTemporaryDirectory()
      .then(obj => {
        let stream;
        if (/^http/.test(installPackage)) {
          stream = hyperquest(installPackage);
        } else {
          stream = fs.createReadStream(installPackage);
        }
        return extractStream(stream, obj.tmpdir).then(() => obj);
      })
      .then(obj => {
        const packageName = require(path.join(obj.tmpdir, 'package.json')).name;
        obj.cleanup();
        return packageName;
      })
      .catch(err => {
        // The package name could be with or without semver version, e.g. tscomp-0.2.0-alpha.1.tgz
        // However, this function returns package name only without semver version.
        console.log(
          `Could not extract the package name from the archive: ${err.message}`
        );
        const assumedProjectName = installPackage.match(
          /^.+\/(.+?)(?:-\d+.+)?\.tgz$/
        )[1];
        console.log(
          `Based on the filename, assuming it is "${chalk.cyan(
            assumedProjectName
          )}"`
        );
        return Promise.resolve(assumedProjectName);
      });
  } else if (installPackage.indexOf('git+') === 0) {
    // Pull package name out of git urls e.g:
    // git+https://github.com/mycompany/tscomp.git
    // git+ssh://github.com/mycompany/tscomp.git#v1.2.3
    return Promise.resolve(installPackage.match(/([^/]+)\.git(#.*)?$/)[1]);
  } else if (installPackage.match(/.+@/)) {
    // Do not match @scope/ when stripping off @version or @tag
    return Promise.resolve(
      installPackage.charAt(0) + installPackage.substr(1).split('@')[0]
    );
  }
  return Promise.resolve(installPackage);
}

function checkNpmVersion() {
  let isNpm2 = false;
  try {
    const npmVersion = execSync('npm --version').toString();
    isNpm2 = semver.lt(npmVersion, '3.0.0');
  } catch (err) {
    return;
  }
  if (!isNpm2) {
    return;
  }
  console.log(chalk.yellow('It looks like you are using npm 2.'));
  console.log(
    chalk.yellow(
      'We suggest using npm 3 or Yarn for faster install times ' +
        'and less disk space usage.'
    )
  );
  console.log();
}

function checkNodeVersion(packageName) {
  const packageJsonPath = path.resolve(
    process.cwd(),
    'node_modules',
    packageName,
    'package.json'
  );
  const packageJson = require(packageJsonPath);
  if (!packageJson.engines || !packageJson.engines.node) {
    return;
  }

  if (!semver.satisfies(process.version, packageJson.engines.node)) {
    console.error(
      chalk.red(
        'You are running Node %s.\n' +
          'Create React App requires Node %s or higher. \n' +
          'Please update your version of Node.'
      ),
      process.version,
      packageJson.engines.node
    );
    process.exit(1);
  }
}

function checkAppName(appName) {
  const validationResult = validateProjectName(appName);
  if (!validationResult.validForNewPackages) {
    console.error(
      `Could not create a project called ${chalk.red(
        `"${appName}"`
      )} because of npm naming restrictions:`
    );
    printValidationResults(validationResult.errors);
    printValidationResults(validationResult.warnings);
    process.exit(1);
  }

  // TODO: there should be a single place that holds the dependencies
  const dependencies = ['react', 'react-dom'];
  const devDependencies = ['tscomp'];
  const allDependencies = dependencies.concat(devDependencies).sort();
  if (allDependencies.indexOf(appName) >= 0) {
    console.error(
      chalk.red(
        `We cannot create a project called ${chalk.green(
          appName
        )} because a dependency with the same name exists.\n` +
          `Due to the way npm works, the following names are not allowed:\n\n`
      ) +
        chalk.cyan(allDependencies.map(depName => `  ${depName}`).join('\n')) +
        chalk.red('\n\nPlease choose a different project name.')
    );
    process.exit(1);
  }
}

function makeCaretRange(dependencies, name) {
  const version = dependencies[name];

  if (typeof version === 'undefined') {
    console.error(chalk.red(`Missing ${name} dependency in package.json`));
    process.exit(1);
  }

  let patchedVersion = `^${version}`;

  if (!semver.validRange(patchedVersion)) {
    console.error(
      `Unable to patch ${name} dependency version because version ${chalk.red(
        version
      )} will become invalid ${chalk.red(patchedVersion)}`
    );
    patchedVersion = version;
  }

  dependencies[name] = patchedVersion;
}

function fixDependencies(packageName) {
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageJson = require(packagePath);

  if (typeof packageJson.dependencies === 'undefined') {
    console.error(chalk.red('Missing dependencies in package.json'));
    process.exit(1);
  }

  const packageVersion = packageJson.dependencies[packageName];

  if (typeof packageVersion === 'undefined') {
    console.error(chalk.red(`Unable to find ${packageName} in package.json`));
    process.exit(1);
  }

  packageJson.devDependencies = packageJson.devDependencies || {};
  packageJson.devDependencies[packageName] = packageVersion;
  delete packageJson.dependencies[packageName];

  if (projectType === 'browser') {
    makeCaretRange(packageJson.dependencies, 'react');
    makeCaretRange(packageJson.dependencies, 'react-dom');
  }

  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
}

// If project only contains files generated by GH, it’s safe.
// We also special case IJ-based products .idea because it integrates with CRA:
// https://github.com/facebook/create-react-app/pull/368#issuecomment-243446094
function isSafeToCreateProjectIn(root, name) {
  const validFiles = [
    '.DS_Store',
    'Thumbs.db',
    '.git',
    '.gitignore',
    '.idea',
    'README.md',
    'LICENSE',
    'web.iml',
    '.hg',
    '.hgignore',
    '.hgcheck',
  ];
  console.log();

  const conflicts = fs
    .readdirSync(root)
    .filter(file => !validFiles.includes(file));
  if (conflicts.length < 1) {
    return true;
  }

  console.log(
    `The directory ${chalk.green(name)} contains files that could conflict:`
  );
  console.log();
  for (const file of conflicts) {
    console.log(`  ${file}`);
  }
  console.log();
  console.log(
    'Either try using a new directory name, or remove the files listed above.'
  );

  return false;
}

function checkIfOnline(useYarn) {
  if (!useYarn) {
    // Don't ping the Yarn registry.
    // We'll just assume the best case.
    return Promise.resolve(true);
  }

  return new Promise(resolve => {
    dns.resolve('registry.yarnpkg.com', err => {
      if (err != null && process.env.https_proxy) {
        // If a proxy is defined, we likely can't resolve external hostnames.
        // Try to resolve the proxy name as an indication of a connection.
        dns.lookup(url.parse(process.env.https_proxy).hostname, proxyErr => {
          resolve(proxyErr == null);
        });
      } else {
        resolve(err == null);
      }
    });
  });
}
