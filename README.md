<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/logo-dark.svg" />
    <img src="docs/logo-light.svg" height="52" align="absmiddle" alt="Chromaoke logo: the letter C as a microphone's cradle, with the mic head in its mouth" />
  </picture>
  Chromaoke
</h1>

<p align="center"><em>Type the song. Paint the room.</em></p>

<p align="center">
  Typing practice with the full lyrics of real songs. Read along, sing along, or type purely by ear,<br />
  and watch each song colour the whole site from its album cover.
</p>

![Home page: the headline "Type the song. Paint the room.", a search box, and the song of the day](docs/screenshots/home.jpg)

## How it works

Search for any song, pick a mode, and type every line of it.

| Mode | What happens |
|---|---|
| **Audio + text** | The song plays, the lyrics stay on screen, and the line being sung is marked. |
| **Audio only** | The lyrics stay hidden and you type what you hear. Capitals and punctuation are ignored, and a correct word typed a little ahead re-aligns you automatically. |
| **Text only** | No music. Type the whole song at your own pace. |

In Audio + text you can also turn on **Sing as I type**: each word is sung as you type it, and the song waits for you.

The site rests in warm black and brass. When a song starts, three colours are taken from its album cover and ripple out from the cover in rings, painting the page:

![The moment "Stand by Me" starts: rings of rose, orange and violet ripple out from the album cover across the page](docs/screenshots/ripple.jpg)

The ripple settles into a slow-drifting wash of all three colours that pulses on the bass, with the colours kept dark enough for the lyrics to stay readable. Going back to the home page fades it out again. People whose system asks for reduced motion get the colours without the ripple or the drift.

![Typing "Stand by Me" in Audio + text, in a wash of the cover's rose, violet and orange, with the line being sung marked](docs/screenshots/typing.jpg)

![Results for "Perfect", in the cover's blue and green: 65 WPM, 98% accuracy, all 289 words right, and a chart of speed through the song](docs/screenshots/results.jpg)

## Features

- **Songs for your speed.** Suggestions in three groups (easy, your speed, a stretch), matched to your recent results or a speed you set. Each song page says how its pace compares with yours.
- **Practice on your weak keys.** The app tallies how often you miss each letter and letter pair, then suggests songs that use those letters more than usual and builds one-minute drills from real lyric lines.
- **Progress.** Your speed over time, a keyboard heatmap of the keys you miss, a daily streak, and every attempt.
- **Leaderboards.** A board for every song in every mode, a song of the day with a board that resets daily, top typists, and the most-played songs this week.
- **Your record on each song.** Best speed per mode and a chart of every attempt, beside that song's leaderboard.
- **Accounts.** Guests keep everything in the browser. Signed-in users keep history and key statistics on the server, and the server recomputes every score rather than trusting the browser.

![Practice page: the keys B and Y and the pair MY are flagged as weak, with a quick drill and songs that use those letters more](docs/screenshots/practice.jpg)

## Where the data comes from

| Need | Source | Key needed |
|---|---|---|
| Lyrics, with line timing | [LRCLIB](https://lrclib.net) | No |
| Audio | [Audius](https://audius.co) | No |
| Audio fallback | JioSaavn, through an unofficial community API | No |
| Album art for the colours | iTunes Search API | No |

- **Lyrics** are fetched live and cleaned into text a standard keyboard can type: curly quotes, accents and dashes become their plain forms. They are held in a small in-memory cache and never stored in the database.
- **Audio** comes from whichever source has the recording closest in length to the timed lyrics, so the sung-line marker lines up. Audius uploads come from its users, so the app only offers ones whose name, artist and length match, and labels them with the uploader.
- **Text only** works for every song, even when no audio is found.

> [!WARNING]
> The JioSaavn fallback relies on a third-party service that decrypts JioSaavn's audio, and it can disappear without notice. It is meant for local use and demos. Set `SAAVN_API_URL=` (empty) to turn it off, and decide about it before making this repository public.

## Run it

You need Node.js and Python 3.

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

With no `DATABASE_URL` the API uses a local SQLite file. For PostgreSQL:

```bash
docker compose up -d
# in .env: DATABASE_URL=postgresql+psycopg://lyrics:lyrics@localhost:5432/lyric_typer
```

## Keys while typing

| Key | Action |
|---|---|
| `Space` | Next word (`Enter` also works in text modes) |
| `Backspace` | Fix the current word |
| `Tab` | Rewind 5 seconds |
| `Ctrl` + `Space` | Pause or resume |
| `Enter` in Audio only | Jump to the line being sung |
| `Esc` | Finish and see your results |

## Built with

- **Frontend:** React 19, TypeScript and Vite, with plain CSS. Fonts are Bricolage Grotesque (headings), Geist (text) and Geist Mono (lyrics).
- **Backend:** FastAPI, SQLAlchemy and httpx, on SQLite or PostgreSQL.
- **Tests:** pytest, with the outside services replaced by fakes so the tests never touch the network.

```bash
python -m pytest web/backend           # backend tests
cd web && npm run build && npm run lint  # type-check, build and lint
```

## Code map

| Path | What it does |
|---|---|
| `web/src/engine/session.ts` | One attempt at a song: word-by-word typing, audio-only re-alignment, results |
| `web/src/engine/typing.ts` | WPM, accuracy, burst speed and consistency from the keystroke log |
| `web/src/engine/wordTimes.ts` | Estimates when each word is sung, for Sing as I type |
| `web/src/engine/theme.ts` | Turns album art into the page's palette |
| `web/src/engine/keys.ts` | Per-key miss tallies, weak keys, and drill building |
| `web/src/engine/catalog.ts` | Tested songs with their pace, speed-matched suggestions, and the song of the day |
| `web/src/engine/letterShares.ts` | Generated letter frequencies of each suggested song's lyrics |
| `web/src/components/Typing.tsx` | The typing screen: keyboard handling, playback and sung-line tracking |
| `web/src/components/LyricsPane.tsx` | Renders the lyrics, or the hidden blanks in Audio only |
| `web/backend/main.py` | API routes: accounts, songs, audio, artwork, results, leaderboards |
| `web/backend/lyrics.py` | LRCLIB client that cleans lyrics into typeable text |
| `web/backend/audius.py` | Finds Audius uploads matching a song's name, artist and length |
| `web/backend/saavn.py` | Fallback audio from JioSaavn |
| `web/backend/artwork.py` | Finds the album cover for a song |
| `web/backend/scoring.py` | Server-side WPM and accuracy, so client numbers aren't trusted |

## Good to know

- Lyrics are only timed per line, so Sing as I type estimates each word's moment from its share of the line. It can be slightly early or late.
- Timed lyrics come from one recording, so the sung-line marker can drift on a recording with a different intro. Audio + text has a timing adjustment for this.
- Songs mostly in a non-Latin script appear in search but can't be selected, since a standard keyboard session can't score them.
- Leaderboards only count signed-in runs that covered at least 90% of the song. The song of the day changes at midnight UTC.
- The project began as a typing game called Robot Repair, which is preserved on the `backup/robot-repair-game` branch.
