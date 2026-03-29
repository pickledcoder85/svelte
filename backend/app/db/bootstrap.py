from __future__ import annotations

import argparse

from backend.app.db.database import apply_migrations, get_database_url, reset_database
from backend.app.db.dev_seed import seed_dev_data

def main() -> None:
    parser = argparse.ArgumentParser(description="Manage the local SQLite database.")
    parser.add_argument("--database-url", default=None, help="Override DATABASE_URL for this command.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Delete the target SQLite database file before applying migrations.",
    )
    parser.add_argument(
        "--seed-dev",
        action="store_true",
        help="Seed a reusable local development user and baseline data after migrations.",
    )
    args = parser.parse_args()

    database_url = args.database_url or get_database_url()

    if args.reset:
        path = reset_database(database_url)
        print(f"Reset database at {path}.")

    apply_migrations(database_url)
    print("Database migrations applied.")

    if args.seed_dev:
        seed_result = seed_dev_data(database_url)
        print(
            "Seeded local development data for "
            f"{seed_result['user_email']} in {seed_result['database_path']}."
        )


if __name__ == "__main__":
    main()
