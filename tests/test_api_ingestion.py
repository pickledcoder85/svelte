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
    rejected_output = repository.save_ingestion_output(
        ingestion_job_id=job_id,
        extracted_text="Serving size 1 cup",
        structured_json={"serving_size": "1 cup"},
        confidence=0.74,
        output_id="output-rejected",
    )
    accepted_output = repository.save_ingestion_output(
        ingestion_job_id=job_id,
        extracted_text="Calories 150",
        structured_json={"calories": 150},
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
    assert {item["id"] for item in queue} == {pending_output["id"], rejected_output["id"]}
    assert all(item["review_state"] == "pending" for item in queue)
    assert queue[0]["structured_json"] in (
        {"product_name": "Rolled oats"},
        {"serving_size": "1 cup"},
    )

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
    assert read_response.json()["structured_json"] == {"product_name": "Rolled oats"}

    review_response = await client.post(
        f"/api/ingestion/outputs/{pending_output['id']}/review",
        headers=headers,
    )
    assert review_response.status_code == 200
    assert review_response.json()["review_state"] == "reviewed"

    accept_response = await client.post(
        f"/api/ingestion/outputs/{pending_output['id']}/accept",
        headers=headers,
        json={
            "extracted_text": "Nutrition Facts\nServing size 2 cups",
            "structured_json": {
                "product_name": "Rolled oats",
                "serving_size": "2 cups",
                "calories": 300,
            },
        },
    )
    assert accept_response.status_code == 200
    assert accept_response.json()["review_state"] == "accepted"
    assert accept_response.json()["extracted_text"] == "Nutrition Facts\nServing size 2 cups"
    assert accept_response.json()["structured_json"] == {
        "product_name": "Rolled oats",
        "serving_size": "2 cups",
        "calories": 300,
    }

    conflict_response = await client.post(
        f"/api/ingestion/outputs/{rejected_output['id']}/reject",
        headers=headers,
    )
    assert conflict_response.status_code == 200
    assert conflict_response.json()["review_state"] == "rejected"

    queue_after_response = await client.get("/api/ingestion/queue", headers=headers)
    assert queue_after_response.status_code == 200
    assert queue_after_response.json() == []

    refreshed_job_outputs_response = await client.get(
        f"/api/ingestion/jobs/{job_id}/outputs",
        headers=headers,
    )
    assert refreshed_job_outputs_response.status_code == 200
    refreshed_job_outputs = refreshed_job_outputs_response.json()
    assert {item["review_state"] for item in refreshed_job_outputs} == {"accepted", "rejected"}
