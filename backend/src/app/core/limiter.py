from fastapi import Request
from slowapi import Limiter


def _real_ip(request: Request) -> str:
    """Use X-Forwarded-For when behind Nginx, fall back to direct client IP."""
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=_real_ip)
