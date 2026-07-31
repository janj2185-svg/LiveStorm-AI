# syntax=docker/dockerfile:1.7
FROM python:3.12-slim AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONDONTWRITEBYTECODE=1

RUN apt-get update \
    && apt-get install --no-install-recommends -y build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY . .
RUN python -m pip wheel --wheel-dir /wheels .

FROM python:3.12-slim AS runtime

ARG APP_UID=10001
ARG APP_GID=10001
ENV PATH="/home/sylora/.local/bin:${PATH}" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    API_WORKERS=2 \
    API_LOG_LEVEL=info

RUN apt-get update \
    && apt-get install --no-install-recommends -y libpq5 ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid "${APP_GID}" sylora \
    && useradd --uid "${APP_UID}" --gid "${APP_GID}" --create-home --shell /usr/sbin/nologin sylora

COPY --from=builder /wheels /wheels
RUN python -m pip install --no-cache-dir /wheels/*.whl \
    && rm -rf /wheels

WORKDIR /app
USER sylora
EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health/ready', timeout=3)"]

CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers \"${API_WORKERS}\" --log-level \"${API_LOG_LEVEL}\" --proxy-headers"]
