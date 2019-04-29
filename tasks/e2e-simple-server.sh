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

# Load functions for working with local NPM registry (Verdaccio)
source local-registry.sh

function cleanup {
  echo 'Cleaning up.'
  ps -ef | grep 'verdaccio' | grep -v grep | awk '{print $2}' | xargs kill -9
  cd "$root_path"
  # Uncomment when snapshot testing is enabled by default:
  # rm ./packages/tscomp-scripts/template/src/__snapshots__/App.test.js.snap
  rm -rf "$temp_app_path"

  # Restore the original NPM and Yarn registry URLs and stop Verdaccio
  stopLocalRegistry
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
  npm i -g npm@latest || true
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
# First, publish tscomp.
# ******************************************************************************

# Start the local NPM registry
startLocalRegistry "$root_path"/tasks/verdaccio.yaml

# Publish the monorepo
publishToLocalRegistry

echo "Tscomp Version: "
npx create-tscomp-project --version

# ******************************************************************************
# Install tscomp-scripts prerelease via create-tscomp-project prerelease.
# ******************************************************************************

# Install the app in a temporary location
cd $temp_app_path
npx create-tscomp-project server test-app

# TODO: verify we installed prerelease

# ******************************************************************************
# Common test utils
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

# Enter the app directory
cd test-app

# Test the build
yarn build
# Check for expected output
exists build/index.js

# Run tests with CI flag
CI=true yarn test
# Uncomment when snapshot testing is enabled by default:
# exists src/__snapshots__/App.test.js.snap

# Test the server
output=`yarn start --smoke-test`
[[ "$output" == *"To get started, edit src/index.ts and save to restart."* ]]

# Test changing outDir
test_change_outdir index.js

# ******************************************************************************
# Finally, let's check that everything still works after ejecting.
# ******************************************************************************

# Eject...
echo yes | yarn eject

# Test the build
yarn build
# Check for expected output
exists build/index.js

# Run tests, overriding the watch option to disable it.
# `CI=true yarn test` won't work here because `yarn test` becomes just `jest`.
# We should either teach Jest to respect CI env variable, or make
# `scripts/test.js` survive ejection (right now it doesn't).
yarn test --watch=no
# Uncomment when snapshot testing is enabled by default:
# exists src/__snapshots__/App.test.js.snap

# Test the server
output=`yarn start --smoke-test`
[[ "$output" == *"To get started, edit src/index.ts and save to restart."* ]]

# Test changing outDir
test_change_outdir index.js

# Cleanup
cleanup
