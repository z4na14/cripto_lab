#!/bin/bash

docker compose -f ./Docker/docker-compose.yml down
rm -rf ./Docker/config/
mkdir -p ./Docker/config/www
cp -r ./src/site/* ./Docker/config/www
docker compose -f ./Docker/docker-compose.yml up -d
