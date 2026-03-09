/* =============================================
   standings.js — All-Time Standings table
   ============================================= */

(function () {
  const ownerStats = Utils.getOwnerStats();

  // Sort by: titles desc → win% desc → total wins desc
  ownerStats.sort((a, b) => {
    if (b.titles !== a.titles) return b.titles - a.titles;
    const wpA = a.wins / (a.wins + a.losses + a.ties) || 0;
    const wpB = b.wins / (b.wins + b.losses + b.ties) || 0;
    if (Math.abs(wpB - wpA) > 0.001) return wpB - wpA;
    return b.wins - a.wins;
  });

  const rows = ownerStats.map((o, i) => {
    const total = o.wins + o.losses + o.ties;
    const wpct = total ? ((o.wins + o.ties * 0.5) / total) : 0;
    const titlesHtml = o.titles > 0
      ? Array(o.titles).fill('<span class="badge">🏆</span>').join(' ')
      : '<span style="color:var(--text-muted)">—</span>';

    const teamsList = o.latestTeam || o.teamNames[o.teamNames.length - 1];

    return `
      <tr>
        <td class="rank-cell num">${i + 1}</td>
        <td class="owner-cell">${Utils.shortOwner(o.owner)}</td>
        <td class="teams-cell">${teamsList}</td>
        <td class="num">${o.seasons}</td>
        <td class="num" style="color:var(--win)">${o.wins}</td>
        <td class="num" style="color:var(--loss)">${o.losses}</td>
        <td class="num win-pct">${Utils.fmtPct(o.wins, o.losses, o.ties)}</td>
        <td class="num">${Utils.fmt(o.pf)}</td>
        <td class="num">${Utils.fmt(o.pa)}</td>
        <td class="num">${Utils.fmt(o.pf - o.pa)}</td>
        <td>${titlesHtml}</td>
      </tr>
    `;
  }).join('');

  document.getElementById('standingsTable').innerHTML = `
    <table>
      <thead>
        <tr>
          <th class="num">#</th>
          <th>Manager</th>
          <th>Team Name(s)</th>
          <th class="num">Seasons</th>
          <th class="num">W</th>
          <th class="num">L</th>
          <th class="num">Win%</th>
          <th class="num">PF</th>
          <th class="num">PA</th>
          <th class="num">+/-</th>
          <th>Titles</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
})();
