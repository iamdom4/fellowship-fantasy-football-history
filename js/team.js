/* =============================================
   team.js — Individual Manager Profile Page
   ============================================= */

(function () {
  const ownerStats   = Utils.getOwnerStats();
  const allMatchups  = Utils.getAllMatchups();
  const seasons      = Utils.getSeasons();
  const teamOwnerMap = Utils.buildTeamOwnerMap();

  // All canonical owners sorted alphabetically
  const allOwners = ownerStats
    .map(o => o.owner)
    .sort((a, b) => a.localeCompare(b));

  // ── POPULATE TEAMS DROPDOWN ──────────────────
  const teamsNav = document.getElementById('teamsDropdownNav');
  if (teamsNav) {
    const params = new URLSearchParams(window.location.search);
    const currentOwner = params.get('owner') || '';
    teamsNav.innerHTML = allOwners.map(o => {
      const active = Utils.isActive(o);
      return `<li><a href="team.html?owner=${encodeURIComponent(o)}"
          class="${o === currentOwner ? 'active' : ''}">
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
    ? (allOwners.find(o => o === requestedOwner) || defaultOwner)
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
