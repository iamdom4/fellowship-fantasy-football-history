# The Fellowship of the League — Project Notes

## ESPN League
- Platform: ESPN Fantasy Football
- League ID: **31945763**
- Seasons: 2020–2025
- Credentials (ESPN_S2 and SWID) are stored in `.env` — **never commit this file**

## Data
- All league data lives in `data/league_data.json`
- To refresh data, run `python3 fetch_league_data.py` (requires `.env` credentials)
- After refreshing, run `python3 generate_js_data.py` to regenerate `js/leagueData.js`
- The site reads from `js/leagueData.js` — no live API calls on page load

## Git Rules
- **Never commit `.env`** — it contains ESPN session cookies
- `.env` is covered by `.gitignore` but always double-check before pushing

## Manager Name Aliases
Two managers have name variations across seasons — normalized in `js/utils.js`:
- `Alyssa Gilliam` → `Alyssa Mirto`
- `Tomas McGrath` → `Thomas McGrath`
