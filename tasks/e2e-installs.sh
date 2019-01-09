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
custom_registry_url=http://localhost:4873
original_npm_registry_url=`npm get registry`
original_yarn_registry_url=`yarn config get registry`

function cleanup {
  echo 'Cleaning up.'
  cd "$root_path"
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
  npm i -g npm@latest
fi

# Bootstrap monorepo
yarn

# ******************************************************************************
# First, publish tscomp.
# ******************************************************************************

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

# Publish the monorepo
# git clean -df]]===========
npm version prerelease --force --no-git-tag-version
"$root_path/tasks/publish.sh" --yes --force-publish=* --skip-git --exact --npm-tag=latest

echo "Tscomp Version: "
npx tscomp new --version

# ******************************************************************************
# Test --scripts-version with a distribution tag
# ******************************************************************************

cd "$temp_app_path"
npx tscomp new lib --scripts-version=@latest test-app-dist-tag
cd test-app-dist-tag

# Check corresponding scripts version is installed and no TypeScript is present.
exists node_modules/tscomp
exists src/index.ts
! exists src/index.tsx
# checkDependencies

# ******************************************************************************
# Test project folder is deleted on failing package installation
# ******************************************************************************

cd "$temp_app_path"
# we will install a non-existing package to simulate a failed installataion.
npx tscomp new lib --scripts-version=`date +%s` test-app-should-not-exist || true
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
npx tscomp new lib --scripts-version=`date +%s` test-app-should-remain || true
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
npx tscomp new browser test-app-nested-paths-t1/aa/bb/cc/dd
cd test-app-nested-paths-t1/aa/bb/cc/dd
yarn start --smoke-test

# Testing a path that does not exist
cd "$temp_app_path"
npx tscomp new browser test-app-nested-paths-t2/aa/bb/cc/dd
cd test-app-nested-paths-t2/aa/bb/cc/dd
yarn start --smoke-test

# Testing a path that is half exists
cd "$temp_app_path"
mkdir -p test-app-nested-paths-t3/aa
npx tscomp new browser test-app-nested-paths-t3/aa/bb/cc/dd
cd test-app-nested-paths-t3/aa/bb/cc/dd
yarn start --smoke-test

# ******************************************************************************
# Test when PnP is enabled
# ******************************************************************************
# cd "$temp_app_path"
# npx tscomp new browser test-app-pnp --use-pnp
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
npx tscomp new browser test-browser
cd test-browser
exists node_modules/react
exists node_modules/tscomp
exists src/index.tsx
! exists src/index.ts
yarn start --smoke-test
yarn build

# Testing a server project
cd "$temp_app_path"
npx tscomp new server test-server
cd test-server
! exists node_modules/react
exists node_modules/tscomp
exists src/index.ts
! exists src/index.tsx
yarn start --smoke-test
yarn build

# Cleanup
cleanup
