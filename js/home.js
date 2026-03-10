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
  const ownerStatsList = Utils.getOwnerStats();
  const ownerToLatestTeam = {};
  ownerStatsList.forEach(s => { ownerToLatestTeam[s.owner] = s.latestTeam; });

  const champHtml = seasons.map(([year, season]) => {
    const champTeam = season.champion?.trim() || '—';
    const champOwnerFull = teamOwnerMap[`${year}_${champTeam}`] || '—';
    const champOwner = Utils.shortOwner(champOwnerFull);
    const currentTeam = ownerToLatestTeam[champOwnerFull] || champTeam;
    const showPrev = currentTeam !== champTeam && champTeam !== '—';
    return `
      <div class="champion-card">
        <div class="year-badge">${year}</div>
        <div class="trophy-wrap">${Icons.trophy({ size: 26 })}</div>
        <div class="champ-name">${currentTeam}</div>
        <div class="champ-owner">${champOwner}</div>
        ${showPrev ? `<div class="champ-prev-name">formerly ${champTeam}</div>` : ''}
      </div>
    `;
  }).join('');
  document.getElementById('championsGrid').innerHTML = champHtml;

  // ── FUN STATS ─────────────────────────────────
  let highScore  = { score: 0,        team: '', owner: '', year: '', week: 0 };
  let lowScore   = { score: Infinity,  team: '', owner: '', year: '', week: 0 };
  let bigBlowout = { margin: 0, winner: '', loser: '', year: '', week: 0 };
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

  const ownerStats = Utils.getOwnerStats();
  const mostTitles = ownerStats.sort((a, b) => b.titles - a.titles)[0];
  const avgScore = matchups.length
    ? (matchups.reduce((s, m) => s + m.home_score + m.away_score, 0) / (matchups.length * 2))
    : 0;

  const funStats = [
    {
      icon: Icons.flame({ size: 22 }), color: 'gold',
      value: Utils.fmt(highScore.score),
      label: 'Highest Single-Week Score',
      sub: `${highScore.team} — ${highScore.year} Wk ${highScore.week}`,
    },
    {
      icon: Icons.skull({ size: 22 }), color: 'red',
      value: Utils.fmt(lowScore.score),
      label: 'Lowest Single-Week Score',
      sub: `${lowScore.team} — ${lowScore.year} Wk ${lowScore.week}`,
    },
    {
      icon: Icons.zap({ size: 22 }), color: 'gold',
      value: `+${Utils.fmt(bigBlowout.margin)}`,
      label: 'Biggest Blowout',
      sub: `${bigBlowout.winner} def. ${bigBlowout.loser} — ${bigBlowout.year} Wk ${bigBlowout.week}`,
    },
    {
      icon: Icons.trendUp({ size: 22 }), color: 'green',
      value: Utils.fmt(bestPFSeason.pf),
      label: 'Most Points in a Season',
      sub: `${bestPFSeason.team} (${Utils.shortOwner(bestPFSeason.owner)}) — ${bestPFSeason.year}`,
    },
    {
      icon: Icons.crown({ size: 22 }), color: 'gold',
      value: mostTitles.titles,
      label: 'Most Championships',
      sub: `${Utils.shortOwner(mostTitles.owner)}`,
    },
    {
      icon: Icons.target({ size: 22 }), color: 'blue',
      value: Utils.fmt(avgScore),
      label: 'Average Weekly Score',
      sub: `Across all ${matchups.length} matchups`,
    },
  ];

  document.getElementById('funStats').innerHTML = funStats.map(s => `
    <div class="fun-stat-card">
      <div class="icon-wrap iw-${s.color}">${s.icon}</div>
      <div class="stat-number">${s.value}</div>
      <div class="card-title">${s.label}</div>
      <div class="stat-sub">${s.sub}</div>
    </div>
  `).join('');

})();
