# Chromaoke

*Type the song. Paint the room.*

Practise typing with the full lyrics of a real song. Search for any track, then type every line of it.

| Mode | What happens |
|---|---|
| **Audio + text** | The song plays, the lyrics stay on screen, and the line being sung is marked. |
| **Audio only** | The lyrics stay hidden and you type what you hear. Capitals and punctuation are ignored. A correct word typed a little ahead re-aligns you automatically. |
| **Text only** | No music. Type the whole song at your own pace. |

In Audio + text you can also choose **Sing as I type**: each word is sung as you type it, and the song waits for you. Lyrics are only timed per line, so each word's moment is estimated from its share of the line (`web/src/engine/wordTimes.ts`).

Results (WPM, accuracy, consistency, words right) are kept per song, in the browser for guests or in the database for signed-in users. Each song has a leaderboard per mode, showing every signed-in typist's best run that covered at least 90% of the song.

The home page suggests songs for the typist's speed: easy, matching, and a stretch. The speed is the average of their last five results, or one they set with the slider. Each song page says how that song's pace compares.

The app keeps a tally of how often each letter and letter pair is aimed at and missed (counts only, never the typed text). The **Practice** page shows the weakest keys, suggests songs whose lyrics use those letters more than usual, and builds one-minute drills from real lyric lines. The **Progress** page shows the tallies as a keyboard heatmap, and each result lists the keys that cost the most.

There is a **song of the day**, the same for everyone, with its own board that resets each UTC day. The **Leaderboards** page also ranks typists by their fastest full run and lists the songs played most this week. A practice streak counts days in a row with a finished song.

Pages: Home (`#/`), a song page (`#/song/<id>`, with your own record on it beside its leaderboard), Practice (`#/practice`), Leaderboards (`#/leaderboards`), Progress (`#/history`) and Account (`#/account`).

The interface uses Bricolage Grotesque for headings, Geist for text and Geist Mono for lyrics. The resting look is warm black with brass. The logo is the C of Chromaoke as a microphone's cradle, with the mic head in its mouth: brass at rest, and in the song's colours while one plays.

## Where the data comes from

- **Lyrics:** [LRCLIB](https://lrclib.net), a free API with no key. Lyrics are fetched live and held in a small in-memory cache, never stored in the database.
- **Audio:** [Audius](https://audius.co), a free music API with no key that streams full tracks. Anyone can upload to it, so the app only offers uploads whose name and length match the song, and they are labelled with the uploader. Some songs have no match there, so [JioSaavn](https://www.jiosaavn.com) is searched as well, through an unofficial community-run API (`web/backend/saavn.py`). That API can disappear without notice and is meant for local use and demos; set `SAAVN_API_URL=` (empty) to turn it off. Text only works for every song.
- **Look:** album art from the iTunes Search API (free, no key) sets each song's colours. The site rests in black and grey, and the colour arrives when the song starts. The app takes up to three colours from the cover (the room, the controls, the sung line) and builds a dark, limited-saturation palette from them, and a soft glow pulses with the bass.

Timed lyrics come from one recording, so the sung-line marker can drift on an upload with a different intro. Audio + text has a timing adjustment for this.

## Run it

Frontend:

```bash
cd web
npm install
npm run dev        # http://localhost:5173
```

API, from the repository root:

```bash
pip install -r requirements-web.txt
uvicorn main:app --reload --app-dir web/backend
```

If port 8000 is taken, run the API with `--port 8010` and start the frontend with `API_URL=http://127.0.0.1:8010 npm run dev`.

With no `DATABASE_URL` the API uses a SQLite file. For PostgreSQL:

```bash
docker compose up -d
# in .env: DATABASE_URL=postgresql+psycopg://lyrics:lyrics@localhost:5432/lyric_typer
```

Tests and checks:

```bash
python -m pytest web/backend
cd web && npm run build && npm run lint
```

## Keys while typing

| Key | Action |
|---|---|
| `Space` | Next word (`Enter` also works in text modes) |
| `Backspace` | Fix the current word |
| `Tab` | Rewind 5 seconds |
| `Ctrl`+`Space` | Pause |
| `Enter` (Audio only) | Jump to the line being sung |
| `Esc` | Finish and see results |

## Code map

| Path | What it does |
|---|---|
| `web/src/engine/session.ts` | One attempt at a song: word-by-word typing, audio-only re-alignment, results |
| `web/src/engine/typing.ts` | WPM, accuracy, burst and consistency from the keystroke log |
| `web/src/components/AudioPlayer.tsx` | Plays the audio stream with no visible element |
| `web/src/components/Typing.tsx` | The typing screen: keyboard handling, playback and sung-line tracking |
| `web/src/components/LyricsPane.tsx` | Renders the lyrics, or the hidden blanks in Audio only |
| `web/backend/lyrics.py` | LRCLIB client; cleans lyrics into text a keyboard can type |
| `web/src/engine/keys.ts` | Per-key miss tallies, weak keys, and drill building |
| `web/src/engine/letterShares.ts` | Generated: letter frequencies of each suggested song's lyrics |
| `web/src/engine/catalog.ts` | Tested songs with their pace, and the speed-matched suggestions |
| `web/src/engine/theme.ts` | Turns album art into the page's palette |
| `web/backend/artwork.py` | Finds the album cover for a song |
| `web/backend/saavn.py` | Fallback audio from JioSaavn |
| `web/backend/audius.py` | Finds uploads matching the song's name, artist and length |
| `web/backend/main.py` | API routes: accounts, songs, audio, results |
| `web/backend/scoring.py` | Server-side WPM and accuracy, so client numbers aren't trusted |

Songs mostly in a non-Latin script appear in search but can't be selected, since a standard keyboard session can't score them.

The earlier Robot Repair game is preserved on the `backup/robot-repair-game` branch.
