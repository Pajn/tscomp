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

# CLI and app temporary locations
# http://unix.stackexchange.com/a/84980
temp_app_path=`mktemp -d 2>/dev/null || mktemp -d -t 'temp_app_path'`

# Load functions for working with local NPM registry (Verdaccio)
source local-registry.sh

function cleanup {
  echo 'Cleaning up.'
  ps -ef | grep 'verdaccio' | grep -v grep | awk '{print $2}' | xargs kill -9
  cd "$root_path"
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

# Check for accidental dependencies in package.json
function checkDependencies {
  if ! awk '/"dependencies": {/{y=1;next}/},/{y=0; next}y' package.json | \
  grep -v -q -E '^\s*"react(-dom|-scripts)?"'; then
   echo "Dependencies are correct"
  else
   echo "There are extraneous dependencies in package.json"
   exit 1
  fi
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
# Test --scripts-version with a distribution tag
# ******************************************************************************

cd "$temp_app_path"
npx create-tscomp-project lib --scripts-version=@latest test-app-dist-tag
cd test-app-dist-tag

# Check corresponding scripts version is installed and no TypeScript is present.
exists node_modules/tscomp-scripts
exists src/index.ts
! exists src/index.tsx
# checkDependencies

# ******************************************************************************
# Test project folder is deleted on failing package installation
# ******************************************************************************

cd "$temp_app_path"
# we will install a non-existing package to simulate a failed installataion.
npx create-tscomp-project lib --scripts-version=`date +%s` test-app-should-not-exist || true
# confirm that the project files were deleted
test ! -e test-app-should-not-exist/package.json
test ! -d test-app-should-not-exist/node_modules

# ******************************************************************************
# Test project folder is not deleted when creating app over existing folder
# ******************************************************************************

cd "$temp_app_path"
mkdir test-app-should-remain
echo '## Hello' > ./test-app-should-remain/README.md
# we will install a non-existing package to simulate a failed installataion.
npx create-tscomp-project lib --scripts-version=`date +%s` test-app-should-remain || true
# confirm the file exist
test -e test-app-should-remain/README.md
# confirm only README.md and error log are the only files in the directory
if [ "$(ls -1 ./test-app-should-remain | wc -l | tr -d '[:space:]')" != "2" ]; then
  false
fi

# ******************************************************************************
# Test nested folder path as the project name
# ******************************************************************************

# Testing a path that exists
cd "$temp_app_path"
mkdir test-app-nested-paths-t1
cd test-app-nested-paths-t1
mkdir -p test-app-nested-paths-t1/aa/bb/cc/dd
npx create-tscomp-project browser test-app-nested-paths-t1/aa/bb/cc/dd
cd test-app-nested-paths-t1/aa/bb/cc/dd
yarn start --smoke-test

# Testing a path that does not exist
cd "$temp_app_path"
npx create-tscomp-project browser test-app-nested-paths-t2/aa/bb/cc/dd
cd test-app-nested-paths-t2/aa/bb/cc/dd
yarn start --smoke-test

# Testing a path that is half exists
cd "$temp_app_path"
mkdir -p test-app-nested-paths-t3/aa
npx create-tscomp-project browser test-app-nested-paths-t3/aa/bb/cc/dd
cd test-app-nested-paths-t3/aa/bb/cc/dd
yarn start --smoke-test

# ******************************************************************************
# Test when PnP is enabled
# ******************************************************************************
# cd "$temp_app_path"
# npx create-tscomp-project browser test-app-pnp --use-pnp
# cd test-app-pnp
# ! exists node_modules
# exists .pnp.js
# yarn start --smoke-test
# yarn build

# ******************************************************************************
# Test variants
# ******************************************************************************
# Testing a browser project
cd "$temp_app_path"
npx create-tscomp-project browser test-browser
cd test-browser
exists node_modules/react
exists node_modules/tscomp-scripts
exists src/index.tsx
! exists src/index.ts
yarn start --smoke-test
yarn build

# Testing a server project
cd "$temp_app_path"
npx create-tscomp-project server test-server
cd test-server
! exists node_modules/react
exists node_modules/tscomp-scripts
exists src/index.ts
! exists src/index.tsx
yarn start --smoke-test
yarn build

# Cleanup
cleanup
