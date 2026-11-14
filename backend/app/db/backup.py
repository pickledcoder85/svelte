"""Consistent SQLite snapshots with simple retention.

Uses SQLite's online backup API, which produces a consistent copy even while the app is
writing. Never copy a live WAL database file with `cp`.

Usage (nightly cron or before a deploy):
    python -m backend.app.db.backup --database /var/lib/relish/relish.db \\
        --dest /var/lib/relish/backups --keep 14
"""

import argparse
import sqlite3
from datetime import UTC, datetime
from pathlib import Path

BACKUP_PREFIX = "relish-"
BACKUP_SUFFIX = ".db"


def backup_database(
    database_path: str | Path,
    destination_dir: str | Path,
    *,
    keep: int = 14,
    label: str = "snapshot",
    now: datetime | None = None,
) -> Path | None:
    """Write a snapshot of `database_path` into `destination_dir` and prune old ones.

    Returns the snapshot path, or None when there is no database yet (first start).
    """
    source = Path(database_path)
    if str(database_path) == ":memory:" or not source.exists():
        return None
    destination = Path(destination_dir)
    destination.mkdir(parents=True, exist_ok=True)
    stamp = (now or datetime.now(UTC)).strftime("%Y%m%dT%H%M%S%fZ")
    target = destination / f"{BACKUP_PREFIX}{stamp}-{label}{BACKUP_SUFFIX}"

    source_connection = sqlite3.connect(source)
    target_connection = sqlite3.connect(target)
    try:
        source_connection.backup(target_connection)
    finally:
        target_connection.close()
        source_connection.close()

    prune_backups(destination, keep=keep)
    return target


def prune_backups(destination_dir: str | Path, *, keep: int) -> list[Path]:
    """Delete all but the newest `keep` snapshots made by this module."""
    snapshots = sorted(
        Path(destination_dir).glob(f"{BACKUP_PREFIX}*{BACKUP_SUFFIX}"),
        key=lambda path: path.name,
    )
    removed = snapshots[: max(len(snapshots) - max(keep, 1), 0)]
    for path in removed:
        path.unlink()
    return removed


def main() -> None:
    parser = argparse.ArgumentParser(description="Snapshot the Relish SQLite database.")
    parser.add_argument("--database", required=True, help="Path to the live SQLite file")
    parser.add_argument("--dest", required=True, help="Directory for snapshots")
    parser.add_argument("--keep", type=int, default=14, help="Snapshots to keep (default 14)")
    parser.add_argument("--label", default="nightly", help="Label in the snapshot file name")
    args = parser.parse_args()
    target = backup_database(args.database, args.dest, keep=args.keep, label=args.label)
    print(target if target else f"No database at {args.database}; nothing to back up.")


if __name__ == "__main__":
    main()
