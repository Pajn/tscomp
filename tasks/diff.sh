#!/bin/sh

git diff -r upstream/master -- packages/react-scripts/$1  -- $1
