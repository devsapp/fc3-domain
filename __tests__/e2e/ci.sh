#!/bin/bash

set -e
set -v

# export domain_component_version=domain@dev.0.1

echo "test fc custom domain ..."
s3 deploy -y 
s3 info
s3 plan
s3 remove -y