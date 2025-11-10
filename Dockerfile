
FROM node:24-alpine AS web-builder

WORKDIR /app/web

# Copy package files
COPY ui/package.json ui/package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source code
COPY ui/ ./

# Build the React app
RUN npm run build

FROM python:3.13-slim-trixie AS reqs

WORKDIR /app

RUN pip install --no-cache-dir poetry poetry-plugin-export

COPY ./pyproject.toml ./poetry.lock /app/

RUN poetry export --without-hashes -f requirements.txt --output requirements.txt

FROM python:3.13-slim-trixie

ENV PYTHONUNBUFFERED=1 \
    UVICORN_HOST=0.0.0.0 \
    UVICORN_PORT=8000 \
    ENV=production

WORKDIR /app


RUN --mount=type=bind,from=reqs,source=/app/requirements.txt,target=/app/requirements.txt \
    pip install --no-cache-dir -r requirements.txt && \
    apt update && \
    apt-get clean autoclean && \
    apt-get autoremove --yes && \
    rm -rf /var/lib/{apt,dpkg,cache,log} && \
    mkdir -p /app/data && \
    chown 1000:1000 /app/data

COPY taskin_api/ .

# Copy built React app from web-builder stage
COPY --from=web-builder /app/web/dist ./static

EXPOSE 8000

USER 1000:1000

ENTRYPOINT [ "uvicorn", "main:api" ]
