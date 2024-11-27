FROM docker.io/python:3.13.0-slim-bullseye AS poetry-locker

WORKDIR /work
COPY ./pyproject.toml /work
COPY ./poetry.lock /work

RUN pip install --no-cache-dir poetry && \
    poetry export --without-hashes -f requirements.txt --output requirements.txt && \
    poetry export --without-hashes -f requirements.txt --dev --output requirements-dev.txt

FROM docker.io/python:3.13.0-slim-bullseye AS final-image

WORKDIR /

COPY --from=poetry-locker /work/requirements.txt /
COPY --from=poetry-locker /work/requirements-dev.txt /

RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential pkg-config libpq-dev && \
    pip install --no-cache-dir -r /requirements.txt && \
    apt-get remove --purge -y build-essential pkg-config git wget gpg lsb-release && \
    apt-get autoremove --purge -y && \
    apt-get clean && \
    rm -rf /tmp/* /var/lib/apt/lists/* /var/tmp/ && \
    adduser --system --no-create-home --uid 1000 --group --home /app ripple && \
    mkdir -p /app/static && \
    chown -R ripple:ripple /app/static

WORKDIR /app

COPY ./ /app

USER 1000

EXPOSE 8080

ENV TMPDIR /dev/shm/
ENV PYTHONUNBUFFERED 1

ENTRYPOINT ["/app/entrypoint.sh"]
