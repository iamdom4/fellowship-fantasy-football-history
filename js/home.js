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
        <span class="matchup-team-name">${team}</span>
        <span class="matchup-score ${won ? 'score-win' : 'score-loss'}">${Utils.fmt(score, 2)}</span>
        <span class="win-caret"></span>
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

  const standingsWidgetEl = document.getElementById('standingsWidget');
  if (standingsWidgetEl) standingsWidgetEl.innerHTML = standings.map((t, i) => {
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

  const prWidgetEl = document.getElementById('powerRankingsWidget');
  if (prWidgetEl) prWidgetEl.innerHTML = prRanked.map((d, i) => `
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

  const recordsTeaserEl = document.getElementById('recordsTeaser');
  if (recordsTeaserEl) recordsTeaserEl.innerHTML = [
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

  function fmtPostDate(str) {
    const d = new Date(str);
    return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function readMins(post) {
    const words = stripHtml(post.content || post.description || '').split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  }
  function extractThumb(post) {
    // Priority: enclosure > thumbnail > first img in content
    // enclosure = post-specific featured image set by Beehiiv
    // thumbnail = often a generic brand banner, not post-specific — lower priority
    let url = '';
    if (post.enclosure && (post.enclosure.link || post.enclosure.url)) {
      url = post.enclosure.link || post.enclosure.url;
    } else if (post.thumbnail && post.thumbnail.startsWith('http')) {
      url = post.thumbnail;
    } else {
      // DOM-based parsing (same as blog.js) — more reliable than regex
      const tmp = document.createElement('div');
      tmp.innerHTML = post.content || post.description || '';
      const img = tmp.querySelector('img[src]');
      url = img ? img.src : '';
    }
    // Strip Cloudflare Image Resizing wrapper (cdn-cgi/image/...) — these URLs
    // can fail on mobile Safari when served from a different domain than localhost.
    // The direct asset URL works everywhere.
    return url.replace(/\/cdn-cgi\/image\/[^/]+\//, '/');
  }

  fetch(API_URL)
    .then(r => r.json())
    .then(data => {
      if (data.status !== 'ok' || !data.items?.length) return;
      const items    = data.items.slice(0, 4);
      const featured = items[0];
      const side     = items.slice(1);
      const thumb    = extractThumb(featured) || 'The Fellowship 2 (Ring).svg';
      const excerpt  = stripHtml(featured.description || '').slice(0, 350) + '…';

      const sideHtml = side.map((p, i) => {
        const snip = stripHtml(p.description || '').slice(0, 80).trim();
        const sThumb = extractThumb(p);
        return `
        <a href="${p.link || '#'}" class="news-item" target="_blank" rel="noopener">
          ${sThumb ? `<div class="news-item-thumb"><img src="${sThumb}" alt="" loading="lazy"></div>` : ''}
          <div class="news-item-text">
            <div class="news-meta">${fmtPostDate(p.pubDate)} <span class="news-read-time">&bull; ${readMins(p)} min read</span></div>
            <div class="news-item-title">${p.title || ''}</div>
            ${snip ? `<div class="news-item-excerpt">${snip}…</div>` : ''}
          </div>
        </a>
        ${i < side.length - 1 ? '<div class="news-item-divider"></div>' : ''}`;
      }).join('');

      blogEl.innerHTML = `
        <div class="news-grid">
          <a href="${featured.link || '#'}" class="news-featured" target="_blank" rel="noopener">
            ${thumb ? `<div class="news-thumb"><img src="${thumb}" alt="" loading="lazy" style="${thumb.endsWith('.svg') ? 'object-fit:contain;padding:1.5rem' : ''}"><span class="news-latest-badge">Latest Issue</span></div>` : ''}
            <div class="news-meta">${fmtPostDate(featured.pubDate)} <span class="news-read-time">&bull; ${readMins(featured)} min read</span></div>
            <div class="news-featured-title">${featured.title || 'Latest Post'}</div>
            <div class="news-excerpt">${excerpt}</div>
          </a>
          <div class="news-sidebar">
            ${sideHtml}
            <a href="blog.html" class="blog-archive-btn news-all-posts">
              All Posts
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </a>
          </div>
        </div>
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
  // Aragorn Crown: team with standing === 1 in the latest season
  const lscCrownTeam = (() => {
    const top = (latestSeason.teams || []).find(t => t.standing === 1);
    return top ? top.team_name.trim() : null;
  })();

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
      const isCrown   = lscCrownTeam && r.team === lscCrownTeam;

      return `<tr${r.inPlayoffs ? ' class="lsc-po-row"' : ''}>
        <td class="lsc-rank-cell">${r.rank}</td>
        <td class="lsc-team-cell">
          ${logo
            ? `<img src="${logo}" class="lsc-logo" alt="" loading="lazy"/>`
            : `<div class="lsc-logo-ph"></div>`}
          <div class="lsc-team-info">
            <span class="lsc-tname">${r.team}${isChamp ? `<span class="lsc-ring" title="League Champion">${ringSvg}</span>` : ''}${isCrown ? `<span class="lsc-ring" title="Aragorn Crown — #1 Seed" style="margin-left:2px;color:#b0bec5;vertical-align:middle">${Icons.aragornCrown({ size: 16 })}</span>` : ''}</span>
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

  // ── HOME PAGE POWER RANKINGS ──────────────────────────────────────────────

  function prGetRegSeasonWeeks(year) {
    const season = LEAGUE_DATA[year];
    if (!season || !season.matchups) return [];
    const weeks = new Set();
    for (const m of season.matchups) {
      if (m.matchup_type === 'NONE' && m.home_score != null && m.away_score != null) weeks.add(m.week);
    }
    return [...weeks].sort((a, b) => a - b);
  }

  function prComputeRankings(year, throughWeek) {
    const season = LEAGUE_DATA[year];
    if (!season) return [];
    const stats = {};
    for (const t of (season.teams || [])) {
      const name = t.team_name.trim();
      stats[name] = { teamName: name, owner: Utils.normalizeName(t.owner), pf: 0, maxPF: 0, wins: 0, losses: 0, medianWins: 0, medianLosses: 0 };
    }
    const byWeek = {};
    for (const m of (season.matchups || [])) {
      if (m.matchup_type !== 'NONE' || m.home_score == null || m.away_score == null || m.week > throughWeek) continue;
      if (!byWeek[m.week]) byWeek[m.week] = [];
      byWeek[m.week].push(m);
    }
    for (const weekMs of Object.values(byWeek)) {
      const scores = weekMs.flatMap(m => [m.home_score, m.away_score]).sort((a, b) => a - b);
      const n = scores.length;
      const median = n === 0 ? 0 : n % 2 === 1 ? scores[Math.floor(n / 2)] : (scores[n / 2 - 1] + scores[n / 2]) / 2;
      for (const m of weekMs) {
        const h = m.home_team?.trim(), a = m.away_team?.trim();
        if (h && stats[h]) {
          stats[h].pf += m.home_score; stats[h].maxPF += (m.home_max_pf || 0);
          m.home_score > m.away_score ? stats[h].wins++ : stats[h].losses++;
          m.home_score > median ? stats[h].medianWins++ : stats[h].medianLosses++;
        }
        if (a && stats[a]) {
          stats[a].pf += m.away_score; stats[a].maxPF += (m.away_max_pf || 0);
          m.away_score > m.home_score ? stats[a].wins++ : stats[a].losses++;
          m.away_score > median ? stats[a].medianWins++ : stats[a].medianLosses++;
        }
      }
    }
    const teams = Object.values(stats).map(t => {
      const totalG = t.wins + t.losses, totalM = t.medianWins + t.medianLosses;
      const winPct = totalG > 0 ? t.wins / totalG : 0;
      const medWinPct = totalM > 0 ? t.medianWins / totalM : 0;
      return { ...t, winPct, medWinPct, prScore: (t.pf * 2) + (t.pf * winPct) + (t.pf * medWinPct) };
    });
    teams.sort((a, b) => Math.abs(b.prScore - a.prScore) > 0.0001 ? b.prScore - a.prScore : b.pf - a.pf);
    teams.forEach((t, i) => { t.rank = i + 1; });
    return teams;
  }

  function prMonotonePath(pts) {
    if (pts.length < 2) return '';
    const n = pts.length, dx = [], dy = [], m = [], t = [];
    for (let i = 0; i < n - 1; i++) { dx[i] = pts[i+1].x - pts[i].x; dy[i] = pts[i+1].y - pts[i].y; m[i] = dy[i] / dx[i]; }
    t[0] = m[0]; t[n-1] = m[n-2];
    for (let i = 1; i < n-1; i++) t[i] = m[i-1] * m[i] <= 0 ? 0 : (m[i-1] + m[i]) / 2;
    for (let i = 0; i < n-1; i++) {
      if (Math.abs(m[i]) < 1e-10) { t[i] = t[i+1] = 0; continue; }
      const a = t[i]/m[i], b = t[i+1]/m[i], s = a*a + b*b;
      if (s > 9) { const tau = 3/Math.sqrt(s); t[i] = tau*a*m[i]; t[i+1] = tau*b*m[i]; }
    }
    const segs = [`M ${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`];
    for (let i = 0; i < n-1; i++) {
      const cp1x = pts[i].x + dx[i]/3, cp1y = pts[i].y + t[i]*dx[i]/3;
      const cp2x = pts[i+1].x - dx[i]/3, cp2y = pts[i+1].y - t[i+1]*dx[i]/3;
      segs.push(`C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${pts[i+1].x.toFixed(2)},${pts[i+1].y.toFixed(2)}`);
    }
    return segs.join(' ');
  }

  function renderHomePRTable(tableEl, year, week) {
    const curr = prComputeRankings(year, week);
    let prevMap = null;
    if (week > 1) {
      const prev = prComputeRankings(year, week - 1);
      prevMap = {};
      prev.forEach(t => { prevMap[t.teamName] = t.rank; });
    }
    if (!curr.length) { tableEl.innerHTML = ''; return; }
    const logoMap = typeof TEAM_LOGOS !== 'undefined' ? TEAM_LOGOS : {};
    let rows = '';
    for (const t of curr) {
      let rankClass = 'rank-num-cell';
      if (t.rank === 1) rankClass += ' rank-1-cell';
      else if (t.rank === 2) rankClass += ' rank-2-cell';
      else if (t.rank === 3) rankClass += ' rank-3-cell';
      let changeHtml = '<span class="change-neutral">&mdash;</span>';
      if (prevMap && prevMap[t.teamName] != null) {
        const delta = prevMap[t.teamName] - t.rank;
        if (delta > 0) changeHtml = `<span class="change-up">&#9650;${delta}</span>`;
        else if (delta < 0) changeHtml = `<span class="change-down">&#9660;${Math.abs(delta)}</span>`;
      }
      const logoUrl  = logoMap[t.owner] || '';
      const logoHtml = logoUrl
        ? `<img src="${logoUrl}" class="lsc-logo" alt="" loading="lazy" />`
        : `<div class="lsc-logo-ph"></div>`;
      const games  = t.wins + t.losses;
      const pfpg   = games > 0 ? Utils.fmt(t.pf / games, 2) : '&mdash;';
      rows += `
        <tr class="pr-row">
          <td class="${rankClass}">${t.rank}</td>
          <td>
            <div class="lsc-team-cell">
              ${logoHtml}
              <div class="lsc-team-info">
                <span class="lsc-tname">${t.teamName}</span>
                <span class="lsc-towner">${Utils.shortOwner(t.owner)}</span>
              </div>
            </div>
          </td>
          <td style="text-align:center;font-family:var(--font-mono);">${t.wins}&ndash;${t.losses}</td>
          <td style="text-align:center;font-family:var(--font-mono);color:var(--text-secondary);">${pfpg}</td>
          <td style="text-align:center;font-weight:700;color:var(--accent-gold);">${Utils.fmt(t.prScore, 2)}</td>
          <td style="text-align:center;">${changeHtml}</td>
        </tr>`;
    }
    tableEl.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="text-align:center;" scope="col">#</th>
              <th scope="col">Team</th>
              <th style="text-align:center;" scope="col">Record</th>
              <th style="text-align:center;" scope="col">PF/G</th>
              <th style="text-align:center;" scope="col">Power Ranking Score</th>
              <th style="text-align:center;" scope="col">Change</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  function renderHomePRChart(chartEl, year) {
    if (!chartEl) return;
    if (chartEl._prTip) { chartEl._prTip.remove(); chartEl._prTip = null; }
    const allWeeks = prGetRegSeasonWeeks(year);
    if (allWeeks.length < 2) { chartEl.innerHTML = ''; return; }
    const teamSeries = {};
    for (const week of allWeeks) {
      for (const t of prComputeRankings(year, week)) {
        if (!teamSeries[t.teamName]) teamSeries[t.teamName] = [];
        teamSeries[t.teamName].push({ week, rank: t.rank });
      }
    }
    const teamNames = Object.keys(teamSeries);
    const numTeams = teamNames.length, numWeeks = allWeeks.length;
    const C = DESIGN.chart, CLR = DESIGN.colors;
    // Override right margin to fit inline name labels (same pattern as powerRankings.js)
    const M = Object.assign({}, C.margin, { right: 175 });
    // Compute minimum width so every week gets proper spacing even on mobile.
    // Chart scrolls horizontally below this width rather than compressing.
    const minChartW = M.left + M.right + Math.max(C.minInnerW, (numWeeks - 1) * C.weekSpacing);
    const containerW = Math.max(minChartW, chartEl.clientWidth || minChartW);
    const innerW = containerW - M.left - M.right;
    const innerH = Math.max(C.minInnerH, numTeams * C.rankSpacing);
    const totalW = containerW;
    const totalH = innerH + M.top + M.bottom;
    const xScale = w  => M.left + (allWeeks.indexOf(w) / (numWeeks - 1)) * innerW;
    const yScale = rk => M.top  + ((rk - 1) / (numTeams - 1)) * innerH;

    let grid = '';
    for (let r = 1; r <= numTeams; r++) {
      const y = yScale(r).toFixed(2);
      grid += `<line x1="${M.left}" y1="${y}" x2="${(M.left+innerW).toFixed(2)}" y2="${y}" stroke="${CLR.gridLine}" stroke-width="1"/>`;
      grid += `<text x="${(M.left-12).toFixed(2)}" y="${y}" text-anchor="end" dominant-baseline="middle" fill="${CLR.textSecondary}" font-size="${C.rankLabelSize}" font-family="${C.fontFamily}" font-weight="${C.fontWeight}">${r}</text>`;
    }
    for (const w of allWeeks) {
      const x = xScale(w).toFixed(2);
      grid += `<line x1="${x}" y1="${M.top}" x2="${x}" y2="${(M.top+innerH).toFixed(2)}" stroke="${CLR.gridLineFaint}" stroke-width="1"/>`;
      grid += `<text x="${x}" y="${(M.top+innerH+26).toFixed(2)}" text-anchor="middle" fill="${CLR.textSecondary}" font-size="${C.weekLabelSize}" font-family="${C.fontFamily}" font-weight="${C.fontWeight}">Wk ${w}</text>`;
    }
    let lines = '', dots = '', labels = '';
    teamNames.forEach((name, ti) => {
      const color = DESIGN.chartColors[ti % DESIGN.chartColors.length];
      const pts = teamSeries[name].map(d => ({ x: xScale(d.week), y: yScale(d.rank), week: d.week, rank: d.rank }));
      const tid = String(ti);
      lines += `<path class="prc-line" data-tid="${tid}" d="${prMonotonePath(pts)}" stroke="${color}" stroke-width="${C.lineWidth}" fill="none" stroke-linecap="round"/>`;
      for (const p of pts) {
        dots += `<circle class="prc-dot" data-tid="${tid}" data-name="${name}" data-week="${p.week}" data-rank="${p.rank}" cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${C.dotRadius}" fill="${CLR.bgPrimary}" stroke="${color}" stroke-width="${C.dotStrokeWidth}"/>`;
      }
      const last = pts[pts.length - 1];
      labels += `<text class="prc-label" data-tid="${tid}" x="${(last.x + 14).toFixed(2)}" y="${last.y.toFixed(2)}" dominant-baseline="middle" fill="${color}" font-size="${C.nameLabelSize}" font-family="${C.fontFamily}" font-weight="${C.nameLabelWeight}" style="cursor:pointer;">${name}</text>`;
    });
    chartEl.innerHTML = `
      <div class="pr-chart-scroll">
        <svg id="prHomeChartSvg" viewBox="0 0 ${totalW} ${totalH}" width="${totalW}" height="${totalH}" xmlns="http://www.w3.org/2000/svg" style="display:block;min-width:${minChartW}px;max-width:100%;">
          ${grid}${lines}${dots}${labels}
        </svg>
      </div>
`;

    const legendEl = { querySelectorAll: () => [] }; // no legend — inline labels replace it

    const tip = document.createElement('div');
    tip.style.cssText = DESIGN.tooltipStyle;
    document.body.appendChild(tip);
    chartEl._prTip = tip;
    const svgEl = document.getElementById('prHomeChartSvg');
    const allLines  = svgEl.querySelectorAll('.prc-line');
    const allDots   = svgEl.querySelectorAll('.prc-dot');
    const allLabels = svgEl.querySelectorAll('.prc-label');
    function hi(tid) {
      allLines.forEach(el  => { el.style.opacity = el.dataset.tid === tid ? '1' : '0.07'; el.style.strokeWidth = el.dataset.tid === tid ? '3' : String(C.lineWidthFaded); });
      allDots.forEach(el   => { el.style.opacity = el.dataset.tid === tid ? '1' : '0.07'; });
      allLabels.forEach(el => { el.style.opacity = el.dataset.tid === tid ? '1' : '0.07'; });
    }
    function lo() {
      allLines.forEach(el  => { el.style.opacity = '1'; el.style.strokeWidth = String(C.lineWidth); });
      allDots.forEach(el   => { el.style.opacity = '1'; });
      allLabels.forEach(el => { el.style.opacity = '1'; });
      tip.style.opacity = '0';
    }
    allLines.forEach(el => { el.style.cursor = 'pointer'; el.addEventListener('mouseenter', () => hi(el.dataset.tid)); el.addEventListener('mouseleave', lo); });
    allLabels.forEach(el => { el.style.cursor = 'pointer'; el.addEventListener('mouseenter', () => hi(el.dataset.tid)); el.addEventListener('mouseleave', lo); });
    allDots.forEach(el => {
      el.addEventListener('mouseenter', () => { hi(el.dataset.tid); tip.innerHTML = `<strong>${el.dataset.name}</strong><br>Week ${el.dataset.week} &mdash; Rank #${el.dataset.rank}`; tip.style.opacity = '1'; });
      el.addEventListener('mousemove', e => { tip.style.left = (e.clientX + 14) + 'px'; tip.style.top = (e.clientY - 10) + 'px'; });
      el.addEventListener('mouseleave', lo);
    });
  }

  // Init home PR section
  (function initHomePR() {
    const tableEl = document.getElementById('prHomeTable');
    const chartEl = document.getElementById('prHomeChart');
    if (!tableEl || !chartEl) return;
    const seasons = Utils.getSeasons();
    if (!seasons.length) return;
    const [year] = seasons[seasons.length - 1]; // most recent
    const weeks = prGetRegSeasonWeeks(year);
    if (!weeks.length) return;

    // ── Week picker ──────────────────────────────────────────────────────────
    const pickerBtn   = document.getElementById('prHomeWeekPickerBtn');
    const pickerVal   = document.getElementById('prHomeWeekPickerVal');
    const pickerPanel = document.getElementById('prHomeWeekPickerPanel');

    let currentWeek = weeks[weeks.length - 1];

    function closePicker() {
      pickerPanel.hidden = true;
      pickerBtn.setAttribute('aria-expanded', 'false');
    }
    function openPicker() {
      pickerPanel.hidden = false;
      pickerBtn.setAttribute('aria-expanded', 'true');
    }
    pickerBtn.addEventListener('click', e => {
      e.stopPropagation();
      pickerPanel.hidden ? openPicker() : closePicker();
    });
    document.addEventListener('click', closePicker);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closePicker(); });

    // Populate options (latest week first)
    [...weeks].reverse().forEach(w => {
      const opt = document.createElement('div');
      opt.className = 'pr-picker-option' + (w === currentWeek ? ' selected' : '');
      opt.setAttribute('role', 'option');
      opt.dataset.value = w;
      opt.innerHTML = `<svg class="pr-picker-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg><span>Week ${w}</span>`;
      opt.addEventListener('click', e => {
        e.stopPropagation();
        currentWeek = w;
        pickerVal.textContent = `Week ${w}`;
        pickerPanel.querySelectorAll('.pr-picker-option').forEach(el => {
          el.classList.toggle('selected', Number(el.dataset.value) === w);
        });
        closePicker();
        renderHomePRTable(tableEl, year, w);
      });
      pickerPanel.appendChild(opt);
    });

    // Set initial label
    pickerVal.textContent = `Week ${currentWeek}`;

    renderHomePRTable(tableEl, year, currentWeek);
    renderHomePRChart(chartEl, year);

    // Re-render chart on container resize (replicates Fantasy Genius proportional scaling)
    if (typeof ResizeObserver !== 'undefined') {
      let roTimer = null;
      const ro = new ResizeObserver(entries => {
        const newW = entries[0].contentRect.width;
        if (!newW) return;
        clearTimeout(roTimer);
        roTimer = setTimeout(() => renderHomePRChart(chartEl, year), 80);
      });
      ro.observe(chartEl);
    }
  })();

  // ── LUCKY WINS & UNLUCKY LOSSES ───────────────

  (function renderLuckySection() {
    const el = document.getElementById('luckySection');
    if (!el) return;

    const year = latestYear;
    const season = LEAGUE_DATA[year];
    if (!season) { el.innerHTML = ''; return; }

    const logos = typeof TEAM_LOGOS !== 'undefined' ? TEAM_LOGOS : {};

    // Build teamName → owner and teamName → logo maps for current year
    const teamToOwner = {};
    for (const t of (season.teams || [])) {
      teamToOwner[t.team_name.trim()] = Utils.normalizeName(t.owner);
    }

    // Filter to regular season matchups for this year
    const regMatchups = (season.matchups || []).filter(
      m => m.matchup_type === 'NONE' && m.home_score != null && m.away_score != null
    );

    // Group scores by week for median calculation
    const weekScores = {};
    regMatchups.forEach(m => {
      (weekScores[m.week] = weekScores[m.week] || []).push(m.home_score, m.away_score);
    });

    // Compute median
    function calcMedian(scores) {
      const s = [...scores].sort((a, b) => a - b);
      const n = s.length;
      if (n === 0) return 0;
      return n % 2 === 1 ? s[Math.floor(n / 2)] : (s[n / 2 - 1] + s[n / 2]) / 2;
    }

    const medians = {};
    for (const [week, scores] of Object.entries(weekScores)) {
      medians[week] = calcMedian(scores);
    }

    // Tally lucky wins and unlucky losses keyed by team_name
    const tally = {};
    regMatchups.forEach(m => {
      const median = medians[m.week];
      [
        { team: m.home_team?.trim(), score: m.home_score, won: m.home_score > m.away_score },
        { team: m.away_team?.trim(), score: m.away_score, won: m.away_score > m.home_score },
      ].forEach(({ team, score, won }) => {
        if (!team) return;
        if (!tally[team]) tally[team] = { lucky: 0, unlucky: 0 };
        if (won  && score < median) tally[team].lucky++;
        if (!won && score > median) tally[team].unlucky++;
      });
    });

    // Sort: net desc, then lucky desc as tiebreaker
    const rows = Object.entries(tally).map(([teamName, t]) => ({
      teamName,
      lucky: t.lucky,
      unlucky: t.unlucky,
      net: t.lucky - t.unlucky,
    }));
    rows.sort((a, b) => b.net - a.net || b.lucky - a.lucky);

    // Label thresholds
    const maxNet = rows[0]?.net ?? 0;
    const minNet = rows[rows.length - 1]?.net ?? 0;

    // Build table rows
    const tbody = rows.map(r => {
      const owner  = teamToOwner[r.teamName] || '';
      const logo   = owner ? logos[owner] : '';
      const logoEl = logo
        ? `<img src="${logo}" class="lsc-logo" alt="" loading="lazy"/>`
        : `<div class="lsc-logo-ph"></div>`;
      const netCls = r.net > 0 ? 'lucky-net-pos' : r.net < 0 ? 'lucky-net-neg' : 'lucky-net-zero';
      const netStr = r.net > 0 ? `+${r.net}` : String(r.net);
      let badges = '';
      if (r.net === maxNet) badges += `<span class="lucky-label-badge lucky-duck">Lucky Duck</span>`;
      if (r.net === minNet) badges += `<span class="lucky-label-badge unlucky-duck">Unlucky Duck</span>`;
      return `<tr>
        <td class="lsc-team-cell">
          ${logoEl}
          <span class="lsc-tname">${r.teamName}</span>
        </td>
        <td class="lucky-count">${r.lucky}</td>
        <td class="unlucky-count">${r.unlucky}</td>
        <td class="${netCls}">${netStr}</td>
        <td>${badges}</td>
      </tr>`;
    }).join('');

    el.innerHTML = `
      <div class="pr-home-header">
        <div class="section-title">
          ${Icons.zap({ size: 16 })}
          Lucky Wins &amp; Unlucky Losses
        </div>
      </div>
      <div class="table-wrap">
        <table class="lsc-table lucky-table">
          <thead>
            <tr>
              <th class="lsc-th-team">Team</th>
              <th title="Won matchup scoring in bottom half of league">Lucky</th>
              <th title="Lost matchup scoring in top half of league">Unlucky</th>
              <th class="lucky-th-net">+/−</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${tbody}</tbody>
        </table>
      </div>
      <div class="lucky-legend">
        <span><strong>Lucky:</strong> Won matchup &amp; scored below the weekly median</span>
        <span><strong>Unlucky:</strong> Lost matchup &amp; scored above the weekly median</span>
        <span><strong>+/-:</strong> Net lucky/unlucky weeks</span>
      </div>`;
  })();

  // ── ANALYTICS SECTION ────────────────────────────────────────

  function computeBoxStats(arr) {
    const s = [...arr].filter(v => v != null && v > 0).sort((a, b) => a - b);
    if (!s.length) return null;
    const n = s.length;
    const median = n % 2 === 1 ? s[Math.floor(n/2)] : (s[n/2-1]+s[n/2])/2;
    const q1 = s[Math.floor(n/4)];
    const q3 = s[Math.floor(n*3/4)];
    return { min: s[0], q1, median, q3, max: s[n-1], n };
  }

  function renderHorizBoxPlots(containerEl, teamRows) {
    if (!containerEl) return;
    if (containerEl._bpTip) { containerEl._bpTip.remove(); containerEl._bpTip = null; }
    const CLR = DESIGN.colors;
    const rowH = 50, padT = 28, padB = 32, padL = 220, padR = 24;
    const logoSize = 28, logoX = 6, textX = logoX + logoSize + 8;
    const totalH = padT + teamRows.length * rowH + padB;
    const w = Math.max(480, containerEl.clientWidth || 480);
    const innerW = w - padL - padR;
    const allVals = teamRows.flatMap(r => [r.stats.min, r.stats.max]);
    const gMin = Math.floor(Math.min(...allVals) / 10) * 10;
    const gMax = Math.ceil(Math.max(...allVals) / 10) * 10;
    const xS = v => padL + ((v - gMin) / (gMax - gMin)) * innerW;
    const step = (gMax - gMin) <= 60 ? 10 : 20;

    // Clip paths: one per row (circular logo mask) + text area clip
    let defs = '<defs>';
    teamRows.forEach((_, i) => {
      const cy = padT + i * rowH + rowH / 2;
      defs += `<clipPath id="bpclip_${i}"><circle cx="${(logoX + logoSize/2).toFixed(1)}" cy="${cy}" r="${(logoSize/2).toFixed(1)}"/></clipPath>`;
    });
    defs += `<clipPath id="bptxtclip"><rect x="${textX}" y="0" width="${padL - textX - 8}" height="${totalH}"/></clipPath>`;
    defs += '</defs>';

    let axis = '', grid = '', rows = '';
    for (let v = gMin; v <= gMax; v += step) {
      const x = xS(v).toFixed(1);
      axis += `<text x="${x}" y="${padT - 8}" text-anchor="middle" fill="${CLR.textMuted}" font-size="11" font-family="${DESIGN.chart.fontFamily}">${v}</text>`;
      grid += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${(padT + teamRows.length * rowH).toFixed(1)}" stroke="${CLR.gridLine}" stroke-width="1"/>`;
    }

    teamRows.forEach((row, i) => {
      const { stats, label, teamName, logoUrl } = row;
      const cy = padT + i * rowH + rowH / 2;
      const x1 = xS(stats.min), x2 = xS(stats.max);
      const qx1 = xS(stats.q1), qx2 = xS(stats.q3);
      const mx = xS(stats.median);
      const boxH = 14, capH = 8;

      // Alternating band
      if (i % 2 === 0) rows += `<rect x="0" y="${(cy - rowH/2).toFixed(1)}" width="${w}" height="${rowH}" fill="rgba(255,255,255,0.018)" rx="0"/>`;

      // Hover highlight rect (initially invisible, fades in via JS)
      rows += `<rect class="bp-hl" data-i="${i}" x="0" y="${(cy - rowH/2).toFixed(1)}" width="${w}" height="${rowH}" fill="rgba(241,255,250,0.07)" opacity="0" style="transition:opacity 0.15s;pointer-events:none"/>`;

      // Logo circle
      if (logoUrl) {
        rows += `<image href="${logoUrl}" x="${logoX}" y="${(cy - logoSize/2).toFixed(1)}" width="${logoSize}" height="${logoSize}" clip-path="url(#bpclip_${i})" preserveAspectRatio="xMidYMid slice"/>`;
      } else {
        rows += `<circle cx="${(logoX + logoSize/2).toFixed(1)}" cy="${cy}" r="${(logoSize/2).toFixed(1)}" fill="${CLR.bgCard}"/>`;
      }
      rows += `<circle cx="${(logoX + logoSize/2).toFixed(1)}" cy="${cy}" r="${(logoSize/2).toFixed(1)}" fill="none" stroke="${CLR.border}" stroke-width="1"/>`;

      // Team name — 16px bold, white
      rows += `<text x="${textX}" y="${cy}" dominant-baseline="middle" fill="#e2e8f0" font-size="16" font-family="${DESIGN.chart.fontFamily}" font-weight="700" clip-path="url(#bptxtclip)">${teamName || label}</text>`;

      // Box plot — single brand color #F1FFFA across all rows
      rows += `<line x1="${x1.toFixed(1)}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${cy}" stroke="${CLR.textSecondary}" stroke-width="1.5"/>`;
      rows += `<line x1="${x1.toFixed(1)}" y1="${(cy-capH/2).toFixed(1)}" x2="${x1.toFixed(1)}" y2="${(cy+capH/2).toFixed(1)}" stroke="${CLR.textSecondary}" stroke-width="1.5"/>`;
      rows += `<line x1="${x2.toFixed(1)}" y1="${(cy-capH/2).toFixed(1)}" x2="${x2.toFixed(1)}" y2="${(cy+capH/2).toFixed(1)}" stroke="${CLR.textSecondary}" stroke-width="1.5"/>`;
      rows += `<rect class="bp-box" data-i="${i}" x="${qx1.toFixed(1)}" y="${(cy-boxH/2).toFixed(1)}" width="${(qx2-qx1).toFixed(1)}" height="${boxH}" fill="#c9a227" rx="2"/>`;
      rows += `<line x1="${mx.toFixed(1)}" y1="${(cy-boxH/2-1).toFixed(1)}" x2="${mx.toFixed(1)}" y2="${(cy+boxH/2+1).toFixed(1)}" stroke="#fff" stroke-width="2.5"/>`;

      // Full-row hover target (transparent, on top)
      rows += `<rect class="bp-row" data-i="${i}" x="0" y="${(cy - rowH/2).toFixed(1)}" width="${w}" height="${rowH}" fill="transparent" style="cursor:pointer"/>`;
    });

    containerEl.innerHTML = `
      <div class="pr-chart-scroll">
        <svg width="${w}" height="${totalH}" style="display:block;max-width:100%;min-width:420px;">
          ${defs}${grid}${axis}${rows}
        </svg>
      </div>`;

    const tip = document.createElement('div');
    tip.style.cssText = DESIGN.tooltipStyle;
    document.body.appendChild(tip);
    containerEl._bpTip = tip;
    containerEl.querySelectorAll('.bp-row').forEach(el => {
      const idx = parseInt(el.dataset.i);
      const row = teamRows[idx];
      const hl  = containerEl.querySelector(`.bp-hl[data-i="${idx}"]`);
      el.addEventListener('mouseenter', () => {
        if (hl) hl.setAttribute('opacity', '1');
        const s = row.stats;
        tip.innerHTML =
          `<strong style="display:block;margin-bottom:4px">${row.teamName || row.label}</strong>` +
          `<span style="color:${CLR.textMuted}">Min:</span> ${s.min.toFixed(1)}` +
          ` &nbsp;·&nbsp; <span style="color:${CLR.textMuted}">25th:</span> ${s.q1.toFixed(1)}` +
          ` &nbsp;·&nbsp; <span style="color:${CLR.textMuted}">Median:</span> <span style="color:${CLR.accentGold};font-weight:700">${s.median.toFixed(1)}</span>` +
          ` &nbsp;·&nbsp; <span style="color:${CLR.textMuted}">75th:</span> ${s.q3.toFixed(1)}` +
          ` &nbsp;·&nbsp; <span style="color:${CLR.textMuted}">Max:</span> ${s.max.toFixed(1)}` +
          ` &nbsp;·&nbsp; <span style="color:${CLR.textMuted}">Games:</span> ${s.n}`;
        tip.style.opacity = '1';
      });
      el.addEventListener('mousemove', e => { tip.style.left=(e.clientX+14)+'px'; tip.style.top=(e.clientY-10)+'px'; });
      el.addEventListener('mouseleave', () => {
        if (hl) hl.setAttribute('opacity', '0');
        tip.style.opacity = '0';
      });
    });
  }

  function renderHistogram(containerEl, allScores) {
    if (!containerEl || !allScores.length) return;
    if (containerEl._histTip) { containerEl._histTip.remove(); containerEl._histTip = null; }
    const CLR = DESIGN.colors;
    const sorted = [...allScores].sort((a, b) => a - b);
    const n = sorted.length;
    const p25 = sorted[Math.floor(n * 0.25)];
    const median = n % 2 === 1 ? sorted[Math.floor(n/2)] : (sorted[n/2-1]+sorted[n/2])/2;
    const p75 = sorted[Math.floor(n * 0.75)];
    const bMin = Math.floor(Math.min(...sorted) / 10) * 10;
    const bMax = Math.ceil(Math.max(...sorted) / 10) * 10;
    const buckets = [];
    for (let b = bMin; b < bMax; b += 10) {
      buckets.push({ lo: b, hi: b+10, count: allScores.filter(s => s >= b && s < b+10).length });
    }
    const maxCount = Math.max(...buckets.map(b => b.count));
    const padL = 40, padR = 12, padT = 12, padB = 32;
    const w = Math.max(260, containerEl.clientWidth || 260);
    const innerW = w - padL - padR;
    const innerH = 150;
    const totalH = padT + innerH + padB;
    const barW = innerW / buckets.length;
    const yS = v => padT + innerH - (v / maxCount) * innerH;

    let bars = '', xAxis = '', yAxis = '';
    buckets.forEach((b, i) => {
      const x = (padL + (b.lo - bMin) / (bMax - bMin) * innerW).toFixed(1);
      const bw = Math.max(1, barW - 1.5).toFixed(1);
      const y = yS(b.count).toFixed(1);
      const bh = (padT + innerH - parseFloat(y)).toFixed(1);
      if (b.count > 0) bars += `<rect class="hist-bar" data-count="${b.count}" data-lo="${b.lo}" data-hi="${b.hi}" x="${x}" y="${y}" width="${bw}" height="${bh}" fill="#7baee0" opacity="0.8" rx="1"/>`;
      if (i % 2 === 0 || buckets.length <= 10) xAxis += `<text x="${(parseFloat(x)+barW/2).toFixed(1)}" y="${totalH-4}" text-anchor="middle" fill="${CLR.textMuted}" font-size="9" font-family="${DESIGN.chart.fontFamily}">${b.lo}</text>`;
    });
    [0, Math.round(maxCount/2), maxCount].forEach(v => {
      const y = yS(v).toFixed(1);
      yAxis += `<text x="${padL-4}" y="${y}" text-anchor="end" dominant-baseline="middle" fill="${CLR.textMuted}" font-size="9" font-family="${DESIGN.chart.fontFamily}">${v}</text>`;
      yAxis += `<line x1="${padL}" y1="${y}" x2="${(padL+innerW).toFixed(1)}" y2="${y}" stroke="${CLR.gridLine}" stroke-width="1"/>`;
    });

    const pill = (val, lbl) => `<div style="text-align:center;flex:1"><div style="font-family:${DESIGN.chart.fontFamily};font-size:0.62rem;color:${CLR.textMuted};letter-spacing:0.07em;text-transform:uppercase;margin-bottom:2px">${lbl}</div><div style="font-family:${DESIGN.chart.fontFamily};font-size:1.1rem;font-weight:700;color:${CLR.accentGold}">${val.toFixed(1)}</div></div>`;
    containerEl.innerHTML = `
      <div style="display:flex;gap:0.5rem;margin-bottom:0.75rem;">${pill(p25,'25th Pct')}${pill(median,'Median')}${pill(p75,'75th Pct')}</div>
      <div class="pr-chart-scroll">
        <svg width="${w}" height="${totalH}" style="display:block;max-width:100%;min-width:240px;">
          ${yAxis}${bars}${xAxis}
          <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${(padT+innerH).toFixed(1)}" stroke="${CLR.textMuted}" stroke-width="1"/>
          <line x1="${padL}" y1="${(padT+innerH).toFixed(1)}" x2="${(padL+innerW).toFixed(1)}" y2="${(padT+innerH).toFixed(1)}" stroke="${CLR.textMuted}" stroke-width="1"/>
        </svg>
      </div>`;

    const tip = document.createElement('div');
    tip.style.cssText = DESIGN.tooltipStyle;
    document.body.appendChild(tip);
    containerEl._histTip = tip;
    containerEl.querySelectorAll('.hist-bar').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('mouseenter', () => { el.setAttribute('opacity','1'); tip.innerHTML = `${el.dataset.lo}–${el.dataset.hi} pts<br><strong>${el.dataset.count} games</strong>`; tip.style.opacity='1'; });
      el.addEventListener('mousemove', e => { tip.style.left=(e.clientX+14)+'px'; tip.style.top=(e.clientY-10)+'px'; });
      el.addEventListener('mouseleave', () => { el.setAttribute('opacity','0.8'); tip.style.opacity='0'; });
    });
  }

  function renderVertBoxPlots(containerEl, weekRows) {
    if (!containerEl || !weekRows.length) return;
    if (containerEl._vbpTip) { containerEl._vbpTip.remove(); containerEl._vbpTip = null; }
    const CLR = DESIGN.colors;
    const colW = 40, padL = 44, padR = 12, padT = 12, padB = 28;
    const minW = padL + weekRows.length * colW + padR;
    const w = Math.max(minW, containerEl.clientWidth || minW);
    const totalH = 210;
    const innerH = totalH - padT - padB;
    const allVals = weekRows.flatMap(r => [r.stats.min, r.stats.max]);
    const gMin = Math.floor(Math.min(...allVals) / 10) * 10;
    const gMax = Math.ceil(Math.max(...allVals) / 10) * 10;
    const yS = v => padT + innerH - ((v - gMin) / (gMax - gMin)) * innerH;
    const cx = i => padL + i * colW + colW / 2;
    const yStep = (gMax - gMin) <= 60 ? 10 : 20;

    let yAxis = '', grid = '', cols = '';
    for (let v = gMin; v <= gMax; v += yStep) {
      const y = yS(v).toFixed(1);
      yAxis += `<text x="${padL-5}" y="${y}" text-anchor="end" dominant-baseline="middle" fill="${CLR.textMuted}" font-size="9" font-family="${DESIGN.chart.fontFamily}">${v}</text>`;
      grid += `<line x1="${padL}" y1="${y}" x2="${(padL + weekRows.length * colW).toFixed(1)}" y2="${y}" stroke="${CLR.gridLine}" stroke-width="1"/>`;
    }

    weekRows.forEach((row, i) => {
      const { stats, week } = row;
      const x = cx(i);
      const y1 = yS(stats.min), y2 = yS(stats.max);
      const qy1 = yS(stats.q3), qy2 = yS(stats.q1);
      const my = yS(stats.median);
      const boxW = 16, capW = 8;
      cols += `<line x1="${x}" y1="${y1.toFixed(1)}" x2="${x}" y2="${y2.toFixed(1)}" stroke="${CLR.textSecondary}" stroke-width="1.5"/>`;
      cols += `<line x1="${(x-capW/2).toFixed(1)}" y1="${y1.toFixed(1)}" x2="${(x+capW/2).toFixed(1)}" y2="${y1.toFixed(1)}" stroke="${CLR.textSecondary}" stroke-width="1.5"/>`;
      cols += `<line x1="${(x-capW/2).toFixed(1)}" y1="${y2.toFixed(1)}" x2="${(x+capW/2).toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${CLR.textSecondary}" stroke-width="1.5"/>`;
      cols += `<rect class="vbp-box" data-i="${i}" x="${(x-boxW/2).toFixed(1)}" y="${qy1.toFixed(1)}" width="${boxW}" height="${(qy2-qy1).toFixed(1)}" fill="#7baee0" rx="2"/>`;
      cols += `<line x1="${(x-boxW/2).toFixed(1)}" y1="${my.toFixed(1)}" x2="${(x+boxW/2).toFixed(1)}" y2="${my.toFixed(1)}" stroke="#fff" stroke-width="2"/>`;
      cols += `<text x="${x}" y="${totalH-5}" text-anchor="middle" fill="${CLR.textMuted}" font-size="9" font-family="${DESIGN.chart.fontFamily}">W${week}</text>`;
    });

    containerEl.innerHTML = `
      <div class="pr-chart-scroll">
        <svg width="${Math.max(minW, w)}" height="${totalH}" style="display:block;max-width:100%;min-width:${minW}px;">
          ${grid}${yAxis}${cols}
        </svg>
      </div>`;

    const tip = document.createElement('div');
    tip.style.cssText = DESIGN.tooltipStyle;
    document.body.appendChild(tip);
    containerEl._vbpTip = tip;
    containerEl.querySelectorAll('.vbp-box').forEach(el => {
      const row = weekRows[parseInt(el.dataset.i)];
      el.style.cursor = 'pointer';
      el.addEventListener('mouseenter', () => { tip.innerHTML = `<strong>Week ${row.week}</strong><br>Min: ${row.stats.min.toFixed(1)}<br>Q1: ${row.stats.q1.toFixed(1)}<br>Median: ${row.stats.median.toFixed(1)}<br>Q3: ${row.stats.q3.toFixed(1)}<br>Max: ${row.stats.max.toFixed(1)}`; tip.style.opacity='1'; });
      el.addEventListener('mousemove', e => { tip.style.left=(e.clientX+14)+'px'; tip.style.top=(e.clientY-10)+'px'; });
      el.addEventListener('mouseleave', () => { tip.style.opacity='0'; });
    });
  }

  function renderScoringTab(el, year) {
    if (!el) return;
    const regMs = latestMatchups.filter(m => m.matchup_type === 'NONE');
    if (!regMs.length) { el.innerHTML = '<div class="analytics-coming-soon">No regular season data</div>'; return; }

    const logoMap = typeof TEAM_LOGOS !== 'undefined' ? TEAM_LOGOS : {};
    const ownerTeamMap = {};
    (latestSeason.teams || []).forEach(t => { ownerTeamMap[t.owner] = t.team_name; });

    const ownerScores = {};
    regMs.forEach(m => {
      (ownerScores[m.home_owner] = ownerScores[m.home_owner] || []).push(m.home_score);
      (ownerScores[m.away_owner] = ownerScores[m.away_owner] || []).push(m.away_score);
    });
    const teamRows = Object.entries(ownerScores)
      .map(([owner, scores]) => ({
        label:    Utils.shortOwner(owner),
        teamName: ownerTeamMap[owner] || Utils.shortOwner(owner),
        logoUrl:  logoMap[owner] || '',
        stats:    computeBoxStats(scores),
      }))
      .filter(r => r.stats)
      .sort((a, b) => b.stats.median - a.stats.median);

    const weekMap = {};
    regMs.forEach(m => { (weekMap[m.week] = weekMap[m.week] || []).push(m.home_score, m.away_score); });
    const weekRows = Object.keys(weekMap)
      .map(w => ({ week: parseInt(w), stats: computeBoxStats(weekMap[w]) }))
      .filter(r => r.stats)
      .sort((a, b) => a.week - b.week);

    const allScores = regMs.flatMap(m => [m.home_score, m.away_score]);

    el.innerHTML = `
      <div class="widget-card" style="padding:1rem 1.25rem;overflow:hidden;">
        <div class="scoring-sub-title" style="margin-bottom:0.75rem;">Team Scoring Distribution
          <span style="font-weight:400;text-transform:none;letter-spacing:0;margin-left:0.75rem;font-size:0.7rem;color:var(--text-muted);">Sorted by median · ${year} regular season</span>
        </div>
        <div id="scoringTeamBoxChart"></div>
        <div class="bp-legend" style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--border);">
          <div class="bp-legend-item"><div class="bp-legend-whisker"></div>Min / Max</div>
          <div class="bp-legend-item"><div class="bp-legend-box"></div>25th – 75th Pct</div>
          <div class="bp-legend-item"><div style="width:2px;height:16px;background:#fff;border-radius:1px;"></div>Median</div>
        </div>
      </div>
      <div class="scoring-sub-grid">
        <div class="widget-card" style="padding:1rem 1.25rem;overflow:hidden;">
          <div class="scoring-sub-title">League Score Distribution</div>
          <div id="scoringHistogram"></div>
        </div>
        <div class="widget-card" style="padding:1rem 1.25rem;overflow:hidden;">
          <div class="scoring-sub-title">Weekly Score Distribution
            <span style="font-weight:400;text-transform:none;letter-spacing:0;margin-left:0.5rem;font-size:0.7rem;color:var(--text-muted);">Box plot per week</span>
          </div>
          <div id="scoringWeeklyBox"></div>
        </div>
      </div>`;

    const teamBoxEl = document.getElementById('scoringTeamBoxChart');
    const histEl    = document.getElementById('scoringHistogram');
    const weeklyEl  = document.getElementById('scoringWeeklyBox');

    renderHorizBoxPlots(teamBoxEl, teamRows);
    renderHistogram(histEl, allScores);
    renderVertBoxPlots(weeklyEl, weekRows);

    if (typeof ResizeObserver !== 'undefined') {
      [
        [teamBoxEl, () => renderHorizBoxPlots(teamBoxEl, teamRows)],
        [histEl,    () => renderHistogram(histEl, allScores)],
        [weeklyEl,  () => renderVertBoxPlots(weeklyEl, weekRows)],
      ].forEach(([target, fn]) => {
        let t = null;
        const ro = new ResizeObserver(entries => {
          if (!entries[0].contentRect.width) return;
          clearTimeout(t); t = setTimeout(fn, 80);
        });
        ro.observe(target);
      });
    }
  }

  (function initHomePageNav() {
    const nav = document.getElementById('homePageNav');
    if (!nav) return;

    nav.querySelectorAll('.home-page-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        nav.querySelectorAll('.home-page-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.home-page-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.panel).classList.add('active');
      });
    });

    renderScoringTab(document.getElementById('scoringPanelContent'), latestYear);
  })();

})();
