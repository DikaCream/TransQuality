import pytest
import datetime
import genlayer.gl.genvm_contracts as gvc
import genlayer.gl as gl

BASE = 1790000000

@pytest.fixture(autouse=True)
def _reset():
    gvc.__known_contract__ = None

def iso(ts: int) -> str:
    return datetime.datetime.fromtimestamp(ts, tz=datetime.timezone.utc).isoformat()

def set_time(ts: int) -> None:
    gl.message_raw["datetime"] = iso(ts)