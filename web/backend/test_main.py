"""Run from the repository root:  python -m pytest web/backend

LRCLIB and Audius are replaced by a fake transport, so the tests never touch the network.
"""

import httpx
import pytest
from fastapi.testclient import TestClient

import lyrics
import scoring
from main import create_app

SONG = {
    "id": 42,
    "trackName": "Test Song",
    "artistName": "The Fixtures",
    "albumName": "Mocks",
    "duration": 200.0,
    "instrumental": False,
    "plainLyrics": "Hello world\nGoodbye world",
    "syncedLyrics": "[00:01.50] Hello world\n[00:04.00] \n[00:05.25] Goodbye world",
}
LENGTH = len("Hello world Goodbye world")


def track(track_id, title, duration, uploader="Someone", streamable=True):
    return {"id": track_id, "title": title, "duration": duration, "is_streamable": streamable, "user": {"name": uploader}}


AUDIUS_TRACKS = [
    track("far", "The Fixtures - Test Song", 320),
    track("cover", "Test Song (cover) The Fixtures", 200),
    track("slowed", "The Fixtures Test Song slowed + reverb", 201),
    track("mashup", "DJ Someone x The Fixtures - Test Song", 200),
    track("sings", "Anna sings Test Song by The Fixtures", 200),
    track("private", "The Fixtures - Test Song", 200, streamable=False),
    track("other", "Test Song", 200, uploader="Unrelated Band"),
    track("near", "Test Song The Fixtures", 205),
    track("exact", "Test Song", 200, uploader="The Fixtures"),
]


class Fake:
    """Answers like the two upstream services and counts the calls."""

    def __init__(self):
        self.audius_status = 200
        self.saavn_status = 200

    def __call__(self, request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if request.url.host == "jiosavan-api2.vercel.app":
            if self.saavn_status != 200:
                return httpx.Response(self.saavn_status, text="gone")
            return httpx.Response(200, json={"data": {"results": [
                {"id": "s1", "name": "Test Song", "duration": 202, "artists": {"primary": [{"name": "The Fixtures"}]},
                 "downloadUrl": [{"quality": "96kbps", "url": "https://cdn.test/96.mp4"}, {"quality": "160kbps", "url": "https://cdn.test/160.mp4"}]},
                {"id": "s2", "name": "Test Song (Karaoke)", "duration": 200, "artists": {"primary": [{"name": "The Fixtures"}]},
                 "downloadUrl": [{"quality": "160kbps", "url": "https://cdn.test/k.mp4"}]},
            ]}})
        if request.url.host == "itunes.apple.com":
            return httpx.Response(200, json={"results": [
                {"artistName": "Someone Else", "artworkUrl100": "https://img.test/other/100x100bb.jpg", "trackTimeMillis": 200000},
                {"artistName": "The Fixtures", "artworkUrl100": "https://img.test/live/100x100bb.jpg", "trackTimeMillis": 400000},
                {"artistName": "The Fixtures", "artworkUrl100": "https://img.test/album/100x100bb.jpg", "trackTimeMillis": 201000},
            ]})
        if path == "/api/search":
            duplicate = {**SONG, "id": 43, "syncedLyrics": None, "albumName": "Reissue"}
            instrumental = {**SONG, "id": 44, "trackName": "Quiet", "instrumental": True}
            hindi = {**SONG, "id": 45, "trackName": "Geet", "plainLyrics": "तुम हो", "syncedLyrics": None}
            return httpx.Response(200, json=[hindi, duplicate, SONG, instrumental])
        if path == "/api/get/42":
            return httpx.Response(200, json=SONG)
        if path.startswith("/api/get/"):
            return httpx.Response(404, json={})
        if path == "/v1/tracks/search":
            if self.audius_status != 200:
                return httpx.Response(self.audius_status, json={})
            return httpx.Response(200, json={"data": AUDIUS_TRACKS})
        raise AssertionError(f"unexpected request: {request.url}")


def make_client(tmp_path, fake):
    http = httpx.Client(transport=httpx.MockTransport(fake))
    return TestClient(create_app(f"sqlite:///{tmp_path / 'test.db'}", http_client=http))


@pytest.fixture
def fake():
    return Fake()


@pytest.fixture
def client(tmp_path, fake):
    with make_client(tmp_path, fake) as test_client:
        yield test_client


def signup(client, name="singer_07"):
    response = client.post("/api/auth/register", json={"username": name, "password": "sing-it-loud"})
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['token']}"}


def result(**overrides):
    body = dict(
        song_id=42, mode="text", elapsed_seconds=10, correct_characters=LENGTH, keystrokes=LENGTH,
        errors=0, backspaces=0, consistency=80, burst_wpm=50, completion=100,
    )
    return {**body, **overrides}


# ----- lyrics cleanup -----

def test_clean_line_makes_text_typeable():
    assert lyrics.clean_line("  Café  — don’t “stop”… ") == 'Cafe - don\'t "stop"...'


def test_artist_prefix_is_removed_from_titles():
    assert lyrics.clean_title("Queen - Bohemian Rhapsody", "Queen") == "Bohemian Rhapsody"
    assert lyrics.clean_title("Bohemian Rhapsody", "Queen") == "Bohemian Rhapsody"


def test_synced_lines_keep_order_and_drop_blanks_and_section_tags():
    parsed = lyrics.parse_synced("[00:05.00] Second\n[00:01.00] First\n[00:03.00] \n[00:04.00] [Chorus]")
    assert parsed == [{"t": 1.0, "text": "First"}, {"t": 5.0, "text": "Second"}]


def test_repeated_timestamps_expand():
    assert [line["t"] for line in lyrics.parse_synced("[00:01.00][01:02.50] Again")] == [1.0, 62.5]


def test_non_latin_lyrics_are_flagged():
    assert lyrics.is_typeable("Hello there") is True
    assert lyrics.is_typeable("तुम हो") is False


# ----- songs -----

def test_search_merges_releases_and_drops_instrumentals(client):
    rows = client.get("/api/songs/search", params={"q": "test"}).json()["results"]
    assert [row["id"] for row in rows] == [42, 45]  # timed release wins, untypeable rows go last
    assert rows[0]["synced"] is True and rows[1]["typeable"] is False


def test_song_returns_timed_clean_lines(client):
    song = client.get("/api/songs/42").json()
    assert song["lines"] == [{"t": 1.5, "text": "Hello world"}, {"t": 5.25, "text": "Goodbye world"}]
    assert song["length"] == LENGTH


def test_unknown_song_is_404(client):
    assert client.get("/api/songs/999").status_code == 404


def test_upstream_outage_is_502(tmp_path):
    def down(_: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("no route")

    with make_client(tmp_path, down) as test_client:
        assert test_client.get("/api/songs/search", params={"q": "test"}).status_code == 502


# ----- audio -----

def test_audio_keeps_the_same_recording_closest_first(client):
    found = client.get("/api/songs/42/audio").json()
    assert found["error"] is False
    assert [c["trackId"] for c in found["candidates"]] == ["exact", "saavn-s1", "near"]
    assert found["candidates"][1]["streamUrl"] == "https://cdn.test/160.mp4"
    assert found["candidates"][0]["streamUrl"].endswith("/v1/tracks/exact/stream?app_name=lyric-typer")


def test_saavn_covers_for_audius(client, fake):
    fake.audius_status = 500
    found = client.get("/api/songs/42/audio").json()
    assert [c["source"] for c in found["candidates"]] == ["jiosaavn"] and found["error"] is False


def test_both_sources_down_is_reported_not_raised(client, fake):
    fake.audius_status = fake.saavn_status = 500
    assert client.get("/api/songs/42/audio").json() == {"candidates": [], "error": True}


def test_art_is_the_same_artists_closest_release(client):
    assert client.get("/api/songs/42/art").json() == {"url": "https://img.test/album/600x600bb.jpg"}


# ----- results -----

def test_wpm_and_accuracy():
    assert scoring.wpm_and_accuracy(300, 300, 15, 60) == (60, 95.0)


def test_result_needs_sign_in(client):
    assert client.post("/api/results", json=result()).status_code == 401


def test_server_recomputes_and_stores_the_real_song(client):
    headers = signup(client)
    assert client.post("/api/results", json=result(), headers=headers).status_code == 201
    history = client.get("/api/me", headers=headers).json()["history"]
    assert len(history) == 1
    assert history[0]["title"] == "Test Song" and history[0]["mode"] == "text"
    assert history[0]["wpm"] == 30 and history[0]["accuracy"] == 100.0


@pytest.mark.parametrize("bad", [
    {"correct_characters": LENGTH + 1, "keystrokes": LENGTH + 1},  # more correct than the song has
    {"errors": 5},  # correct count leaves no room for the errors
    {"elapsed_seconds": 0.5},  # impossibly fast
])
def test_inconsistent_results_are_rejected(client, bad):
    assert client.post("/api/results", json=result(**bad), headers=signup(client)).status_code == 422


def test_unknown_mode_is_rejected(client):
    assert client.post("/api/results", json=result(mode="karaoke"), headers=signup(client)).status_code == 422


def test_clear_history_only_affects_that_user(client):
    first, second = signup(client, "first_user"), signup(client, "second_user")
    client.post("/api/results", json=result(), headers=first)
    client.post("/api/results", json=result(), headers=second)
    assert client.delete("/api/me/history", headers=first).status_code == 204
    assert client.get("/api/me", headers=first).json()["history"] == []
    assert len(client.get("/api/me", headers=second).json()["history"]) == 1


def test_leaderboard_is_each_typists_best_full_run(client):
    fast, slow = signup(client, "fast_one"), signup(client, "slow_one")
    client.post("/api/results", json=result(elapsed_seconds=10), headers=fast)
    client.post("/api/results", json=result(elapsed_seconds=6), headers=fast)
    client.post("/api/results", json=result(elapsed_seconds=20), headers=slow)
    client.post("/api/results", json=result(elapsed_seconds=3, completion=40), headers=slow)  # fastest, but only part of the song
    board = client.get("/api/songs/42/leaderboard", params={"mode": "text"}).json()["entries"]
    assert [(entry["username"], entry["wpm"]) for entry in board] == [("fast_one", 50), ("slow_one", 15)]
    assert client.get("/api/songs/42/leaderboard", params={"mode": "audio"}).json()["entries"] == []


def test_all_mode_and_daily_boards(client):
    headers = signup(client, "one_typist")
    client.post("/api/results", json=result(mode="text", elapsed_seconds=10), headers=headers)
    client.post("/api/results", json=result(mode="both", elapsed_seconds=6), headers=headers)
    every = client.get("/api/songs/42/leaderboard").json()["entries"]
    assert [(entry["wpm"], entry["mode"]) for entry in every] == [(50, "both")]
    assert client.get("/api/songs/42/leaderboard", params={"today": True}).json()["entries"] == every


def test_site_boards_rank_typists_and_count_plays(client):
    fast, slow = signup(client, "fast_one"), signup(client, "slow_one")
    client.post("/api/results", json=result(elapsed_seconds=6), headers=fast)
    client.post("/api/results", json=result(elapsed_seconds=20), headers=slow)
    client.post("/api/results", json=result(elapsed_seconds=3, completion=40), headers=slow)  # too little of the song to rank
    boards = client.get("/api/leaderboards").json()
    assert [(entry["username"], entry["wpm"], entry["title"]) for entry in boards["typists"]] == [("fast_one", 50, "Test Song"), ("slow_one", 15, "Test Song")]
    assert boards["songs"] == [{"songId": 42, "title": "Test Song", "artist": "The Fixtures", "plays": 3}]


def test_key_statistics_add_up_across_results_and_drills(client):
    headers = signup(client)
    client.post("/api/results", json=result(key_stats={"keys": {"b": [10, 2]}, "pairs": {"th": [4, 1]}}), headers=headers)
    assert client.post("/api/me/keys", json={"keys": {"b": [5, 1], "y": [3, 0]}}, headers=headers).status_code == 204
    assert client.get("/api/me", headers=headers).json()["keyStats"] == {"keys": {"b": [15, 3], "y": [3, 0]}, "pairs": {"th": [4, 1]}}
    client.delete("/api/me/history", headers=headers)
    assert client.get("/api/me", headers=headers).json()["keyStats"] == {"keys": {}, "pairs": {}}


@pytest.mark.parametrize("bad", [{"keys": {"B": [1, 0]}}, {"keys": {"b": [1, 2]}}, {"pairs": {"t": [1, 0]}}, {"keys": {"b": [-1, 0]}}])
def test_malformed_key_statistics_are_rejected(client, bad):
    assert client.post("/api/me/keys", json=bad, headers=signup(client)).status_code == 422


# ----- accounts -----

def test_login_logout_and_token_revocation(client):
    headers = signup(client)
    assert client.post("/api/auth/login", json={"username": "singer_07", "password": "wrong-password"}).status_code == 401
    assert client.post("/api/auth/logout", headers=headers).status_code == 204
    assert client.get("/api/me", headers=headers).status_code == 401


def test_duplicate_username_is_rejected(client):
    signup(client)
    assert client.post("/api/auth/register", json={"username": "SINGER_07", "password": "sing-it-loud"}).status_code == 409


def test_delete_account(client):
    headers = signup(client)
    assert client.delete("/api/me", headers=headers).status_code == 204
    assert client.get("/api/me", headers=headers).status_code == 401
