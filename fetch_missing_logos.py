"""Download logos that were behind auth in 2025 by falling back to earlier seasons."""
import os, re, urllib.request
from dotenv import load_dotenv
from espn_api.football import League

load_dotenv()
LEAGUE_ID = int(os.getenv("LEAGUE_ID"))
ESPN_S2   = os.getenv("ESPN_S2")
SWID      = os.getenv("SWID")

MISSING = {'Robert Gross', 'Alyssa Mirto', 'Alyssa Gilliam'}

os.makedirs("images/logos", exist_ok=True)

def slugify(name):
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')

def try_download(owner, url):
    slug = slugify(owner)
    # Normalize Alyssa alias
    if 'alyssa' in owner.lower():
        slug = 'alyssa-mirto'
    clean_url = url.split('?')[0]
    ext = clean_url.rsplit('.', 1)[-1].lower()
    if ext not in ('png', 'jpg', 'jpeg', 'gif', 'svg'):
        ext = 'png'
    local_path = f"images/logos/{slug}.{ext}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            ct = resp.headers.get('Content-Type', '')
            if 'html' in ct:
                return None
            with open(local_path, 'wb') as f:
                f.write(resp.read())
        print(f"  OK  {owner} → {local_path}  (from {url})")
        return local_path
    except Exception as e:
        print(f"  ERR {owner}: {e}")
        return None

found = {}
for year in [2024, 2023, 2022, 2021, 2020]:
    if not MISSING - set(found.keys()):
        break
    try:
        league = League(league_id=LEAGUE_ID, year=year, espn_s2=ESPN_S2, swid=SWID)
        for t in league.teams:
            owner_info = t.owners[0] if t.owners else {}
            owner = f"{owner_info.get('firstName','')} {owner_info.get('lastName','')}".strip()
            canonical = 'Alyssa Mirto' if 'alyssa' in owner.lower() else owner
            if canonical in MISSING and canonical not in found and t.logo_url:
                path = try_download(owner, t.logo_url)
                if path:
                    found[canonical] = path
    except Exception as e:
        print(f"  {year}: error - {e}")

print(f"\nDownloaded: {found}")
