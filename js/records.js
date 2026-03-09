/* =============================================
   records.js — League Records page
   ============================================= */

(function () {
  const seasons = Utils.getSeasons();
  const matchups = Utils.getAllMatchups();

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

  const closestGame = [...blowouts].sort((a, b) => a.margin - b.margin)[0];
  const biggestBlowout = blowouts[0];

  const scoringCards = [
    {
      icon: '🔥',
      value: Utils.fmt(highScore.score),
      title: 'Highest Single-Week Score',
      holder: highScore.team,
      detail: `${Utils.shortOwner(highScore.owner)} — ${highScore.year}, Week ${highScore.week}`,
    },
    {
      icon: '💀',
      value: Utils.fmt(lowScore.score),
      title: 'Lowest Single-Week Score',
      holder: lowScore.team,
      detail: `${Utils.shortOwner(lowScore.owner)} — ${lowScore.year}, Week ${lowScore.week}`,
    },
    {
      icon: '💥',
      value: `+${Utils.fmt(biggestBlowout.margin)}`,
      title: 'Biggest Blowout',
      holder: `${biggestBlowout.winner} def. ${biggestBlowout.loser}`,
      detail: `${Utils.fmt(biggestBlowout.winScore)} – ${Utils.fmt(biggestBlowout.loseScore)} — ${biggestBlowout.year}, Week ${biggestBlowout.week}`,
    },
    {
      icon: '😬',
      value: `+${Utils.fmt(closestGame.margin)}`,
      title: 'Closest Game',
      holder: `${closestGame.winner} def. ${closestGame.loser}`,
      detail: `${Utils.fmt(closestGame.winScore)} – ${Utils.fmt(closestGame.loseScore)} — ${closestGame.year}, Week ${closestGame.week}`,
    },
  ];

  document.getElementById('scoringRecords').innerHTML = scoringCards.map(renderRecord).join('');

  // ── SEASON RECORDS ────────────────────────────
  let bestRecord  = { w: 0, l: 99, pct: 0, team: '', owner: '', year: '' };
  let worstRecord = { w: 99, l: 0, pct: 1, team: '', owner: '', year: '' };
  let mostPF      = { pf: 0, team: '', owner: '', year: '' };
  let leastPF     = { pf: Infinity, team: '', owner: '', year: '' };
  let mostPA      = { pa: 0, team: '', owner: '', year: '' };

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
      icon: '🏅',
      value: `${bestRecord.w}–${bestRecord.l}`,
      title: 'Best Regular Season Record',
      holder: bestRecord.team,
      detail: `${Utils.shortOwner(bestRecord.owner)} — ${bestRecord.year} (${(bestRecord.pct * 100).toFixed(1)}%)`,
    },
    {
      icon: '😢',
      value: `${worstRecord.w}–${worstRecord.l}`,
      title: 'Worst Regular Season Record',
      holder: worstRecord.team,
      detail: `${Utils.shortOwner(worstRecord.owner)} — ${worstRecord.year} (${(worstRecord.pct * 100).toFixed(1)}%)`,
    },
    {
      icon: '📈',
      value: Utils.fmt(mostPF.pf),
      title: 'Most Points in a Season',
      holder: mostPF.team,
      detail: `${Utils.shortOwner(mostPF.owner)} — ${mostPF.year}`,
    },
    {
      icon: '📉',
      value: Utils.fmt(leastPF.pf),
      title: 'Fewest Points in a Season',
      holder: leastPF.team,
      detail: `${Utils.shortOwner(leastPF.owner)} — ${leastPF.year}`,
    },
    {
      icon: '🎯',
      value: Utils.fmt(mostPA.pa),
      title: 'Most Points Scored Against',
      holder: mostPA.team,
      detail: `${Utils.shortOwner(mostPA.owner)} — ${mostPA.year} (unluckiest team)`,
    },
  ];

  document.getElementById('seasonRecords').innerHTML = seasonCards.map(renderRecord).join('');

  // ── WIN STREAKS ───────────────────────────────
  // Build per-owner weekly results in chronological order
  const ownerResults = {}; // { owner: [{ year, week, win: bool }] }
  const regMatchups = matchups.filter(m => !m.is_playoff);

  for (const m of regMatchups) {
    const homeWon = m.home_score > m.away_score;
    for (const [owner, won] of [[m.home_owner, homeWon], [m.away_owner, !homeWon]]) {
      if (!ownerResults[owner]) ownerResults[owner] = [];
      ownerResults[owner].push({ year: m.year, week: m.week, won });
    }
  }

  // Sort each owner's results chronologically
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
      icon: '🔥',
      value: `${longestWin.streak}W`,
      title: 'Longest Win Streak',
      holder: longestWin.owner,
      detail: longestWin.detail,
    },
    {
      icon: '❄️',
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
      <td class="num" style="color:var(--accent-gold);font-weight:700">${Utils.fmt(s.score)}</td>
      <td class="num">${s.year}</td>
      <td class="num">Week ${s.week}</td>
    </tr>
  `).join('');

  document.getElementById('topScoresTable').innerHTML = `
    <table>
      <thead>
        <tr>
          <th class="num">#</th>
          <th>Team</th>
          <th>Manager</th>
          <th class="num">Score</th>
          <th class="num">Year</th>
          <th class="num">Week</th>
        </tr>
      </thead>
      <tbody>${top10Rows}</tbody>
    </table>
  `;

  // ── HELPERS ───────────────────────────────────
  function renderRecord(r) {
    return `
      <div class="record-card">
        <div class="record-icon">${r.icon}</div>
        <div class="card-title">${r.title}</div>
        <div class="record-value">${r.value}</div>
        <div class="record-holder">${r.holder}</div>
        <div class="record-detail">${r.detail}</div>
      </div>
    `;
  }

})();
