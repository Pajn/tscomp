#!/bin/bash
# Copyright (c) 2015-present, Facebook, Inc.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

# ******************************************************************************
# This is an end-to-end test intended to run on CI.
# You can also run it locally but it's slow.
# ******************************************************************************

# Start in tasks/ even if run from root directory
cd "$(dirname "$0")"

# App temporary location
# http://unix.stackexchange.com/a/84980
temp_app_path=`mktemp -d 2>/dev/null || mktemp -d -t 'temp_app_path'`
custom_registry_url=http://localhost:4873
original_npm_registry_url=`npm get registry`
original_yarn_registry_url=`yarn config get registry`

function cleanup {
  echo 'Cleaning up.'
  cd "$root_path"
  # Uncomment when snapshot testing is enabled by default:
  # rm ./packages/tscomp-scripts/template/src/__snapshots__/App.test.js.snap
  rm -rf "$temp_app_path"
  npm set registry "$original_npm_registry_url"
  yarn config set registry "$original_yarn_registry_url"
}

# Error messages are redirected to stderr
function handle_error {
  echo "$(basename $0): ERROR! An error was encountered executing line $1." 1>&2;
  cleanup
  echo 'Exiting with error.' 1>&2;
  exit 1
}

function handle_exit {
  cleanup
  echo 'Exiting without error.' 1>&2;
  exit
}

# Check for the existence of one or more files.
function exists {
  for f in $*; do
    test -e "$f"
  done
}

# Exit the script with a helpful error message when any error is encountered
trap 'set +x; handle_error $LINENO $BASH_COMMAND' ERR

# Cleanup before exit on any termination signal
trap 'set +x; handle_exit' SIGQUIT SIGTERM SIGINT SIGKILL SIGHUP

# Echo every command being executed
set -x

# Go to root
cd ..
root_path=$PWD

if hash npm 2>/dev/null
then
  npm i -g npm@latest
fi

# Bootstrap monorepo
yarn

# Start local registry
tmp_registry_log=`mktemp`
(cd && nohup npx verdaccio@3.8.2 -c "$root_path"/tasks/verdaccio.yaml &>$tmp_registry_log &)
# Wait for `verdaccio` to boot
grep -q 'http address' <(tail -f $tmp_registry_log)

# Set registry to local registry
npm set registry "$custom_registry_url"
yarn config set registry "$custom_registry_url"

# Login so we can publish packages
(cd && npx npm-auth-to-token@1.0.0 -u user -p password -e user@example.com -r "$custom_registry_url")

# Lint own code
./node_modules/.bin/eslint --max-warnings 0 packages/create-tscomp-project/
./node_modules/.bin/eslint --max-warnings 0 packages/tscomp-scripts/

# ******************************************************************************
# First, test the tscomp development environment.
# This does not affect our users but makes sure we can develop it.
# ******************************************************************************

git clean -df
./tasks/publish.sh --yes --force-publish=* --skip-git --cd-version=prerelease --exact --npm-tag=latest

# ******************************************************************************
# Install tscomp-scripts prerelease via create-tscomp-project prerelease.
# ******************************************************************************

# Install the app in a temporary location
cd $temp_app_path
npx create-tscomp-project lib test-library

# TODO: verify we installed prerelease

# ******************************************************************************
# Now that we used create-tscomp-project to create an app depending on tscomp-scripts,
# let's make sure all npm scripts are in the working state.
# ******************************************************************************

function test_change_outdir {
  files_to_check=( "$@" )

  # Backup package.json because we're going to make it dirty
  cp tsconfig.json tsconfig.json.orig

  sed 's/\"outDir\": \"\w*\"/\"outDir\": \"other\"/' tsconfig.json > tmp && mv tmp tsconfig.json

  yarn build

  for file in "${files_to_check[@]}"
  do
    exists "other/$file" || exit 1
  done

  # Restore tsconfig.json
  rm tsconfig.json
  mv tsconfig.json.orig tsconfig.json
  rm -rf other
}

function verify_module_scope {
  # Create stub json file
  echo "{}" >> sample.json

  # Save App.tsx, we're going to modify it
  cp src/index.ts src/index.ts.bak

  # Add an out of scope import
  echo "import sampleJson from '../sample'" | cat - src/index.ts > src/index.ts.temp && mv src/index.ts.temp src/index.ts

  # Make sure the build fails
  yarn build; test $? -eq 1 || exit 1
  # TODO: check for error message

  rm sample.json

  # Restore index.ts
  rm src/index.ts
  mv src/index.ts.bak src/index.ts
}

# Enter the app directory
cd test-library

# Test the build
yarn build
# Check for expected output
exists lib/index.js
exists lib/index.d.ts
exists cjs/index.js
exists cjs/index.d.ts

# Run tests with CI flag
CI=true yarn test
# Uncomment when snapshot testing is enabled by default:
# exists src/__snapshots__/App.test.js.snap

# Test changing outDir
test_change_outdir index.js index.d.ts

# ******************************************************************************
# Finally, let's check that everything still works after ejecting.
# ******************************************************************************

# Eject...
echo yes | npm run eject

# Test the build
yarn build
# Check for expected output
exists lib/index.js
exists lib/index.d.ts
exists cjs/index.js
exists cjs/index.d.ts

# Run tests, overriding the watch option to disable it.
# `CI=true yarn test` won't work here because `yarn test` becomes just `jest`.
# We should either teach Jest to respect CI env variable, or make
# `scripts/test.js` survive ejection (right now it doesn't).
yarn test --watch=no
# Uncomment when snapshot testing is enabled by default:
# exists src/__snapshots__/App.test.js.snap

# Test changing outDir
test_change_outdir index.js index.d.ts

# Cleanup
cleanup
