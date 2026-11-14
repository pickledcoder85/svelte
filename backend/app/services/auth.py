from backend.app.models.auth import AuthSession, LoginRequest
from backend.app.repositories.sqlite import SQLiteRepository


class AuthIntentConflictError(RuntimeError):
    pass


def create_session(repository: SQLiteRepository, payload: LoginRequest) -> AuthSession:
    existing_user = repository.get_user_identity_by_email(payload.email)
    if payload.intent == "signup" and existing_user is not None:
        raise AuthIntentConflictError("That email already has a profile. Sign in instead.")
    if payload.intent == "signin" and existing_user is None:
        raise AuthIntentConflictError("No profile found for that email. Sign up instead.")

    session = AuthSession.create_local(payload.email, payload.display_name)
    repository.ensure_user_identity(
        user_id=session.user_id,
        email=session.email,
        display_name=session.display_name,
    )
    return repository.save_session(session)


def get_session_from_token(repository: SQLiteRepository, access_token: str) -> AuthSession | None:
    return repository.get_session(access_token)
