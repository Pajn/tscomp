#!/usr/bin/env node
/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const cprocess = require('child_process');
const fse = require('fs-extra');
const os = require('os');
const path = require('path');

const temp = path.join(os.tmpdir(), `tscomp-compile-lockfile`);

try {
  // Ensures that we start from a clean state
  fse.removeSync(temp);
  fse.mkdirSync(temp);

  // Create an empty package.json that we'll populate
  fse.writeFileSync(path.join(temp, 'package.json'), '{}');

  // Extract the dependencies from tscomp-scripts (which is a workspace)
  const dependencies = require('tscomp-scripts/package.json').dependencies;
  const descriptors = Object.keys(dependencies).map(
    dep => `${dep}@${dependencies[dep]}`
  );

  // Run "yarn add" with all the dependencies of tscomp-scripts
  cprocess.execFileSync('yarn', ['add', ...descriptors], { cwd: temp });

  // Store the generated lockfile in create-tscomp-project
  // We can't store it inside tscomp-scripts, because we need it even before tscomp-scripts is installed
  fse.copySync(
    path.join(temp, 'yarn.lock'),
    path.join(
      __dirname,
      '..',
      'packages',
      'create-tscomp-project',
      'yarn.lock.cached'
    )
  );
} finally {
  fse.removeSync(temp);
}
