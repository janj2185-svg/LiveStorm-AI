from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger("sylora.errors")


class APIError(Exception):
    def __init__(
        self,
        status_code: int,
        code: str,
        title: str,
        detail: str,
        *,
        headers: dict[str, str] | None = None,
        extra: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(code)
        self.status_code = status_code
        self.code = code
        self.title = title
        self.detail = detail
        self.headers = headers or {}
        self.extra = extra or {}


def problem_response(
    request: Request,
    *,
    status_code: int,
    code: str,
    title: str,
    detail: str,
    headers: dict[str, str] | None = None,
    extra: dict[str, Any] | None = None,
) -> JSONResponse:
    body: dict[str, Any] = {
        "type": f"https://api.sylora.com/problems/{code}",
        "title": title,
        "status": status_code,
        "detail": detail,
        "instance": request.url.path,
        "code": code,
        "request_id": getattr(request.state, "request_id", None),
    }
    if extra:
        body.update(extra)
    return JSONResponse(
        status_code=status_code,
        content=body,
        headers=headers,
        media_type="application/problem+json",
    )


def install_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(APIError)
    async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
        return problem_response(
            request,
            status_code=exc.status_code,
            code=exc.code,
            title=exc.title,
            detail=exc.detail,
            headers=dict(exc.headers) if exc.headers else None,
            extra=exc.extra,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        fields = [
            ".".join(str(part) for part in error["loc"] if part not in {"body", "query"})
            for error in exc.errors()
        ]
        return problem_response(
            request,
            status_code=422,
            code="validation_error",
            title="Request validation failed",
            detail="One or more request fields are invalid.",
            extra={"invalid_fields": sorted(set(filter(None, fields)))},
        )

    @app.exception_handler(HTTPException)
    async def http_error_handler(request: Request, exc: HTTPException) -> JSONResponse:
        detail = (
            exc.detail if isinstance(exc.detail, str) else "The request could not be completed."
        )
        return problem_response(
            request,
            status_code=exc.status_code,
            code="http_error",
            title="Request failed",
            detail=detail,
            headers=dict(exc.headers) if exc.headers else None,
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(
            "unhandled_request_error",
            extra={"request_id": getattr(request.state, "request_id", None)},
        )
        return problem_response(
            request,
            status_code=500,
            code="internal_error",
            title="Internal server error",
            detail="The request could not be completed.",
        )
