from backend.app.models.auth import AuthSession, LoginRequest
from backend.app.repositories.memory import InMemoryBackendRepository


def create_session(repository: InMemoryBackendRepository, payload: LoginRequest) -> AuthSession:
    session = AuthSession.create_local(payload.email, payload.display_name)
    return repository.save_session(session)


def get_session_from_token(
    repository: InMemoryBackendRepository, access_token: str
) -> AuthSession | None:
    return repository.get_session(access_token)
