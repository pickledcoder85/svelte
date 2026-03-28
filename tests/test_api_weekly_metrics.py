import pytest


@pytest.mark.asyncio
async def test_weekly_metrics_endpoint(client):
    response = await client.get("/api/nutrition/weekly-metrics")

    assert response.status_code == 200
    body = response.json()
    assert body["calorie_goal"] == 14800
    assert body["adherence_score"] == 87
