/* =============================================
   playoffs.js — Playoff Bracket page
   ============================================= */

(function () {
  const seasons = Utils.getSeasons().filter(([, s]) => {
    return s.matchups && s.matchups.some(m =>
      m.matchup_type === 'WINNERS_BRACKET' || m.is_playoff
    );
  });

  const teamOwnerMap = Utils.buildTeamOwnerMap();

  // URL param for year
  const params = new URLSearchParams(window.location.search);
  let activeYear = params.get('year') || seasons[seasons.length - 1][0];
  if (!seasons.find(([y]) => y === activeYear)) activeYear = seasons[seasons.length - 1][0];

  // ── POPULATE DROPDOWNS & TABS ────────────────
  const playoffsNav = document.getElementById('playoffsDropdownNav');
  const draftNav    = document.getElementById('draftDropdownNav');
  const allDraftSeasons = Utils.getSeasons().filter(([,s]) => s.draft && s.draft.length > 0);

  playoffsNav.innerHTML = seasons.map(([y]) =>
    `<li><a href="playoffs.html?year=${y}" class="${y === activeYear ? 'active' : ''}">${y} Season</a></li>`
  ).join('');

  draftNav.innerHTML = allDraftSeasons.map(([y]) =>
    `<li><a href="draft.html?year=${y}">${y} Season</a></li>`
  ).join('');

  document.getElementById('playoffYearTabs').innerHTML = seasons.map(([y]) =>
    `<a href="playoffs.html?year=${y}" class="draft-tab ${y === activeYear ? 'draft-tab-active' : ''}">${y}</a>`
  ).join('');

  // ── RENDER ───────────────────────────────────
  function getOwner(year, teamName) {
    if (!teamName || teamName === 'N/A') return '';
    return Utils.shortOwner(teamOwnerMap[`${year}_${teamName?.trim()}`] || '');
  }

  function renderBracket(year) {
    const season = LEAGUE_DATA[year];
    const leagueName = season.settings?.league_name || '';
    document.getElementById('playoffsTitle').textContent = `${year} Playoff Bracket`;
    document.getElementById('playoffsSub').textContent = leagueName || `${year} Season`;

    const allMatchups = season.matchups || [];

    // Separate bracket types
    const winnersBracket      = allMatchups.filter(m => m.matchup_type === 'WINNERS_BRACKET');
    const consolationBracket  = allMatchups.filter(m => m.matchup_type === 'WINNERS_CONSOLATION_LADDER');
    const losersBracket       = allMatchups.filter(m => m.matchup_type === 'LOSERS_CONSOLATION_LADDER');

    // Group by week → rounds
    function groupByWeek(matches) {
      const grouped = {};
      for (const m of matches) {
        if (!grouped[m.week]) grouped[m.week] = [];
        grouped[m.week].push(m);
      }
      return Object.entries(grouped).sort(([a],[b]) => Number(a) - Number(b));
    }

    const champRounds = groupByWeek(winnersBracket);
    const consolRounds = groupByWeek(consolationBracket);
    const losersRounds = groupByWeek(losersBracket);

    const champion = season.champion?.trim() || '';
    const champOwner = getOwner(year, champion);

    const html = `
      <div class="bracket-section">
        <div class="bracket-section-title">${Icons.trophy({ size: 16 })} Championship Bracket</div>
        ${renderMainBracket(champRounds, year, champion)}
      </div>
      ${consolRounds.length ? `
      <div class="bracket-section" style="margin-top:2.5rem">
        <div class="bracket-section-title">${Icons.medal({ size: 16 })} Consolation Bracket</div>
        ${renderLinearBracket(consolRounds, year, '3rd Place')}
      </div>` : ''}
      ${losersRounds.length ? `
      <div class="bracket-section" style="margin-top:2.5rem">
        <div class="bracket-section-title">${Icons.skull({ size: 16 })} Toilet Bowl</div>
        ${renderLinearBracket(losersRounds, year, 'Last Place')}
      </div>` : ''}
    `;

    document.getElementById('playoffContent').innerHTML = html;
  }

  // ── CHAMPIONSHIP BRACKET ─────────────────────
  function renderMainBracket(rounds, year, champion) {
    if (!rounds.length) return '<p style="color:var(--text-muted)">No data.</p>';

    const roundNames = getRoundNames(rounds.length);

    const roundCols = rounds.map(([week, matches], ri) => {
      const isLastRound = ri === rounds.length - 1;
      const matchCards = matches
        .filter(m => m.home_team && m.home_team !== 'N/A')
        .map(m => buildMatchCard(m, year, isLastRound, champion));

      return `
        <div class="bracket-round">
          <div class="bracket-round-label">${roundNames[ri] || `Round ${ri + 1}`}</div>
          <div class="bracket-round-matches" style="--match-count:${matchCards.length}">
            ${matchCards.join('')}
          </div>
        </div>
      `;
    });

    return `<div class="bracket-grid" style="--round-count:${rounds.length}">${roundCols.join('')}</div>`;
  }

  function getRoundNames(totalRounds) {
    if (totalRounds === 1) return ['Championship'];
    if (totalRounds === 2) return ['Semifinals', 'Championship'];
    if (totalRounds === 3) return ['Quarterfinals', 'Semifinals', 'Championship'];
    return rounds.map((_, i) => `Round ${i + 1}`);
  }

  function buildMatchCard(m, year, isFinal, champion) {
    const homeTeam  = m.home_team?.trim() || 'BYE';
    const awayTeam  = m.away_team?.trim() || 'BYE';
    const homeScore = m.home_score || 0;
    const awayScore = m.away_score || 0;
    const isBye     = awayTeam === 'BYE' || awayScore === 0;

    const homeWon = isBye ? true : homeScore > awayScore;
    const awayWon = !isBye && awayScore > homeScore;

    const homeOwner = getOwner(year, homeTeam);
    const awayOwner = getOwner(year, awayTeam);

    const isChamp = isFinal && (homeTeam === champion || awayTeam === champion);

    return `
      <div class="bracket-match ${isFinal ? 'bracket-match-final' : ''}">
        ${isFinal && isChamp ? `<div class="bracket-final-label">${Icons.trophy({ size: 12 })} Championship</div>` : ''}
        <div class="bracket-team ${homeWon ? 'bracket-winner' : isBye ? '' : 'bracket-loser'}">
          <span class="bracket-team-name" title="${homeTeam}">${homeTeam}</span>
          <span class="bracket-team-owner">${homeOwner}</span>
          <span class="bracket-score ${homeWon ? 'score-win' : 'score-loss'}">${isBye ? 'BYE' : homeScore.toFixed(1)}</span>
        </div>
        <div class="bracket-divider"></div>
        <div class="bracket-team ${awayWon ? 'bracket-winner' : isBye ? 'bracket-bye' : 'bracket-loser'}">
          <span class="bracket-team-name" title="${awayTeam}">${isBye ? '— BYE —' : awayTeam}</span>
          <span class="bracket-team-owner">${isBye ? '' : awayOwner}</span>
          <span class="bracket-score ${awayWon ? 'score-win' : 'score-loss'}">${isBye ? '' : awayScore.toFixed(1)}</span>
        </div>
      </div>
    `;
  }

  // ── CONSOLATION / LOSERS (linear per round) ──
  function renderLinearBracket(rounds, year, label) {
    return rounds.map(([week, matches], ri) => {
      const isLast = ri === rounds.length - 1;
      const cards = matches
        .filter(m => m.home_team && m.home_team !== 'N/A')
        .map(m => buildMatchCard(m, year, false, ''));

      return `
        <div style="margin-bottom:1.25rem">
          <div class="bracket-round-label" style="margin-bottom:0.6rem">${isLast ? label + ' Game' : `Round ${ri + 1}`} <span style="color:var(--text-muted);font-weight:400;font-size:0.75rem">— Week ${week}</span></div>
          <div style="display:flex;flex-wrap:wrap;gap:0.75rem">${cards.join('')}</div>
        </div>
      `;
    }).join('');
  }

  renderBracket(activeYear);

})();
