/* =============================================
   team.js — Individual Manager Profile Page
   ============================================= */

(function () {
  const ownerStats   = Utils.getOwnerStats();
  const allMatchups  = Utils.getAllMatchups();
  const seasons      = Utils.getSeasons();
  const teamOwnerMap = Utils.buildTeamOwnerMap();
  const logoMap      = Utils.getLogoMap();

  // All canonical owners sorted alphabetically
  const allOwners = ownerStats
    .map(o => o.owner)
    .sort((a, b) => a.localeCompare(b));

  // ── POPULATE TEAMS DROPDOWN ──────────────────
  const teamsNav = document.getElementById('teamsDropdownNav');
  if (teamsNav) {
    const params = new URLSearchParams(window.location.search);
    const currentShort = params.get('owner') || '';
    teamsNav.innerHTML = allOwners.map(o => {
      const active = Utils.isActive(o);
      return `<li><a href="team.html?owner=${encodeURIComponent(Utils.shortOwner(o))}"
          class="${Utils.shortOwner(o) === currentShort ? 'active' : ''}">
          ${Utils.shortOwner(o)}${!active ? ' <span class="dropdown-inactive">Alumni</span>' : ''}
        </a></li>`;
    }).join('');
  }

  // ── RESOLVE ACTIVE OWNER ─────────────────────
  const urlParams = new URLSearchParams(window.location.search);
  const requestedOwner = urlParams.get('owner');

  // Default: most seasons played (first in ownerStats sorted by seasons desc)
  const defaultOwner = [...ownerStats].sort((a, b) => b.seasons - a.seasons)[0]?.owner;
  const activeOwner  = requestedOwner
    ? (Utils.resolveOwner(requestedOwner) || defaultOwner)
    : defaultOwner;

  if (!activeOwner) {
    document.getElementById('teamContent').innerHTML = '<p style="color:var(--text-muted)">No owner found.</p>';
    return;
  }

  // ── GATHER DATA ──────────────────────────────
  const stats = ownerStats.find(o => o.owner === activeOwner);
  const totalGames = stats.wins + stats.losses + stats.ties;
  const winPct = totalGames ? ((stats.wins + stats.ties * 0.5) / totalGames * 100).toFixed(1) : '0.0';

  // Per-season breakdown
  const seasonRows = [];
  for (const [year, season] of seasons) {
    const teamEntry = season.teams.find(t => Utils.normalizeName(t.owner) === activeOwner);
    if (!teamEntry) continue;
    const games = teamEntry.wins + teamEntry.losses + teamEntry.ties;
    const pct   = games ? ((teamEntry.wins + teamEntry.ties * 0.5) / games * 100).toFixed(1) : '0.0';
    const isChamp = season.champion?.trim() === teamEntry.team_name.trim();
    seasonRows.push({ year, teamEntry, pct, isChamp, season });
  }

  // Best/worst by win%
  const sorted = [...seasonRows].sort((a, b) => parseFloat(b.pct) - parseFloat(a.pct));
  const bestSeason  = sorted[0];
  const worstSeason = sorted[sorted.length - 1];

  // Best/worst by points for
  const sortedPF = [...seasonRows].sort((a, b) => b.teamEntry.points_for - a.teamEntry.points_for);
  const mostPFSeason  = sortedPF[0];
  const leastPFSeason = sortedPF[sortedPF.length - 1];

  // Championship years
  const champYears = seasonRows.filter(r => r.isChamp).map(r => r.year);

  // H2H records vs all other managers
  const h2h = {};
  for (const m of allMatchups) {
    const isHome = m.home_owner === activeOwner;
    const isAway = m.away_owner === activeOwner;
    if (!isHome && !isAway) continue;
    const opp = isHome ? m.away_owner : m.home_owner;
    if (!opp || opp === activeOwner) continue;
    if (!h2h[opp]) h2h[opp] = { w: 0, l: 0, pf: 0, pa: 0 };
    const myScore  = isHome ? m.home_score : m.away_score;
    const oppScore = isHome ? m.away_score : m.home_score;
    if (myScore > oppScore) h2h[opp].w++;
    else if (oppScore > myScore) h2h[opp].l++;
    h2h[opp].pf += myScore;
    h2h[opp].pa += oppScore;
  }

  const h2hSorted = Object.entries(h2h)
    .map(([opp, r]) => ({ opp, ...r, games: r.w + r.l, pct: r.w + r.l ? r.w / (r.w + r.l) : 0 }))
    .sort((a, b) => b.games - a.games);

  const bestH2H  = [...h2hSorted].filter(r => r.w > r.l).sort((a, b) => (b.w - b.l) - (a.w - a.l)).slice(0, 3);
  const worstH2H = [...h2hSorted].filter(r => r.l > r.w).sort((a, b) => (b.l - b.w) - (a.l - a.w)).slice(0, 3);

  // ── RENDER ───────────────────────────────────
  document.title = `${stats.latestTeam} — The Fellowship of the League`;

  const isActive = Utils.isActive(activeOwner);
  const champBadges = champYears.length
    ? champYears.map(y => `<span class="badge">${Icons.trophy({ size: 11 })} ${y}</span>`).join(' ')
    : '<span style="color:var(--text-muted);font-size:0.85rem">No championships yet</span>';

  // Season table rows — most recent year first
  const seasonTableRows = [...seasonRows].reverse().map(r => {
    const t = r.teamEntry;
    return `
      <tr>
        <td class="num">${r.year}</td>
        <td>${t.team_name.trim()} ${r.isChamp ? Icons.trophy({ size: 13, cls: 'icon-gold' }) : ''}</td>
        <td class="num" style="color:var(--win)">${t.wins}</td>
        <td class="num" style="color:var(--loss)">${t.losses}</td>
        <td class="num win-pct">${r.pct}%</td>
        <td class="num">${Utils.fmt(t.points_for)}</td>
        <td class="num">${Utils.fmt(t.points_against)}</td>
        <td class="num" style="color:${t.points_for >= t.points_against ? 'var(--win)' : 'var(--loss)'}">
          ${t.points_for >= t.points_against ? '+' : ''}${Utils.fmt(t.points_for - t.points_against)}
        </td>
        <td class="num">${ordinal(t.final_standing)}</td>
      </tr>
    `;
  }).join('');

  // H2H table rows
  const h2hRows = h2hSorted.map(r => {
    const winCls = r.w > r.l ? 'style="color:var(--win)"' : r.l > r.w ? 'style="color:var(--loss)"' : '';
    return `
      <tr>
        <td class="owner-cell">${Utils.shortOwner(r.opp)}</td>
        <td class="num" ${winCls}>${r.w}–${r.l}</td>
        <td class="num win-pct">${(r.pct * 100).toFixed(1)}%</td>
        <td class="num">${Utils.fmt(r.pf / r.games)}</td>
        <td class="num">${Utils.fmt(r.pa / r.games)}</td>
      </tr>
    `;
  }).join('');

  document.getElementById('teamContent').innerHTML = `

    <!-- PROFILE HEADER -->
    <div class="team-header">
      <div class="team-header-avatar">${
        (typeof TEAM_LOGOS !== 'undefined' && TEAM_LOGOS[activeOwner])
          ? `<img src="${TEAM_LOGOS[activeOwner]}" alt="${stats.latestTeam} logo" />`
          : Utils.shortOwner(activeOwner).split(' ')[0][0]
      }</div>
      <div class="team-header-info">
        <div class="team-header-name">${stats.latestTeam}</div>
        <div class="team-header-team">${Utils.shortOwner(activeOwner)}</div>
        <div class="team-header-seasons">
          ${stats.seasons} season${stats.seasons !== 1 ? 's' : ''} &nbsp;·&nbsp; ${stats.teamNames.length > 1 ? stats.teamNames.length + ' team names' : '1 team name'}
          ${!isActive ? '&nbsp;·&nbsp; <span class="alumni-badge">Alumni</span>' : ''}
        </div>
        <div style="margin-top:0.6rem">${champBadges}</div>
      </div>
    </div>

    <!-- CAREER STAT PILLS -->
    <div class="grid-4" style="margin-bottom:2rem">
      ${statPill('All-Time Record', `${stats.wins}–${stats.losses}`, `${winPct}% win rate`)}
      ${statPill('Points For', Utils.fmt(stats.pf), `${Utils.fmt(stats.pf / stats.seasons)} per season`)}
      ${statPill('Points Against', Utils.fmt(stats.pa), `${Utils.fmt(stats.pa / stats.seasons)} per season`)}
      ${statPill('Championships', stats.titles, champYears.length ? champYears.join(', ') : 'Not yet')}
    </div>

    <!-- WEEK-BY-WEEK CHART -->
    <div style="margin-bottom:2rem">
      <div class="section-title">${Icons.trendUp({ size: 16 })} Weekly Performance</div>
      <div class="card week-chart-card">
        <div class="week-chart-tabs" id="weekChartTabs"></div>
        <div id="weekChartBody"></div>
      </div>
    </div>

    <!-- SEASON HIGHLIGHTS -->
    <div class="grid-2" style="margin-bottom:2rem">
      <div>
        <div class="section-title">${Icons.star({ size: 16 })} Season Highlights</div>
        <div class="grid-2">
          ${highlightCard('Best Record', `${bestSeason.teamEntry.wins}–${bestSeason.teamEntry.losses}`, bestSeason.teamEntry.team_name.trim(), bestSeason.year, Icons.award({ size: 16 }), 'green')}
          ${highlightCard('Worst Record', `${worstSeason.teamEntry.wins}–${worstSeason.teamEntry.losses}`, worstSeason.teamEntry.team_name.trim(), worstSeason.year, Icons.alert({ size: 16 }), 'red')}
          ${highlightCard('Most Points', Utils.fmt(mostPFSeason.teamEntry.points_for), mostPFSeason.teamEntry.team_name.trim(), mostPFSeason.year, Icons.trendUp({ size: 16 }), 'green')}
          ${highlightCard('Fewest Points', Utils.fmt(leastPFSeason.teamEntry.points_for), leastPFSeason.teamEntry.team_name.trim(), leastPFSeason.year, Icons.trendDown({ size: 16 }), 'red')}
        </div>
      </div>
      <div>
        <div class="section-title">${Icons.swords({ size: 16 })} Head-to-Head</div>
        <div style="margin-bottom:0.5rem;font-size:0.75rem;color:var(--text-muted)">Best matchups</div>
        ${bestH2H.length ? bestH2H.map(r => h2hMiniCard(r, true)).join('') : '<p style="color:var(--text-muted);font-size:0.85rem">—</p>'}
        <div style="margin:0.75rem 0 0.5rem;font-size:0.75rem;color:var(--text-muted)">Toughest opponents</div>
        ${worstH2H.length ? worstH2H.map(r => h2hMiniCard(r, false)).join('') : '<p style="color:var(--text-muted);font-size:0.85rem">—</p>'}
      </div>
    </div>

    <!-- SEASON BY SEASON TABLE -->
    <div style="margin-bottom:2rem">
      <div class="section-title">${Icons.calendar({ size: 16 })} Season-by-Season</div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="num">Year</th>
              <th>Team Name</th>
              <th class="num">W</th>
              <th class="num">L</th>
              <th class="num">Win%</th>
              <th class="num">PF</th>
              <th class="num">PA</th>
              <th class="num">+/-</th>
              <th class="num">Finish</th>
            </tr>
          </thead>
          <tbody>${seasonTableRows}</tbody>
        </table>
      </div>
    </div>

    <!-- FULL H2H TABLE -->
    <div style="margin-bottom:2rem">
      <div class="section-title">${Icons.barChart({ size: 16 })} All Head-to-Head Records</div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Opponent</th>
              <th class="num">Record</th>
              <th class="num">Win%</th>
              <th class="num">Avg PF</th>
              <th class="num">Avg PA</th>
            </tr>
          </thead>
          <tbody>${h2hRows}</tbody>
        </table>
      </div>
    </div>
  `;

  // ── WEEK CHART ───────────────────────────────

  // Get week-by-week data: use pre-computed arrays when available, fall back to matchups
  function getWeeklyData(year, teamEntry) {
    if (teamEntry.scores && teamEntry.scores.length > 0) {
      return { scores: teamEntry.scores, outcomes: teamEntry.outcomes || [], schedule: teamEntry.schedule || [] };
    }
    const season = LEAGUE_DATA[year];
    const regCount = season?.settings?.reg_season_count || 14;
    const teamName = teamEntry.team_name?.trim();
    const scores = [], outcomes = [], schedule = [];
    for (let w = 1; w <= regCount; w++) {
      const m = (season?.matchups || []).find(mx =>
        mx.week === w && mx.matchup_type === 'NONE' &&
        (mx.home_team?.trim() === teamName || mx.away_team?.trim() === teamName)
      );
      if (!m) continue;
      const isHome = m.home_team?.trim() === teamName;
      const myScore  = isHome ? m.home_score  : m.away_score;
      const oppScore = isHome ? m.away_score  : m.home_score;
      scores[w - 1]   = myScore || 0;
      outcomes[w - 1] = myScore > oppScore ? 'W' : myScore < oppScore ? 'L' : (myScore ? 'T' : 'U');
      schedule[w - 1] = ((isHome ? m.away_team : m.home_team) || '—').trim();
    }
    return { scores, outcomes, schedule };
  }

  const chartSeasons = seasonRows.filter(r => {
    const d = getWeeklyData(r.year, r.teamEntry);
    return d.scores.some(s => s > 0);
  });

  const tabsEl = document.getElementById('weekChartTabs');
  const bodyEl = document.getElementById('weekChartBody');

  if (tabsEl && bodyEl && chartSeasons.length) {
    // Build year tabs — most recent first
    const yearList = [...chartSeasons].reverse().map(r => r.year);
    tabsEl.innerHTML = yearList.map(y =>
      `<button class="week-chart-tab" data-year="${y}">${y}</button>`
    ).join('');

    function renderChart(year) {
      const row = chartSeasons.find(r => r.year === year);
      if (!row) return;

      const regCount = LEAGUE_DATA[year]?.settings?.reg_season_count || 14;
      const wd = getWeeklyData(year, row.teamEntry);
      const wkScores   = wd.scores.slice(0, regCount);
      const wkOutcomes = wd.outcomes.slice(0, regCount);
      const wkSchedule = wd.schedule.slice(0, regCount);

      const validScores = wkScores.filter(s => s > 0);
      if (!validScores.length) {
        bodyEl.innerHTML = '<p style="color:var(--text-muted);padding:1rem">No scored weeks yet.</p>';
        tabsEl.querySelectorAll('.week-chart-tab').forEach(b => b.classList.toggle('active', b.dataset.year === String(year)));
        return;
      }

      const maxS = Math.max(...validScores);
      const minS = Math.min(...validScores);
      const pad  = (maxS - minS) * 0.15 || 20;
      const yMax = maxS + pad;
      const yMin = Math.max(0, minS - pad);

      const W = 680, H = 160;
      const PL = 46, PR = 12, PT = 14, PB = 28;
      const cW = W - PL - PR;
      const cH = H - PT - PB;
      const n  = wkScores.length;
      const xP = i => PL + (n > 1 ? i / (n - 1) : 0.5) * cW;
      const yP = v => PT + cH - ((v - yMin) / (yMax - yMin)) * cH;

      const playedIdx = wkScores.reduce((acc, s, i) => { if (s > 0) acc.push(i); return acc; }, []);
      const lineParts = playedIdx.map((i, j) =>
        `${j === 0 ? 'M' : 'L'} ${xP(i).toFixed(1)},${yP(wkScores[i]).toFixed(1)}`
      );
      const linePath = lineParts.join(' ');
      const areaPath = playedIdx.length
        ? `M ${xP(playedIdx[0]).toFixed(1)},${(PT + cH).toFixed(1)} ${lineParts.join(' ')} L ${xP(playedIdx[playedIdx.length - 1]).toFixed(1)},${(PT + cH).toFixed(1)} Z`
        : '';

      let yLines = '', yLabels = '';
      for (let ti = 0; ti <= 3; ti++) {
        const v = yMin + (yMax - yMin) * (ti / 3);
        const y = yP(v).toFixed(1);
        yLines  += `<line x1="${PL}" y1="${y}" x2="${W - PR}" y2="${y}" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>`;
        yLabels += `<text x="${PL - 6}" y="${y}" text-anchor="end" dominant-baseline="middle" fill="var(--text-muted)" font-size="10" font-family="Barlow Condensed,sans-serif">${v.toFixed(0)}</text>`;
      }

      let xLabels = '';
      wkScores.forEach((_, i) => {
        xLabels += `<text x="${xP(i).toFixed(1)}" y="${H - 4}" text-anchor="middle" fill="var(--text-muted)" font-size="10" font-family="Barlow Condensed,sans-serif">${i + 1}</text>`;
      });

      let dots = '';
      wkScores.forEach((s, i) => {
        if (!s) return;
        const outcome = wkOutcomes[i] || 'U';
        const opp  = wkSchedule[i] || '—';
        const fill = outcome === 'W' ? '#4ade80' : outcome === 'L' ? '#f87171' : '#94a3b8';
        dots += `<circle cx="${xP(i).toFixed(1)}" cy="${yP(s).toFixed(1)}" r="5" fill="${fill}" stroke="var(--bg-card)" stroke-width="2" class="chart-dot"><title>Wk ${i + 1}: ${s.toFixed(1)} pts vs ${opp} (${outcome})</title></circle>`;
      });

      const avg  = validScores.reduce((a, b) => a + b, 0) / validScores.length;
      const avgY = yP(avg).toFixed(1);
      const wins   = wkOutcomes.filter(o => o === 'W').length;
      const losses = wkOutcomes.filter(o => o === 'L').length;
      const highWk = wkScores.indexOf(Math.max(...validScores)) + 1;
      const lowWk  = wkScores.indexOf(Math.min(...validScores)) + 1;

      bodyEl.innerHTML = `
        <svg viewBox="0 0 ${W} ${H}" class="week-chart-svg" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="cg${year}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#c9a227" stop-opacity="0.25"/>
              <stop offset="100%" stop-color="#c9a227" stop-opacity="0"/>
            </linearGradient>
          </defs>
          ${yLines}
          <line x1="${PL}" y1="${avgY}" x2="${W - PR}" y2="${avgY}" stroke="rgba(201,162,39,0.3)" stroke-width="1" stroke-dasharray="4,3"/>
          <text x="${W - PR}" y="${Number(avgY) - 4}" text-anchor="end" fill="rgba(201,162,39,0.6)" font-size="9" font-family="Barlow Condensed,sans-serif">AVG ${avg.toFixed(1)}</text>
          ${areaPath ? `<path d="${areaPath}" fill="url(#cg${year})"/>` : ''}
          ${linePath ? `<path d="${linePath}" fill="none" stroke="#c9a227" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
          ${yLabels}${xLabels}${dots}
        </svg>
        <div class="week-chart-stats">
          <div class="week-chart-stat"><span class="week-chart-stat-val" style="color:#4ade80">${wins}</span><span class="week-chart-stat-lbl">Wins</span></div>
          <div class="week-chart-stat"><span class="week-chart-stat-val" style="color:#f87171">${losses}</span><span class="week-chart-stat-lbl">Losses</span></div>
          <div class="week-chart-stat"><span class="week-chart-stat-val">${avg.toFixed(1)}</span><span class="week-chart-stat-lbl">Avg Score</span></div>
          <div class="week-chart-stat"><span class="week-chart-stat-val">${maxS.toFixed(1)}</span><span class="week-chart-stat-lbl">Best (Wk ${highWk})</span></div>
          <div class="week-chart-stat"><span class="week-chart-stat-val">${Math.min(...validScores).toFixed(1)}</span><span class="week-chart-stat-lbl">Lowest (Wk ${lowWk})</span></div>
        </div>
      `;

      tabsEl.querySelectorAll('.week-chart-tab').forEach(b => b.classList.toggle('active', b.dataset.year === String(year)));
    }

    tabsEl.addEventListener('click', e => {
      const btn = e.target.closest('.week-chart-tab');
      if (btn) renderChart(btn.dataset.year);
    });

    // Default to most recent season with data
    renderChart(yearList[0]);
  } else if (tabsEl && bodyEl) {
    bodyEl.innerHTML = '<p style="color:var(--text-muted);padding:1rem 0">No weekly data available — re-run fetch_league_data.py to populate.</p>';
  }

  // ── HELPER FUNCTIONS ─────────────────────────
  function statPill(label, value, sub) {
    return `
      <div class="card">
        <div class="card-title">${label}</div>
        <div class="stat-number">${value}</div>
        <div class="stat-sub">${sub}</div>
      </div>
    `;
  }

  function highlightCard(label, value, team, year, iconHtml, color = 'gold') {
    return `
      <div class="team-highlight-card">
        <div class="icon-wrap icon-wrap-sm iw-${color}">${iconHtml}</div>
        <div class="card-title">${label}</div>
        <div style="font-size:1.2rem;font-weight:800;color:var(--accent-gold)">${value}</div>
        <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:0.2rem">${team}</div>
        <div style="font-size:0.7rem;color:var(--text-muted)">${year}</div>
      </div>
    `;
  }

  function h2hMiniCard(r, isGood) {
    const color = isGood ? 'var(--win)' : 'var(--loss)';
    return `
      <div class="h2h-mini-card">
        <span class="owner-cell" style="font-size:0.85rem">${Utils.shortOwner(r.opp)}</span>
        <span style="color:${color};font-weight:700;font-size:0.85rem">${r.w}–${r.l}</span>
        <span style="color:var(--text-muted);font-size:0.75rem">${(r.pct * 100).toFixed(0)}%</span>
      </div>
    `;
  }

  function ordinal(n) {
    if (!n || n === 'N/A') return '—';
    const s = ['th','st','nd','rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

})();
