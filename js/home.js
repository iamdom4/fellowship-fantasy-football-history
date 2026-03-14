/* =============================================
   home.js — Home page dashboard
   ============================================= */

(function () {
  const seasons      = Utils.getSeasons();
  const matchups     = Utils.getAllMatchups();
  const teamOwnerMap = Utils.buildTeamOwnerMap();
  const ownerStats   = Utils.getOwnerStats();

  // Latest season
  const [latestYear, latestSeason] = seasons[seasons.length - 1];

  // All matchups for latest season
  const latestMatchups = matchups.filter(m => m.year === latestYear);

  // Latest week in latest season
  const latestWeek = latestMatchups.length
    ? Math.max(...latestMatchups.map(m => m.week))
    : 0;
  const latestWeekMatchups = latestMatchups.filter(m => m.week === latestWeek);
  const isPlayoffWeek = latestWeekMatchups.some(m => m.is_playoff);

  // Total stats
  const totalPF       = matchups.reduce((s, m) => s + m.home_score + m.away_score, 0);
  const totalManagers = Utils.getAllOwners().length;

  // Reigning champion
  const champTeam      = latestSeason.champion?.trim() || '—';
  const champOwnerFull = teamOwnerMap[`${latestYear}_${champTeam}`] || '';
  const champOwner     = champOwnerFull ? Utils.shortOwner(champOwnerFull) : '';

  // ── HERO ──────────────────────────────────────
  document.getElementById('hero').innerHTML = `
    <div class="hero-content">
      <div class="hero-eyebrow">
        <span class="hero-season-badge">${latestYear} Season</span>
        ${latestWeek ? `<span style="color:var(--border)">·</span><span>Week ${latestWeek}</span>` : ''}
      </div>
      <h1>The Fellowship<span>of the League</span></h1>
      <div class="hero-meta">
        <div class="hero-meta-item"><div class="val">${seasons.length}</div><div class="lbl">Seasons</div></div>
        <div class="hero-meta-item"><div class="val">${totalManagers}</div><div class="lbl">Managers</div></div>
        <div class="hero-meta-item"><div class="val">${matchups.length}</div><div class="lbl">Matchups</div></div>
        <div class="hero-meta-item"><div class="val">${Math.round(totalPF).toLocaleString()}</div><div class="lbl">Total Points</div></div>
      </div>
    </div>
    ${champTeam !== '—' ? `
    <div class="hero-champ">
      <div class="hero-champ-label">${latestYear} Champion</div>
      <div class="hero-champ-trophy">${Icons.trophy({ size: 30 })}</div>
      <div class="hero-champ-team">${champTeam}</div>
      ${champOwner ? `<div class="hero-champ-owner">${champOwner}</div>` : ''}
    </div>` : ''}
  `;

  // ── SCOREBOARD ────────────────────────────────
  const weekPill = isPlayoffWeek
    ? `<span class="scoreboard-type-pill playoffs">Playoffs</span>`
    : `<span class="scoreboard-type-pill regular">Reg. Season</span>`;

  document.getElementById('scoreboardLabel').innerHTML =
    `Week ${latestWeek} &bull; ${latestYear} ${weekPill}`;

  document.getElementById('scoreboard').innerHTML = latestWeekMatchups.map(m => {
    const homeWon  = m.home_score > m.away_score;
    const awayWon  = m.away_score > m.home_score;
    const margin   = Math.abs(m.home_score - m.away_score).toFixed(1);
    return `
      <div class="matchup-card">
        <div class="matchup-team ${homeWon ? 'matchup-winner' : ''}">
          <span class="matchup-team-name" title="${m.home_team}">${m.home_team}</span>
          <span class="matchup-score ${homeWon ? 'score-win' : 'score-loss'}">${Utils.fmt(m.home_score)}</span>
        </div>
        <div class="matchup-team ${awayWon ? 'matchup-winner' : ''}">
          <span class="matchup-team-name" title="${m.away_team}">${m.away_team}</span>
          <span class="matchup-score ${awayWon ? 'score-win' : 'score-loss'}">${Utils.fmt(m.away_score)}</span>
        </div>
        <div class="matchup-footer">
          <span>${Utils.shortOwner(m.home_owner)} vs ${Utils.shortOwner(m.away_owner)}</span>
          <span class="matchup-footer-margin">${(homeWon || awayWon) ? `+${margin}` : 'TIE'}</span>
        </div>
      </div>
    `;
  }).join('');

  // ── STANDINGS WIDGET ──────────────────────────
  const standings = [...latestSeason.teams]
    .map(t => ({ ...t, pct: (t.wins + t.losses) ? t.wins / (t.wins + t.losses) : 0 }))
    .sort((a, b) => b.pct - a.pct || b.points_for - a.points_for);

  document.getElementById('standingsWidget').innerHTML = standings.map((t, i) => {
    const winColor = t.wins > t.losses
      ? 'var(--win)'
      : t.wins < t.losses ? 'var(--loss)' : 'var(--text-secondary)';
    return `
      <div class="standings-w-row">
        <span class="standings-w-rank">${i + 1}</span>
        <span class="standings-w-team" title="${t.team_name.trim()}">${t.team_name.trim()}</span>
        <span class="standings-w-owner">${Utils.shortOwner(t.owner)}</span>
        <span class="standings-w-record" style="color:${winColor}">${t.wins}–${t.losses}</span>
        <span class="standings-w-pf">${Utils.fmt(t.points_for, 0)}</span>
      </div>
    `;
  }).join('');

  // ── POWER RANKINGS WIDGET ────────────────────
  const prMatchups = matchups.filter(
    m => m.year === latestYear && !m.is_playoff && m.matchup_type === 'NONE'
  );

  const prData = {};
  for (const t of latestSeason.teams) {
    prData[t.team_name.trim()] = {
      team: t.team_name.trim(), owner: t.owner,
      pf: 0, w: 0, l: 0, weeks: 0, medianWins: 0,
    };
  }

  // Group by week for median calculation
  const weekGroups = {};
  for (const m of prMatchups) {
    if (!weekGroups[m.week]) weekGroups[m.week] = [];
    weekGroups[m.week].push(m);
  }

  for (const wkMatchups of Object.values(weekGroups)) {
    const scores = [];
    for (const m of wkMatchups) {
      if (prData[m.home_team]) scores.push(m.home_score);
      if (prData[m.away_team]) scores.push(m.away_score);
    }
    scores.sort((a, b) => a - b);
    const median = scores.length ? scores[Math.floor(scores.length / 2)] : 0;

    for (const m of wkMatchups) {
      const ht = m.home_team, at = m.away_team;
      if (!prData[ht] || !prData[at]) continue;
      prData[ht].pf += m.home_score; prData[ht].weeks++;
      prData[at].pf += m.away_score; prData[at].weeks++;
      if (m.home_score > m.away_score) { prData[ht].w++; prData[at].l++; }
      else if (m.away_score > m.home_score) { prData[at].w++; prData[ht].l++; }
      if (m.home_score > median) prData[ht].medianWins++;
      if (m.away_score > median) prData[at].medianWins++;
    }
  }

  const prRanked = Object.values(prData)
    .map(d => {
      const total = d.w + d.l;
      const winPct      = total ? d.w / total : 0;
      const medianWinPct = d.weeks ? d.medianWins / d.weeks : 0;
      return { ...d, prScore: d.pf * 2 + d.pf * winPct + d.pf * medianWinPct };
    })
    .sort((a, b) => b.prScore - a.prScore || b.pf - a.pf);

  document.getElementById('powerRankingsWidget').innerHTML = prRanked.map((d, i) => `
    <div class="pr-widget-row">
      <span class="pr-rank-num ${i < 3 ? 'top3' : ''}">${i + 1}</span>
      <span class="pr-team-name" title="${d.team}">${d.team}</span>
      <span class="pr-owner">${Utils.shortOwner(d.owner)}</span>
      <span class="pr-score">${Utils.fmt(d.pf, 0)} pts</span>
    </div>
  `).join('');

  // ── ALL-TIME RECORDS TEASER ───────────────────
  let highScore  = { score: 0, team: '', year: '', week: 0 };
  let bigBlowout = { margin: 0, winner: '', year: '', week: 0 };
  const mostTitles = [...ownerStats].sort((a, b) => b.titles - a.titles)[0];

  for (const m of matchups) {
    if (m.home_score > highScore.score)
      highScore = { score: m.home_score, team: m.home_team, year: m.year, week: m.week };
    if (m.away_score > highScore.score)
      highScore = { score: m.away_score, team: m.away_team, year: m.year, week: m.week };
    const margin = Math.abs(m.home_score - m.away_score);
    if (margin > bigBlowout.margin)
      bigBlowout = { margin, winner: m.home_score > m.away_score ? m.home_team : m.away_team, year: m.year, week: m.week };
  }

  document.getElementById('recordsTeaser').innerHTML = [
    { icon: Icons.flame({ size: 18 }),  color: 'gold', val: Utils.fmt(highScore.score), label: 'Highest Score',   sub: `${highScore.team} — ${highScore.year} Wk ${highScore.week}` },
    { icon: Icons.zap({ size: 18 }),    color: 'gold', val: `+${Utils.fmt(bigBlowout.margin)}`, label: 'Biggest Blowout', sub: `${bigBlowout.winner} — ${bigBlowout.year} Wk ${bigBlowout.week}` },
    { icon: Icons.crown({ size: 18 }), color: 'gold', val: mostTitles.titles, label: 'Most Titles', sub: Utils.shortOwner(mostTitles.owner) },
  ].map(r => `
    <div class="record-teaser-item">
      <div class="icon-wrap iw-${r.color} icon-wrap-sm">${r.icon}</div>
      <div class="record-teaser-val">${r.val}</div>
      <div class="record-teaser-info">
        <div class="record-teaser-label">${r.label}</div>
        <div class="record-teaser-holder">${r.sub}</div>
      </div>
    </div>
  `).join('');

  // ── LATEST BLOG POST ──────────────────────────
  const FEED_URL = 'https://rss.beehiiv.com/feeds/FoRgH2KsTV.xml';
  const API_URL  = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(FEED_URL);
  const blogEl   = document.getElementById('latestBlog');

  function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return (tmp.textContent || tmp.innerText || '').trim();
  }
  function authorColor(name) {
    const cols = ['#c9a227','#4ade80','#60a5fa','#f472b6','#fb923c','#a78bfa'];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return cols[Math.abs(h) % cols.length];
  }

  fetch(API_URL)
    .then(r => r.json())
    .then(data => {
      if (data.status !== 'ok' || !data.items?.length) return;
      const post    = data.items[0];
      const date    = new Date(post.pubDate);
      const dateStr = isNaN(date) ? '' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const excerpt = stripHtml(post.description || '').slice(0, 160) + '…';
      const author  = post.author || '';
      const color   = authorColor(author);
      const initial = (author || '?')[0].toUpperCase();
      blogEl.innerHTML = `
        <a href="${post.link || '#'}" class="home-blog-card" target="_blank" rel="noopener">
          <div class="home-blog-meta">${dateStr}</div>
          <div class="home-blog-title">${post.title || 'Latest Post'}</div>
          <div class="home-blog-excerpt">${excerpt}</div>
          ${author ? `<div class="home-blog-author">
            <span class="home-blog-avatar" style="background:${color}">${initial}</span>
            <span class="home-blog-author-name">${author}</span>
          </div>` : ''}
        </a>
        <a href="blog.html" class="home-blog-cta">
          View all posts
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </a>
      `;
    })
    .catch(() => {
      blogEl.innerHTML = `
        <div class="home-blog-meta" style="margin-bottom:0.5rem">Latest Newsletter</div>
        <a href="blog.html" class="home-blog-cta" style="margin-top:0">
          Visit the blog
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </a>
      `;
    });

})();
