/* =============================================
   standings.js — All-Time Standings
   ============================================= */

(function () {
  const ownerStats   = Utils.getOwnerStats();
  const streakMap    = Utils.getStreakMap();
  const crownMap     = Utils.getAragornCrownMap(); // { year: { owner, teamName } }
  // Build per-owner crown count
  const crownCounts  = {};
  for (const { owner } of Object.values(crownMap)) {
    crownCounts[owner] = (crownCounts[owner] || 0) + 1;
  }

  // Sort: titles desc → win% desc → wins desc
  ownerStats.sort((a, b) => {
    if (b.titles !== a.titles) return b.titles - a.titles;
    const wpA = a.wins / (a.wins + a.losses + a.ties) || 0;
    const wpB = b.wins / (b.wins + b.losses + b.ties) || 0;
    if (Math.abs(wpB - wpA) > 0.001) return wpB - wpA;
    return b.wins - a.wins;
  });

  // ── PODIUM (Top 3) ────────────────────────────
  const podiumCfg = [
    { order: 1, label: '2nd Place', avatarCls: 'sa-silver', borderCls: 'podium-silver' },
    { order: 0, label: '1st Place', avatarCls: 'sa-gold',   borderCls: 'podium-gold'   },
    { order: 2, label: '3rd Place', avatarCls: 'sa-bronze', borderCls: 'podium-bronze' },
  ];

  const podiumHtml = `
    <div class="standings-podium">
      ${podiumCfg.map(({ order, label, avatarCls, borderCls }) => {
        const o = ownerStats[order];
        if (!o) return '';
        const total = o.wins + o.losses + o.ties;
        const wpct  = total ? ((o.wins + o.ties * 0.5) / total * 100).toFixed(1) : '0.0';
        const initial = o.owner.charAt(0).toUpperCase();
        const logoUrl = (typeof TEAM_LOGOS !== 'undefined') ? TEAM_LOGOS[o.owner] : null;
        const trophyHtml = o.titles > 0
          ? `<div class="podium-titles">${Array(o.titles).fill(`<span class="badge">${Icons.trophy({ size: 11 })}</span>`).join(' ')}</div>`
          : '';
        const crownCount = crownCounts[o.owner] || 0;
        const crownHtml = crownCount > 0
          ? `<div class="podium-titles">${Array(crownCount).fill(`<span class="badge badge-silver">${Icons.aragornCrown({ size: 11 })}</span>`).join(' ')}</div>`
          : '';
        return `
          <a class="podium-card ${borderCls}" href="team.html?owner=${encodeURIComponent(Utils.shortOwner(o.owner))}">
            <div class="podium-label">${label}</div>
            <div class="podium-avatar ${avatarCls}">${logoUrl ? `<img src="${logoUrl}" alt="${initial}" onerror="this.style.display='none'">` : ''}${initial}</div>
            <div class="podium-name">${Utils.shortOwner(o.owner)}</div>
            <div class="podium-team">${o.latestTeam || o.teamNames[0]}</div>
            ${trophyHtml}
            ${crownHtml}
            <div class="podium-stats">
              <div class="podium-stat-item">
                <div class="podium-stat-val" style="color:var(--win)">${o.wins}</div>
                <div class="podium-stat-lbl">Wins</div>
              </div>
              <div class="podium-stat-item">
                <div class="podium-stat-val">${wpct}%</div>
                <div class="podium-stat-lbl">Win%</div>
              </div>
              <div class="podium-stat-item">
                <div class="podium-stat-val">${o.seasons}</div>
                <div class="podium-stat-lbl">Seasons</div>
              </div>
            </div>
          </a>
        `;
      }).join('')}
    </div>
  `;
  document.getElementById('standingsPodium').innerHTML = podiumHtml;

  // ── FULL TABLE ────────────────────────────────
  const rows = ownerStats.map((o, i) => {
    const total  = o.wins + o.losses + o.ties;
    const wpct   = total ? ((o.wins + o.ties * 0.5) / total) : 0;
    const wpctPct = (wpct * 100).toFixed(1);
    const diff   = o.pf - o.pa;
    const diffStr = (diff >= 0 ? '+' : '') + Utils.fmt(diff, 2);
    const diffColor = diff >= 0 ? 'var(--win)' : 'var(--loss)';

    // Rank badge
    const rankBadge = i < 3
      ? `<span class="rank-medal rank-${i + 1}">${i + 1}</span>`
      : `<span class="rank-num">${i + 1}</span>`;

    // Avatar color
    const avatarCls = i === 0 ? 'sa-gold' : i === 1 ? 'sa-silver' : i === 2 ? 'sa-bronze' : 'sa-default';
    const initial   = o.owner.charAt(0).toUpperCase();
    const logoUrl   = (typeof TEAM_LOGOS !== 'undefined') ? TEAM_LOGOS[o.owner] : null;
    const isActive  = Utils.isActive(o.owner);
    const streak    = streakMap[o.owner];
    const streakHtml = streak
      ? `<span class="streak-badge streak-${streak.type === 'W' ? 'win' : 'loss'}">${streak.type}${streak.length}</span>`
      : '<span style="color:var(--text-muted)">—</span>';

    // Title badges
    const titlesHtml = o.titles > 0
      ? Array(o.titles).fill(`<span class="badge">${Icons.trophy({ size: 11 })}</span>`).join(' ')
      : '<span style="color:var(--text-muted)">—</span>';

    // Aragorn Crown badges
    const ownerCrowns = crownCounts[o.owner] || 0;
    const crownsHtml = ownerCrowns > 0
      ? Array(ownerCrowns).fill(`<span class="badge badge-silver">${Icons.aragornCrown({ size: 11 })}</span>`).join(' ')
      : '<span style="color:var(--text-muted)">—</span>';

    const teamName = o.latestTeam || o.teamNames[o.teamNames.length - 1];

    const ownerUrl = `team.html?owner=${encodeURIComponent(Utils.shortOwner(o.owner))}`;
    return `
      <tr class="standings-row" onclick="window.location='${ownerUrl}'" tabindex="0" role="link" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.location='${ownerUrl}';}">
        <td class="num">${rankBadge}</td>
        <td>
          <div class="standings-player">
            <div class="standings-avatar ${avatarCls}">${logoUrl ? `<img src="${logoUrl}" alt="${initial}" onerror="this.style.display='none'">` : ''}${initial}</div>
            <div>
              <div class="standings-name">${Utils.shortOwner(o.owner)}</div>
              ${!isActive ? '<div class="standings-alumni">Alumni</div>' : ''}
            </div>
          </div>
        </td>
        <td class="teams-cell">${teamName}</td>
        <td class="num">${o.seasons}</td>
        <td class="num" style="color:var(--win);font-weight:600">${o.wins}</td>
        <td class="num" style="color:var(--loss)">${o.losses}</td>
        <td class="num">
          <div class="winpct-cell">
            <div class="winpct-bar-wrap">
              <div class="winpct-bar" style="width:${wpctPct}%"></div>
            </div>
            <span class="win-pct">${wpctPct}%</span>
          </div>
        </td>
        <td class="num">${Utils.fmt(o.pf, 2)}</td>
        <td class="num">${Utils.fmt(o.pa, 2)}</td>
        <td class="num" style="color:${diffColor};font-weight:600">${diffStr}</td>
        <td>${titlesHtml}</td>
        <td>${crownsHtml}</td>
        <td class="num">${streakHtml}</td>
      </tr>
    `;
  }).join('');

  document.getElementById('standingsTable').innerHTML = `
    <table>
      <thead>
        <tr>
          <th class="num" scope="col">#</th>
          <th scope="col">Manager</th>
          <th scope="col">Current Team</th>
          <th class="num" scope="col">Seasons</th>
          <th class="num" scope="col">W</th>
          <th class="num" scope="col">L</th>
          <th class="num" scope="col">Win%</th>
          <th class="num" scope="col">PF</th>
          <th class="num" scope="col">PA</th>
          <th class="num" scope="col">+/−</th>
          <th scope="col">Titles</th>
          <th scope="col">Aragorn Crown</th>
          <th class="num" scope="col">Streak</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

})();
