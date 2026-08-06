from fastapi import HTTPException, status


class SyloraHTTPException(HTTPException):
    def __init__(self, status_code: int, code: str, message: str) -> None:
        super().__init__(status_code=status_code, detail={"code": code, "message": message})


def unauthorized(message: str = "Authentication required") -> SyloraHTTPException:
    return SyloraHTTPException(status.HTTP_401_UNAUTHORIZED, "unauthorized", message)


def forbidden(message: str = "Permission denied") -> SyloraHTTPException:
    return SyloraHTTPException(status.HTTP_403_FORBIDDEN, "forbidden", message)


def conflict(code: str, message: str) -> SyloraHTTPException:
    return SyloraHTTPException(status.HTTP_409_CONFLICT, code, message)


def bad_request(code: str, message: str) -> SyloraHTTPException:
    return SyloraHTTPException(status.HTTP_400_BAD_REQUEST, code, message)
