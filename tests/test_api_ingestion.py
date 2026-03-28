from datetime import datetime

import pytest


@pytest.mark.asyncio
async def test_ingestion_review_queue_reads_and_transitions(client, repository):
    session_response = await client.post(
        "/api/auth/session",
        json={"email": "reviewer@example.com", "display_name": "Reviewer"},
    )
    assert session_response.status_code == 200
    session = session_response.json()["session"]
    headers = {"Authorization": f"Bearer {session['access_token']}"}

    job_id = repository.create_ingestion_job(
        user_id=session["user_id"],
        source_kind="camera",
        source_name="nutrition-label.jpg",
        status="processing",
    )
    pending_output = repository.save_ingestion_output(
        ingestion_job_id=job_id,
        extracted_text="Nutrition Facts",
        structured_json={"product_name": "Rolled oats"},
        confidence=0.91,
        output_id="output-pending",
    )
    accepted_output = repository.save_ingestion_output(
        ingestion_job_id=job_id,
        extracted_text="Serving size 1 cup",
        structured_json={"serving_size": "1 cup"},
        confidence=0.74,
        output_id="output-accepted",
    )
    repository.accept_ingestion_output(
        accepted_output["id"],
        accepted_at=datetime(2026, 3, 27, 15, 45),
    )

    queue_response = await client.get("/api/ingestion/queue", headers=headers)
    assert queue_response.status_code == 200
    queue = queue_response.json()
    assert len(queue) == 1
    assert queue[0]["id"] == pending_output["id"]
    assert queue[0]["review_state"] == "pending"
    assert queue[0]["structured_json"] == {"product_name": "Rolled oats"}

    job_outputs_response = await client.get(
        f"/api/ingestion/jobs/{job_id}/outputs",
        headers=headers,
    )
    assert job_outputs_response.status_code == 200
    job_outputs = job_outputs_response.json()
    assert {item["review_state"] for item in job_outputs} == {"pending", "accepted"}

    read_response = await client.get(
        f"/api/ingestion/outputs/{pending_output['id']}",
        headers=headers,
    )
    assert read_response.status_code == 200
    assert read_response.json()["id"] == pending_output["id"]

    review_response = await client.post(
        f"/api/ingestion/outputs/{pending_output['id']}/review",
        headers=headers,
    )
    assert review_response.status_code == 200
    assert review_response.json()["review_state"] == "reviewed"

    accept_response = await client.post(
        f"/api/ingestion/outputs/{pending_output['id']}/accept",
        headers=headers,
    )
    assert accept_response.status_code == 200
    assert accept_response.json()["review_state"] == "accepted"

    conflict_response = await client.post(
        f"/api/ingestion/outputs/{pending_output['id']}/reject",
        headers=headers,
    )
    assert conflict_response.status_code == 409
