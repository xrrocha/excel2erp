#!/bin/sh
set -ex
CMD_DIR="$(dirname "$0")"
cd "$CMD_DIR"
java -jar excel-2-sap.jar ../assets/wb-server.yaml