const execa = require('execa');
const fs = require('fs-extra');
const path = require('path');
const tempy = require('tempy');
const ReactScripts = require('./scripts');

module.exports = class TestSetup {
  constructor(fixtureName, templateDirectory, { pnp = true } = {}) {
    this.fixtureName = fixtureName;

    this.templateDirectory = templateDirectory;
    this.testDirectory = null;
    this._scripts = null;

    this.setup = this.setup.bind(this);
    this.teardown = this.teardown.bind(this);

    this.isLocal = !(process.env.CI && process.env.CI !== 'false');
    this.settings = { pnp: pnp && !this.isLocal };
  }

  async setup() {
    await this.teardown();
    this.testDirectory = tempy.directory();
    await fs.copy(
      path.resolve(__dirname, '..', 'template'),
      this.testDirectory
    );
    await fs.copy(this.templateDirectory, this.testDirectory);
    await fs.remove(path.resolve(this.testDirectory, 'test.partial.js'));
    await fs.remove(path.resolve(this.testDirectory, '.disable-pnp'));

    const packageJson = await fs.readJson(
      path.resolve(this.testDirectory, 'package.json')
    );

    const shouldInstallScripts = !this.isLocal;
    if (shouldInstallScripts) {
      packageJson.dependencies = Object.assign({}, packageJson.dependencies, {
        'tscomp-scripts': 'latest',
      });
    }
    packageJson.scripts = Object.assign({}, packageJson.scripts, {
      start: 'tscomp start',
      build: 'tscomp build',
      test: 'tscomp test',
    });
    packageJson.license = packageJson.license || 'UNLICENSED';
    await fs.writeJson(
      path.resolve(this.testDirectory, 'package.json'),
      packageJson
    );

    if (this.settings.pnp) {
      await execa(
        'yarnpkg',
        ['install', '--enable-pnp', '--mutex', 'network'],
        { cwd: this.testDirectory }
      );
    } else {
      // yarn is unfotunately to buggy right now without pnp
      await execa('npm', ['install', '--no-package-lock'], {
        cwd: this.testDirectory,
      });
    }

    if (!shouldInstallScripts) {
      await fs.ensureSymlink(
        path.resolve(
          path.resolve(
            __dirname,
            '../../../..',
            'packages',
            'tscomp-scripts',
            'bin',
            'tscomp.js'
          )
        ),
        path.join(this.testDirectory, 'node_modules', '.bin', 'tscomp-scripts')
      );
      await execa('yarnpkg', ['link', 'tscomp-scripts'], {
        cwd: this.testDirectory,
      });
    }
  }

  get scripts() {
    if (this.testDirectory == null) {
      return null;
    }
    if (this._scripts == null) {
      this._scripts = new ReactScripts(this.testDirectory);
    }
    return this._scripts;
  }

  async teardown() {
    if (this.testDirectory != null) {
      await fs.remove(this.testDirectory);
      this.testDirectory = null;
      this._scripts = null;
    }
  }
};
