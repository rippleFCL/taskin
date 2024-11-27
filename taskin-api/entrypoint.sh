#!/usr/bin/env bash

set -euo pipefail
echo "ripple's a melt"
if [ "$#" -eq 0 ]; then
  set -- gunicorn main:app \-b '[::]:8080' --workers "${GUNICORN_WORKERS:-1}" --threads "${GUNICORN_THREADS:-4}" --preload  --worker-class uvicorn.workers.UvicornWorker
fi

exec "$@"
