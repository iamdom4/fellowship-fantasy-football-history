/* =============================================
   h2h.js — Head-to-Head Matrix
   ============================================= */

(function () {
  const owners = Utils.getAllOwners();
  const matchups = Utils.getAllMatchups();

  // Build H2H record: records[ownerA][ownerB] = { w, l }
  const records = {};
  for (const o of owners) {
    records[o] = {};
    for (const o2 of owners) records[o][o2] = { w: 0, l: 0 };
  }

  for (const m of matchups) {
    const ho = m.home_owner;
    const ao = m.away_owner;
    if (!ho || !ao || ho === ao) continue;
    if (!records[ho] || !records[ao]) continue;

    if (m.home_score > m.away_score) {
      records[ho][ao].w++;
      records[ao][ho].l++;
    } else if (m.away_score > m.home_score) {
      records[ao][ho].w++;
      records[ho][ao].l++;
    }
  }

  // ── H2H MATRIX ────────────────────────────────
  const shortName = name => Utils.shortOwner(name);

  const headerCols = owners.map(o => `<th title="${o}">${shortName(o)}</th>`).join('');

  const matrixRows = owners.map(rowOwner => {
    const cells = owners.map(colOwner => {
      if (rowOwner === colOwner) return `<td class="h2h-cell-self">—</td>`;
      const { w, l } = records[rowOwner][colOwner];
      if (w + l === 0) return `<td class="h2h-cell-self" style="color:var(--text-muted)">—</td>`;
      const cls = w > l ? 'h2h-cell-win' : w < l ? 'h2h-cell-loss' : 'h2h-cell-even';
      return `<td class="${cls}" title="${rowOwner} vs ${colOwner}">${w}–${l}</td>`;
    }).join('');
    return `<tr><td class="row-label">${rowOwner}</td>${cells}</tr>`;
  }).join('');

  document.getElementById('h2hMatrix').innerHTML = `
    <table class="h2h-table">
      <thead>
        <tr>
          <th style="text-align:left;min-width:120px">Manager</th>
          ${headerCols}
        </tr>
      </thead>
      <tbody>${matrixRows}</tbody>
    </table>
  `;

  // ── H2H SUMMARY TABLE ─────────────────────────
  const summary = owners.map(o => {
    let w = 0, l = 0, opponents = 0;
    for (const o2 of owners) {
      if (o2 === o) continue;
      w += records[o][o2].w;
      l += records[o][o2].l;
      if (records[o][o2].w + records[o][o2].l > 0) opponents++;
    }
    const best = owners
      .filter(o2 => o2 !== o && records[o][o2].w > records[o][o2].l)
      .sort((a, b) => (records[o][b].w - records[o][b].l) - (records[o][a].w - records[o][a].l))[0];
    const worst = owners
      .filter(o2 => o2 !== o && records[o][o2].l > records[o][o2].w)
      .sort((a, b) => (records[o][b].l - records[o][b].w) - (records[o][a].l - records[o][a].w))[0];
    return { owner: o, w, l, opponents, best, worst };
  }).sort((a, b) => {
    const wpa = a.w + a.l ? a.w / (a.w + a.l) : 0;
    const wpb = b.w + b.l ? b.w / (b.w + b.l) : 0;
    return wpb - wpa;
  });

  const summaryRows = summary.map((s, i) => {
    const bestStr  = s.best  ? `${shortName(s.best)} (${records[s.owner][s.best].w}–${records[s.owner][s.best].l})`   : '—';
    const worstStr = s.worst ? `${shortName(s.worst)} (${records[s.owner][s.worst].w}–${records[s.owner][s.worst].l})` : '—';
    return `
      <tr>
        <td class="rank-cell num">${i + 1}</td>
        <td class="owner-cell">${Utils.shortOwner(s.owner)}</td>
        <td class="num" style="color:var(--win)">${s.w}</td>
        <td class="num" style="color:var(--loss)">${s.l}</td>
        <td class="num win-pct">${Utils.fmtPct(s.w, s.l)}</td>
        <td style="color:var(--win);font-size:0.8rem">${bestStr}</td>
        <td style="color:var(--loss);font-size:0.8rem">${worstStr}</td>
      </tr>
    `;
  }).join('');

  document.getElementById('h2hSummary').innerHTML = `
    <table>
      <thead>
        <tr>
          <th class="num">#</th>
          <th>Manager</th>
          <th class="num">W</th>
          <th class="num">L</th>
          <th class="num">Win%</th>
          <th>Best Matchup</th>
          <th>Toughest Opponent</th>
        </tr>
      </thead>
      <tbody>${summaryRows}</tbody>
    </table>
  `;

})();
