from backend.app.db.database import apply_migrations


def main() -> None:
    apply_migrations()
    print("Database migrations applied.")


if __name__ == "__main__":
    main()

