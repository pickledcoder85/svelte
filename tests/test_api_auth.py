import pytest


@pytest.mark.asyncio
async def test_create_and_fetch_session(client):
    response = await client.post(
        "/api/auth/session",
        json={"email": "tester@example.com", "display_name": "Tester", "intent": "signup"},
    )

    assert response.status_code == 200
    session = response.json()["session"]
    assert session["email"] == "tester@example.com"
    assert session["display_name"] == "Tester"
    assert session["provider"] == "local"

    lookup = await client.get(
        "/api/auth/session",
        headers={"Authorization": f"Bearer {session['access_token']}"},
    )
    assert lookup.status_code == 200
    assert lookup.json()["session"]["access_token"] == session["access_token"]


@pytest.mark.asyncio
async def test_signup_rejects_existing_email(client):
    first = await client.post(
        "/api/auth/session",
        json={"email": "tester@example.com", "display_name": "Tester", "intent": "signup"},
    )
    assert first.status_code == 200

    second = await client.post(
        "/api/auth/session",
        json={"email": "tester@example.com", "display_name": "Tester Again", "intent": "signup"},
    )
    assert second.status_code == 409
    assert second.json()["detail"] == "That email already has a profile. Sign in instead."


@pytest.mark.asyncio
async def test_signin_rejects_unknown_email(client):
    response = await client.post(
        "/api/auth/session",
        json={"email": "missing@example.com", "display_name": "Missing", "intent": "signin"},
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "No profile found for that email. Sign up instead."


@pytest.mark.asyncio
async def test_invalid_session_token_is_rejected_for_user_owned_routes(client):
    response = await client.get(
        "/api/auth/session",
        headers={"Authorization": "Bearer not-a-real-session"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "No active session."

    profile_response = await client.get(
        "/api/profile",
        headers={"Authorization": "Bearer not-a-real-session"},
    )
    assert profile_response.status_code == 401
    assert profile_response.json()["detail"] == "No active session."
