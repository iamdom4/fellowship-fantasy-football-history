import os
import json
from dotenv import load_dotenv
from espn_api.football import League

load_dotenv()

LEAGUE_ID = int(os.getenv("LEAGUE_ID"))
ESPN_S2 = os.getenv("ESPN_S2", None)
SWID = os.getenv("SWID", None)
SEASONS = list(range(2020, 2026))


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


def fetch_matchups(league):
    matchups = []
    for week in range(1, league.current_week + 1):
        try:
            box_scores = league.box_scores(week)
            for match in box_scores:
                matchups.append({
                    "week": week,
                    "home_team": safe(match.home_team.team_name if match.home_team else None),
                    "home_score": safe(match.home_score),
                    "home_projected": safe(match.home_projected),
                    "away_team": safe(match.away_team.team_name if match.away_team else None),
                    "away_score": safe(match.away_score),
                    "away_projected": safe(match.away_projected),
                    "is_playoff": safe(match.is_playoff),
                    "matchup_type": safe(match.matchup_type),
                })
        except Exception as e:
            print(f"  Could not fetch week {week} matchups: {e}")
    return matchups


def fetch_draft(league):
    # Build playerId → position map from all rosters
    player_positions = {}
    try:
        for team in league.teams:
            for player in team.roster:
                player_positions[player.playerId] = safe(player.position)
    except Exception:
        pass

    draft_picks = []
    try:
        for pick in league.draft:
            position = player_positions.get(pick.playerId, "N/A")
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

        season_data = {
            "year": year,
            "settings": fetch_settings(league),
            "teams": fetch_teams(league),
            "champion": fetch_champion(league),
            "matchups": fetch_matchups(league),
            "draft": fetch_draft(league),
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
