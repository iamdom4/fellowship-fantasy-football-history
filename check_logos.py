"""Check logo URLs for specific owners across seasons."""
import os
import urllib.request
from dotenv import load_dotenv
from espn_api.football import League

load_dotenv()
LEAGUE_ID = int(os.getenv("LEAGUE_ID"))
ESPN_S2   = os.getenv("ESPN_S2")
SWID      = os.getenv("SWID")

targets = {'Robert Gross', 'Alyssa Mirto', 'Alyssa Gilliam'}

for year in [2025, 2024, 2023, 2022]:
    try:
        league = League(league_id=LEAGUE_ID, year=year, espn_s2=ESPN_S2, swid=SWID)
        for t in league.teams:
            owner_info = t.owners[0] if t.owners else {}
            owner = f"{owner_info.get('firstName','')} {owner_info.get('lastName','')}".strip()
            if owner in targets:
                url = t.logo_url or '(none)'
                # Try fetching to check if accessible
                accessible = '?'
                if url != '(none)':
                    try:
                        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                        resp = urllib.request.urlopen(req, timeout=5)
                        ct = resp.headers.get('Content-Type', '')
                        accessible = f'OK ({ct.split(";")[0]})'
                    except Exception as e:
                        accessible = f'ERR {e}'
                print(f"  {year} | {owner} | {url} | {accessible}")
    except Exception as e:
        print(f"  {year}: error - {e}")
