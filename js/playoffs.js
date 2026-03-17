/* =============================================
   playoffs.js — Playoff Bracket page
   ============================================= */

(function () {
  try {
  const seasons = Utils.getSeasons().filter(([, s]) => {
    return s.matchups && s.matchups.some(m =>
      m.matchup_type === 'WINNERS_BRACKET' || m.is_playoff
    );
  });

  const teamOwnerMap = Utils.buildTeamOwnerMap();

  // ── Custom picker helper ───────────────────────
  function makePicker(btnId, valId, panelId) {
    const btn     = document.getElementById(btnId);
    const valEl   = document.getElementById(valId);
    const panel   = document.getElementById(panelId);
    if (!btn || !valEl || !panel) {
      console.error('makePicker: element(s) not found', { btnId, valId, panelId });
      return { getValue: () => null, setValue: () => {}, populate: () => {}, onChange: () => {} };
    }
    let currentValue = null;
    const callbacks  = [];

    function open()  { panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); }
    function close() { panel.hidden = true;  btn.setAttribute('aria-expanded', 'false'); }
    btn.addEventListener('click', e => { e.stopPropagation(); panel.hidden ? open() : close(); });
    document.addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

    function populate(items) {
      panel.innerHTML = '';
      items.forEach(({ value, label }) => {
        const opt = document.createElement('div');
        opt.className = 'pr-picker-option' + (String(value) === String(currentValue) ? ' selected' : '');
        opt.setAttribute('role', 'option');
        opt.setAttribute('aria-selected', String(value) === String(currentValue) ? 'true' : 'false');
        opt.dataset.value = value;
        opt.innerHTML = `<svg class="pr-picker-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg><span>${label}</span>`;
        opt.addEventListener('click', e => {
          e.stopPropagation();
          setValue(value, label);
          close();
          callbacks.forEach(cb => cb(value));
        });
        panel.appendChild(opt);
      });
    }

    function setValue(value, label) {
      currentValue = String(value);
      valEl.textContent = label || value;
      panel.querySelectorAll('.pr-picker-option').forEach(el => {
        const sel = el.dataset.value === String(value);
        el.classList.toggle('selected', sel);
        el.setAttribute('aria-selected', sel ? 'true' : 'false');
      });
    }

    return { getValue: () => currentValue, setValue, populate, onChange: cb => callbacks.push(cb) };
  }

  // Active year from URL or default to latest
  function getYearFromURL() {
    const y = new URLSearchParams(window.location.search).get('year');
    return (y && seasons.find(([yr]) => yr === y)) ? y : seasons[seasons.length - 1][0];
  }

  let activeYear = getYearFromURL();

  // ── BUILD YEAR PICKER ─────────────────────────
  const yearPicker = makePicker('yearPickerBtn', 'yearPickerVal', 'yearPickerPanel');
  const yearItems  = [...seasons].reverse().map(([y]) => ({ value: y, label: y }));
  yearPicker.populate(yearItems);
  yearPicker.setValue(activeYear, activeYear);

  yearPicker.onChange(year => { switchYear(year); });

  // ── SWITCH YEAR ───────────────────────────────
  function switchYear(year) {
    if (year === activeYear) return;
    activeYear = year;
    history.pushState({ year }, '', `playoffs.html?year=${year}`);
    renderBracket(activeYear);
  }

  // Browser back/forward
  window.addEventListener('popstate', e => {
    activeYear = (e.state && e.state.year) ? e.state.year : getYearFromURL();
    yearPicker.setValue(activeYear, activeYear);
    renderBracket(activeYear);
  });

  // ── HELPERS ───────────────────────────────────
  function getOwner(year, teamName) {
    if (!teamName || teamName === 'N/A') return '';
    return Utils.shortOwner(teamOwnerMap[`${year}_${teamName?.trim()}`] || '');
  }

  // ── RENDER BRACKET ────────────────────────────
  function renderBracket(year) {
    const season = LEAGUE_DATA[year];
    const leagueName = season.settings?.league_name || '';
    document.getElementById('playoffsTitle').textContent = `${year} Playoff Bracket`;
    document.getElementById('playoffsSub').textContent = leagueName || `${year} Season`;

    // Build seed map: { "Team Name" → seed_number } from regular season standings
    const seedMap = {};
    (season.teams || []).forEach(t => {
      if (t.standing) seedMap[t.team_name.trim()] = t.standing;
    });

    const allMatchups = season.matchups || [];
    const winnersBracket     = allMatchups.filter(m => m.matchup_type === 'WINNERS_BRACKET');
    const consolationBracket = allMatchups.filter(m => m.matchup_type === 'WINNERS_CONSOLATION_LADDER');
    const losersBracket      = allMatchups.filter(m => m.matchup_type === 'LOSERS_CONSOLATION_LADDER');

    function groupByWeek(matches) {
      const grouped = {};
      for (const m of matches) {
        if (!grouped[m.week]) grouped[m.week] = [];
        grouped[m.week].push(m);
      }
      return Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b));
    }

    const champRounds  = groupByWeek(winnersBracket);
    const consolRounds = groupByWeek(consolationBracket);
    const losersRounds = groupByWeek(losersBracket);
    const champion     = season.champion?.trim() || '';

    document.getElementById('playoffContent').innerHTML = `
      <div class="bracket-section">
        <div class="bracket-section-title">${Icons.trophy({ size: 16 })} Championship Bracket</div>
        ${renderMainBracket(champRounds, year, champion, seedMap)}
      </div>
      ${consolRounds.length ? `
      <div class="bracket-section section-block-top">
        <div class="bracket-section-title">${Icons.medal({ size: 16 })} Consolation Bracket</div>
        ${renderLinearBracket(consolRounds, year, '3rd Place', seedMap)}
      </div>` : ''}
      ${losersRounds.length ? `
      <div class="bracket-section section-block-top">
        <div class="bracket-section-title">${Icons.skull({ size: 16 })} Toilet Bowl</div>
        ${renderLinearBracket(losersRounds, year, 'Last Place', seedMap)}
      </div>` : ''}
    `;
  }

  // ── CHAMPIONSHIP BRACKET ─────────────────────
  function renderMainBracket(rounds, year, champion, seedMap) {
    if (!rounds.length) return '<p style="color:var(--text-muted)">No data.</p>';
    const roundNames = getRoundNames(rounds.length);
    const roundCols = rounds.map(([, matches], ri) => {
      const isLastRound = ri === rounds.length - 1;
      const matchCards = matches
        .filter(m => m.home_team && m.home_team !== 'N/A')
        .map(m => buildMatchCard(m, year, isLastRound, champion, seedMap));
      return `
        <div class="bracket-round">
          <div class="bracket-round-label">${roundNames[ri] || `Round ${ri + 1}`}</div>
          <div class="bracket-round-matches" style="--match-count:${matchCards.length}">
            ${matchCards.join('')}
          </div>
        </div>`;
    });
    return `<div class="bracket-grid" style="--round-count:${rounds.length}">${roundCols.join('')}</div>`;
  }

  function getRoundNames(totalRounds) {
    if (totalRounds === 1) return ['Championship'];
    if (totalRounds === 2) return ['Semifinals', 'Championship'];
    if (totalRounds === 3) return ['Quarterfinals', 'Semifinals', 'Championship'];
    return Array.from({ length: totalRounds }, (_, i) => `Round ${i + 1}`);
  }

  function buildMatchCard(m, year, isFinal, champion, seedMap = {}) {
    const homeTeam  = m.home_team?.trim() || 'BYE';
    const awayTeam  = m.away_team?.trim() || 'BYE';
    const homeScore = m.home_score || 0;
    const awayScore = m.away_score || 0;
    const isBye     = awayTeam === 'BYE' || awayScore === 0;
    const homeWon   = isBye ? true : homeScore > awayScore;
    const awayWon   = !isBye && awayScore > homeScore;
    const homeOwner = getOwner(year, homeTeam);
    const awayOwner = getOwner(year, awayTeam);
    const isChamp   = isFinal && (homeTeam === champion || awayTeam === champion);
    const homeSeed  = seedMap[homeTeam];
    const awaySeed  = seedMap[awayTeam];
    return `
      <div class="bracket-match ${isFinal ? 'bracket-match-final' : ''}">
        ${isFinal && isChamp ? `<div class="bracket-final-label">${Icons.trophy({ size: 12 })} Championship</div>` : ''}
        <div class="bracket-team ${homeWon ? 'bracket-winner' : isBye ? '' : 'bracket-loser'}">
          ${homeSeed ? `<span class="bracket-seed">${homeSeed}</span>` : ''}
          <span class="bracket-team-name" title="${homeTeam}">${homeTeam}</span>
          <span class="bracket-team-owner">${homeOwner}</span>
          <span class="bracket-score ${homeWon ? 'score-win' : 'score-loss'}">${isBye ? 'BYE' : homeScore.toFixed(2)}</span>
        </div>
        <div class="bracket-divider"></div>
        <div class="bracket-team ${awayWon ? 'bracket-winner' : isBye ? 'bracket-bye' : 'bracket-loser'}">
          ${awaySeed && !isBye ? `<span class="bracket-seed">${awaySeed}</span>` : ''}
          <span class="bracket-team-name" title="${awayTeam}">${isBye ? '— BYE —' : awayTeam}</span>
          <span class="bracket-team-owner">${isBye ? '' : awayOwner}</span>
          <span class="bracket-score ${awayWon ? 'score-win' : 'score-loss'}">${isBye ? '' : awayScore.toFixed(2)}</span>
        </div>
      </div>`;
  }

  // ── CONSOLATION / LOSERS ─────────────────────
  function renderLinearBracket(rounds, year, label, seedMap) {
    return rounds.map(([week, matches], ri) => {
      const isLast = ri === rounds.length - 1;
      const cards = matches
        .filter(m => m.home_team && m.home_team !== 'N/A')
        .map(m => buildMatchCard(m, year, false, '', seedMap));
      return `
        <div style="margin-bottom:1.25rem">
          <div class="bracket-round-label" style="margin-bottom:0.6rem">
            ${isLast ? label + ' Game' : `Round ${ri + 1}`}
            <span style="color:var(--text-muted);font-weight:400;font-size:0.75rem">— Week ${week}</span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:0.75rem">${cards.join('')}</div>
        </div>`;
    }).join('');
  }

  // ── INIT ──────────────────────────────────────
  renderBracket(activeYear);

  } catch (err) {
    const el = document.getElementById('playoffContent');
    if (el) el.innerHTML = `<p style="color:var(--loss);padding:2rem;font-family:monospace;font-size:0.85rem">Error: ${err.message}<br><pre style="margin-top:0.5rem;white-space:pre-wrap">${err.stack}</pre></p>`;
    console.error('playoffs.js error:', err);
  }

})();
