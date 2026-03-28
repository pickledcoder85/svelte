from backend.app.models.auth import AuthSession, LoginRequest
from backend.app.repositories.sqlite import SQLiteRepository


def create_session(repository: SQLiteRepository, payload: LoginRequest) -> AuthSession:
    session = AuthSession.create_local(payload.email, payload.display_name)
    repository.save_user_identity(
        user_id=session.user_id,
        email=session.email,
        display_name=session.display_name,
    )
    return repository.save_session(session)


def get_session_from_token(repository: SQLiteRepository, access_token: str) -> AuthSession | None:
    return repository.get_session(access_token)
