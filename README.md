# The Fellowship of the League

A custom fantasy football history site for a 12-team ESPN league running since 2020. Built as a static site with no backend — all data is pre-fetched from the ESPN API and baked into a JS file at build time.

---

## Features

- **Scoreboard** — latest week's matchups with featured game highlight
- **League Standings** — season standings with playoff tracking, power record, vs. median record, and management %
- **All-Time Standings** — career leaderboard with podium, win%, titles, Aragorn Crown counts, and current streak
- **Team Profiles** — per-manager deep dive: weekly performance chart, season-by-season history, head-to-head records
- **Records** — champions timeline, Aragorn Crown timeline, scoring records, season records, streak records
- **Head-to-Head** — full matchup matrix between all managers
- **Rivalries** — per-pair win%, biggest wins, and historical trend
- **Power Rankings** — composite score (PF + win% + median win%) by season and week, with rank-by-week chart
- **Playoffs** — bracket viewer by season (championship + toilet bowl)
- **Draft History** — full draft board by season with overall pick numbers
- **Blog** — Beehiiv newsletter posts rendered as cards via RSS

---

## Awards

### Championship Trophy
Awarded to the season champion. Displayed in gold across standings, team profiles, and the records page.

### Aragorn Crown
Awarded to the team that finishes with the best regular-season record (#1 seed, `standing === 1`). Displayed in silver across standings, team profiles, home page, and the records page. Named after Aragorn — the rightful king.

---

## Tech Stack

- **Pure HTML/CSS/JS** — no framework, no build step
- **ESPN Fantasy API** — data fetched via Python script using `espn-api`
- **Static data** — `js/leagueData.js` is pre-generated; the site makes no live API calls
- **Google Fonts** — Barlow Condensed + Barlow
- **Hosted as a static site** — works with any static host or local file server

---

## Project Structure

```
fellowship-fantasy-football-site/
├── index.html              # Home page
├── standings.html          # All-time standings
├── records.html            # League records & timelines
├── h2h.html                # Head-to-head matrix
├── rivalries.html          # Rivalry stats
├── team.html               # Team profile (?owner=First L.)
├── power-rankings.html     # Power rankings
├── playoffs.html           # Playoff brackets
├── draft.html              # Draft history
├── blog.html               # Newsletter / blog
│
├── css/
│   └── style.css           # All site styles
│
├── js/
│   ├── leagueData.js       # ⚠ Generated — do not edit manually
│   ├── utils.js            # Shared data helpers (Utils namespace)
│   ├── logoData.js         # TEAM_LOGOS map (owner → image path)
│   ├── icons.js            # SVG icon library (Icons namespace)
│   ├── nav.js              # Sidebar navigation
│   ├── home.js             # Home page logic
│   ├── standings.js        # All-time standings
│   ├── records.js          # Records page
│   ├── h2h.js              # Head-to-head
│   ├── rivalries.js        # Rivalries
│   ├── team.js             # Team profile
│   ├── powerRankings.js    # Power rankings
│   ├── playoffs.js         # Playoff brackets
│   ├── draft.js            # Draft history
│   └── blog.js             # Blog / RSS feed
│
├── images/
│   └── logos/              # Local team logo files
│
├── data/
│   └── league_data.json    # Raw ESPN data (generated)
│
├── fetch_league_data.py    # Step 1: fetch data from ESPN API
└── generate_js_data.py     # Step 2: convert JSON → leagueData.js
```

---

## Setup & Data Pipeline

### Prerequisites

```bash
pip install espn-api python-dotenv
```

### Environment variables

Create a `.env` file in the project root (never commit this):

```
ESPN_S2=your_espn_s2_cookie
SWID=your_swid_cookie
```

To find these values: log into ESPN Fantasy, open DevTools → Application → Cookies → look for `espn_s2` and `SWID`.

### Refresh data

```bash
# Step 1: fetch from ESPN API → data/league_data.json
python3 fetch_league_data.py

# Step 2: convert to JS → js/leagueData.js
python3 generate_js_data.py
```

### Run locally

Any static file server works:

```bash
# Python
python3 -m http.server 8080

# Node
npx serve .
```

Then open `http://localhost:8080`.

---

## Cache Busting

Every JS and CSS file is loaded with a `?v=N` query string in each HTML file's `<script>` / `<link>` tag. Bump the version number whenever you edit a shared file, otherwise browsers will serve stale cached versions.

---

## Manager Name Aliases

Two managers have name variations across seasons, normalized in `js/utils.js`:

| Raw name | Canonical name |
|----------|---------------|
| `Alyssa Gilliam` | `Alyssa Mirto` |
| `Tomas McGrath` | `Thomas McGrath` |

---

## Power Rankings Formula

Regular season only (`matchup_type === 'NONE'`):

```
prScore = (PF × 2) + (PF × winPct) + (PF × medianWinPct)
```

- **PF** — cumulative points scored through the selected week
- **winPct** — actual W/(W+L) vs opponent
- **medianWinPct** — weeks scored above the league median / total weeks played
