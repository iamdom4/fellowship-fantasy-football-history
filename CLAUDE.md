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

---

## Responsive Design Requirements

**Every UI change must work correctly on both desktop and mobile.**

- Test layouts at both desktop (1440px) and mobile (≤ 900px) breakpoints
- Use `@media (max-width: 900px)` for mobile overrides — this is the established breakpoint for this project
- Multi-column grids (e.g. `.pr-home-grid`) must collapse to a single column on mobile
- Tables with many columns should use horizontal scroll on mobile (`.table-wrap` with `overflow-x: auto`)
- Touch targets must be at least 44×44px
- Font sizes must remain readable at mobile widths — minimum 14px for data, 16px for body text
- Avoid fixed pixel widths on elements that need to flex with the viewport
- Cards and containers should use `width: 100%` + `max-width` rather than fixed widths

## Manager Name Aliases
Two managers have name variations across seasons — normalized in `js/utils.js`:
- `Alyssa Gilliam` → `Alyssa Mirto`
- `Tomas McGrath` → `Thomas McGrath`

---

## Display Rules

### Owner Names
**Never hard-code or display a team owner's full legal name anywhere on the site.**
Always use `Utils.shortOwner(name)` which formats as first name + first initial (e.g. `"Dominic Mirto"` → `"Dominic M."`).

- Full names may only appear as keys in `js/logoData.js`, `js/utils.js` (aliases), and raw data files — never in rendered HTML or user-facing JS strings
- URL params use the short form: `team.html?owner=Dominic%20M.`
- Use `Utils.resolveOwner(param)` to convert a URL param back to a canonical full name for internal data lookups

### Scores & Records
**All game scores and point totals must be displayed to exactly two decimal places.**
Use `Utils.fmt(value, 2)` or `.toFixed(2)` — never round to one decimal or display as integers.
This applies to: weekly scores, season totals (PF/PA), averages, margins of victory, and any record-related stat.

---

## Pages (10 total)

| File | Title | JS File |
|------|-------|---------|
| `index.html` | Home — scoreboard widget + standings + blog + power rankings | `js/home.js` |
| `standings.html` | All-Time Standings — podium + full table with streak column | `js/standings.js` |
| `records.html` | League Records — champions timeline, highlights, scoring/season/streak | `js/records.js` |
| `h2h.html` | Head-to-Head — matchup matrix + summary table | `js/h2h.js` |
| `rivalries.html` | Rivalries — per-pair matchup stats with win% bars | `js/rivalries.js` |
| `team.html` | Team Profile — per-owner deep dive (URL param `?owner=First%20L.`) | `js/team.js` |
| `power-rankings.html` | Power Rankings — by season + week selectors | `js/powerRankings.js` |
| `playoffs.html` | Playoff Bracket — by season selector | `js/playoffs.js` |
| `draft.html` | Draft History — full draft board by season, overall pick numbers | `js/draft.js` |
| `blog.html` | Blog — Beehiiv RSS posts rendered as cards | `js/blog.js` |

> **Note:** `blog.html` does **not** load `leagueData.js`, `utils.js`, or `logoData.js` — it has no fantasy data dependency. Posts are fetched via the rss2json CORS proxy (`api.rss2json.com`). The sidebar team list falls back to static HTML on this page.

---

## JavaScript Architecture

### Script load order (every page except blog.html)
```html
<script src="js/leagueData.js?v=N"></script>  <!-- global LEAGUE_DATA -->
<script src="js/utils.js?v=N"></script>        <!-- Utils namespace -->
<script src="js/logoData.js?v=N"></script>     <!-- TEAM_LOGOS map -->
<script src="js/icons.js?v=N"></script>        <!-- Icons namespace -->
<script src="js/[page].js?v=N"></script>       <!-- page-specific logic -->
<script src="js/nav.js?v=N"></script>          <!-- sidebar nav + dynamic team list -->
```

> **Cache busting:** Every shared JS and CSS file uses a `?v=N` query string in each HTML file's `<script>` / `<link>` tag. **Bump the version number in the relevant HTML file(s) whenever you edit that JS or CSS file**, otherwise browsers will serve the old cached version.

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
- `Utils.shortOwner(name)` — `"Dominic Mirto"` → `"Dominic M."` — **always use this for display**
- `Utils.resolveOwner(param)` — reverse lookup: `"Dominic M."` → `"Dominic Mirto"` (supports legacy full-name params too)
- `Utils.buildTeamOwnerMap()` — `{ "2020_Sweet Victory": "Alyssa Mirto", ... }`
- `Utils.getLogoMap()` — `{ owner: logo_url }` from ESPN CDN (populated after re-running fetch pipeline)
- `Utils.getStreakMap()` — `{ owner: { type, length } }` from the most recent season
- `Utils.getAragornCrownMap()` — `{ year: { owner, teamName } }` — the #1 regular-season seed (standing === 1) for each year
- `Utils.fmt(n, decimals)` — number formatter, returns "—" for null/NaN
- `Utils.fmtPct(w, l, t)` — win percentage string

### Logo System
- **`js/logoData.js`** — defines global `TEAM_LOGOS = { "Full Name": "images/logos/slug.jpg", ... }`
- **`images/logos/`** — local logo files named `firstname-lastname.jpg` or `.svg`
- Logos are keyed by canonical full owner name internally, but **never display the full name**
- To update a logo: re-download from ESPN (use `fetch_league_data.py` or manual download), replace file in `images/logos/`, update `logoData.js` entry and any HTML `<img>` `src` attributes if the extension changed
- `nav.js` uses `TEAM_LOGOS` to render sidebar team logos dynamically

### Active vs Alumni
`isActive(owner)` checks if the owner appears in the **most recent season's teams array**. Alumni are sorted to the bottom of the sidebar team list and show a `.sidebar-alumni-tag` badge.

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

---

## Home Page Brackets (`js/home.js`)

Both the championship bracket and toilet bowl bracket use **identical HTML structure**:
```
.bracket-grid → .bracket-round → .bracket-round-label + .bracket-round-matches
```
This ensures consistent column widths, card sizes, fonts, and dividers across both.

### Championship bracket
- `renderChampBracket(rounds)` — standard winner-advances logic
- Rounds grouped by week via `groupByWeek(matchups)`

### Toilet bowl bracket
- `renderToiletBracket6(allToiletMs, allTeams)` — returns `{ html, toiletChamp }`
- Seeds teams by **`standing` descending** (worst regular season = seed 1, gets top bye). **Never use `final_standing`** — toilet bowl results shift it, making it wrong for seeding.
- Loser advances each round; advancing team gets `.bracket-toilet-adv` highlight (brown)
- Bye cards use `.tb6-bye-slot` class (dashed gold border, subtle gold background)
- Round 1 column: 4 cards — bye1, r1Top game, bye2, r1Bot game
- Games are found by **week index**, not by standard seeding pairings (ESPN consolation ladder doesn't follow standard bracket seeding)
- `toiletChamp` = team name of last place (loser of the toilet bowl final)

### Last place hero callout
- `#heroToiletChamp` is a placeholder div rendered in the hero banner by `home.js`
- After `renderToiletBracket6` runs, if `toiletChamp` is known it populates that div with a brown-themed callout card (`.hero-toilet-champ`) alongside the champion card

### Playoff checkmarks (standings table)
- Built from `WINNERS_BRACKET` matchups **only** — never from `LOSERS_CONSOLATION_LADDER` or row index
- Stored as `r.inPlayoffs = lscPlayoffTeams.has(r.team)` so the flag travels with the team regardless of sort order

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
<div class="icon-wrap iw-gold">  <!-- iw-gold | iw-green | iw-red | iw-blue | iw-silver -->
<div class="icon-wrap iw-gold icon-wrap-sm">  <!-- small: 32×32px -->

<!-- Champion card trophy (54×54px circular) -->
<div class="trophy-wrap">

<!-- Aragorn Crown badge (silver) -->
<span class="badge badge-silver">${Icons.aragornCrown({ size: 11 })}</span>
```

The `Icons` helper only accepts `size` and `cls` options — **not `style`**. To apply a color, set it on the wrapping element so `stroke="currentColor"` resolves correctly:
```js
// Correct — color on the wrapper
`<span style="color:#b0bec5">${Icons.aragornCrown({ size: 16 })}</span>`
// Wrong — style option is ignored
Icons.aragornCrown({ size: 16, style: 'color:#b0bec5' })
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
- **Tables**: `.table-wrap` → `<table>`
- **Streak badges**: `.streak-badge.streak-win` (green) / `.streak-badge.streak-loss` (red)
- **Week chart**: `.week-chart-card` → `.week-chart-tabs` + `.week-chart-svg` + `.week-chart-stats`
- **Fonts**: Barlow Condensed (headings/labels/numbers) + Barlow (body) via Google Fonts `@import`
- **Aragorn Crown (silver)**: `.iw-silver` (icon wrap) / `.badge-silver` (inline badge) — color `#b0bec5`

---

## LEAGUE_DATA Structure

`js/leagueData.js` exports a global `const LEAGUE_DATA` object keyed by year:

```js
LEAGUE_DATA = {
  "2020": {
    champion: "Team Name",
    settings: {
      league_name, team_count, playoff_team_count, reg_season_count,
      trade_deadline, veto_votes_required, scoring_type, keeper_count,
      median_scoring, faab, acquisition_budget, division_map,
    },
    teams: [
      {
        owner: "First Last",          // canonical full name — normalize before display
        team_name: "Team Name",
        wins, losses, ties,
        points_for, points_against,   // display to 2 decimal places
        standing,                     // regular season finish — USE THIS for seeding/brackets
        final_standing,               // post-toilet-bowl adjusted value — NOT reliable for seeding
        streak_type, streak_length,   // current streak (e.g. "W", 3)
        acquisitions, drops, trades,  // transaction counts
        logo_url,                     // ESPN CDN URL (populated after re-running pipeline)
        outcomes: ["W","L",...],       // parallel week-by-week arrays
        scores:   [142.5, 118.3,...],  // display to 2 decimal places
        mov:      [24.2, -6.1,...],
        schedule: ["Team Name",...],
      }
    ],
    matchups: [
      {
        week: 1,
        matchup_type: "NONE",         // "NONE" = regular season
                                      // "WINNERS_BRACKET" = championship playoff
                                      // "LOSERS_CONSOLATION_LADDER" = toilet bowl
        is_playoff: false,
        home_team, home_score,        // display scores to 2 decimal places
        home_projected, home_max_pf,
        home_lineup: [ /* BoxPlayer objects */ ],
        away_team, away_score,
        away_projected, away_max_pf,
        away_lineup: [ /* BoxPlayer objects */ ],
      }
    ],
    draft: [
      {
        round, pick,
        overall_pick,                 // absolute pick number across all rounds
        team: "Team Name",
        owner: "First Last",
        player_name, position,
        keeper_status, bid_amount,
      }
    ],
    transactions: [
      {
        date,
        actions: [{ team, action, player, position }],
      }
    ],
    playoff_bracket: { ... },
    error: null,
  }
}
```

### BoxPlayer fields (in `home_lineup` / `away_lineup`)
```js
{
  name, playerId, position, slot_position,
  points, projected_points,            // display to 2 decimal places
  pro_team, pro_opponent,
  on_bye_week, game_played,
  breakdown: { statKey: value, ... },
}
```

---

## Awards

### Championship Trophy
- Awarded to the season champion (`season.champion` field)
- Displayed with `Icons.trophy` in gold across standings, team profile, and records page

### Aragorn Crown
- Awarded to the team with `standing === 1` (best regular-season record) in each year
- Determined via `Utils.getAragornCrownMap()` — returns `{ year: { owner, teamName } }`
- Displayed in **silver** (`#b0bec5`) using `Icons.aragornCrown`
- Shown on: standings table (all-time), team profile header + stat pill + season row, records page timeline, home page league standings row
- ESPN has a mid-season clinch flag in its API but it is not currently in the data pipeline

---

## What NOT to Edit

- `js/leagueData.js` — generated file, always overwritten by `generate_js_data.py`
- `.env` — never commit; contains ESPN_S2 and SWID session cookies
