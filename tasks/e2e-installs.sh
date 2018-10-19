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
temp_cli_path=`mktemp -d 2>/dev/null || mktemp -d -t 'temp_cli_path'`
temp_app_path=`mktemp -d 2>/dev/null || mktemp -d -t 'temp_app_path'`

function cleanup {
  echo 'Cleaning up.'
  cd "$root_path"
  rm -rf "$temp_cli_path" "$temp_app_path"
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

function tscomp {
  node "$temp_cli_path"/node_modules/tscomp/bin/tscomp.js $*
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

# Clear cache to avoid issues with incorrect packages being used
if hash yarnpkg 2>/dev/null
then
  # AppVeyor uses an old version of yarn.
  # Once updated to 0.24.3 or above, the workaround can be removed
  # and replaced with `yarnpkg cache clean`
  # Issues:
  #    https://github.com/yarnpkg/yarn/issues/2591
  #    https://github.com/appveyor/ci/issues/1576
  #    https://github.com/facebookincubator/create-react-app/pull/2400
  # When removing workaround, you may run into
  #    https://github.com/facebookincubator/create-react-app/issues/2030
  case "$(uname -s)" in
    *CYGWIN*|MSYS*|MINGW*) yarn=yarn.cmd;;
    *) yarn=yarnpkg;;
  esac
  # $yarn cache clean
fi

#if hash npm 2>/dev/null
#then
#  # npm 5 is too buggy right now
#  if [ $(npm -v | head -c 1) -eq 5 ]; then
#    npm i -g npm@^4.x
#  fi;
#  npm cache clean || npm cache verify
#fi

# npm install
yarn

if [ "$USE_YARN" = "yes" ]
then
  # Install Yarn so that the test can use it to install packages.
  npm install -g yarn
  # yarn cache clean
fi

# ******************************************************************************
# First, pack and install tscomp.
# ******************************************************************************

# Pack CLI
cd "$root_path"
cli_path=$PWD/`npm pack`

# Install the CLI in a temporary location
cd "$temp_cli_path"
npm install "$cli_path"

# ******************************************************************************
# Test nested folder path as the project name
# ******************************************************************************

# Testing a path that exists
cd "$temp_app_path"
mkdir test-app-nested-paths-t1
cd test-app-nested-paths-t1
mkdir -p test-app-nested-paths-t1/aa/bb/cc/dd
tscomp new lib test-app-nested-paths-t1/aa/bb/cc/dd
cd test-app-nested-paths-t1/aa/bb/cc/dd
CI=true npm test

# Testing a path that does not exist
cd "$temp_app_path"
tscomp new lib test-app-nested-paths-t2/aa/bb/cc/dd
cd test-app-nested-paths-t2/aa/bb/cc/dd
CI=true npm test

# Testing a path that is half exists
cd "$temp_app_path"
mkdir -p test-app-nested-paths-t3/aa
tscomp new lib test-app-nested-paths-t3/aa/bb/cc/dd
cd test-app-nested-paths-t3/aa/bb/cc/dd
CI=true npm test

# Testing a browser project
cd "$temp_app_path"
mkdir -p test-app-nested-paths-t4/aa
tscomp new browser test-app-nested-paths-t4/aa
cd test-app-nested-paths-t4/aa/
CI=true npm test

# Testing a server project
cd "$temp_app_path"
mkdir -p test-app-nested-paths-t5/aa
tscomp new server test-app-nested-paths-t5/aa
cd test-app-nested-paths-t5/aa/
CI=true npm test

# Cleanup
cleanup
