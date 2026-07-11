FROM node:20-slim

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* frontend/

RUN cd frontend && npm ci

COPY frontend frontend

EXPOSE 3000

