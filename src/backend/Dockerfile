# Usar la imagen oficial de python
FROM python:3.12-slim

# Instalar PostgreSQL y utilidades comunes
RUN apt-get update && apt-get install -y \
    postgresql postgresql-contrib libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*


# Exponer el puerto que se va a usar para llevar a cabo la conexión
EXPOSE 9000

# Añadir usuario dentro del contenedor
RUN useradd -m app
# Configurar la carpeta de trabajo
WORKDIR /app
RUN chown -R app:app /app

# Copiar requisitos de python
COPY src/backend/requirements.txt /requirements.txt


# Cambiar a usuario sin permisos de root
USER app
# Instalar requisitos en modo usuario
RUN pip install --user -r ../requirements.txt

CMD ["python", "main.py"]