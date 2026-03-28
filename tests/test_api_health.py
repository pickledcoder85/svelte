def test_health_endpoint(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["service"] == "nutrition-os-api"
    assert "environment" in body
    assert body["mode"] in {"demo", "configured"}
    assert "timestamp" in body
