from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx
import pytest

from backend.app.config import Settings
from backend.app.main import create_app
from backend.app.models.auth import AuthSession, user_id_for_email

OWNER = "owner@example.com"


def build_settings(**overrides) -> Settings:
    values = {"app_env": "test", "auth_mode": "local", "owner_email": "", "dev_auto_login": False}
    values.update(overrides)
    return Settings(_env_file=None, **values)


def build_client(tmp_path: Path, settings: Settings, client_host: str = "127.0.0.1"):
    app = create_app(database_path=str(tmp_path / "auth.db"), settings=settings)
    transport = httpx.ASGITransport(app=app, client=(client_host, 51234))
    return app, httpx.AsyncClient(transport=transport, base_url="http://testserver")


def tailscale_headers(login: str = OWNER, name: str | None = "Owner Name") -> dict[str, str]:
    headers = {"Tailscale-User-Login": login}
    if name:
        headers["Tailscale-User-Name"] = name
    return headers


@pytest.mark.asyncio
async def test_tailscale_owner_header_signs_in_without_password(tmp_path):
    app, client = build_client(tmp_path, build_settings(auth_mode="tailscale", owner_email=OWNER))
    async with client:
        session_response = await client.get("/api/auth/session", headers=tailscale_headers("Owner@Example.com"))
        assert session_response.status_code == 200
        session = session_response.json()["session"]
        assert session["provider"] == "tailscale"
        assert session["email"] == OWNER
        assert session["user_id"] == user_id_for_email(OWNER)

        profile_response = await client.get("/api/profile", headers=tailscale_headers())
        assert profile_response.status_code == 200
        assert profile_response.json()["display_name"] == "Owner Name"

    identity = app.state.repository.get_user_identity(user_id_for_email(OWNER))
    assert identity is not None


@pytest.mark.asyncio
async def test_tailscale_mode_rejects_missing_wrong_and_untrusted_identities(tmp_path):
    settings = build_settings(auth_mode="tailscale", owner_email=OWNER)
    app, client = build_client(tmp_path, settings)
    async with client:
        assert (await client.get("/api/profile")).status_code == 401
        assert (
            await client.get("/api/profile", headers=tailscale_headers("intruder@example.com"))
        ).status_code == 403

        # Bearer tokens are ignored in tailscale mode, even valid stored ones.
        stored = app.state.repository.save_session(AuthSession.create_local(OWNER, "Owner"))
        bearer = {"Authorization": f"Bearer {stored.access_token}"}
        assert (await client.get("/api/profile", headers=bearer)).status_code == 401

        # Email sign-up and sign-in do not exist in tailscale mode.
        login_response = await client.post(
            "/api/auth/session",
            json={"email": OWNER, "display_name": "Owner"},
        )
        assert login_response.status_code == 404

    # Identity headers on a non-loopback connection are never trusted.
    (tmp_path / "remote").mkdir()
    _, remote_client = build_client(tmp_path / "remote", settings, client_host="100.64.0.7")
    async with remote_client:
        response = await remote_client.get("/api/profile", headers=tailscale_headers())
        assert response.status_code == 403


@pytest.mark.asyncio
async def test_every_data_route_requires_a_session(tmp_path):
    _, client = build_client(tmp_path, build_settings())
    async with client:
        health = await client.get("/api/health")
        assert health.status_code == 200
        assert health.json()["auth_mode"] == "local"

        unauthenticated_calls = [
            client.post("/api/vision/label", json={"image_base64": "ZmFrZQ=="}),
            client.get("/api/recipes"),
            client.post("/api/recipes", json={"title": "x", "steps": [], "assets": [], "ingredients": []}),
            client.get("/api/meals/templates"),
            client.get("/api/nutrition/weekly-metrics"),
            client.get("/api/nutrition/foods/search?q=oats"),
            client.post(
                "/api/nutrition/meals/calculate",
                json={"id": "m", "name": "m", "serving_count": 1, "ingredients": []},
            ),
            client.get("/api/tracker/exercise"),
            client.get("/api/profile"),
        ]
        for call in unauthenticated_calls:
            response = await call
            assert response.status_code == 401, response.request.url


@pytest.mark.asyncio
async def test_local_mode_rejects_expired_bearer_sessions(tmp_path):
    app, client = build_client(tmp_path, build_settings())
    expired = AuthSession.create_local("expired@example.com", "Expired").model_copy(
        update={"expires_at": datetime.now(timezone.utc) - timedelta(minutes=1)}
    )
    app.state.repository.ensure_user_identity(user_id=expired.user_id, email=expired.email)
    app.state.repository.save_session(expired)
    async with client:
        response = await client.get(
            "/api/profile",
            headers={"Authorization": f"Bearer {expired.access_token}"},
        )
        assert response.status_code == 401


@pytest.mark.asyncio
async def test_dev_auto_login_uses_owner_without_a_token(tmp_path):
    _, client = build_client(tmp_path, build_settings(dev_auto_login=True, owner_email=OWNER))
    async with client:
        response = await client.get("/api/auth/session")
        assert response.status_code == 200
        session = response.json()["session"]
        assert session["provider"] == "dev"
        assert session["user_id"] == user_id_for_email(OWNER)
        assert (await client.get("/api/profile")).status_code == 200


@pytest.mark.parametrize(
    "overrides, message",
    [
        ({"app_env": "production"}, "AUTH_MODE=tailscale"),
        (
            {"app_env": "production", "auth_mode": "tailscale", "owner_email": OWNER, "dev_auto_login": True},
            "DEV_AUTO_LOGIN",
        ),
        ({"auth_mode": "tailscale"}, "OWNER_EMAIL"),
        ({"dev_auto_login": True}, "OWNER_EMAIL"),
    ],
)
def test_unsafe_auth_settings_fail_at_startup(tmp_path, overrides, message):
    with pytest.raises(RuntimeError, match=message):
        create_app(database_path=str(tmp_path / "unsafe.db"), settings=build_settings(**overrides))


def test_production_tailscale_settings_start(tmp_path):
    app = create_app(
        database_path=str(tmp_path / "prod.db"),
        settings=build_settings(
            app_env="production",
            auth_mode="tailscale",
            owner_email=OWNER,
            database_url=f"sqlite:///{tmp_path / 'prod.db'}",
        ),
    )
    assert app.state.settings.is_production


# --- Regression tests for the adversarial review of the single-owner auth slice ---


@pytest.mark.asyncio
async def test_uvicorn_proxy_headers_would_lock_out_the_owner(tmp_path):
    """Pins the deploy requirement: run uvicorn with --no-proxy-headers (scripts/prod-backend.sh).

    Tailscale Serve sets X-Forwarded-For to the phone's tailnet IP. uvicorn's default proxy
    handling rewrites the client to that IP, so the loopback check rejects the owner.
    """
    from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

    app = create_app(
        database_path=str(tmp_path / "proxy.db"),
        settings=build_settings(auth_mode="tailscale", owner_email=OWNER),
    )
    serve_headers = {**tailscale_headers(), "X-Forwarded-For": "100.101.102.103"}

    proxied = ProxyHeadersMiddleware(app, trusted_hosts="127.0.0.1")
    transport = httpx.ASGITransport(app=proxied, client=("127.0.0.1", 51234))
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        assert (await client.get("/api/profile", headers=serve_headers)).status_code == 403

    direct = httpx.ASGITransport(app=app, client=("127.0.0.1", 51234))
    async with httpx.AsyncClient(transport=direct, base_url="http://testserver") as client:
        assert (await client.get("/api/profile", headers=serve_headers)).status_code == 200


@pytest.mark.asyncio
async def test_tailscale_writes_require_relish_header_and_same_site(tmp_path):
    _, client = build_client(tmp_path, build_settings(auth_mode="tailscale", owner_email=OWNER))
    favorite_url = "/api/nutrition/favorites/foods/food-oats"
    async with client:
        # A cross-site page can send a body-less POST without a preflight, but not our header.
        forged = await client.post(
            favorite_url,
            headers={**tailscale_headers(), "Origin": "https://evil.example"},
        )
        assert forged.status_code == 403

        cross_site = await client.post(
            favorite_url,
            headers={**tailscale_headers(), "X-Relish-Request": "1", "Sec-Fetch-Site": "cross-site"},
        )
        assert cross_site.status_code == 403

        from_app = await client.post(
            favorite_url,
            headers={**tailscale_headers(), "X-Relish-Request": "1", "Sec-Fetch-Site": "same-origin"},
        )
        assert from_app.status_code == 200

        # Reads stay simple: no extra header needed.
        assert (await client.get("/api/profile", headers=tailscale_headers())).status_code == 200


@pytest.mark.asyncio
async def test_dev_auto_login_only_applies_to_this_machine(tmp_path):
    settings = build_settings(dev_auto_login=True, owner_email=OWNER)
    _, lan_client = build_client(tmp_path, settings, client_host="192.168.1.77")
    async with lan_client:
        assert (await lan_client.get("/api/profile")).status_code == 401


@pytest.mark.asyncio
async def test_tailscale_display_name_is_decoded(tmp_path):
    _, client = build_client(tmp_path, build_settings(auth_mode="tailscale", owner_email=OWNER))
    async with client:
        response = await client.get(
            "/api/profile",
            headers=tailscale_headers(name="=?utf-8?q?Ferris_B=C3=BCller?="),
        )
        assert response.status_code == 200
        assert response.json()["display_name"] == "Ferris Büller"


@pytest.mark.parametrize("app_env", ["prod", "Production", "live", ""])
def test_unknown_app_env_values_fail_at_startup(app_env):
    with pytest.raises(ValueError):
        build_settings(app_env=app_env)
