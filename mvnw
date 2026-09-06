#!/bin/sh
set -eu
BASE_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
MAVEN_VERSION=3.9.9
MAVEN_HOME="$BASE_DIR/.mvn/apache-maven-$MAVEN_VERSION"
if [ ! -x "$MAVEN_HOME/bin/mvn" ]; then
  CACHE_DIR="${TMPDIR:-/tmp}/saferoute-maven"
  ARCHIVE="$CACHE_DIR/apache-maven-$MAVEN_VERSION-bin.tar.gz"
  mkdir -p "$CACHE_DIR"
  if [ ! -f "$ARCHIVE" ]; then
    curl -fsSL "https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/$MAVEN_VERSION/apache-maven-$MAVEN_VERSION-bin.tar.gz" -o "$ARCHIVE"
  fi
  mkdir -p "$BASE_DIR/.mvn"
