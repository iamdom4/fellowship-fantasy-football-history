/* =============================================
   draft.js — Draft History page
   ============================================= */

(function () {
  const seasons = Utils.getSeasons().filter(([, s]) => s.draft && s.draft.length > 0);
  const teamOwnerMap = Utils.buildTeamOwnerMap();

  const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'D/ST', 'K'];
  const POS_LABELS = { 'D/ST': 'D/ST', 'N/A': '?' };

  function posClass(pos) {
    if (!pos || pos === 'N/A') return 'NA';
    return pos.replace('/', '');  // D/ST → DST
  }

  // Read ?year= from URL, default to most recent
  const params = new URLSearchParams(window.location.search);
  let activeYear = params.get('year') || seasons[seasons.length - 1][0];
  if (!seasons.find(([y]) => y === activeYear)) activeYear = seasons[seasons.length - 1][0];

  // ── NAV DROPDOWNS ─────────────────────────────
  const dropdownNav = document.getElementById('draftDropdownNav');
  if (dropdownNav) {
    dropdownNav.innerHTML = seasons.map(([year]) => `
      <li><a href="draft.html?year=${year}" class="${year === activeYear ? 'active' : ''}">${year} Season</a></li>
    `).join('');
  }
  // Populate playoffs nav if present
  const playoffsNav = document.getElementById('playoffsDropdownNav');
  if (playoffsNav) {
    const playoffSeasons = Utils.getSeasons().filter(([,s]) =>
      s.matchups && s.matchups.some(m => m.matchup_type === 'WINNERS_BRACKET')
    );
    playoffsNav.innerHTML = playoffSeasons.map(([y]) =>
      `<li><a href="playoffs.html?year=${y}">${y} Season</a></li>`
    ).join('');
  }

  // Populate teams nav if present
  const teamsNav = document.getElementById('teamsDropdownNav');
  if (teamsNav) {
    const ownerStats = Utils.getOwnerStats().map(o => o.owner).sort((a,b) => a.localeCompare(b));
    teamsNav.innerHTML = ownerStats.map(o => {
      const alumni = Utils.isActive(o) ? '' : ' <span class="dropdown-inactive">Alumni</span>';
      return `<li><a href="team.html?owner=${encodeURIComponent(o)}">${Utils.shortOwner(o)}${alumni}</a></li>`;
    }).join('');
  }

  // ── YEAR TABS ─────────────────────────────────
  document.getElementById('draftYearTabs').innerHTML = seasons.map(([year]) => `
    <a href="draft.html?year=${year}" class="draft-tab ${year === activeYear ? 'draft-tab-active' : ''}">${year}</a>
  `).join('');

  // ── RENDER DRAFT BOARD ───────────────────────
  function renderDraft(year) {
    const season = LEAGUE_DATA[year];
    if (!season || !season.draft || season.draft.length === 0) {
      document.getElementById('draftBoard').innerHTML = '<div class="loading">No draft data available.</div>';
      return;
    }

    const draft = season.draft;
    const leagueName = season.settings?.league_name || '';

    document.getElementById('draftPageTitle').textContent = `${year} Draft Board`;
    document.getElementById('draftPageSub').textContent =
      leagueName ? `${leagueName} — ${draft.length} picks` : `${draft.length} total picks`;

    // Build team → owner map for this year
    const teamToOwner = {};
    for (const t of (season.teams || [])) {
      teamToOwner[t.team_name.trim()] = Utils.shortOwner(
        teamOwnerMap[`${year}_${t.team_name.trim()}`] || t.owner
      );
    }

    // Group picks by round
    const rounds = {};
    let overall = 0;
    for (const pick of draft) {
      if (!rounds[pick.round]) rounds[pick.round] = [];
      rounds[pick.round].push(pick);
    }

    const roundsHtml = Object.entries(rounds)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([round, picks]) => {
        const picksHtml = picks
          .sort((a, b) => a.pick - b.pick)
          .map(pick => {
            overall++;
            const teamName = pick.team?.trim() || '—';
            const owner = teamToOwner[teamName] || '—';
            const pos = pick.position || 'N/A';
            const pc = posClass(pos);
            return `
              <div class="draft-pick pos-${pc}">
                <div class="pick-number">#${overall} <span class="pos-badge pos-badge-${pc}">${pos}</span></div>
                <div class="pick-player">${pick.player_name || '—'}</div>
                <div class="pick-team">${teamName}</div>
                <div class="pick-owner">${owner}</div>
              </div>
            `;
          }).join('');

        return `
          <div class="draft-round">
            <div class="draft-round-header">Round ${round}</div>
            <div class="draft-picks-grid">${picksHtml}</div>
          </div>
        `;
      }).join('');

    // Position legend
    const allPositions = [...new Set(draft.map(p => p.position || 'N/A'))];
    const posOrder = ['QB', 'RB', 'WR', 'TE', 'D/ST', 'K', 'N/A'];
    const sortedPositions = posOrder.filter(p => allPositions.includes(p));
    const counts = {};
    for (const p of draft) { const pos = p.position || 'N/A'; counts[pos] = (counts[pos] || 0) + 1; }

    const legendHtml = sortedPositions.map(pos => {
      const pc = posClass(pos);
      return `
        <div class="legend-item">
          <span class="legend-dot pos-dot-${pc}"></span>
          <span class="pos-badge pos-badge-${pc}">${pos}</span>
          <span style="color:var(--text-muted);font-size:0.75rem">${counts[pos] || 0} picks</span>
        </div>
      `;
    }).join('');

    document.getElementById('draftBoard').innerHTML = `
      <div class="draft-legend card" style="margin-bottom:1.5rem">
        <div class="card-title">Position Key</div>
        <div class="draft-legend-grid">${legendHtml}</div>
      </div>
      <div class="draft-rounds">${roundsHtml}</div>
    `;
  }

  renderDraft(activeYear);

})();
