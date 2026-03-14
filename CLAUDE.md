# The Fellowship of the League — Project Notes

## ESPN League
- Platform: ESPN Fantasy Football
- League ID: **31945763**
- Seasons: 2020–2025
- Credentials (ESPN_S2 and SWID) are stored in `.env` — **never commit this file**

## Data Pipeline
- All league data lives in `data/league_data.json`
- To refresh data: `python3 fetch_league_data.py` (requires `.env` credentials)
- After refreshing: `python3 generate_js_data.py` → regenerates `js/leagueData.js`
- The site reads from `js/leagueData.js` — **no live API calls on page load**
- **Never manually edit `js/leagueData.js`** — it is fully generated; changes will be overwritten

## Git Rules
- **Never commit `.env`** — it contains ESPN session cookies
- `.env` is covered by `.gitignore` but always double-check before pushing

## Manager Name Aliases
Two managers have name variations across seasons — normalized in `js/utils.js`:
- `Alyssa Gilliam` → `Alyssa Mirto`
- `Tomas McGrath` → `Thomas McGrath`

---

## Pages (8 total)

| File | Title | JS File |
|------|-------|---------|
| `index.html` | Home — champions grid + league highlights | `js/home.js` |
| `standings.html` | All-Time Standings — podium + full table | `js/standings.js` |
| `records.html` | League Records — scoring, season, streak, top 10 | `js/records.js` |
| `h2h.html` | Head-to-Head — matchup matrix + summary table | `js/h2h.js` |
| `rivalries.html` | Rivalries — per-pair matchup stats with win% bars | `js/rivalries.js` |
| `team.html` | Team Profile — per-owner deep dive (URL param `?owner=Name`) | `js/team.js` |
| `power-rankings.html` | Power Rankings — by season + week selectors | `js/powerRankings.js` |
| `playoffs.html` | Playoff Bracket — by season selector | `js/playoffs.js` |
| `draft.html` | Draft History — full draft board by season | `js/draft.js` |
| `blog.html` | Blog — Beehiiv RSS posts rendered as cards | `js/blog.js` |

> **Note:** `blog.html` does **not** load `leagueData.js` or `utils.js` — it has no fantasy data dependency. Posts are fetched via the rss2json CORS proxy (`api.rss2json.com`) to avoid browser CORS restrictions on the Beehiiv RSS feed.

---

## JavaScript Architecture

### Script load order (every page)
```html
<script src="js/leagueData.js?v=13"></script>  <!-- global LEAGUE_DATA -->
<script src="js/utils.js?v=13"></script>        <!-- Utils namespace -->
<script src="js/icons.js?v=13"></script>        <!-- Icons namespace -->
<script src="js/[page].js?v=13"></script>       <!-- page-specific logic -->
<script src="js/nav.js?v=13"></script>           <!-- mobile nav toggle -->
```

### Module pattern
All shared namespaces are IIFEs returning a public API:
```js
const Utils = (() => { ... return { getSeasons, getOwnerStats, ... }; })();
const Icons = (() => { ... return { trophy, flame, ... }; })();
```

Page scripts are also wrapped in an IIFE but don't expose globals.

### Utils API (`js/utils.js`)
- `Utils.getSeasons()` — returns `[[year, seasonObj], ...]` sorted oldest→newest, skips errored seasons
- `Utils.getAllOwners()` — unique canonical owner names, sorted by most seasons played
- `Utils.getOwnerStats()` — array of `{ owner, seasons, teamNames[], latestTeam, wins, losses, ties, pf, pa, titles }`
- `Utils.getAllMatchups()` — all matchups with `{ year, week, home_team, home_score, away_team, away_score, home_owner, away_owner, is_playoff, matchup_type }`
- `Utils.normalizeName(name)` — applies name aliases
- `Utils.isActive(owner)` — true if the owner appears in the latest season
- `Utils.shortOwner(name)` — "Dominic Mirto" → "Dominic M."
- `Utils.buildTeamOwnerMap()` — `{ "2020_Sweet Victory": "Alyssa Mirto", ... }`
- `Utils.fmt(n, decimals)` — number formatter, returns "—" for null/NaN
- `Utils.fmtPct(w, l, t)` — win percentage string

### Active vs Alumni
`isActive(owner)` checks if the owner appears in the **most recent season's teams array**. Alumni show a `.dropdown-inactive` badge in the nav dropdown and are often sorted/separated in tables.

---

## Power Rankings Formula

Computed in `js/powerRankings.js`, regular season only (`matchup_type === 'NONE'`):

```
prScore = (PF × 2) + (PF × winPct) + (PF × medianWinPct)
```

- **PF** = cumulative points scored through the selected week
- **winPct** = actual W/(W+L) record vs opponent
- **medianWinPct** = wins above median each week / total weeks (a team "wins" vs median if their score exceeds the week's median score across all teams)
- Sorted by `prScore` descending, tiebroken by raw PF
- Week-over-week rank change arrows are computed by comparing current vs previous week's rankings
- `maxPF` (best possible lineup score) is stored per matchup but not currently displayed in the UI

---

## Icon System (`js/icons.js`)

SVG icon library (Lucide-style). Usage:
```js
Icons.trophy({ size: 20 })     // returns SVG string
Icons.flame({ size: 22 })
Icons.star({ size: 16 })
// etc.
```

HTML wrapping patterns:
```html
<!-- Standard icon wrap (42×42px rounded square) -->
<div class="icon-wrap iw-gold">  <!-- iw-gold | iw-green | iw-red | iw-blue -->
<div class="icon-wrap iw-gold icon-wrap-sm">  <!-- small: 32×32px -->

<!-- Champion card trophy (54×54px circular) -->
<div class="trophy-wrap">
```

Zero emojis in HTML or JS — all replaced with SVG.

---

## CSS Conventions (`css/style.css`)

### Key CSS variables
```css
--bg-primary:   #070b12    /* page background */
--bg-card:      #0d1421    /* card background */
--bg-nav:       #060910    /* navbar */
--accent-gold:  #c9a227
--accent-gold-lt: #e8b43a
--win:          green-ish  /* winning record color */
--loss:         red-ish    /* losing record color */
--text-primary, --text-muted
```

### Patterns
- **Cards**: `linear-gradient(160deg, #0d1421 60%, #101929)` background; gold shimmer via `::before` on hover
- **Section titles**: `font-family: Barlow Condensed`, uppercase, `::after` gradient gold underline
- **Tables**: `.table-wrap` → `<table class="data-table">`
- **Fun stats bento**: `grid-template-columns: repeat(3, 1fr)` with `nth-child(4) { grid-column: span 2 }`
- **Fonts**: Barlow Condensed (headings/labels/numbers) + Barlow (body) via Google Fonts `@import`

---

## LEAGUE_DATA Structure

`js/leagueData.js` exports a global `const LEAGUE_DATA` object keyed by year:

```js
LEAGUE_DATA = {
  "2020": {
    champion: "Team Name",          // winning team name (string)
    teams: [
      {
        owner: "First Last",
        team_name: "Team Name",
        wins: 9, losses: 4, ties: 0,
        points_for: 1540.2,
        points_against: 1389.8,
        // final_standings rank may also be present
      }
    ],
    matchups: [
      {
        week: 1,
        matchup_type: "NONE",       // "NONE" = regular season, other = playoff
        is_playoff: false,
        home_team: "Team Name",
        home_score: 142.5,
        home_max_pf: 185.0,         // best possible lineup score (not displayed yet)
        away_team: "Team Name",
        away_score: 118.3,
        away_max_pf: 170.0,
      }
    ],
    draft: [
      {
        round: 1,
        pick: 1,
        overall_pick: 1,
        owner: "First Last",
        team_name: "Team Name",
        player_name: "Player Name",
        position: "QB",
        pro_team: "KC",
      }
    ],
    playoff_bracket: { ... },       // structure varies; used by playoffs.js
    error: null,                    // non-null if season failed to fetch
  }
}
```

---

## What NOT to Edit

- `js/leagueData.js` — generated file, always overwritten by `generate_js_data.py`
- `.env` — never commit; contains ESPN_S2 and SWID session cookies
