from email.header import decode_header, make_header

from fastapi import Depends, Header, HTTPException, Request

from backend.app.config import Settings, get_settings
from backend.app.models.auth import AuthSession
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.auth import get_session_from_token

TAILSCALE_LOGIN_HEADER = "Tailscale-User-Login"
TAILSCALE_NAME_HEADER = "Tailscale-User-Name"
# Tailscale Serve proxies to the app over loopback. Identity headers are only trusted on
# loopback connections, so anything that reaches the app another way cannot forge them.
LOOPBACK_HOSTS = frozenset({"127.0.0.1", "::1", "localhost"})
UNSAFE_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})
SAME_SITE_FETCH_VALUES = frozenset({"same-origin", "none"})
# Sent by the Relish app on every write; see _reject_cross_site_writes.
RELISH_REQUEST_HEADER = "X-Relish-Request"


async def get_repository(request: Request) -> SQLiteRepository:
    return request.app.state.repository


def get_app_settings(request: Request) -> Settings:
    return getattr(request.app.state, "settings", None) or get_settings()


def _decode_tailscale_header(value: str | None) -> str:
    """Tailscale Q-encodes non-ASCII header values (RFC 2047); decode them before use."""
    raw = (value or "").strip()
    if not raw:
        return ""
    try:
        return str(make_header(decode_header(raw))).strip()
    except (ValueError, LookupError, UnicodeDecodeError):
        return raw


def _is_loopback_client(request: Request) -> bool:
    return bool(request.client) and request.client.host in LOOPBACK_HOSTS


def _reject_cross_site_writes(request: Request) -> None:
    """Block cross-site writes that ride on the ambient Tailscale identity.

    A Tailscale identity behaves like a cookie: the device carries it on every request,
    including ones a malicious page triggers. Writes must send `X-Relish-Request`, which a
    cross-site page cannot add without a CORS preflight that this server refuses, and must
    not be marked cross-site by the browser.
    """
    if request.method.upper() not in UNSAFE_METHODS:
        return
    fetch_site = (request.headers.get("Sec-Fetch-Site") or "").strip().lower()
    if fetch_site and fetch_site not in SAME_SITE_FETCH_VALUES:
        raise HTTPException(status_code=403, detail="Cross-site requests are not allowed.")
    if request.headers.get(RELISH_REQUEST_HEADER) != "1":
        raise HTTPException(status_code=403, detail="Missing Relish request header.")


def _owner_email(settings: Settings) -> str:
    return settings.owner_email.strip().lower()


def _ensure_owner(repository: SQLiteRepository, session: AuthSession) -> AuthSession:
    if repository.get_user_identity(session.user_id) is None:
        repository.ensure_user_identity(
            user_id=session.user_id,
            email=session.email,
            display_name=session.display_name,
        )
    return session


def _tailscale_session(
    request: Request,
    settings: Settings,
    repository: SQLiteRepository,
) -> AuthSession | None:
    login = _decode_tailscale_header(request.headers.get(TAILSCALE_LOGIN_HEADER)).lower()
    if not login:
        return None
    # uvicorn must run with --no-proxy-headers: otherwise it rewrites the client address
    # from Tailscale Serve's X-Forwarded-For and every owner request fails this check.
    if not _is_loopback_client(request):
        raise HTTPException(status_code=403, detail="Untrusted identity source.")
    if login != _owner_email(settings):
        raise HTTPException(status_code=403, detail="This Relish server belongs to someone else.")
    _reject_cross_site_writes(request)
    display_name = _decode_tailscale_header(request.headers.get(TAILSCALE_NAME_HEADER)) or None
    return _ensure_owner(repository, AuthSession.for_owner(login, display_name, "tailscale"))


async def get_current_session(
    request: Request,
    authorization: str | None = Header(default=None),
    repository: SQLiteRepository = Depends(get_repository),
) -> AuthSession | None:
    settings = get_app_settings(request)

    if settings.auth_mode == "tailscale":
        # Bearer tokens are ignored: only the Tailscale identity counts.
        return _tailscale_session(request, settings, repository)

    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
        session = get_session_from_token(repository, token)
        if session is not None and not session.is_expired():
            return session

    # Dev auto-login only for this machine: the dev launcher binds 0.0.0.0 for phone testing,
    # and other devices on the same Wi-Fi must not become the owner.
    if settings.dev_auto_login and _owner_email(settings) and _is_loopback_client(request):
        return _ensure_owner(
            repository,
            AuthSession.for_owner(_owner_email(settings), None, "dev"),
        )
    return None


async def get_required_session(
    session: AuthSession | None = Depends(get_current_session),
) -> AuthSession:
    if session is None:
        raise HTTPException(status_code=401, detail="No active session.")
    return session
