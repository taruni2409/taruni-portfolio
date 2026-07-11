FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir -U pip

# Keep the image simple: install runtime deps directly.
RUN pip install --no-cache-dir \
    "fastapi>=0.115" \
    "uvicorn[standard]>=0.30" \
    "pydantic>=2.7" \
    "pydantic-settings>=2.3"

COPY backend backend

EXPOSE 8000

