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
      <h1>The Fellowship <span>of the League</span></h1>
    </div>
    ${champTeam !== '—' ? `
    <div class="hero-champ">
      <div class="hero-champ-label">${latestYear} Champion</div>
      <div class="hero-champ-trophy">${Icons.trophy({ size: 30 })}</div>
      <div class="hero-champ-team">${champTeam}</div>
      ${champOwner ? `<div class="hero-champ-owner">${champOwner}</div>` : ''}
    </div>` : ''}
    <div id="heroToiletChamp"></div>
  `;

  // ── SCOREBOARD ────────────────────────────────
  const sbLogos = typeof TEAM_LOGOS !== 'undefined' ? TEAM_LOGOS : {};

  const playoffPill = isPlayoffWeek
    ? `<span class="scoreboard-type-pill playoffs">Playoffs</span>`
    : '';

  // Set title (pill inline, only during playoffs) and clear the label
  document.getElementById('scoreboardTitle').innerHTML =
    `<svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg> Week ${latestWeek} Scoreboard ${playoffPill}`;
  document.getElementById('scoreboardLabel').innerHTML = '';

  // Determine featured matchup
  const sbMatchups = [...latestWeekMatchups];
  let featuredMatchup = null;
  let featuredLabel   = '';

  if (isPlayoffWeek) {
    // Championship: team that is the season champion, or fallback to first WINNERS_BRACKET game
    let idx = champTeam ? sbMatchups.findIndex(m =>
      m.home_team?.trim() === champTeam || m.away_team?.trim() === champTeam
    ) : -1;
    if (idx === -1) idx = sbMatchups.findIndex(m => m.matchup_type === 'WINNERS_BRACKET');
    if (idx > -1) { featuredMatchup = sbMatchups.splice(idx, 1)[0]; featuredLabel = 'Championship'; }
  } else {
    // Matchup of the Week: smallest margin of victory
    let minMargin = Infinity, minIdx = 0;
    sbMatchups.forEach((m, i) => {
      const mg = Math.abs(m.home_score - m.away_score);
      if (mg < minMargin) { minMargin = mg; minIdx = i; }
    });
    featuredMatchup = sbMatchups.splice(minIdx, 1)[0];
    featuredLabel   = 'Matchup of the Week';
  }

  function logoEl(url, cls) {
    return url
      ? `<img src="${url}" class="${cls}" alt="" loading="lazy"/>`
      : `<div class="${cls} ${cls}-ph"></div>`;
  }

  function buildFeaturedCard(m, label) {
    const homeWon  = m.home_score > m.away_score;
    const awayWon  = m.away_score > m.home_score;
    const homeLogo = sbLogos[m.home_owner] || '';
    const awayLogo = sbLogos[m.away_owner] || '';
    const icon     = isPlayoffWeek ? Icons.trophy({ size: 11 }) : Icons.zap({ size: 11 });
    return `
      <div class="sb-featured-card">
        <div class="sb-featured-label">${icon} ${label}</div>
        <div class="sb-featured-teams">
          <div class="sb-ft${homeWon ? ' winner' : ''}">
            ${logoEl(homeLogo, 'sb-ft-logo')}
            <div class="sb-ft-info">
              <span class="sb-ft-name">${m.home_team}</span>
              <span class="sb-ft-score ${homeWon ? 'score-win' : 'score-loss'}">${Utils.fmt(m.home_score, 2)}</span>
            </div>
          </div>
          <div class="sb-ft-vs">VS</div>
          <div class="sb-ft sb-ft-away${awayWon ? ' winner' : ''}">
            ${logoEl(awayLogo, 'sb-ft-logo')}
            <div class="sb-ft-info">
              <span class="sb-ft-name">${m.away_team}</span>
              <span class="sb-ft-score ${awayWon ? 'score-win' : 'score-loss'}">${Utils.fmt(m.away_score, 2)}</span>
            </div>
          </div>
        </div>
      </div>`;
  }

  function buildRegularCard(m) {
    const homeWon  = m.home_score > m.away_score;
    const awayWon  = m.away_score > m.home_score;
    const homeLogo = sbLogos[m.home_owner] || '';
    const awayLogo = sbLogos[m.away_owner] || '';
    const row = (team, score, won, logo) => `
      <div class="matchup-team ${won ? 'matchup-winner' : ''}">
        ${logoEl(logo, 'matchup-logo')}
        <div class="matchup-team-body">
          <span class="matchup-team-name">${team}</span>
          <span class="matchup-score ${won ? 'score-win' : 'score-loss'}">${Utils.fmt(score, 2)}</span>
        </div>
      </div>`;
    return `
      <div class="matchup-card">
        ${row(m.home_team, m.home_score, homeWon, homeLogo)}
        ${row(m.away_team, m.away_score, awayWon, awayLogo)}
      </div>`;
  }

  const featuredHtml = featuredMatchup ? buildFeaturedCard(featuredMatchup, featuredLabel) : '';
  const regularHtml  = `<div class="sb-regular-grid">${sbMatchups.map(buildRegularCard).join('')}</div>`;
  document.getElementById('scoreboard').innerHTML = featuredHtml + regularHtml;

  // ── PLAYOFF BRACKETS (weeks 15-17) ────────────────────────────────
  if (isPlayoffWeek) {
    const allMs = latestSeason.matchups || [];
    const champMs  = allMs.filter(m => m.matchup_type === 'WINNERS_BRACKET');
    const toiletMs = allMs.filter(m => m.matchup_type === 'LOSERS_CONSOLATION_LADDER');

    function groupByWeek(ms) {
      const g = {};
      for (const m of ms) (g[m.week] = g[m.week] || []).push(m);
      return Object.entries(g).sort(([a], [b]) => Number(a) - Number(b));
    }

    function champRoundName(ri, total) {
      if (total === 1) return 'Championship';
      if (total === 2) return ['Semifinals', 'Championship'][ri] || `Round ${ri + 1}`;
      if (total === 3) return ['Quarterfinals', 'Semifinals', 'Championship'][ri] || `Round ${ri + 1}`;
      return `Round ${ri + 1}`;
    }

    function buildBracketMatch(m, isToilet) {
      const homeTeam  = m.home_team?.trim() || 'TBD';
      const awayTeam  = m.away_team?.trim() || 'TBD';
      const homeScore = m.home_score || 0;
      const awayScore = m.away_score || 0;
      const played    = homeScore > 0 || awayScore > 0;

      const homeAdv = played ? (isToilet ? homeScore < awayScore : homeScore > awayScore) : false;
      const awayAdv = played ? (isToilet ? awayScore < homeScore : awayScore > homeScore) : false;

      const advClass = isToilet ? 'bracket-toilet-adv' : 'bracket-winner';
      const teamRow  = (team, score, adv) => `
        <div class="bracket-team ${played ? (adv ? advClass : 'bracket-loser') : ''}">
          <span class="bracket-team-name" title="${team}">${team}</span>
          <span class="bracket-score ${played ? (adv ? (isToilet ? '' : 'score-win') : '') : ''}">${played ? score.toFixed(2) : '—'}</span>
        </div>`;

      return `
        <div class="bracket-match">
          ${teamRow(homeTeam, homeScore, homeAdv)}
          <div class="bracket-divider"></div>
          ${teamRow(awayTeam, awayScore, awayAdv)}
        </div>`;
    }

    function renderChampBracket(rounds) {
      if (!rounds.length) return '<p style="color:var(--text-muted);font-size:0.8rem;padding:0.5rem">No data yet.</p>';
      const cols = rounds.map(([, ms], ri) => {
        const cards = ms
          .filter(m => m.home_team && m.home_team !== 'N/A')
          .map(m => buildBracketMatch(m, false));
        return `
          <div class="bracket-round">
            <div class="bracket-round-label">${champRoundName(ri, rounds.length)}</div>
            <div class="bracket-round-matches" style="--match-count:${cards.length}">
              ${cards.join('')}
            </div>
          </div>`;
      });
      return `<div class="bracket-grid" style="--round-count:${rounds.length}">${cols.join('')}</div>`;
    }

    // ── CUSTOM 6-TEAM TOILET BOWL BRACKET ──────────────────────────────
    // Seeds teams from regular season final standings (worst = seed 1, gets bye).
    // Loser advances in every round. The loser of the final is last place.
    function renderToiletBracket6(allToiletMs, allTeams) {
      if (!allToiletMs.length) return '<p style="color:var(--text-muted);font-size:0.8rem;padding:0.5rem 0">No data yet.</p>';

      // Build set of teams in toilet bowl
      const toiletTeamSet = new Set();
      allToiletMs.forEach(m => {
        if (m.home_team && m.home_team !== 'N/A') toiletTeamSet.add(m.home_team.trim());
        if (m.away_team && m.away_team !== 'N/A') toiletTeamSet.add(m.away_team.trim());
      });

      // Seed by regular season standing descending: worst reg-season team = seed 1 (top bye)
      // Uses `standing` (regular season) not `final_standing` (which includes toilet bowl results)
      const seeded = allTeams
        .filter(t => toiletTeamSet.has(t.team_name?.trim()))
        .sort((a, b) => (b.standing || 0) - (a.standing || 0))
        .map(t => t.team_name.trim());

      if (seeded.length < 6) return '<p style="color:var(--text-muted);font-size:0.8rem;padding:0.5rem 0">Insufficient team data.</p>';
      // seeded[0]=seed1(last place,top bye), [1]=seed2(2nd-to-last,bot bye), seeds 3–6 play R1

      const byeSet    = new Set(seeded.slice(0, 2));
      const r1TeamSet = new Set(seeded.slice(2));

      // Group matchups by week (ascending)
      const byWeek = {};
      allToiletMs.forEach(m => {
        if (m.home_team && m.home_team !== 'N/A') (byWeek[m.week] = byWeek[m.week] || []).push(m);
      });
      const weeks = Object.keys(byWeek).map(Number).sort((a, b) => a - b);

      // Helper: loser of a game (toilet bowl = lower score = advancing)
      function loserOf(m) {
        if (!m) return null;
        const played = (m.home_score || 0) > 0 || (m.away_score || 0) > 0;
        if (!played) return null;
        return (m.home_score || 0) < (m.away_score || 0) ? m.home_team?.trim() : m.away_team?.trim();
      }

      // R1: first toilet bowl week, games where BOTH teams are non-bye seeds (3–6)
      const r1All = (byWeek[weeks[0]] || []).filter(m =>
        r1TeamSet.has(m.home_team?.trim()) && r1TeamSet.has(m.away_team?.trim())
      );

      // SF: second week, games where at least one team is a bye seed (1 or 2)
      const sfAll = weeks.length >= 2
        ? (byWeek[weeks[1]] || []).filter(m =>
            byeSet.has(m.home_team?.trim()) || byeSet.has(m.away_team?.trim())
          )
        : [];

      // Assign SF top/bottom by which bye seed (seeded[0] vs seeded[1]) is in each SF game
      const sfForSeed1 = sfAll.find(m =>
        m.home_team?.trim() === seeded[0] || m.away_team?.trim() === seeded[0]
      );
      const sfForSeed2 = sfAll.find(m => m !== sfForSeed1 && (
        m.home_team?.trim() === seeded[1] || m.away_team?.trim() === seeded[1]
      ));
      const sfTop = sfForSeed1 || null;
      const sfBot = sfForSeed2 || null;

      // Map R1 games to top/bottom by tracing which R1 loser appears in each SF game
      let r1Top = r1All[0] || null;
      let r1Bot = r1All[1] || null;
      if (sfTop && r1All.length >= 1) {
        const nonByeInSfTop = byeSet.has(sfTop.home_team?.trim())
          ? sfTop.away_team?.trim() : sfTop.home_team?.trim();
        const matched = r1All.find(m => loserOf(m) === nonByeInSfTop);
        if (matched) { r1Top = matched; r1Bot = r1All.find(m => m !== matched) || null; }
      }

      const r1TopLoser = loserOf(r1Top);
      const r1BotLoser = loserOf(r1Bot);

      // Final: third week, game between the two SF losers
      const sfTopLoser = loserOf(sfTop);
      const sfBotLoser = loserOf(sfBot);
      const finalGame = (sfTopLoser && sfBotLoser)
        ? (byWeek[weeks[2]] || []).find(m => {
            const h = m.home_team?.trim(), a = m.away_team?.trim();
            return (h === sfTopLoser && a === sfBotLoser) || (h === sfBotLoser && a === sfTopLoser);
          })
        : null;
      const toiletChamp = loserOf(finalGame);

      // ── Render helpers ──────────────────────────────────────────────
      function tbMatch(m) {
        if (!m) return tbTBD();
        const home = m.home_team?.trim() || 'TBD';
        const away = m.away_team?.trim() || 'TBD';
        const hs = m.home_score || 0;
        const as = m.away_score || 0;
        const played = hs > 0 || as > 0;
        const homeAdv = played && hs < as;
        const awayAdv = played && as < hs;
        const row = (name, score, adv) => `
          <div class="bracket-team ${played ? (adv ? 'bracket-toilet-adv' : 'bracket-loser') : ''}">
            <span class="bracket-team-name" title="${name}">${name}</span>
            <span class="bracket-score" ${adv ? 'style="color:#c17f3a"' : ''}>${played ? score.toFixed(2) : '—'}</span>
          </div>`;
        return `<div class="bracket-match">${row(home, hs, homeAdv)}<div class="bracket-divider"></div>${row(away, as, awayAdv)}</div>`;
      }

      function tbBye(teamName) {
        return `<div class="bracket-match tb6-bye-slot">
          <div class="bracket-team">
            <span class="bracket-team-name" title="${teamName}">${teamName}</span>
            <span class="bracket-score">—</span>
          </div>
          <div class="bracket-divider"></div>
          <div class="bracket-team">
            <span class="bracket-team-name" style="color:var(--accent-gold);font-family:var(--font-display);font-weight:700;letter-spacing:0.06em;font-size:0.78rem">BYE</span>
            <span class="bracket-score">—</span>
          </div>
        </div>`;
      }

      function tbTBD() {
        const ph = () => `<div class="bracket-team"><span class="bracket-team-name" style="color:var(--text-muted);font-style:italic">TBD</span><span class="bracket-score">—</span></div>`;
        return `<div class="bracket-match tb6-tbd-slot">${ph()}<div class="bracket-divider"></div>${ph()}</div>`;
      }

      function tbPending(t1, t2) {
        const row = (name, muted) => `<div class="bracket-team"><span class="bracket-team-name" ${muted ? 'style="color:var(--text-muted);font-style:italic"' : ''}>${name}</span><span class="bracket-score">—</span></div>`;
        return `<div class="bracket-match tb6-tbd-slot">${row(t1, false)}<div class="bracket-divider"></div>${row(t2, !t2 || t2 === 'TBD')}</div>`;
      }

      // Show final, or pending teams if SF is done but final hasn't been played
      function tbFinalOrPending() {
        if (finalGame) return tbMatch(finalGame);
        if (sfTopLoser && sfBotLoser) return tbPending(sfTopLoser, sfBotLoser);
        if (sfTopLoser) return tbPending(sfTopLoser, 'TBD');
        return tbTBD();
      }

      const html = `
        <div class="bracket-grid">
          <div class="bracket-round">
            <div class="bracket-round-label">Round 1</div>
            <div class="bracket-round-matches">
              ${tbBye(seeded[0])}
              ${tbMatch(r1Top) || tbTBD()}
              ${tbBye(seeded[1])}
              ${tbMatch(r1Bot) || tbTBD()}
            </div>
          </div>
          <div class="bracket-round">
            <div class="bracket-round-label">Semifinal</div>
            <div class="bracket-round-matches">
              ${sfTop ? tbMatch(sfTop) : (r1TopLoser ? tbPending(seeded[0], r1TopLoser) : tbTBD())}
              ${sfBot ? tbMatch(sfBot) : (r1BotLoser ? tbPending(seeded[1], r1BotLoser) : tbTBD())}
            </div>
          </div>
          <div class="bracket-round">
            <div class="bracket-round-label">Toilet Bowl</div>
            <div class="bracket-round-matches">
              ${tbFinalOrPending()}
            </div>
          </div>
        </div>`;
      return { html, toiletChamp };
    }

    const champRounds = groupByWeek(champMs);
    const { html: toiletBracketHtml, toiletChamp } = renderToiletBracket6(toiletMs, latestSeason.teams || []);

    // Populate last place callout in hero banner
    if (toiletChamp) {
      const toiletOwnerFull = teamOwnerMap[`${latestYear}_${toiletChamp}`] || '';
      const toiletOwner = toiletOwnerFull ? Utils.shortOwner(toiletOwnerFull) : '';
      const el = document.getElementById('heroToiletChamp');
      if (el) el.innerHTML = `
        <div class="hero-toilet-champ">
          <div class="hero-toilet-label">${latestYear} Last Place</div>
          <div class="hero-toilet-icon">${Icons.skull({ size: 26 })}</div>
          <div class="hero-champ-team">${toiletChamp}</div>
          ${toiletOwner ? `<div class="hero-champ-owner">${toiletOwner}</div>` : ''}
        </div>`;
    }

    document.getElementById('homeBrackets').innerHTML = `
      <div class="home-brackets-grid">
        <div class="home-bracket-card">
          <div class="section-title">${Icons.trophy({ size: 16 })} Championship Bracket</div>
          ${renderChampBracket(champRounds)}
        </div>
        <div class="home-bracket-card">
          <div class="section-title">${Icons.skull({ size: 16 })} Toilet Bowl</div>
          ${toiletBracketHtml}
        </div>
      </div>`;
    document.getElementById('homeBracketsSection').style.display = '';
  }

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
    { icon: Icons.flame({ size: 18 }),  color: 'gold', val: Utils.fmt(highScore.score, 2), label: 'Highest Score',   sub: `${highScore.team} — ${highScore.year} Wk ${highScore.week}` },
    { icon: Icons.zap({ size: 18 }),    color: 'gold', val: `+${Utils.fmt(bigBlowout.margin, 2)}`, label: 'Biggest Blowout', sub: `${bigBlowout.winner} — ${bigBlowout.year} Wk ${bigBlowout.week}` },
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

  // ── LEAGUE STANDINGS TABLE ────────────────────────────────────────────
  const lscSeasonMatchups = latestSeason.matchups || [];
  const lscPlayoffCount   = latestSeason.settings?.playoff_team_count || 6;

  // Determine which teams made the winners bracket playoffs.
  // Only WINNERS_BRACKET matchup_type counts — excludes toilet bowl / consolation ladders.
  const lscPlayoffTeams = new Set();
  for (const m of lscSeasonMatchups) {
    if (m.matchup_type === 'WINNERS_BRACKET') {
      if (m.home_team) lscPlayoffTeams.add(m.home_team.trim());
      if (m.away_team) lscPlayoffTeams.add(m.away_team.trim());
    }
  }
  // Fallback: if winners bracket data doesn't exist yet, use top N by final_standing
  if (lscPlayoffTeams.size === 0) {
    [...latestSeason.teams]
      .sort((a, b) => (a.final_standing || 99) - (b.final_standing || 99))
      .slice(0, lscPlayoffCount)
      .forEach(t => lscPlayoffTeams.add(t.team_name.trim()));
  }

  function buildLscRows(filter) {
    let ms;
    if (filter === 'regular')       ms = lscSeasonMatchups.filter(m => m.matchup_type === 'NONE');
    else if (filter === 'playoffs') ms = lscSeasonMatchups.filter(m => m.is_playoff || m.matchup_type !== 'NONE');
    else                            ms = lscSeasonMatchups;

    // Init per-team accumulators
    const st = {};
    for (const t of latestSeason.teams) {
      const key = t.team_name.trim();
      st[key] = { team: key, owner: t.owner, w: 0, l: 0, tie: 0, pf: 0, pa: 0, maxPf: 0, hasMaxPf: false, pwW: 0, pwL: 0, medW: 0, medL: 0 };
    }

    // Group matchups by week
    const byWeek = {};
    for (const m of ms) { (byWeek[m.week] = byWeek[m.week] || []).push(m); }

    for (const wkMs of Object.values(byWeek)) {
      // Gather scores for this week
      const wkScores = {};
      for (const m of wkMs) {
        const ht = m.home_team?.trim(), at = m.away_team?.trim();
        if (ht && st[ht]) wkScores[ht] = { score: m.home_score, maxPf: m.home_max_pf || 0 };
        if (at && st[at]) wkScores[at] = { score: m.away_score, maxPf: m.away_max_pf || 0 };
      }

      // Weekly median
      const sorted = Object.values(wkScores).map(s => s.score).sort((a, b) => a - b);
      const mid    = Math.floor(sorted.length / 2);
      const median = sorted.length === 0 ? 0 : sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

      // Actual record, PF, PA, MaxPF
      for (const m of wkMs) {
        const ht = m.home_team?.trim(), at = m.away_team?.trim();
        if (!st[ht] || !st[at]) continue;
        st[ht].pf += m.home_score; st[ht].pa += m.away_score;
        st[at].pf += m.away_score; st[at].pa += m.home_score;
        if (m.home_max_pf > 0) { st[ht].maxPf += m.home_max_pf; st[ht].hasMaxPf = true; }
        if (m.away_max_pf > 0) { st[at].maxPf += m.away_max_pf; st[at].hasMaxPf = true; }
        if (m.home_score > m.away_score)      { st[ht].w++;   st[at].l++;   }
        else if (m.away_score > m.home_score) { st[at].w++;   st[ht].l++;   }
        else                                  { st[ht].tie++; st[at].tie++; }
      }

      // vs. Median
      for (const [team, { score }] of Object.entries(wkScores)) {
        if (!st[team]) continue;
        score > median ? st[team].medW++ : st[team].medL++;
      }

      // Power record: each team vs every other team this week
      const teamKeys = Object.keys(wkScores);
      for (let i = 0; i < teamKeys.length; i++) {
        for (let j = i + 1; j < teamKeys.length; j++) {
          const ta = teamKeys[i], tb = teamKeys[j];
          if (!st[ta] || !st[tb]) continue;
          const sa = wkScores[ta].score, sb = wkScores[tb].score;
          if (sa > sb)      { st[ta].pwW++; st[tb].pwL++; }
          else if (sb > sa) { st[tb].pwW++; st[ta].pwL++; }
        }
      }
    }

    // Sort by win pct then PF
    const rows = Object.values(st).sort((a, b) => {
      const ap = (a.w + a.tie * 0.5) / Math.max(a.w + a.l + a.tie, 1);
      const bp = (b.w + b.tie * 0.5) / Math.max(b.w + b.l + b.tie, 1);
      return bp - ap || b.pf - a.pf;
    });

    rows.forEach((r, i) => {
      r.rank = i + 1;
      r.inPlayoffs = lscPlayoffTeams.has(r.team);
      r.mgmtPct    = r.hasMaxPf && r.maxPf > 0 ? (r.pf / r.maxPf) * 100 : null;
    });
    return rows;
  }

  let lscFilter  = 'regular';
  let lscSortCol = 'rank';
  let lscSortDir = 'asc';

  function renderLsc() {
    const rows = buildLscRows(lscFilter);

    // Apply column sort
    const sortFns = {
      rank:        r => r.rank,
      record:      r => r.w + r.tie * 0.5,
      powerRecord: r => r.pwW,
      vsMedian:    r => r.medW,
      combined:    r => r.w + r.medW,
      pf:          r => r.pf,
      pa:          r => r.pa,
      maxPf:       r => r.maxPf,
      mgmtPct:     r => r.mgmtPct ?? -1,
    };
    const dir = lscSortDir === 'asc' ? 1 : -1;
    const fn  = sortFns[lscSortCol] || sortFns.rank;
    rows.sort((a, b) => dir * (fn(a) - fn(b)));

    // Update sort arrows
    document.querySelectorAll('#lscTable thead th[data-sort]').forEach(th => {
      const arrow = th.querySelector('.lsc-sort');
      if (!arrow) return;
      if (th.dataset.sort === lscSortCol) {
        arrow.textContent = lscSortDir === 'asc' ? '↑' : '↓';
        th.classList.add('lsc-sorted');
      } else {
        arrow.textContent = '↕';
        th.classList.remove('lsc-sorted');
      }
    });

    const logos    = typeof TEAM_LOGOS !== 'undefined' ? TEAM_LOGOS : {};
    const checkSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--win)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;
    const ringSvg  = `<img src="The%20Fellowship%202%20(Ring).svg" alt="Champion" width="20" height="20" style="display:inline-block;vertical-align:middle" loading="lazy"/>`;

    document.getElementById('lscTbody').innerHTML = rows.map(r => {
      const logo      = logos[r.owner] || '';
      const short     = Utils.shortOwner(r.owner);
      const rec       = `${r.w}–${r.l}${r.tie ? `–${r.tie}` : ''}`;
      const pwRec     = `${r.pwW}–${r.pwL}`;
      const medRec    = `${r.medW}–${r.medL}`;
      const combRec   = `${r.w + r.medW}–${r.l + r.medL}`;
      const recColor  = r.w > r.l ? 'var(--win)' : r.w < r.l ? 'var(--loss)' : 'var(--text-secondary)';
      const mgmtStr   = r.mgmtPct !== null ? r.mgmtPct.toFixed(1) + '%' : '—';
      const isChamp   = champTeam && r.team === champTeam;

      return `<tr${r.inPlayoffs ? ' class="lsc-po-row"' : ''}>
        <td class="lsc-rank-cell">${r.rank}</td>
        <td class="lsc-team-cell">
          ${logo
            ? `<img src="${logo}" class="lsc-logo" alt="" loading="lazy"/>`
            : `<div class="lsc-logo-ph"></div>`}
          <div class="lsc-team-info">
            <span class="lsc-tname">${r.team}${isChamp ? `<span class="lsc-ring" title="League Champion">${ringSvg}</span>` : ''}</span>
            <span class="lsc-towner">${short}</span>
          </div>
        </td>
        <td class="lsc-po-cell">${r.inPlayoffs ? `<span class="lsc-clinched" title="In playoff position">${checkSvg}</span>` : ''}</td>
        <td class="num lsc-rec-cell" style="color:${recColor}">${rec}</td>
        <td class="num lsc-rec-cell">${pwRec}</td>
        <td class="num lsc-rec-cell">${medRec}</td>
        <td class="num lsc-rec-cell">${combRec}</td>
        <td class="num">${Utils.fmt(r.pf, 2)}</td>
        <td class="num">${Utils.fmt(r.pa, 2)}</td>
        <td class="num">${r.maxPf > 0 ? Utils.fmt(r.maxPf, 2) : '—'}</td>
        <td class="num lsc-mgmt-cell">${mgmtStr}</td>
      </tr>`;
    }).join('');
  }

  renderLsc();

  // Filter buttons
  document.querySelectorAll('#lscFilterBtns .lsc-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#lscFilterBtns .lsc-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      lscFilter  = btn.dataset.filter;
      lscSortCol = 'rank';
      lscSortDir = 'asc';
      renderLsc();
    });
  });

  // Sortable column headers
  document.querySelectorAll('#lscTable thead th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      if (lscSortCol === col) {
        lscSortDir = lscSortDir === 'asc' ? 'desc' : 'asc';
      } else {
        lscSortCol = col;
        lscSortDir = (col === 'rank' || col === 'pa') ? 'asc' : 'desc';
      }
      renderLsc();
    });
  });

})();
