#!/usr/bin/env bash

set -euo pipefail
if [ "$#" -eq 0 ]; then
  set -- gunicorn main:app \-b '[::]:8080' --workers "${GUNICORN_WORKERS:-1}" --threads "${GUNICORN_THREADS:-4}" --preload  --worker-class uvicorn.workers.UvicornWorker --log-level debug
fi

exec "$@"
