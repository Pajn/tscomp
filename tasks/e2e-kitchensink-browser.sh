#!/bin/bash
# Copyright (c) 2015-present, Facebook, Inc.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

# ******************************************************************************
# This is an end-to-end kitchensink test intended to run on CI.
# You can also run it locally but it's slow.
# ******************************************************************************

# Start in tasks/ even if run from root directory
cd "$(dirname "$0")"

# CLI, app, and test module temporary locations
# http://unix.stackexchange.com/a/84980
temp_cli_path=`mktemp -d 2>/dev/null || mktemp -d -t 'temp_cli_path'`
temp_app_path=`mktemp -d 2>/dev/null || mktemp -d -t 'temp_app_path'`
temp_module_path=`mktemp -d 2>/dev/null || mktemp -d -t 'temp_module_path'`

function cleanup {
  echo 'Cleaning up.'
  ps -ef | grep 'tscomp' | grep -v grep | awk '{print $2}' | xargs kill -9
  cd "$root_path"
  # TODO: fix "Device or resource busy" and remove ``|| $CI`
  rm -rf "$temp_cli_path" $temp_app_path $temp_module_path || $CI
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

function tscomp {
  node "$temp_cli_path"/node_modules/tscomp/bin/tscomp.js "$@"
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

# Clear cache to avoid issues with incorrect packages being used
if hash yarnpkg 2>/dev/null
then
  # AppVeyor uses an old version of yarn.
  # Once updated to 0.24.3 or above, the workaround can be removed
  # and replaced with `yarnpkg cache clean`
  # Issues:
  #    https://github.com/yarnpkg/yarn/issues/2591
  #    https://github.com/appveyor/ci/issues/1576
  #    https://github.com/facebook/create-react-app/pull/2400
  # When removing workaround, you may run into
  #    https://github.com/facebook/create-react-app/issues/2030
  case "$(uname -s)" in
    *CYGWIN*|MSYS*|MINGW*) yarn=yarn.cmd;;
    *) yarn=yarnpkg;;
  esac
  $yarn cache clean
fi

yarn

# ******************************************************************************
# First, pack tscomp so we can use it.
# ******************************************************************************

# Pack CLI
cd "$root_path"
cli_path=$PWD/`npm pack`

# ******************************************************************************
# Now that we have packed them, create a clean app folder and install them.
# ******************************************************************************

# Install the CLI in a temporary location
cd "$temp_cli_path"
yarn add "$cli_path"

# Install the app in a temporary location
cd $temp_app_path
tscomp new --scripts-version="$cli_path" --internal-testing-template="$root_path"/fixtures/kitchensink-browser browser test-kitchensink

# ...but still link to tscomp
yarn add "$root_path"

# Install the test module
cd "$temp_module_path"
yarn add test-integrity@^2.0.1

# ******************************************************************************
# Now that we used tscomp to create an app depending on tscomp,
# let's make sure all npm scripts are in the working state.
# ******************************************************************************

# Enter the app directory
cd $temp_app_path/test-kitchensink

# In kitchensink, we want to test all transforms
export BROWSERSLIST='ie 9'

# Link to test module
npm link "$temp_module_path/node_modules/test-integrity"

# Test the build
REACT_APP_SHELL_ENV_MESSAGE=fromtheshell \
  NODE_PATH=src \
  PUBLIC_URL=http://www.example.org/spa/ \
  yarn build

# Check for expected output
exists build/*.html
exists build/static/js/main.*.js

# Unit tests
REACT_APP_SHELL_ENV_MESSAGE=fromtheshell \
  CI=true \
  NODE_PATH=src \
  NODE_ENV=test \
  yarn test --no-cache --runInBand --testPathPattern=src

# Prepare "development" environment
tmp_server_log=`mktemp`
PORT=9001 \
  REACT_APP_SHELL_ENV_MESSAGE=fromtheshell \
  NODE_PATH=src \
  nohup yarn start &>$tmp_server_log &
grep -q 'You can now view' <(tail -f $tmp_server_log)

# Test "development" environment
E2E_URL="http://localhost:9001" \
  REACT_APP_SHELL_ENV_MESSAGE=fromtheshell \
  CI=true NODE_PATH=src \
  NODE_ENV=development \
  BABEL_ENV=test \
  node_modules/.bin/jest --no-cache --runInBand --config='jest.integration.config.js'

# Test "production" environment
E2E_FILE=./build/index.html \
  CI=true \
  NODE_PATH=src \
  NODE_ENV=production \
  BABEL_ENV=test \
  PUBLIC_URL=http://www.example.org/spa/ \
  node_modules/.bin/jest --no-cache --runInBand --config='jest.integration.config.js'

# Cleanup
cleanup
