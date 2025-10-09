docker compose up -d ./Docker
rm -r ./Docker/config/www
ln -s $PWD/src/site/ ./Docker/config/www
