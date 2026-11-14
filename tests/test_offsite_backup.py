import json
from datetime import UTC, datetime

import httpx
import pytest

from backend.app.db.offsite import (
    METADATA_TOKEN_URL,
    OffsiteBackupError,
    copy_offsite,
    prune_remote,
)

BUCKET = "relish-backups-test"


class FakeStorage:
    """A tiny stand-in for the metadata server and the Cloud Storage JSON API."""

    def __init__(self, objects: dict[str, str] | None = None, token_status: int = 200):
        self.objects = dict(objects or {})
        self.token_status = token_status
        self.requests: list[httpx.Request] = []

    def handler(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        url = str(request.url)
        if url.startswith(METADATA_TOKEN_URL):
            assert request.headers["Metadata-Flavor"] == "Google"
            if self.token_status != 200:
                return httpx.Response(self.token_status)
            return httpx.Response(200, json={"access_token": "token-123", "expires_in": 3599})
        assert request.headers["Authorization"] == "Bearer token-123"
        if request.method == "POST" and "/upload/storage/v1/" in url:
            name = request.url.params["name"]
            self.objects[name] = "2026-11-14T21:00:00Z"
            return httpx.Response(200, json={"name": name})
        if request.method == "GET" and url.split("?")[0].endswith("/o"):
            prefix = request.url.params.get("prefix", "")
            items = [{"name": n, "timeCreated": t} for n, t in self.objects.items() if n.startswith(prefix)]
            return httpx.Response(200, json={"items": items})
        if request.method == "DELETE":
            name = httpx.URL(url).path.split("/o/", 1)[1]
            from urllib.parse import unquote

            self.objects.pop(unquote(name), None)
            return httpx.Response(204)
        return httpx.Response(404)

    def client(self) -> httpx.Client:
        return httpx.Client(transport=httpx.MockTransport(self.handler))


def test_copy_offsite_uploads_with_the_vm_identity_and_prunes_old_copies(tmp_path):
    snapshot = tmp_path / "relish-20261114T213812Z-nightly.db"
    snapshot.write_bytes(b"SQLite format 3\x00 test")
    storage = FakeStorage(
        {
            "snapshots/relish-old.db": "2026-09-01T00:00:00Z",
            "snapshots/relish-recent.db": "2026-11-10T00:00:00Z",
        }
    )

    uploaded, deleted = copy_offsite(snapshot, BUCKET, keep_days=30, client_factory=storage.client)

    assert uploaded == "snapshots/relish-20261114T213812Z-nightly.db"
    assert deleted == ["snapshots/relish-old.db"]
    assert set(storage.objects) == {"snapshots/relish-recent.db", uploaded}
    upload = next(r for r in storage.requests if r.method == "POST")
    assert upload.content == b"SQLite format 3\x00 test"
    assert upload.url.params["uploadType"] == "media"


def test_prune_never_deletes_the_newest_copy():
    storage = FakeStorage({"snapshots/only.db": "2020-01-01T00:00:00Z"})
    with storage.client() as client:
        deleted = prune_remote(client, "token-123", BUCKET, keep_days=30, now=datetime(2026, 11, 14, tzinfo=UTC))
    assert deleted == []
    assert "snapshots/only.db" in storage.objects


def test_missing_metadata_server_is_a_clear_error(tmp_path):
    snapshot = tmp_path / "s.db"
    snapshot.write_bytes(b"x")
    storage = FakeStorage(token_status=404)
    with pytest.raises(OffsiteBackupError, match="Google Cloud VM"):
        copy_offsite(snapshot, BUCKET, client_factory=storage.client)


def test_failed_upload_raises(tmp_path):
    snapshot = tmp_path / "s.db"
    snapshot.write_bytes(b"x")

    def handler(request: httpx.Request) -> httpx.Response:
        if str(request.url).startswith(METADATA_TOKEN_URL):
            return httpx.Response(200, content=json.dumps({"access_token": "token-123"}))
        return httpx.Response(403, text="forbidden")

    with pytest.raises(OffsiteBackupError, match="Upload of snapshots/s.db failed with 403"):
        copy_offsite(snapshot, BUCKET, client_factory=lambda: httpx.Client(transport=httpx.MockTransport(handler)))
