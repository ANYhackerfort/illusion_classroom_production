# ------------------------------------------------------
# Base Image
# ------------------------------------------------------
FROM python:3.11-slim

# ------------------------------------------------------
# Environment variables (good defaults)
# ------------------------------------------------------
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/usr/local/bin:$PATH"

WORKDIR /app

# ------------------------------------------------------
# System dependencies
# ------------------------------------------------------

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libmariadb-dev \
    libmariadb-dev-compat \
    pkg-config \
    netcat-openbsd \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# ------------------------------------------------------
# Python dependencies
# ------------------------------------------------------
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ------------------------------------------------------
# Copy project
# ------------------------------------------------------
COPY . .

# ------------------------------------------------------
# Collect static (optional but recommended for production)
# ------------------------------------------------------
# RUN python manage.py collectstatic --noinput

# ------------------------------------------------------
# Expose port (optional, but helps documentation)
# ------------------------------------------------------
EXPOSE 8000

# ------------------------------------------------------
# Healthcheck (optional, good for orchestration)
# ------------------------------------------------------
# HEALTHCHECK CMD curl --fail http://localhost:8000/health/ || exit 1

# ------------------------------------------------------
# Entrypoint (Gunicorn)
# ------------------------------------------------------
CMD ["gunicorn", "illusion_classroom.wsgi:application", "-b", "0.0.0.0:8000", "-w", "3"]
