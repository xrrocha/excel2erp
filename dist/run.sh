#!/bin/sh
set -ex
CMD_DIR="$(dirname "$0")"
cd "$CMD_DIR"
java -jar excel2erp.jar ../assets/wb-server.yaml