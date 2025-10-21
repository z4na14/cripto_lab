#!/bin/bash

# Construir imagen del backend
docker build -f ./src/backend/Dockerfile -t cripto:backend .