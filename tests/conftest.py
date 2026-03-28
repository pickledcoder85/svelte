import asyncio

import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.main import create_app


class SyncApiClient:
    def __init__(self) -> None:
        self.app = create_app()

    def request(self, method: str, path: str, **kwargs):
        async def send():
            transport = ASGITransport(app=self.app)
            async with AsyncClient(transport=transport, base_url="http://testserver") as client:
                return await client.request(method, path, **kwargs)

        return asyncio.run(send())

    def get(self, path: str, **kwargs):
        return self.request("GET", path, **kwargs)

    def post(self, path: str, **kwargs):
        return self.request("POST", path, **kwargs)


@pytest.fixture()
def client() -> SyncApiClient:
    return SyncApiClient()
