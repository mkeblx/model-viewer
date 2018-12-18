#!/usr/bin/env bash

set -x
set -e

if [ -z "$TRAVIS_TAG" ]; then
  echo '$TRAVIS_TAG is not set!';
  exit 1;
fi

set +e

git checkout origin/gh-pages -- ./fidelity

set -e

if [[ ! -d "./fidelity" ]]; then
  mkdir -p ./fidelity;
fi

if [[ -d "./fidelity/$TRAVIS_TAG" ]]; then
  rm -rf "./fidelity/$TRAVIS_TAG";
fi

cp -r "./test/fidelity/results" "./fidelity/$TRAVIS_TAG"

echo `ls -l ./ | egrep '^d' | awk '{print $9}'` > ./fidelity/manifest

set +x
set +e
