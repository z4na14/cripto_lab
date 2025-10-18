#!/bin/bash

docker compose -f ./Docker/docker-compose.yml down
docker compose -f ./Docker/docker-compose.yml up -d
