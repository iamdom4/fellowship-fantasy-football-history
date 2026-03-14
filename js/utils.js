/* =============================================
   utils.js — Shared data-processing helpers
   All pages load leagueData.js first, which
   defines the global LEAGUE_DATA constant.
   ============================================= */

const Utils = (() => {

  // Maps old/variant names → canonical (most recent) name
  const NAME_ALIASES = {
    'Alyssa Gilliam': 'Alyssa Mirto',
    'Tomas McGrath':  'Thomas McGrath',
  };

  // Owners present in the most recent season are considered active
  function getActiveOwners() {
    const seasons = getSeasons();
    if (!seasons.length) return new Set();
    const [, latestSeason] = seasons[seasons.length - 1];
    return new Set(
      (latestSeason.teams || []).map(t => normalizeName(t.owner))
    );
  }

  function isActive(owner) {
    return getActiveOwners().has(owner);
  }

  /** Normalize an owner name to their canonical name */
  function normalizeName(name) {
    return NAME_ALIASES[name] || name;
  }

  function getSeasons() {
    return Object.entries(LEAGUE_DATA)
      .filter(([, s]) => !s.error)
      .sort(([a], [b]) => Number(a) - Number(b));
  }

  /** Build { "2020_Sweet Victory": "Alyssa Mirto", ... } — names are normalized */
  function buildTeamOwnerMap() {
    const map = {};
    for (const [year, season] of getSeasons()) {
      for (const t of season.teams) {
        map[`${year}_${t.team_name.trim()}`] = normalizeName(t.owner);
      }
    }
    return map;
  }

  /** Returns sorted array of unique canonical owner names (sorted by most seasons played) */
  function getAllOwners() {
    const counts = {};
    for (const [, season] of getSeasons()) {
      for (const t of season.teams) {
        const o = normalizeName(t.owner);
        counts[o] = (counts[o] || 0) + 1;
      }
    }
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  }

  /**
   * Aggregate per-owner stats across all seasons.
   * Returns array of { owner, seasons, teamNames[], latestTeam, wins, losses, ties, pf, pa, titles }
   */
  function getOwnerStats() {
    const stats = {};
    const teamOwnerMap = buildTeamOwnerMap();

    for (const [year, season] of getSeasons()) {
      for (const t of season.teams) {
        const o = normalizeName(t.owner);
        if (!stats[o]) {
          stats[o] = { owner: o, seasons: 0, teamNames: [], latestTeam: '', latestYear: 0, wins: 0, losses: 0, ties: 0, pf: 0, pa: 0, titles: 0 };
        }
        stats[o].seasons++;
        stats[o].wins   += t.wins;
        stats[o].losses += t.losses;
        stats[o].ties   += t.ties;
        stats[o].pf     += t.points_for;
        stats[o].pa     += t.points_against;
        if (!stats[o].teamNames.includes(t.team_name.trim())) {
          stats[o].teamNames.push(t.team_name.trim());
        }
        // Track most recent team name
        if (Number(year) >= stats[o].latestYear) {
          stats[o].latestYear = Number(year);
          stats[o].latestTeam = t.team_name.trim();
        }
      }
      // Count titles
      if (season.champion) {
        const champOwner = teamOwnerMap[`${year}_${season.champion.trim()}`];
        if (champOwner && stats[champOwner]) stats[champOwner].titles++;
      }
    }

    return Object.values(stats);
  }

  /** Returns all matchups with year + normalized owner info attached */
  function getAllMatchups() {
    const teamOwnerMap = buildTeamOwnerMap();
    const all = [];
    for (const [year, season] of getSeasons()) {
      for (const m of season.matchups) {
        if (!m.home_score || !m.away_score) continue;
        all.push({
          year,
          week: m.week,
          home_team:  m.home_team?.trim(),
          home_score: m.home_score,
          away_team:  m.away_team?.trim(),
          away_score: m.away_score,
          home_owner: teamOwnerMap[`${year}_${m.home_team?.trim()}`] || normalizeName(m.home_team?.trim()),
          away_owner: teamOwnerMap[`${year}_${m.away_team?.trim()}`] || normalizeName(m.away_team?.trim()),
          is_playoff: m.is_playoff,
          matchup_type: m.matchup_type,
        });
      }
    }
    return all;
  }

  /** "Dominic Mirto" → "Dominic M." */
  function shortOwner(name) {
    if (!name) return name;
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  }

  function fmt(n, decimals = 1) {
    if (n == null || isNaN(n)) return "—";
    return Number(n).toFixed(decimals);
  }

  function fmtPct(w, l, t = 0) {
    const total = w + l + t;
    if (total === 0) return "—";
    return ((w + t * 0.5) / total * 100).toFixed(1) + "%";
  }

  /** Returns { owner: logo_url } using each owner's most recent season logo */
  function getLogoMap() {
    const map = {};
    for (const [, season] of getSeasons()) {
      for (const t of season.teams) {
        if (t.logo_url && t.logo_url !== 'N/A') {
          map[normalizeName(t.owner)] = t.logo_url;
        }
      }
    }
    return map;
  }

  /** Returns { owner: { type, length } } from the most recent season */
  function getStreakMap() {
    const seasons = getSeasons();
    if (!seasons.length) return {};
    const [, latestSeason] = seasons[seasons.length - 1];
    const map = {};
    for (const t of latestSeason.teams || []) {
      const o = normalizeName(t.owner);
      if (t.streak_type && t.streak_length) {
        map[o] = { type: t.streak_type, length: t.streak_length };
      }
    }
    return map;
  }

  /**
   * Resolve a URL owner param (short or full) → canonical full name.
   * Supports new format ("Dominic M.") and legacy full-name URLs.
   */
  function resolveOwner(param) {
    if (!param) return null;
    const owners = getAllOwners();
    return owners.find(o => shortOwner(o) === param) || owners.find(o => o === param) || null;
  }

  return { getSeasons, buildTeamOwnerMap, getAllOwners, getOwnerStats, getAllMatchups, normalizeName, shortOwner, resolveOwner, isActive, fmt, fmtPct, getLogoMap, getStreakMap };
})();
