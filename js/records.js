/* =============================================
   records.js — League Records page
   ============================================= */

(function () {
  const seasons = Utils.getSeasons();
  const matchups = Utils.getAllMatchups();
  const teamOwnerMap = Utils.buildTeamOwnerMap();

  // ── CHAMPIONS TIMELINE ───────────────────────
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

  // ── ARAGORN CROWN TIMELINE ────────────────────
  const crownMapRec = Utils.getAragornCrownMap();
  const crownGridEl = document.getElementById('aragornCrownGrid');
  if (crownGridEl) {
    crownGridEl.innerHTML = Object.entries(crownMapRec)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([year, { owner, teamName }]) => {
        const currentTeam = ownerToLatestTeam[owner] || teamName;
        const showPrev = currentTeam !== teamName;
        return `
          <div class="champion-card">
            <div class="year-badge">${year}</div>
            <div class="trophy-wrap" style="color:#b0bec5;">${Icons.aragornCrown({ size: 26 })}</div>
            <div class="champ-name">${currentTeam}</div>
            <div class="champ-owner">${Utils.shortOwner(owner)}</div>
            ${showPrev ? `<div class="champ-prev-name">formerly ${teamName}</div>` : ''}
          </div>`;
      }).join('');
  }

  // ── LEAGUE HIGHLIGHTS (FUN STATS) ────────────
  let highScore2  = { score: 0,       team: '', owner: '', year: '', week: 0 };
  let lowScore2   = { score: Infinity, team: '', owner: '', year: '', week: 0 };
  let bigBlowout2 = { margin: 0, winner: '', loser: '', year: '', week: 0 };
  let bestPFSeason2 = { pf: 0, team: '', owner: '', year: '' };

  for (const m of matchups) {
    const scores = [
      { score: m.home_score, team: m.home_team, owner: m.home_owner },
      { score: m.away_score, team: m.away_team, owner: m.away_owner },
    ];
    for (const s of scores) {
      if (s.score > highScore2.score) highScore2 = { ...s, year: m.year, week: m.week };
      if (s.score > 0 && s.score < lowScore2.score) lowScore2 = { ...s, year: m.year, week: m.week };
    }
    const margin = Math.abs(m.home_score - m.away_score);
    if (margin > bigBlowout2.margin) {
      bigBlowout2 = {
        margin, year: m.year, week: m.week,
        winner: m.home_score > m.away_score ? m.home_team : m.away_team,
        loser:  m.home_score > m.away_score ? m.away_team : m.home_team,
      };
    }
  }
  for (const [year, season] of seasons) {
    for (const t of season.teams) {
      if (t.points_for > bestPFSeason2.pf) {
        bestPFSeason2 = { pf: t.points_for, team: t.team_name.trim(), owner: t.owner, year };
      }
    }
  }
  const mostTitles2 = [...ownerStatsList].sort((a, b) => b.titles - a.titles)[0];
  const avgScore2   = matchups.length
    ? matchups.reduce((s, m) => s + m.home_score + m.away_score, 0) / (matchups.length * 2)
    : 0;

  const funStats = [
    { icon: Icons.flame({ size: 22 }),    color: 'gold',  value: Utils.fmt(highScore2.score, 2),     label: 'Highest Single-Week Score',  sub: `${highScore2.team} — ${highScore2.year} Wk ${highScore2.week}` },
    { icon: Icons.skull({ size: 22 }),    color: 'red',   value: Utils.fmt(lowScore2.score, 2),      label: 'Lowest Single-Week Score',   sub: `${lowScore2.team} — ${lowScore2.year} Wk ${lowScore2.week}` },
    { icon: Icons.zap({ size: 22 }),      color: 'gold',  value: `+${Utils.fmt(bigBlowout2.margin, 2)}`, label: 'Biggest Blowout',        sub: `${bigBlowout2.winner} def. ${bigBlowout2.loser} — ${bigBlowout2.year} Wk ${bigBlowout2.week}` },
    { icon: Icons.trendUp({ size: 22 }), color: 'green', value: Utils.fmt(bestPFSeason2.pf, 2),     label: 'Most Points in a Season',    sub: `${bestPFSeason2.team} (${Utils.shortOwner(bestPFSeason2.owner)}) — ${bestPFSeason2.year}` },
    { icon: Icons.crown({ size: 22 }),   color: 'gold',  value: mostTitles2.titles,              label: 'Most Championships',         sub: `${Utils.shortOwner(mostTitles2.owner)}` },
    { icon: Icons.target({ size: 22 }),  color: 'blue',  value: Utils.fmt(avgScore2, 2),            label: 'Average Weekly Score',       sub: `Across all ${matchups.length} matchups` },
  ];
  document.getElementById('funStats').innerHTML = funStats.map(s => `
    <div class="fun-stat-card">
      <div class="icon-wrap iw-${s.color}">${s.icon}</div>
      <div class="stat-number">${s.value}</div>
      <div class="card-title">${s.label}</div>
      <div class="stat-sub">${s.sub}</div>
    </div>
  `).join('');

  // ── BUILD ALL SCORES ─────────────────────────
  const allScores = [];
  for (const m of matchups) {
    if (m.home_score > 0) allScores.push({ score: m.home_score, team: m.home_team, owner: m.home_owner, year: m.year, week: m.week });
    if (m.away_score > 0) allScores.push({ score: m.away_score, team: m.away_team, owner: m.away_owner, year: m.year, week: m.week });
  }
  allScores.sort((a, b) => b.score - a.score);

  // ── SCORING RECORDS ──────────────────────────
  const highScore = allScores[0];
  const lowScore  = allScores[allScores.length - 1];

  const blowouts = matchups.map(m => ({
    margin: Math.abs(m.home_score - m.away_score),
    winner: m.home_score > m.away_score ? m.home_team : m.away_team,
    loser:  m.home_score > m.away_score ? m.away_team : m.home_team,
    winScore: Math.max(m.home_score, m.away_score),
    loseScore: Math.min(m.home_score, m.away_score),
    year: m.year, week: m.week,
  })).sort((a, b) => b.margin - a.margin);

  const closestGame    = [...blowouts].sort((a, b) => a.margin - b.margin)[0];
  const biggestBlowout = blowouts[0];

  const scoringCards = [
    {
      icon: Icons.flame({ size: 22 }), color: 'gold',
      value: Utils.fmt(highScore.score, 2),
      title: 'Highest Single-Week Score',
      holder: highScore.team,
      detail: `${Utils.shortOwner(highScore.owner)} — ${highScore.year}, Week ${highScore.week}`,
    },
    {
      icon: Icons.skull({ size: 22 }), color: 'red',
      value: Utils.fmt(lowScore.score, 2),
      title: 'Lowest Single-Week Score',
      holder: lowScore.team,
      detail: `${Utils.shortOwner(lowScore.owner)} — ${lowScore.year}, Week ${lowScore.week}`,
    },
    {
      icon: Icons.zap({ size: 22 }), color: 'gold',
      value: `+${Utils.fmt(biggestBlowout.margin, 2)}`,
      title: 'Biggest Blowout',
      holder: `${biggestBlowout.winner} def. ${biggestBlowout.loser}`,
      detail: `${Utils.fmt(biggestBlowout.winScore, 2)} – ${Utils.fmt(biggestBlowout.loseScore, 2)} — ${biggestBlowout.year}, Week ${biggestBlowout.week}`,
    },
    {
      icon: Icons.target({ size: 22 }), color: 'blue',
      value: `+${Utils.fmt(closestGame.margin, 2)}`,
      title: 'Closest Game',
      holder: `${closestGame.winner} def. ${closestGame.loser}`,
      detail: `${Utils.fmt(closestGame.winScore, 2)} – ${Utils.fmt(closestGame.loseScore, 2)} — ${closestGame.year}, Week ${closestGame.week}`,
    },
  ];

  document.getElementById('scoringRecords').innerHTML = scoringCards.map(renderRecord).join('');

  // ── SEASON RECORDS ────────────────────────────
  let bestRecord  = { w: 0, l: 99, pct: 0,        team: '', owner: '', year: '' };
  let worstRecord = { w: 99, l: 0, pct: 1,         team: '', owner: '', year: '' };
  let mostPF      = { pf: 0,        team: '', owner: '', year: '' };
  let leastPF     = { pf: Infinity,  team: '', owner: '', year: '' };
  let mostPA      = { pa: 0,         team: '', owner: '', year: '' };

  for (const [year, season] of seasons) {
    for (const t of season.teams) {
      const total = t.wins + t.losses + t.ties;
      const pct = total ? (t.wins + t.ties * 0.5) / total : 0;

      if (pct > bestRecord.pct || (pct === bestRecord.pct && t.wins > bestRecord.w)) {
        bestRecord = { w: t.wins, l: t.losses, pct, team: t.team_name.trim(), owner: t.owner, year };
      }
      if (pct < worstRecord.pct || (pct === worstRecord.pct && t.losses > worstRecord.l)) {
        worstRecord = { w: t.wins, l: t.losses, pct, team: t.team_name.trim(), owner: t.owner, year };
      }
      if (t.points_for > mostPF.pf) {
        mostPF = { pf: t.points_for, team: t.team_name.trim(), owner: t.owner, year };
      }
      if (t.points_for < leastPF.pf) {
        leastPF = { pf: t.points_for, team: t.team_name.trim(), owner: t.owner, year };
      }
      if (t.points_against > mostPA.pa) {
        mostPA = { pa: t.points_against, team: t.team_name.trim(), owner: t.owner, year };
      }
    }
  }

  const seasonCards = [
    {
      icon: Icons.award({ size: 22 }), color: 'green',
      value: `${bestRecord.w}–${bestRecord.l}`,
      title: 'Best Regular Season Record',
      holder: bestRecord.team,
      detail: `${Utils.shortOwner(bestRecord.owner)} — ${bestRecord.year} (${(bestRecord.pct * 100).toFixed(1)}%)`,
    },
    {
      icon: Icons.alert({ size: 22 }), color: 'red',
      value: `${worstRecord.w}–${worstRecord.l}`,
      title: 'Worst Regular Season Record',
      holder: worstRecord.team,
      detail: `${Utils.shortOwner(worstRecord.owner)} — ${worstRecord.year} (${(worstRecord.pct * 100).toFixed(1)}%)`,
    },
    {
      icon: Icons.trendUp({ size: 22 }), color: 'green',
      value: Utils.fmt(mostPF.pf, 2),
      title: 'Most Points in a Season',
      holder: mostPF.team,
      detail: `${Utils.shortOwner(mostPF.owner)} — ${mostPF.year}`,
    },
    {
      icon: Icons.trendDown({ size: 22 }), color: 'red',
      value: Utils.fmt(leastPF.pf, 2),
      title: 'Fewest Points in a Season',
      holder: leastPF.team,
      detail: `${Utils.shortOwner(leastPF.owner)} — ${leastPF.year}`,
    },
    {
      icon: Icons.shield({ size: 22 }), color: 'red',
      value: Utils.fmt(mostPA.pa, 2),
      title: 'Most Points Scored Against',
      holder: mostPA.team,
      detail: `${Utils.shortOwner(mostPA.owner)} — ${mostPA.year} (unluckiest team)`,
    },
  ];

  document.getElementById('seasonRecords').innerHTML = seasonCards.map(renderRecord).join('');

  // ── WIN STREAKS ───────────────────────────────
  const ownerResults = {};
  const regMatchups = matchups.filter(m => !m.is_playoff);

  for (const m of regMatchups) {
    const homeWon = m.home_score > m.away_score;
    for (const [owner, won] of [[m.home_owner, homeWon], [m.away_owner, !homeWon]]) {
      if (!ownerResults[owner]) ownerResults[owner] = [];
      ownerResults[owner].push({ year: m.year, week: m.week, won });
    }
  }

  for (const o of Object.keys(ownerResults)) {
    ownerResults[o].sort((a, b) => Number(a.year) - Number(b.year) || a.week - b.week);
  }

  let longestWin  = { streak: 0, owner: '', detail: '' };
  let longestLoss = { streak: 0, owner: '', detail: '' };

  for (const [owner, results] of Object.entries(ownerResults)) {
    let ws = 0, ls = 0, maxWs = 0, maxLs = 0;
    let wsStart = null, lsStart = null;
    let bestWsStart = null, bestLsStart = null;

    for (const r of results) {
      if (r.won) {
        if (ws === 0) wsStart = `${r.year} Wk ${r.week}`;
        ws++; ls = 0;
        if (ws > maxWs) { maxWs = ws; bestWsStart = wsStart; }
      } else {
        if (ls === 0) lsStart = `${r.year} Wk ${r.week}`;
        ls++; ws = 0;
        if (ls > maxLs) { maxLs = ls; bestLsStart = lsStart; }
      }
    }
    if (maxWs > longestWin.streak)  longestWin  = { streak: maxWs, owner: Utils.shortOwner(owner), detail: `Starting ${bestWsStart}` };
    if (maxLs > longestLoss.streak) longestLoss = { streak: maxLs, owner: Utils.shortOwner(owner), detail: `Starting ${bestLsStart}` };
  }

  const streakCards = [
    {
      icon: Icons.flame({ size: 22 }), color: 'green',
      value: `${longestWin.streak}W`,
      title: 'Longest Win Streak',
      holder: longestWin.owner,
      detail: longestWin.detail,
    },
    {
      icon: Icons.snowflake({ size: 22 }), color: 'red',
      value: `${longestLoss.streak}L`,
      title: 'Longest Losing Streak',
      holder: longestLoss.owner,
      detail: longestLoss.detail,
    },
  ];

  document.getElementById('streakRecords').innerHTML = streakCards.map(renderRecord).join('');

  // ── TOP 10 SCORES TABLE ───────────────────────
  const top10 = allScores.slice(0, 10);
  const top10Rows = top10.map((s, i) => `
    <tr>
      <td class="rank-cell num">${i + 1}</td>
      <td class="owner-cell">${s.team}</td>
      <td>${Utils.shortOwner(s.owner)}</td>
      <td class="num" style="color:var(--accent-gold);font-weight:700">${Utils.fmt(s.score, 2)}</td>
      <td class="num">${s.year}</td>
      <td class="num">Week ${s.week}</td>
    </tr>
  `).join('');

  document.getElementById('topScoresTable').innerHTML = `
    <table>
      <thead>
        <tr>
          <th class="num" scope="col">#</th>
          <th scope="col">Team</th>
          <th scope="col">Manager</th>
          <th class="num" scope="col">Score</th>
          <th class="num" scope="col">Year</th>
          <th class="num" scope="col">Week</th>
        </tr>
      </thead>
      <tbody>${top10Rows}</tbody>
    </table>
  `;

  // ── HELPERS ───────────────────────────────────
  function renderRecord(r) {
    return `
      <div class="record-card">
        <div class="icon-wrap iw-${r.color}">${r.icon}</div>
        <div class="card-title">${r.title}</div>
        <div class="record-value">${r.value}</div>
        <div class="record-holder">${r.holder}</div>
        <div class="record-detail">${r.detail}</div>
      </div>
    `;
  }

})();
