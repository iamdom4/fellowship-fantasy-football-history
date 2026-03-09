"""
Converts data/league_data.json into js/leagueData.js so the site
works by opening HTML files directly (no server required).
Re-run this script any time you update league_data.json.
"""
import json, os

base = os.path.dirname(__file__)
with open(os.path.join(base, "data", "league_data.json"), "r") as f:
    data = json.load(f)

js = f"const LEAGUE_DATA = {json.dumps(data, indent=2)};\n"

with open(os.path.join(base, "js", "leagueData.js"), "w") as f:
    f.write(js)

print("js/leagueData.js generated successfully.")
