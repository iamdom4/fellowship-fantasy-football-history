/* =============================================
   home.js — Home page rendering
   ============================================= */

(function () {
  const seasons = Utils.getSeasons();
  const teamOwnerMap = Utils.buildTeamOwnerMap();
  const matchups = Utils.getAllMatchups();

  // ── HERO ──────────────────────────────────────
  const totalTeams = Utils.getAllOwners().length;
  const totalMatchups = matchups.length;
  const totalPF = matchups.reduce((s, m) => s + m.home_score + m.away_score, 0);

  document.getElementById('hero').innerHTML = `
    <h1>The Fellowship of the League</h1>
    <p>League history from 2020 to 2025</p>
    <div class="hero-meta">
      <div class="hero-meta-item">
        <div class="val">${seasons.length}</div>
        <div class="lbl">Seasons</div>
      </div>
      <div class="hero-meta-item">
        <div class="val">${totalTeams}</div>
        <div class="lbl">Managers</div>
      </div>
      <div class="hero-meta-item">
        <div class="val">${totalMatchups}</div>
        <div class="lbl">Matchups</div>
      </div>
      <div class="hero-meta-item">
        <div class="val">${Math.round(totalPF).toLocaleString()}</div>
        <div class="lbl">Total Points</div>
      </div>
    </div>
  `;

  // ── CHAMPIONS ─────────────────────────────────
  const champHtml = seasons.map(([year, season]) => {
    const champTeam = season.champion?.trim() || '—';
    const champOwner = Utils.shortOwner(teamOwnerMap[`${year}_${champTeam}`] || '—');
    const leagueName = season.settings?.league_name || '';
    return `
      <div class="champion-card">
        <div class="year-badge">${year}</div>
        <div class="trophy">🏆</div>
        <div class="champ-name">${champTeam}</div>
        <div class="champ-owner">${champOwner}</div>
        ${leagueName ? `<div class="champ-league">${leagueName}</div>` : ''}
      </div>
    `;
  }).join('');
  document.getElementById('championsGrid').innerHTML = champHtml;

  // ── FUN STATS ─────────────────────────────────
  // Highest single-week score
  let highScore = { score: 0, team: '', owner: '', year: '', week: 0 };
  // Lowest score (filter out zeros/byes)
  let lowScore  = { score: Infinity, team: '', owner: '', year: '', week: 0 };
  // Biggest blowout
  let bigBlowout = { margin: 0, winner: '', loser: '', year: '', week: 0 };
  // Most total PF in a season
  let bestPFSeason = { pf: 0, team: '', owner: '', year: '' };

  for (const m of matchups) {
    const scores = [
      { score: m.home_score, team: m.home_team, owner: m.home_owner },
      { score: m.away_score, team: m.away_team, owner: m.away_owner },
    ];
    for (const s of scores) {
      if (s.score > highScore.score) highScore = { ...s, year: m.year, week: m.week };
      if (s.score > 0 && s.score < lowScore.score) lowScore = { ...s, year: m.year, week: m.week };
    }
    const margin = Math.abs(m.home_score - m.away_score);
    if (margin > bigBlowout.margin) {
      bigBlowout = {
        margin,
        winner: m.home_score > m.away_score ? m.home_team : m.away_team,
        loser:  m.home_score > m.away_score ? m.away_team : m.home_team,
        year: m.year, week: m.week,
      };
    }
  }

  for (const [year, season] of seasons) {
    for (const t of season.teams) {
      if (t.points_for > bestPFSeason.pf) {
        bestPFSeason = { pf: t.points_for, team: t.team_name.trim(), owner: t.owner, year };
      }
    }
  }

  // Most championships
  const ownerStats = Utils.getOwnerStats();
  const mostTitles = ownerStats.sort((a, b) => b.titles - a.titles)[0];

  // Avg score per week
  const avgScore = matchups.length
    ? (matchups.reduce((s, m) => s + m.home_score + m.away_score, 0) / (matchups.length * 2))
    : 0;

  const funStats = [
    {
      icon: '🔥',
      value: Utils.fmt(highScore.score),
      label: 'Highest Single-Week Score',
      sub: `${highScore.team} — ${highScore.year} Wk ${highScore.week}`,
    },
    {
      icon: '💀',
      value: Utils.fmt(lowScore.score),
      label: 'Lowest Single-Week Score',
      sub: `${lowScore.team} — ${lowScore.year} Wk ${lowScore.week}`,
    },
    {
      icon: '💥',
      value: `+${Utils.fmt(bigBlowout.margin)}`,
      label: 'Biggest Blowout',
      sub: `${bigBlowout.winner} def. ${bigBlowout.loser} — ${bigBlowout.year} Wk ${bigBlowout.week}`,
    },
    {
      icon: '📈',
      value: Utils.fmt(bestPFSeason.pf),
      label: 'Most Points in a Season',
      sub: `${bestPFSeason.team} (${Utils.shortOwner(bestPFSeason.owner)}) — ${bestPFSeason.year}`,
    },
    {
      icon: '👑',
      value: mostTitles.titles,
      label: 'Most Championships',
      sub: `${Utils.shortOwner(mostTitles.owner)}`,
    },
    {
      icon: '🎯',
      value: Utils.fmt(avgScore),
      label: 'Average Weekly Score',
      sub: `Across all ${matchups.length} matchups`,
    },
  ];

  document.getElementById('funStats').innerHTML = funStats.map(s => `
    <div class="fun-stat-card">
      <div class="icon">${s.icon}</div>
      <div class="card-title">${s.label}</div>
      <div class="stat-number">${s.value}</div>
      <div class="stat-sub">${s.sub}</div>
    </div>
  `).join('');

})();
