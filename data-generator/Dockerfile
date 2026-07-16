# =============================================================================
# KSP Intelligence Portal — Data Generator Image
# File: data-generator/Dockerfile
#
# Lightweight Python image used for:
#   docker compose run --rm data-generator python -m data_generator.bulk_load
#   docker compose run --rm data-generator python -m data_generator.kafka_producer
#   docker compose run --rm data-generator python -m data_generator.verify
#   docker compose run --rm data-generator python -m pytest tests/
# =============================================================================

FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System deps (psycopg2-binary's wheel is prebuilt, so only ca-certificates is
# needed for HTTPS to elasticsearch / kafka telemetry)
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
        libpq5 \
        && rm -rf /var/lib/apt/lists/*

# Install Python deps first (better layer caching)
COPY requirements.txt /app/requirements.txt
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy source — place modules under /app/data_generator/ so the package layout
# matches the `from . import config` relative imports and `python -m data_generator.X`
# invocation works from WORKDIR /app.
COPY __init__.py /app/data_generator/__init__.py
COPY config.py  /app/data_generator/config.py
COPY generate.py /app/data_generator/generate.py
COPY bulk_load.py /app/data_generator/bulk_load.py
COPY kafka_producer.py /app/data_generator/kafka_producer.py
COPY verify.py   /app/data_generator/verify.py
COPY tests/__init__.py    /app/data_generator/tests/__init__.py
COPY tests/test_config.py   /app/data_generator/tests/test_config.py
COPY tests/test_generate.py /app/data_generator/tests/test_generate.py

# Default command — show help; users override via `docker compose run ... cmd args`
CMD ["python", "-c", "print('data-generator ready. Use: docker compose run --rm data-generator python -m data_generator.bulk_load')"]
