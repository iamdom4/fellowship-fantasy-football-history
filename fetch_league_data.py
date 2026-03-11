import os
import json
from dotenv import load_dotenv
from espn_api.football import League

load_dotenv()

LEAGUE_ID = int(os.getenv("LEAGUE_ID"))
ESPN_S2 = os.getenv("ESPN_S2", None)
SWID = os.getenv("SWID", None)
SEASONS = list(range(2020, 2026))


def compute_max_lineup_score(lineup):
    """
    Compute the theoretical maximum score if the optimal lineup was set.
    Fills the most restrictive slots first (QB, K, D/ST, RB, WR, TE),
    then flexible slots (FLEX, OP), using a greedy descending-score approach.
    """
    SLOT_ELIGIBILITY = {
        'QB':        ['QB'],
        'RB':        ['RB'],
        'WR':        ['WR'],
        'TE':        ['TE'],
        'K':         ['K'],
        'D/ST':      ['D/ST'],
        'FLEX':      ['RB', 'WR', 'TE'],
        'OP':        ['QB', 'RB', 'WR', 'TE'],
        'RB/WR/TE':  ['RB', 'WR', 'TE'],
        'WR/TE':     ['WR', 'TE'],
        'WR/RB':     ['RB', 'WR'],
        'WR/RB/TE':  ['RB', 'WR', 'TE'],
    }
    # Process most restrictive slots before flexible ones
    SLOT_PRIORITY = [
        'QB', 'K', 'D/ST', 'RB', 'WR', 'TE',
        'WR/TE', 'WR/RB', 'RB/WR/TE', 'WR/RB/TE', 'FLEX', 'OP',
    ]

    # Infer starting slot counts from the actual lineup (exclude bench/IR)
    slot_counts = {}
    for p in lineup:
        slot = getattr(p, 'slot_position', '')
        if slot not in ('BE', 'IR'):
            slot_counts[slot] = slot_counts.get(slot, 0) + 1

    # Collect all non-IR players and their scores
    players = []
    for p in lineup:
        if getattr(p, 'slot_position', '') == 'IR':
            continue
        points = p.points if p.points is not None else 0
        position = getattr(p, 'position', '')
        players.append({'position': position, 'points': points})

    # Sort descending so greedy picks the best available first
    players.sort(key=lambda x: x['points'], reverse=True)

    used = set()
    total = 0.0

    for slot in SLOT_PRIORITY:
        count = slot_counts.get(slot, 0)
        if count == 0:
            continue
        eligible = SLOT_ELIGIBILITY.get(slot, [slot])
        filled = 0
        for i, p in enumerate(players):
            if i in used:
                continue
            if p['position'] in eligible:
                total += p['points']
                used.add(i)
                filled += 1
                if filled >= count:
                    break

    return round(total, 2)


def safe(val, fallback="N/A"):
    try:
        return val if val is not None else fallback
    except Exception:
        return fallback


def get_owner_name(team):
    try:
        if team.owners and len(team.owners) > 0:
            o = team.owners[0]
            first = o.get("firstName", "")
            last = o.get("lastName", "")
            name = f"{first} {last}".strip()
            return name if name else o.get("displayName", "N/A")
    except Exception:
        pass
    return "N/A"


def fetch_teams(league):
    teams = []
    for team in league.teams:
        teams.append({
            "team_id": safe(team.team_id),
            "team_name": safe(team.team_name),
            "owner": get_owner_name(team),
            "wins": safe(team.wins),
            "losses": safe(team.losses),
            "ties": safe(team.ties),
            "points_for": safe(team.points_for),
            "points_against": safe(team.points_against),
            "standing": safe(team.standing),
            "final_standing": safe(team.final_standing),
        })
    return teams


def fetch_matchups(league, player_positions):
    """Fetch matchups and populate player_positions from every lineup seen."""
    matchups = []
    for week in range(1, league.current_week + 1):
        try:
            box_scores = league.box_scores(week)
            for match in box_scores:
                # Harvest positions from lineups so draft lookup is comprehensive
                for lineup in (match.home_lineup or [], match.away_lineup or []):
                    for player in lineup:
                        pid = getattr(player, 'playerId', None)
                        pos = getattr(player, 'position', None)
                        if pid and pos and pos != 'N/A':
                            player_positions[pid] = pos
                home_max = 0.0
                away_max = 0.0
                try:
                    if match.home_lineup:
                        home_max = compute_max_lineup_score(match.home_lineup)
                    if match.away_lineup:
                        away_max = compute_max_lineup_score(match.away_lineup)
                except Exception:
                    pass
                matchups.append({
                    "week": week,
                    "home_team": safe(match.home_team.team_name if match.home_team else None),
                    "home_score": safe(match.home_score),
                    "home_projected": safe(match.home_projected),
                    "home_max_pf": home_max,
                    "away_team": safe(match.away_team.team_name if match.away_team else None),
                    "away_score": safe(match.away_score),
                    "away_projected": safe(match.away_projected),
                    "away_max_pf": away_max,
                    "is_playoff": safe(match.is_playoff),
                    "matchup_type": safe(match.matchup_type),
                })
        except Exception as e:
            print(f"  Could not fetch week {week} matchups: {e}")
    return matchups


def fetch_draft(league, player_positions):
    draft_picks = []
    try:
        for pick in league.draft:
            position = player_positions.get(pick.playerId, "N/A")
            # Fallback: D/ST units have names ending in "D/ST"
            if (not position or position == "N/A") and pick.playerName and pick.playerName.endswith("D/ST"):
                position = "D/ST"
            draft_picks.append({
                "round": safe(pick.round_num),
                "pick": safe(pick.round_pick),
                "team": safe(pick.team.team_name if pick.team else None),
                "player_name": safe(pick.playerName),
                "position": position,
            })
    except Exception as e:
        print(f"  Could not fetch draft data: {e}")
    return draft_picks


def fetch_champion(league):
    try:
        standings = sorted(league.teams, key=lambda t: t.final_standing)
        return safe(standings[0].team_name) if standings else "N/A"
    except Exception:
        return "N/A"


def fetch_settings(league):
    try:
        s = league.settings
        return {
            "league_name": safe(s.name),
            "team_count": safe(s.team_count),
            "playoff_team_count": safe(s.playoff_team_count),
            "reg_season_count": safe(s.reg_season_count),
            "trade_deadline": safe(s.trade_deadline),
            "veto_votes_required": safe(s.veto_votes_required),
        }
    except Exception as e:
        print(f"  Could not fetch settings: {e}")
        return {}


all_data = {}

for year in SEASONS:
    print(f"\nFetching {year} season...")
    try:
        league = League(
            league_id=LEAGUE_ID,
            year=year,
            espn_s2=ESPN_S2,
            swid=SWID,
        )

        # Build position map: start from rosters, then fill from lineups in fetch_matchups
        player_positions = {}
        try:
            for team in league.teams:
                for player in team.roster:
                    pid = getattr(player, 'playerId', None)
                    pos = getattr(player, 'position', None)
                    if pid and pos and pos != 'N/A':
                        player_positions[pid] = pos
        except Exception:
            pass

        matchups = fetch_matchups(league, player_positions)

        season_data = {
            "year": year,
            "settings": fetch_settings(league),
            "teams": fetch_teams(league),
            "champion": fetch_champion(league),
            "matchups": matchups,
            "draft": fetch_draft(league, player_positions),
        }

        all_data[str(year)] = season_data
        print(f"  Done. {len(season_data['teams'])} teams, "
              f"{len(season_data['matchups'])} matchup records, "
              f"{len(season_data['draft'])} draft picks.")

    except Exception as e:
        print(f"  SKIPPED {year} (needs ESPN cookies): {e}")
        all_data[str(year)] = {"error": str(e), "requires_auth": True}

output_path = os.path.join(os.path.dirname(__file__), "data", "league_data.json")
with open(output_path, "w") as f:
    json.dump(all_data, f, indent=2)

print(f"\nAll data saved to {output_path}")
