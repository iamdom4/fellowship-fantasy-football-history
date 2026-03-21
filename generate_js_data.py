"""
Converts data/league_data.json into js/leagueData.js so the site
works by opening HTML files directly (no server required).
Re-run this script any time you update league_data.json.
"""
import json, os

base = os.path.dirname(__file__)
with open(os.path.join(base, "data", "league_data.json"), "r") as f:
    data = json.load(f)

# ── Pre-aggregate positional strength ────────────────────────────────────────
SLOT_MAP = {
    'QB': 'QB', 'RB': 'RB', 'WR': 'WR', 'TE': 'TE',
    'FLEX': 'FLEX', 'RB/WR/TE': 'FLEX',
    'D/ST': 'DST', 'DST': 'DST',
    'K': 'K',
}
POSITIONS = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'DST', 'K']

for year, season in data.items():
    if not isinstance(season, dict):
        continue
    name_to_owner = {t['team_name']: t['owner'] for t in season.get('teams', [])}
    totals = {}
    for m in season.get('matchups', []):
        if m.get('matchup_type') == 'NONE':
            for side in ('home', 'away'):
                owner = name_to_owner.get(m.get(f'{side}_team'), '')
                if not owner:
                    continue
                totals.setdefault(owner, {p: 0.0 for p in POSITIONS})
                for player in m.get(f'{side}_lineup', []):
                    pos = SLOT_MAP.get(player.get('slot_position', ''))
                    pts = player.get('points', 0)
                    if pts is None:
                        pts = 0
                    if pos:
                        totals[owner][pos] = round(totals[owner][pos] + pts, 2)
    ps = {}
    for pos in POSITIONS:
        sorted_owners = sorted(totals.keys(), key=lambda o: totals[o].get(pos, 0), reverse=True)
        rank = 1
        for i, owner in enumerate(sorted_owners):
            if i > 0:
                prev = sorted_owners[i - 1]
                if totals[owner].get(pos, 0) < totals[prev].get(pos, 0):
                    rank = i + 1  # skip ranks for ties
            ps.setdefault(owner, {})[pos] = {'pts': totals[owner].get(pos, 0), 'rank': rank}
    season['positional_strength'] = ps
    # Strip raw lineup arrays to keep leagueData.js small
    for m in season.get('matchups', []):
        m.pop('home_lineup', None)
        m.pop('away_lineup', None)
# ─────────────────────────────────────────────────────────────────────────────

js = f"const LEAGUE_DATA = {json.dumps(data, indent=2)};\n"

with open(os.path.join(base, "js", "leagueData.js"), "w") as f:
    f.write(js)

print("js/leagueData.js generated successfully.")
