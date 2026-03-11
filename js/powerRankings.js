/* =============================================
   powerRankings.js — Power Rankings page logic
   Formula: (pf * 2) + (pf * winPct) + (pf * medianWinPct)
   Regular season weeks only (matchup_type === 'NONE')
   ============================================= */

(() => {
  try {
    const yearSel  = document.getElementById('yearSelect');
    const weekSel  = document.getElementById('weekSelect');
    const content  = document.getElementById('rankingsContent');

    // ── Populate year selector ───────────────────────────────────────────────
    const seasons = Utils.getSeasons(); // sorted oldest → newest
    if (!seasons.length) {
      content.innerHTML = '<p class="loading">No season data found.</p>';
      return;
    }

    // Newest first
    const seasonsSorted = [...seasons].reverse();
    seasonsSorted.forEach(([year]) => {
      const opt = document.createElement('option');
      opt.value = year;
      opt.textContent = year;
      yearSel.appendChild(opt);
    });

    // ── Helpers ──────────────────────────────────────────────────────────────

    /** Get all regular-season weeks for a given year, sorted ascending */
    function getRegSeasonWeeks(year) {
      const season = LEAGUE_DATA[year];
      if (!season || !season.matchups) return [];
      const weeks = new Set();
      for (const m of season.matchups) {
        if (m.matchup_type === 'NONE' && m.home_score != null && m.away_score != null) {
          weeks.add(m.week);
        }
      }
      return [...weeks].sort((a, b) => a - b);
    }

    /** Populate the week selector for a given year */
    function populateWeeks(year) {
      weekSel.innerHTML = '';
      const weeks = getRegSeasonWeeks(year);
      weeks.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w;
        opt.textContent = `Week ${w}`;
        weekSel.appendChild(opt);
      });
      // Default to the latest week
      if (weeks.length) weekSel.value = weeks[weeks.length - 1];
      return weeks;
    }

    /** Build team→owner lookup for a given year */
    function buildTeamOwnerMapForYear(year) {
      const season = LEAGUE_DATA[year];
      if (!season || !season.teams) return {};
      const map = {};
      for (const t of season.teams) {
        map[t.team_name.trim()] = Utils.normalizeName(t.owner);
      }
      return map;
    }

    /**
     * Compute power rankings for a season through a given week (inclusive).
     * Returns array of team objects sorted by prScore desc (then pf desc).
     */
    function computeRankings(year, throughWeek) {
      const season = LEAGUE_DATA[year];
      if (!season) return [];

      const teamOwnerMap = buildTeamOwnerMapForYear(year);

      // Initialize stats from season.teams so every team appears
      const stats = {};
      for (const t of (season.teams || [])) {
        const name = t.team_name.trim();
        const owner = Utils.normalizeName(t.owner);
        stats[name] = {
          teamName: name,
          owner,
          pf: 0,
          maxPF: 0,
          wins: 0,
          losses: 0,
          medianWins: 0,
          medianLosses: 0,
        };
      }

      // Process each regular-season week up to throughWeek
      const matchupsByWeek = {};
      for (const m of (season.matchups || [])) {
        if (m.matchup_type !== 'NONE') continue;
        if (m.home_score == null || m.away_score == null) continue;
        if (m.week > throughWeek) continue;
        if (!matchupsByWeek[m.week]) matchupsByWeek[m.week] = [];
        matchupsByWeek[m.week].push(m);
      }

      for (const [, weekMatchups] of Object.entries(matchupsByWeek)) {
        // Collect all scores for this week to compute median
        const allScores = [];
        for (const m of weekMatchups) {
          allScores.push(m.home_score, m.away_score);
        }
        allScores.sort((a, b) => a - b);

        let median;
        const n = allScores.length;
        if (n === 0) {
          median = 0;
        } else if (n % 2 === 1) {
          median = allScores[Math.floor(n / 2)];
        } else {
          median = (allScores[n / 2 - 1] + allScores[n / 2]) / 2;
        }

        // Accumulate stats for each team
        for (const m of weekMatchups) {
          const homeName = m.home_team ? m.home_team.trim() : null;
          const awayName = m.away_team ? m.away_team.trim() : null;

          // If team not in stats (edge case), skip
          if (homeName && stats[homeName]) {
            stats[homeName].pf          += m.home_score;
            stats[homeName].maxPF       += (m.home_max_pf || 0);
            if (m.home_score > m.away_score) {
              stats[homeName].wins++;
            } else {
              stats[homeName].losses++;
            }
            if (m.home_score > median) {
              stats[homeName].medianWins++;
            } else {
              stats[homeName].medianLosses++;
            }
          }

          if (awayName && stats[awayName]) {
            stats[awayName].pf          += m.away_score;
            stats[awayName].maxPF       += (m.away_max_pf || 0);
            if (m.away_score > m.home_score) {
              stats[awayName].wins++;
            } else {
              stats[awayName].losses++;
            }
            if (m.away_score > median) {
              stats[awayName].medianWins++;
            } else {
              stats[awayName].medianLosses++;
            }
          }
        }
      }

      // Compute PR score for each team
      const teams = Object.values(stats).map(t => {
        const totalGames    = t.wins + t.losses;
        const totalMedian   = t.medianWins + t.medianLosses;
        const winPct        = totalGames  > 0 ? t.wins       / totalGames  : 0;
        const medianWinPct  = totalMedian > 0 ? t.medianWins / totalMedian : 0;
        const prScore = (t.pf * 2) + (t.pf * winPct) + (t.pf * medianWinPct);
        return { ...t, winPct, medianWinPct, prScore, maxPF: t.maxPF };
      });

      // Sort: prScore desc, then pf desc for ties
      teams.sort((a, b) => {
        if (Math.abs(b.prScore - a.prScore) > 0.0001) return b.prScore - a.prScore;
        return b.pf - a.pf;
      });

      // Assign ranks (1-based)
      teams.forEach((t, i) => { t.rank = i + 1; });

      return teams;
    }

    /** Render the rankings table into #rankingsContent */
    function renderRankings(year, week) {
      const currRankings = computeRankings(year, week);

      // Compute previous week rankings for change arrows
      let prevRankMap = null;
      if (week > 1) {
        const prevRankings = computeRankings(year, week - 1);
        prevRankMap = {};
        for (const t of prevRankings) {
          prevRankMap[t.teamName] = t.rank;
        }
      }

      if (!currRankings.length) {
        content.innerHTML = '<p class="loading">No data available for this selection.</p>';
        return;
      }

      // Build table HTML
      let rows = '';
      for (const t of currRankings) {
        // Rank number cell styling
        let rankClass = 'rank-num-cell';
        if (t.rank === 1) rankClass += ' rank-1-cell';
        else if (t.rank === 2) rankClass += ' rank-2-cell';
        else if (t.rank === 3) rankClass += ' rank-3-cell';

        // Change cell
        let changeHtml = '<span class="change-neutral">&mdash;</span>';
        if (prevRankMap !== null && prevRankMap[t.teamName] != null) {
          const prevRank = prevRankMap[t.teamName];
          const delta = prevRank - t.rank; // positive = moved up
          if (delta > 0) {
            changeHtml = `<span class="change-up">&#9650;${delta}</span>`;
          } else if (delta < 0) {
            changeHtml = `<span class="change-down">&#9660;${Math.abs(delta)}</span>`;
          } else {
            changeHtml = '<span class="change-neutral">&mdash;</span>';
          }
        }

        // Record display
        const record      = `${t.wins}&ndash;${t.losses}`;
        const medianRec   = `(${t.medianWins}&ndash;${t.medianLosses} vs median)`;

        // PR score display
        const prDisplay  = Utils.fmt(t.prScore, 2);
        const pfDisplay  = Utils.fmt(t.pf, 2);
        const maxDisplay = Utils.fmt(t.maxPF, 2);
        const totalGames = t.wins + t.losses;
        const pfgDisplay = Utils.fmt(totalGames > 0 ? t.pf / totalGames : 0, 2);

        // Owner URL encode
        const ownerEnc = encodeURIComponent(t.owner);

        rows += `
          <tr class="pr-row" data-owner="${ownerEnc}" style="cursor:pointer;">
            <td class="${rankClass}">${t.rank}</td>
            <td>
              <div class="owner-cell">${t.teamName}</div>
              <div style="font-size:0.78rem;color:var(--text-muted);margin-top:0.1rem;">${Utils.shortOwner(t.owner)}</div>
            </td>
            <td>
              <div>${record}</div>
              <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.1rem;">${medianRec}</div>
            </td>
            <td class="num">${pfgDisplay}</td>
            <td class="num">${pfDisplay}</td>
            <td class="num">${maxDisplay}</td>
            <td class="num" style="font-weight:700;color:var(--accent-gold);">${prDisplay}</td>
            <td class="num">${changeHtml}</td>
          </tr>`;
      }

      content.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="text-align:center;">#</th>
                <th>Team</th>
                <th>Record</th>
                <th class="num">PF/G</th>
                <th class="num">Pts For</th>
                <th class="num">Max PF</th>
                <th class="num">PR Score</th>
                <th class="num">Change</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>`;

      // Row click → team page
      content.querySelectorAll('.pr-row').forEach(row => {
        row.addEventListener('click', () => {
          window.location.href = `team.html?owner=${row.dataset.owner}`;
        });
      });
    }

    // ── Chart ─────────────────────────────────────────────────────────────────

    const CHART_COLORS = [
      '#c9a227','#e07b7b','#7baee0','#7bcca0','#b39ddb',
      '#e0a87b','#7bcfcb','#e07bb5','#d4c97a','#7bd4e0',
      '#e09a7b','#a3c97b','#9db3cc','#c4a07b',
    ];

    /** Monotone cubic interpolation (Fritsch-Carlson) — never overshoots between points */
    function monotonePath(pts) {
      if (pts.length < 2) return '';
      const n = pts.length;
      const dx = [], dy = [], m = [], t = [];

      for (let i = 0; i < n - 1; i++) {
        dx[i] = pts[i + 1].x - pts[i].x;
        dy[i] = pts[i + 1].y - pts[i].y;
        m[i]  = dy[i] / dx[i];
      }

      t[0]     = m[0];
      t[n - 1] = m[n - 2];
      for (let i = 1; i < n - 1; i++) {
        t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
      }

      for (let i = 0; i < n - 1; i++) {
        if (Math.abs(m[i]) < 1e-10) { t[i] = t[i + 1] = 0; continue; }
        const a = t[i] / m[i], b = t[i + 1] / m[i];
        const s = a * a + b * b;
        if (s > 9) {
          const tau = 3 / Math.sqrt(s);
          t[i]     = tau * a * m[i];
          t[i + 1] = tau * b * m[i];
        }
      }

      const segs = [`M ${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`];
      for (let i = 0; i < n - 1; i++) {
        const cp1x = pts[i].x     + dx[i] / 3;
        const cp1y = pts[i].y     + t[i]     * dx[i] / 3;
        const cp2x = pts[i + 1].x - dx[i] / 3;
        const cp2y = pts[i + 1].y - t[i + 1] * dx[i] / 3;
        segs.push(`C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${pts[i+1].x.toFixed(2)},${pts[i+1].y.toFixed(2)}`);
      }
      return segs.join(' ');
    }

    function renderChart(year) {
      const chartEl = document.getElementById('rankingsChart');
      if (!chartEl) return;

      // Clean up previous tooltip
      if (chartEl._tooltip) { chartEl._tooltip.remove(); chartEl._tooltip = null; }

      const allWeeks = getRegSeasonWeeks(year);
      if (allWeeks.length < 2) { chartEl.innerHTML = ''; return; }

      // Compute rank per team per week
      const teamSeries = {}; // teamName -> [{week, rank}]
      for (const week of allWeeks) {
        const rankings = computeRankings(year, week);
        for (const t of rankings) {
          if (!teamSeries[t.teamName]) teamSeries[t.teamName] = [];
          teamSeries[t.teamName].push({ week, rank: t.rank });
        }
      }

      const teamNames = Object.keys(teamSeries);
      const numTeams  = teamNames.length;
      const numWeeks  = allWeeks.length;

      // Layout
      const M = { top: 24, right: 170, bottom: 38, left: 38 };
      const innerW = Math.max(560, numWeeks * 64);
      const innerH = Math.max(280, numTeams * 38);
      const totalW = innerW + M.left + M.right;
      const totalH = innerH + M.top  + M.bottom;

      const xScale = w  => M.left + (allWeeks.indexOf(w) / (numWeeks - 1)) * innerW;
      const yScale = rk => M.top  + ((rk - 1) / (numTeams - 1)) * innerH;

      // Grid
      let grid = '';
      for (let r = 1; r <= numTeams; r++) {
        const y = yScale(r).toFixed(2);
        grid += `<line x1="${M.left}" y1="${y}" x2="${(M.left+innerW).toFixed(2)}" y2="${y}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`;
        grid += `<text x="${(M.left-8).toFixed(2)}" y="${y}" text-anchor="end" dominant-baseline="middle" fill="#5a6a88" font-size="11" font-family="Barlow Condensed,sans-serif">${r}</text>`;
      }
      for (const w of allWeeks) {
        const x = xScale(w).toFixed(2);
        grid += `<line x1="${x}" y1="${M.top}" x2="${x}" y2="${(M.top+innerH).toFixed(2)}" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>`;
        grid += `<text x="${x}" y="${(M.top+innerH+20).toFixed(2)}" text-anchor="middle" fill="#5a6a88" font-size="11" font-family="Barlow Condensed,sans-serif">Wk ${w}</text>`;
      }

      // Axis label
      const midY = (M.top + innerH / 2).toFixed(2);
      const axX  = (M.left - 28).toFixed(2);
      grid += `<text x="${axX}" y="${midY}" text-anchor="middle" fill="#5a6a88" font-size="11" font-family="Barlow Condensed,sans-serif" transform="rotate(-90,${axX},${midY})">Rank</text>`;

      // Lines, dots, labels
      let lines = '', dots = '', labels = '';
      teamNames.forEach((name, ti) => {
        const color = CHART_COLORS[ti % CHART_COLORS.length];
        const pts   = teamSeries[name].map(d => ({ x: xScale(d.week), y: yScale(d.rank), week: d.week, rank: d.rank }));
        const tid   = String(ti);

        lines += `<path class="prc-line" data-tid="${tid}" d="${monotonePath(pts)}" stroke="${color}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;

        for (const p of pts) {
          dots += `<circle class="prc-dot" data-tid="${tid}" data-name="${name}" data-week="${p.week}" data-rank="${p.rank}" cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="5.5" fill="#070b12" stroke="${color}" stroke-width="2.2"/>`;
        }

        const last = pts[pts.length - 1];
        labels += `<text class="prc-label" data-tid="${tid}" x="${(last.x+14).toFixed(2)}" y="${last.y.toFixed(2)}" dominant-baseline="middle" fill="${color}" font-size="12" font-family="Barlow Condensed,sans-serif" font-weight="600" style="cursor:pointer;">${name}</text>`;
      });

      chartEl.innerHTML = `
        <div style="background:linear-gradient(160deg,var(--bg-card) 60%,#111928);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1.5rem;">
          <div class="section-title" style="margin-bottom:0.5rem;">
            <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            Power Rank by Week
          </div>
          <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:1.25rem;">Hover a line or name to highlight that team's trajectory</p>
          <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;">
            <svg id="prChartSvg" viewBox="0 0 ${totalW} ${totalH}" xmlns="http://www.w3.org/2000/svg" style="min-width:${Math.min(totalW,600)}px;width:100%;">
              ${grid}${lines}${dots}${labels}
            </svg>
          </div>
        </div>`;

      // Tooltip
      const tip = document.createElement('div');
      tip.style.cssText = 'position:fixed;background:#0d1421;border:1px solid rgba(201,162,39,0.35);border-radius:6px;padding:7px 12px;font-size:0.8rem;color:#e2e8f0;pointer-events:none;opacity:0;transition:opacity 0.12s;z-index:200;font-family:Barlow,sans-serif;white-space:nowrap;';
      document.body.appendChild(tip);
      chartEl._tooltip = tip;

      const svgEl  = document.getElementById('prChartSvg');
      const allLines  = svgEl.querySelectorAll('.prc-line');
      const allDots   = svgEl.querySelectorAll('.prc-dot');
      const allLabels = svgEl.querySelectorAll('.prc-label');

      function hi(tid) {
        allLines.forEach(el  => { el.style.opacity = el.dataset.tid === tid ? '1' : '0.07'; el.style.strokeWidth = el.dataset.tid === tid ? '3' : '1.5'; });
        allDots.forEach(el   => { el.style.opacity = el.dataset.tid === tid ? '1' : '0.07'; });
        allLabels.forEach(el => { el.style.opacity = el.dataset.tid === tid ? '1' : '0.15'; el.style.fontWeight = el.dataset.tid === tid ? '700' : '400'; });
      }
      function lo() {
        allLines.forEach(el  => { el.style.opacity = '1'; el.style.strokeWidth = '2.2'; });
        allDots.forEach(el   => { el.style.opacity = '1'; });
        allLabels.forEach(el => { el.style.opacity = '1'; el.style.fontWeight = '600'; });
        tip.style.opacity = '0';
      }

      allLines.forEach(el => {
        el.style.cursor = 'pointer';
        el.addEventListener('mouseenter', () => hi(el.dataset.tid));
        el.addEventListener('mouseleave', lo);
      });
      allLabels.forEach(el => {
        el.addEventListener('mouseenter', () => hi(el.dataset.tid));
        el.addEventListener('mouseleave', lo);
      });
      allDots.forEach(el => {
        el.addEventListener('mouseenter', e => {
          hi(el.dataset.tid);
          tip.innerHTML = `<strong>${el.dataset.name}</strong><br>Week ${el.dataset.week} &mdash; Rank #${el.dataset.rank}`;
          tip.style.opacity = '1';
        });
        el.addEventListener('mousemove', e => {
          tip.style.left = (e.clientX + 14) + 'px';
          tip.style.top  = (e.clientY - 10) + 'px';
        });
        el.addEventListener('mouseleave', lo);
      });
    }

    // ── Wire up selectors ────────────────────────────────────────────────────

    function onYearChange() {
      const year = yearSel.value;
      populateWeeks(year);
      renderRankings(year, parseInt(weekSel.value, 10));
      renderChart(year);
    }

    function onWeekChange() {
      renderRankings(yearSel.value, parseInt(weekSel.value, 10));
    }

    yearSel.addEventListener('change', onYearChange);
    weekSel.addEventListener('change', onWeekChange);

    // ── Initial render ───────────────────────────────────────────────────────
    const defaultYear = seasonsSorted[0][0]; // most recent year
    yearSel.value = defaultYear;
    populateWeeks(defaultYear);
    renderRankings(defaultYear, parseInt(weekSel.value, 10));
    renderChart(defaultYear);

  } catch (err) {
    const content = document.getElementById('rankingsContent');
    if (content) {
      content.innerHTML = `<div class="loading" style="color:var(--loss);">
        <strong>Error loading power rankings:</strong><br>${err.message}
      </div>`;
    }
    console.error('[powerRankings]', err);
  }
})();
