#!/bin/bash

set -e
set -v

# export domain_component_version=domain@dev.0.1


checkUrl(){
  url=$1
  echo $url

  expected_status_code=200
  expected_body="hello world"

  response=$(curl -s -w "\n%{http_code}\n" $url)
  status_code=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | sed '$d')

  if [ "$status_code" == "$expected_status_code" ] && [ "$body" == "$expected_body" ]; then
      echo "Success: status code is $expected_status_code and body is '$expected_body'"
  else
      echo "Error: expected status code '$expected_status_code' and body '$expected_body', but got status code '$status_code' and body '$body'"
      exit 1
  fi
}

echo "test fc custom domain ..."
s3 deploy -y --debug
s3 info
s3 plan

sleep 1s

checkUrl "http://test-serverless-devs-custom-domain-ci.fcv3.1431999136518149.cn-huhehaote.fc.devsapp.net/a"

checkUrl "http://test-serverless-devs-custom-domain-ci-1.fcV3.1431999136518149.cn-huhehaote.fc.devsapp.net/b"

s3 remove -y