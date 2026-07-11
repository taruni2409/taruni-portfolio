FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir -U pip

COPY pyproject.toml .
RUN pip install --no-cache-dir -e .

# Pre-download the embedding model during build so startup warmup is fast.
# Baked into the image layer — no network call needed at container startup.
# Update the model string here whenever EMBED_MODEL in rag/store.py changes.
RUN python -c "from fastembed import TextEmbedding; list(TextEmbedding('BAAI/bge-base-en-v1.5').embed(['warmup']))"

COPY src ./src
COPY data ./data

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--app-dir", "src", "--host", "0.0.0.0", "--port", "8000"]
