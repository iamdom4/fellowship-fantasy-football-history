/* =============================================
   rivalries.js — Head-to-Head Rivalries
   ============================================= */

(function () {
  const owners = Utils.getAllOwners();
  const matchups = Utils.getAllMatchups();

  // ── BUILD PER-PAIR STATS ──────────────────────
  const pairs = {};

  for (const m of matchups) {
    const a = m.home_owner;
    const b = m.away_owner;
    if (!a || !b || a === b) continue;
    if (m.home_score <= 0 && m.away_score <= 0) continue;

    const key = [a, b].sort().join('||');
    const [n1, n2] = key.split('||');

    if (!pairs[key]) {
      pairs[key] = { owner1: n1, owner2: n2, w1: 0, l1: 0, pf1: 0, pf2: 0, games: 0, lastYear: 0 };
    }

    const p = pairs[key];
    p.games++;
    if (m.year > p.lastYear) p.lastYear = m.year;

    const [score1, score2] = a === n1
      ? [m.home_score, m.away_score]
      : [m.away_score, m.home_score];

    p.pf1 += score1;
    p.pf2 += score2;
    if (score1 > score2) p.w1++;
    else if (score2 > score1) p.l1++;
  }

  // ── COMPUTE DERIVED STATS ────────────────────
  const rivalries = Object.values(pairs)
    .filter(p => p.games >= 3)
    .map(p => {
      const w2 = p.l1;
      const l2 = p.w1;
      const winPct1 = p.games ? p.w1 / p.games : 0.5;
      const winPct2 = 1 - winPct1;
      const avgPf1 = p.games ? p.pf1 / p.games : 0;
      const avgPf2 = p.games ? p.pf2 / p.games : 0;
      const diff = Math.abs(winPct1 - 0.5);
      const avgCombined = avgPf1 + avgPf2;

      let label, labelColor;
      if (diff < 0.051) { label = 'DEAD EVEN';   labelColor = 'blue'; }
      else if (diff < 0.15) { label = 'COMPETITIVE'; labelColor = 'green'; }
      else if (diff < 0.30) { label = 'ONE-SIDED';   labelColor = 'gold'; }
      else                   { label = 'DOMINATED';   labelColor = 'red'; }

      return { ...p, w2, l2, winPct1, winPct2, avgPf1, avgPf2, avgCombined, label, labelColor };
    })
    .sort((a, b) => b.games - a.games || b.avgCombined - a.avgCombined);

  if (!rivalries.length) {
    document.getElementById('rivalriesGrid').innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:3rem">Not enough matchup data yet.</p>';
    return;
  }

  // ── FEATURED RIVALRY ────────────────────────
  const featured = rivalries[0];
  document.getElementById('featuredRivalry').innerHTML = renderFeaturedCard(featured);

  // ── RIVALRIES GRID ──────────────────────────
  document.getElementById('rivalriesGrid').innerHTML = rivalries.slice(1).map(renderCard).join('');

  // ── RIVALRY STATS ───────────────────────────
  const highestScoring = [...rivalries].sort((a, b) => b.avgCombined - a.avgCombined)[0];
  const mostLopsided   = [...rivalries].filter(r => r.games >= 5).sort((a, b) => Math.abs(b.winPct1 - 0.5) - Math.abs(a.winPct1 - 0.5))[0];
  const mostGames      = rivalries[0]; // already sorted by games

  const statCards = [
    {
      icon: Icons.flame({ size: 20 }), color: 'gold',
      label: 'Highest Scoring',
      owners: `${Utils.shortOwner(highestScoring.owner1)} vs ${Utils.shortOwner(highestScoring.owner2)}`,
      stat: `${Utils.fmt(highestScoring.avgCombined)} avg combined pts`,
    },
    {
      icon: Icons.zap({ size: 20 }), color: 'green',
      label: 'Most Played',
      owners: `${Utils.shortOwner(mostGames.owner1)} vs ${Utils.shortOwner(mostGames.owner2)}`,
      stat: `${mostGames.games} total matchups`,
    },
    ...(mostLopsided ? [{
      icon: Icons.trendUp({ size: 20 }), color: 'red',
      label: 'Most Lopsided',
      owners: `${Utils.shortOwner(mostLopsided.owner1)} vs ${Utils.shortOwner(mostLopsided.owner2)}`,
      stat: `${(Math.max(mostLopsided.winPct1, mostLopsided.winPct2) * 100).toFixed(0)}% win rate`,
    }] : []),
  ];

  document.getElementById('rivalryStats').innerHTML = statCards.map(s => `
    <div class="rivalry-stat-card">
      <div class="icon-wrap iw-${s.color} icon-wrap-sm">${s.icon}</div>
      <div>
        <div class="rivalry-stat-label">${s.label}</div>
        <div class="rivalry-stat-owners">${s.owners}</div>
        <div class="rivalry-stat-value">${s.stat}</div>
      </div>
    </div>
  `).join('');

  // ── RENDER HELPERS ───────────────────────────
  function renderFeaturedCard(r) {
    const leader = r.winPct1 >= r.winPct2 ? r.owner1 : r.owner2;
    const [w1, l1, pct1, avg1] = [r.w1, r.l1, r.winPct1, r.avgPf1];
    const [w2, l2, pct2, avg2] = [r.w2, r.l2, r.winPct2, r.avgPf2];
    const barW1 = Math.round(pct1 * 100);
    const barW2 = 100 - barW1;
    return `
      <div class="rivalry-card rivalry-card-featured">
        <div class="rivalry-badge rivalry-badge-${r.labelColor}">${r.label}</div>
        <div class="rivalry-game-count">${r.games} matchups</div>
        <div class="rivalry-matchup">
          <div class="rivalry-owner rivalry-owner-left">
            <div class="rivalry-name">${Utils.shortOwner(r.owner1)}</div>
            <div class="rivalry-record">${w1}–${l1}</div>
            <div class="rivalry-avg">${Utils.fmt(avg1)} avg</div>
          </div>
          <div class="rivalry-vs">VS</div>
          <div class="rivalry-owner rivalry-owner-right">
            <div class="rivalry-name">${Utils.shortOwner(r.owner2)}</div>
            <div class="rivalry-record">${w2}–${l2}</div>
            <div class="rivalry-avg">${Utils.fmt(avg2)} avg</div>
          </div>
        </div>
        <div class="rivalry-bar-wrap">
          <div class="rivalry-bar">
            <div class="rivalry-bar-fill rivalry-bar-left" style="width:${barW1}%"></div>
            <div class="rivalry-bar-fill rivalry-bar-right" style="width:${barW2}%"></div>
          </div>
          <div class="rivalry-bar-labels">
            <span>${barW1}%</span>
            <span>${barW2}%</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderCard(r) {
    const [w1, l1, pct1, avg1] = [r.w1, r.l1, r.winPct1, r.avgPf1];
    const [w2, l2, pct2, avg2] = [r.w2, r.l2, r.winPct2, r.avgPf2];
    const barW1 = Math.round(pct1 * 100);
    const barW2 = 100 - barW1;
    return `
      <div class="rivalry-card">
        <div class="rivalry-card-top">
          <div class="rivalry-badge rivalry-badge-sm rivalry-badge-${r.labelColor}">${r.label}</div>
          <div class="rivalry-game-count">${r.games} games</div>
        </div>
        <div class="rivalry-matchup">
          <div class="rivalry-owner rivalry-owner-left">
            <div class="rivalry-name">${Utils.shortOwner(r.owner1)}</div>
            <div class="rivalry-record">${w1}–${l1}</div>
            <div class="rivalry-avg">${Utils.fmt(avg1)}</div>
          </div>
          <div class="rivalry-vs">VS</div>
          <div class="rivalry-owner rivalry-owner-right">
            <div class="rivalry-name">${Utils.shortOwner(r.owner2)}</div>
            <div class="rivalry-record">${w2}–${l2}</div>
            <div class="rivalry-avg">${Utils.fmt(avg2)}</div>
          </div>
        </div>
        <div class="rivalry-bar-wrap">
          <div class="rivalry-bar">
            <div class="rivalry-bar-fill rivalry-bar-left" style="width:${barW1}%"></div>
            <div class="rivalry-bar-fill rivalry-bar-right" style="width:${barW2}%"></div>
          </div>
        </div>
      </div>
    `;
  }

})();
