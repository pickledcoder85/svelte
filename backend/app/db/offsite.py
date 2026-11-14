"""Copy database snapshots to a private Google Cloud Storage bucket.

Runs on the Google Cloud VM and authenticates as the VM's attached service account through
the metadata server: no key files exist anywhere. The VM needs the Storage "Read Write"
access scope. Old copies are pruned here (the scope cannot change bucket lifecycle rules).
"""

from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from pathlib import Path
from urllib.parse import quote

import httpx

METADATA_TOKEN_URL = (
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token"
)
STORAGE_API = "https://storage.googleapis.com/storage/v1"
UPLOAD_API = "https://storage.googleapis.com/upload/storage/v1"
DEFAULT_PREFIX = "snapshots/"
TIMEOUT_SECONDS = 60


class OffsiteBackupError(RuntimeError):
    pass


def fetch_metadata_token(client: httpx.Client) -> str:
    response = client.get(METADATA_TOKEN_URL, headers={"Metadata-Flavor": "Google"})
    if response.status_code != 200:
        raise OffsiteBackupError(f"Metadata server returned {response.status_code}; is this a Google Cloud VM?")
    token = response.json().get("access_token")
    if not token:
        raise OffsiteBackupError("Metadata server returned no access token.")
    return token


def upload_snapshot(
    client: httpx.Client,
    token: str,
    bucket: str,
    snapshot: Path,
    prefix: str = DEFAULT_PREFIX,
) -> str:
    """Upload one snapshot file; returns the object name."""
    name = f"{prefix}{snapshot.name}"
    response = client.post(
        f"{UPLOAD_API}/b/{quote(bucket, safe='')}/o",
        params={"uploadType": "media", "name": name},
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/octet-stream"},
        content=snapshot.read_bytes(),
    )
    if response.status_code not in (200, 201):
        raise OffsiteBackupError(f"Upload of {name} failed with {response.status_code}: {response.text[:200]}")
    return name


def prune_remote(
    client: httpx.Client,
    token: str,
    bucket: str,
    *,
    keep_days: int,
    prefix: str = DEFAULT_PREFIX,
    now: datetime | None = None,
) -> list[str]:
    """Delete copies older than keep_days; never deletes the newest copy."""
    headers = {"Authorization": f"Bearer {token}"}
    items: list[dict] = []
    page_token: str | None = None
    while True:
        params = {"prefix": prefix, "fields": "items(name,timeCreated),nextPageToken"}
        if page_token:
            params["pageToken"] = page_token
        response = client.get(f"{STORAGE_API}/b/{quote(bucket, safe='')}/o", params=params, headers=headers)
        if response.status_code != 200:
            raise OffsiteBackupError(f"Listing {bucket} failed with {response.status_code}: {response.text[:200]}")
        payload = response.json()
        items.extend(payload.get("items", []))
        page_token = payload.get("nextPageToken")
        if not page_token:
            break

    cutoff = (now or datetime.now(UTC)) - timedelta(days=max(keep_days, 1))
    items.sort(key=lambda item: item["timeCreated"])
    deleted: list[str] = []
    for item in items[:-1]:  # always keep the newest copy
        created = datetime.fromisoformat(item["timeCreated"].replace("Z", "+00:00"))
        if created < cutoff:
            response = client.delete(
                f"{STORAGE_API}/b/{quote(bucket, safe='')}/o/{quote(item['name'], safe='')}",
                headers=headers,
            )
            if response.status_code not in (200, 204, 404):
                raise OffsiteBackupError(f"Deleting {item['name']} failed with {response.status_code}")
            deleted.append(item["name"])
    return deleted


def copy_offsite(
    snapshot: Path,
    bucket: str,
    *,
    keep_days: int = 30,
    client_factory: Callable[[], httpx.Client] | None = None,
) -> tuple[str, list[str]]:
    """Upload a snapshot and prune old copies. Returns (uploaded name, deleted names)."""
    factory = client_factory or (lambda: httpx.Client(timeout=TIMEOUT_SECONDS))
    with factory() as client:
        token = fetch_metadata_token(client)
        uploaded = upload_snapshot(client, token, bucket, snapshot)
        deleted = prune_remote(client, token, bucket, keep_days=keep_days)
    return uploaded, deleted
