#!/bin/sh

git diff -r upstream/master -- packages/react-scripts/$1 -- packages/tscomp-scripts/$1
