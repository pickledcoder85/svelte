def test_create_and_fetch_session(client):
    response = client.post(
        "/api/auth/session",
        json={"email": "tester@example.com", "display_name": "Tester"},
    )

    assert response.status_code == 200
    session = response.json()["session"]
    assert session["email"] == "tester@example.com"
    assert session["display_name"] == "Tester"
    assert session["provider"] == "local"

    lookup = client.get(
        "/api/auth/session",
        headers={"Authorization": f"Bearer {session['access_token']}"},
    )
    assert lookup.status_code == 200
    assert lookup.json()["session"]["access_token"] == session["access_token"]
