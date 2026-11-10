"""Run from the repository root:  python -m pytest web/backend"""

import pytest
from fastapi.testclient import TestClient

import scoring
from main import create_app

PASSAGE = scoring.MISSIONS["battery"]["levels"][0]["passages"][0]


@pytest.fixture
def client(tmp_path):
    with TestClient(create_app(f"sqlite:///{tmp_path / 'test.db'}")) as test_client:
        yield test_client


def signup(client, name="tech_07"):
    response = client.post("/api/auth/register", json={"username": name, "password": "glitch-buster"})
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['token']}"}


def session(**overrides):
    n = len(PASSAGE)
    body = dict(
        mission="battery", level=1, passage=PASSAGE, repaired=True, time_left=40, elapsed_seconds=20,
        correct_characters=n, keystrokes=n, errors=0, backspaces=0, consistency=80, burst_wpm=50,
        features={"charStats": {"a": [5, 0]}}, profile={"sessions": 1},
    )
    return {**body, **overrides}


# ----- pure scoring -----

def test_wpm_and_accuracy():
    assert scoring.wpm_and_accuracy(300, 300, 15, 60) == (60, 95.0)
    assert scoring.rewards(60, 95.0, True, 1, 20, 26)[1] == 3


def test_failed_repair_gives_no_stars():
    assert scoring.rewards(60, 100, False, 1, 0, 26) == (30, 0)


def test_fast_but_sloppy_does_not_level_up():
    assert scoring.next_level(2, 3, 80, 90, 34, True)["change"] == 0


def test_accurate_and_fast_levels_up():
    assert scoring.next_level(1, 3, 40, 97, 26, True) == {"level": 2, "change": 1, "reason": "target_beaten"}


def test_low_accuracy_levels_down():
    assert scoring.next_level(2, 3, 40, 80, 26, True)["level"] == 1


def test_passage_validation():
    assert scoring.validate_passage("Reroute the motion circuit through junction four.")["ok"]
    assert not scoring.validate_passage("short")["ok"]
    assert not scoring.validate_passage("Type your password here so the robot can reboot.")["ok"]


def test_catalogue_passages_are_valid():
    for mission in scoring.MISSIONS.values():
        for level in mission["levels"]:
            for passage in level["passages"]:
                assert scoring.validate_passage(passage)["ok"], passage


# ----- accounts -----

def test_register_login_logout(client):
    headers = signup(client)
    assert client.get("/api/me", headers=headers).json()["username"] == "tech_07"
    assert client.post("/api/auth/register", json={"username": "TECH_07", "password": "another-pass"}).status_code == 409
    assert client.post("/api/auth/login", json={"username": "tech_07", "password": "wrong-password"}).status_code == 401
    login = client.post("/api/auth/login", json={"username": "Tech_07", "password": "glitch-buster"})
    assert login.status_code == 200
    assert client.post("/api/auth/logout", headers=headers).status_code == 204
    assert client.get("/api/me", headers=headers).status_code == 401


def test_bad_credentials_rejected(client):
    assert client.post("/api/auth/register", json={"username": "x", "password": "glitch-buster"}).status_code == 422
    assert client.post("/api/auth/register", json={"username": "valid_name", "password": "short"}).status_code == 422
    assert client.get("/api/me").status_code == 401
    assert client.get("/api/me", headers={"Authorization": "Bearer nope"}).status_code == 401


def test_password_is_not_stored_in_plain_text(client):
    signup(client)
    with client.app.state.db.make_session() as db:
        from db import User
        stored = db.query(User).one().password_hash
    assert "glitch-buster" not in stored and stored.startswith("scrypt$")


# ----- sessions -----

def test_session_is_scored_by_server_and_stored(client):
    headers = signup(client)
    # The client cannot choose its own score: wpm/xp are recomputed from raw counts.
    response = client.post("/api/sessions", json=session(), headers=headers)
    assert response.status_code == 201
    body = response.json()
    assert body["wpm"] == round(len(PASSAGE) / 5 / (20 / 60))
    assert body["decision"]["level"] == 2
    me = client.get("/api/me", headers=headers).json()
    assert me["xp"] == body["xp"]
    assert me["missions"]["battery"] == {"level": 2, "bestStars": 3, "bestWpm": body["wpm"], "repairs": 1}
    assert len(me["history"]) == 1 and me["profile"] == {"sessions": 1}


@pytest.mark.parametrize(
    "overrides",
    [
        {"passage": "not a real passage from the catalogue"},
        {"mission": "battery", "level": 9},
        {"correct_characters": 999},
        {"errors": 10, "keystrokes": len(PASSAGE)},  # cannot have every char correct with 10 errors
        {"elapsed_seconds": 0.5},  # impossible WPM
        {"elapsed_seconds": 500},  # longer than the time limit
        {"repaired": True, "keystrokes": 5, "correct_characters": 5},
        {"time_left": 59, "elapsed_seconds": 20},  # claims more bonus time than was left
    ],
)
def test_implausible_sessions_rejected(client, overrides):
    headers = signup(client)
    assert client.post("/api/sessions", json=session(**overrides), headers=headers).status_code == 422


def test_users_only_see_their_own_history(client):
    alice, bob = signup(client, "alice"), signup(client, "bob")
    client.post("/api/sessions", json=session(), headers=alice)
    assert client.get("/api/me", headers=bob).json()["history"] == []


def test_clear_history_and_delete_account(client):
    headers = signup(client)
    client.post("/api/sessions", json=session(), headers=headers)
    assert client.delete("/api/me/history", headers=headers).status_code == 204
    me = client.get("/api/me", headers=headers).json()
    assert me["history"] == [] and me["xp"] == 0 and me["missions"] == {} and me["profile"] is None
    assert client.delete("/api/me", headers=headers).status_code == 204
    assert client.get("/api/me", headers=headers).status_code == 401
