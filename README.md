# Robot Repair — web game

*Repair. Type. Improve.* A gamified typing platform where you are a technician
repairing robots corrupted by The Glitch. Every repair is a typing exercise, and a
learning engine adapts future missions to your weaknesses.

This repository implements the first three phases of the project vision: a playable
game with a real typing engine, performance reports and the core visual identity;
the rule-based first stage of the behaviour analyzer and adaptive difficulty engine;
and accounts with a database-backed session history.

## Run it

```bash
cd web
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
npm run lint
```

The game works on its own as a **guest** (progress saved in the browser). To use
**accounts**, run the API as well, from the repository root:

```bash
pip install -r requirements-web.txt
uvicorn main:app --reload --app-dir web/backend   # http://localhost:8000/docs
python -m pytest web/backend                      # backend tests
```

`npm run dev` forwards `/api` to port 8000. With no `DATABASE_URL` the API uses a
SQLite file (`web/backend/robot_repair.db`). For PostgreSQL:

```bash
docker compose up -d
# PowerShell: $env:DATABASE_URL = "postgresql+psycopg://robot:robot@localhost:5432/robot_repair"
export DATABASE_URL=postgresql+psycopg://robot:robot@localhost:5432/robot_repair
uvicorn main:app --reload --app-dir web/backend
```

## How it plays

1. **Workshop**: your rank, XP, daily goal, robot collection, R.O.B.I.'s tip and the five missions.
2. **Briefing**: a damaged robot arrives; read its diagnosis and pick a difficulty level.
3. **Repair Station**: type the repair command. Correct keys restore core integrity, mistakes trigger a glitch
   and make the robot flinch, combos build up, and the timer starts on your first key.
4. **Report**: WPM, accuracy, consistency, burst speed, a speed timeline, R.O.B.I.'s notes and the adaptive
   engine's level decision. Stars and XP depend on WPM, accuracy and time left.
5. **Performance Lab**: WPM and accuracy trends, typing behaviour profile, per-key error heatmap,
   weak letter pairs, recent repairs and a button that deletes all stored history.

Keyboard: `Enter` starts/retries, `Esc` goes back or aborts, `Backspace` fixes errors.

## Code map

| Path | Vision section | What it does |
|---|---|---|
| `web/src/engine/typing.ts` | 5.1, Principle 4 | Deterministic engine: WPM, accuracy, burst, consistency, fatigue, per-key and per-letter-pair stats |
| `web/src/engine/analyzer.ts` | 5.1 | Rule-based weakness scoring for the six categories, merged into a persistent profile |
| `web/src/engine/difficulty.ts` | 5.2 "Start" | Rule-based level changes (needs speed **and** accuracy) and passage selection targeting weak letter pairs |
| `web/src/engine/coach.ts` | 5.4 | R.O.B.I. feedback built only from real session data (no LLM yet) |
| `web/src/engine/storage.ts` | 12 | Guest save in localStorage: summaries only, never raw keystrokes |
| `web/src/engine/api.ts` | 8 | API client: accounts, session upload, history deletion |
| `web/src/data/missions.json` | 4 | The five missions, three levels each, original passages. Shared with the backend |
| `web/src/components/Robot.tsx` | 6.3 | Original SVG robot with idle / damaged / struggling / repaired / celebrating expressions |
| `web/src/App.css`, `web/src/index.css` | 6.2–6.4 | Palette tokens, holographic panels, glitch and circuit effects, reduce-motion mode |
| `web/backend/main.py` | 8, 12 | FastAPI routes: accounts, session submission, history, account deletion |
| `web/backend/scoring.py` | 5.2, 5.3 | Server-side scoring and difficulty (same formulas as the game), passage validator |
| `web/backend/db.py` | 8 | SQLAlchemy models: users, auth tokens, typing sessions (with ML features), mission progress |
| `web/backend/auth.py` | 12 | scrypt password hashing and revocable bearer tokens (stored hashed) |

## Accounts and data (Phase 3)

- **Guest or account.** Guests keep progress in the browser. Signed-in progress, history and profile live in the
  database and follow the player across devices. The two saves are kept separate.
- **The server decides the score.** The game sends raw counts (characters, keystrokes, errors, time); the API
  recomputes WPM, accuracy, XP, stars and the next level itself, and rejects sessions that are impossible:
  unknown passage, more correct characters than the passage has, superhuman WPM, or a claimed time bonus
  that doesn't match the elapsed time.
- **ML-ready history.** Each stored session keeps its aggregated features (per-key and per-letter-pair counts,
  fatigue and consistency signals). This is the training data for the Phase 4 classifier. The typed text and
  keystroke timeline are never sent.
- **User control.** Players can clear their history or delete their account from the game.
- **Not yet:** database migrations (tables are created on start-up), login rate limiting, password reset,
  and importing guest progress into a new account.

## Roadmap status (vision Section 9)

| Phase | Status |
|---|---|
| 1 Typing engine, WPM, accuracy, timers | Done |
| 2 Robot Repair UI, art style, missions, animations | Done (5 missions, CSS/SVG animation) |
| 3 Accounts, database, session history | Done (SQLite tested; PostgreSQL via Docker Compose, see below) |
| 4 Typing behaviour analyzer | Rule-based stage done; ML classifier (Random Forest / XGBoost) not started |
| 5 Personalized difficulty engine | Rule-based stage done |
| 6 AI-generated challenges | Passage validator ready; LLM integration not started |
| 7 R.O.B.I. coach | Data-grounded feedback done; conversational LLM coach not started |
| 8 Contextual bandit | Not started |
| 9 Collection, achievements, polish | Robot collection, stars, XP ranks done |
| 10 Rhythm Repair | Not started |

Decisions still open (vision Section 15): art source, platform, audio, audience, LLM provider and Rhythm Repair music.
The vision lists Tailwind, Framer Motion and Recharts; this milestone uses plain CSS, CSS/SVG animation and
small hand-built SVG charts so it needs no extra packages. Those libraries can be added when the UI grows.

PostgreSQL support uses the same SQLAlchemy models and the `psycopg` driver, but the test suite runs on
SQLite; run it once against the Docker database before relying on it.
