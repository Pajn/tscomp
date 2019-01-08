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
  rm "$cli_path"
  # Uncomment when snapshot testing is enabled by default:
  # rm ./packages/react-scripts/template/src/__snapshots__/App.test.js.snap
  rm -rf "$temp_cli_path" $temp_app_path
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

#if hash npm 2>/dev/null
#then
#  # npm 5 is too buggy right now
#  if [ $(npm -v | head -c 1) -eq 5 ]; then
#    npm i -g npm@^4.x
#  fi;
#  npm cache clean || npm cache verify
#fi

# We need to install create-react-app deps to test it
npm install

# If the node version is < 6, the script should just give an error.
nodeVersion=`node --version | cut -d v -f2`
nodeMajor=`echo $nodeVersion | cut -d. -f1`
nodeMinor=`echo $nodeVersion | cut -d. -f2`
if [[ nodeMajor -lt 6 ]]
then
  cd $temp_app_path
  err_output=`node "$root_path"/bin/tscomp.js test-node-version 2>&1 > /dev/null || echo ''`
  [[ $err_output =~ You\ are\ running\ Node ]] && exit 0 || exit 1
fi

npm install

if [ "$USE_YARN" = "yes" ]
then
  # Install Yarn so that the test can use it to install packages.
  npm install -g yarn
  yarn cache clean
fi

# ******************************************************************************
# Next, pack tscomp so we can verify that it work.
# ******************************************************************************

# Pack CLI
cli_path=$PWD/`npm pack`

# ******************************************************************************
# Now that we have packed them, create a clean app folder and install them.
# ******************************************************************************

# Install the CLI in a temporary location
cd "$temp_cli_path"

# Initialize package.json before installing the CLI because npm will not install
# the CLI properly in the temporary location if it is missing.
npm init --yes

# Now we can install the CLI from the local package.
npm install "$cli_path"


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

# ******************************************************************************
# ******************************************************************************
# ******************************************************************************
# Test the browser template
# ******************************************************************************
# ******************************************************************************
# ******************************************************************************

# Install the app in a temporary location
cd $temp_app_path
tscomp new browser --scripts-version="$cli_path" test-browser-app

# ******************************************************************************
# Now that we used tscomp to create an app,
# let's make sure all npm scripts are in the working state.
# ******************************************************************************

function verify_env_url {
  # Backup package.json because we're going to make it dirty
  cp package.json package.json.orig

  # Test default behavior
  grep -F -R --exclude=*.map "\"/static/" build/ -q; test $? -eq 0 || exit 1

  # Test relative path build
  awk -v n=2 -v s="  \"homepage\": \".\"," 'NR == n {print s} {print}' package.json > tmp && mv tmp package.json

  yarn build
  # Disabled until this can be tested
  # grep -F -R --exclude=*.map "../../static/" build/ -q; test $? -eq 0 || exit 1
  grep -F -R --exclude=*.map "\"./static/" build/ -q; test $? -eq 0 || exit 1
  grep -F -R --exclude=*.map "\"/static/" build/ -q; test $? -eq 1 || exit 1

  PUBLIC_URL="/anabsolute" yarn build
  grep -F -R --exclude=*.map "/anabsolute/static/" build/ -q; test $? -eq 0 || exit 1
  grep -F -R --exclude=*.map "\"/static/" build/ -q; test $? -eq 1 || exit 1

  # Test absolute path build
  sed "2s/.*/  \"homepage\": \"\/testingpath\",/" package.json > tmp && mv tmp package.json

  yarn build
  grep -F -R --exclude=*.map "/testingpath/static/" build/ -q; test $? -eq 0 || exit 1
  grep -F -R --exclude=*.map "\"/static/" build/ -q; test $? -eq 1 || exit 1

  PUBLIC_URL="https://www.example.net/overridetest" yarn build
  grep -F -R --exclude=*.map "https://www.example.net/overridetest/static/" build/ -q; test $? -eq 0 || exit 1
  grep -F -R --exclude=*.map "\"/static/" build/ -q; test $? -eq 1 || exit 1
  grep -F -R --exclude=*.map "testingpath/static" build/ -q; test $? -eq 1 || exit 1

  # Test absolute url build
  sed "2s/.*/  \"homepage\": \"https:\/\/www.example.net\/testingpath\",/" package.json > tmp && mv tmp package.json

  yarn build
  grep -F -R --exclude=*.map "/testingpath/static/" build/ -q; test $? -eq 0 || exit 1
  grep -F -R --exclude=*.map "\"/static/" build/ -q; test $? -eq 1 || exit 1

  PUBLIC_URL="https://www.example.net/overridetest" yarn build
  grep -F -R --exclude=*.map "https://www.example.net/overridetest/static/" build/ -q; test $? -eq 0 || exit 1
  grep -F -R --exclude=*.map "\"/static/" build/ -q; test $? -eq 1 || exit 1
  grep -F -R --exclude=*.map "testingpath/static" build/ -q; test $? -eq 1 || exit 1

  # Restore package.json
  rm package.json
  mv package.json.orig package.json
}

# Enter the app directory
cd test-browser-app

# Test the build
yarn build
# Check for expected output
exists build/*.html
exists build/static/js/*.js
exists build/static/css/*.css
exists build/static/media/*.svg
exists build/favicon.ico

# Run tests with CI flag
CI=true yarn test
# Uncomment when snapshot testing is enabled by default:
# exists src/__snapshots__/App.test.js.snap

# Test the server
yarn start --smoke-test

# Test environment handling
verify_env_url

# Test changing outDir
test_change_outdir *.html static/js/*.js static/css/*.css static/media/*.svg favicon.ico

# ******************************************************************************
# Finally, let's check that everything still works after ejecting.
# ******************************************************************************

# Eject...
echo yes | yarn eject

# ...but still link to the local packages
yarn add "$root_path"

# Test the build
yarn build
# Check for expected output
exists build/*.html
exists build/static/js/*.js
exists build/static/css/*.css
exists build/static/media/*.svg
exists build/favicon.ico

# Run tests
CI=true yarn test
# Uncomment when snapshot testing is enabled by default:
# exists src/__snapshots__/App.test.js.snap

# Test the server
yarn start --smoke-test

# Test environment handling
verify_env_url

# Test changing outDir
test_change_outdir *.html static/js/*.js static/css/*.css static/media/*.svg favicon.ico
