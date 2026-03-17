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

  // ── Custom picker helper ───────────────────────
  function makePicker(btnId, valId, panelId) {
    const btn     = document.getElementById(btnId);
    const valEl   = document.getElementById(valId);
    const panel   = document.getElementById(panelId);
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

  // ── YEAR PICKER ───────────────────────────────
  const defaultYear = (() => {
    const p = new URLSearchParams(window.location.search).get('year');
    return seasons.find(([y]) => y === p) ? p : seasons[seasons.length - 1][0];
  })();

  const yearPicker = makePicker('yearPickerBtn', 'yearPickerVal', 'yearPickerPanel');
  const yearItems  = [...seasons].reverse().map(([year]) => ({ value: year, label: year }));
  yearPicker.populate(yearItems);
  yearPicker.setValue(defaultYear, defaultYear);

  yearPicker.onChange(year => {
    history.pushState({}, '', `draft.html?year=${year}`);
    renderDraft(year);
  });

  window.addEventListener('popstate', () => {
    const y = new URLSearchParams(window.location.search).get('year') || seasons[seasons.length - 1][0];
    yearPicker.setValue(y, y);
    renderDraft(y);
  });

  // Populate teams nav if present
  const teamsNav = document.getElementById('teamsDropdownNav');
  if (teamsNav) {
    const ownerStats = Utils.getOwnerStats().map(o => o.owner).sort((a,b) => a.localeCompare(b));
    teamsNav.innerHTML = ownerStats.map(o => {
      const alumni = Utils.isActive(o) ? '' : ' <span class="dropdown-inactive">Alumni</span>';
      return `<li><a href="team.html?owner=${encodeURIComponent(Utils.shortOwner(o))}">${Utils.shortOwner(o)}${alumni}</a></li>`;
    }).join('');
  }

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

    // Build team → picks map
    const teamPicks = {};
    for (const pick of draft) {
      const key = pick.team?.trim() || '—';
      if (!teamPicks[key]) teamPicks[key] = [];
      teamPicks[key].push(pick);
    }

    // Order teams by their round-1 pick number (draft order)
    const teamOrder = Object.keys(teamPicks).sort((a, b) => {
      const aP = (teamPicks[a].find(p => p.round === 1) || {}).pick || 99;
      const bP = (teamPicks[b].find(p => p.round === 1) || {}).pick || 99;
      return aP - bP;
    });

    const numTeams = teamOrder.length;
    const maxRound = Math.max(...draft.map(p => p.round));

    // Column headers
    const headerCells = teamOrder.map(team => {
      const owner = teamToOwner[team] || '—';
      return `<th class="draft-col-header" scope="col"><div class="draft-col-team" title="${team}">${team}</div><div class="draft-col-owner">${owner}</div></th>`;
    }).join('');

    // Rows — one per round
    let rows = '';
    for (let round = 1; round <= maxRound; round++) {
      const cells = teamOrder.map(team => {
        const pick = (teamPicks[team] || []).find(p => p.round === round);
        if (!pick) return '<td class="draft-cell-empty"></td>';
        const overall = pick.overall_pick || (round - 1) * numTeams + pick.pick;
        const pos = pick.position || 'N/A';
        const pc = posClass(pos);
        const keeperBadge = pick.keeper_status ? '<span class="draft-keeper-badge">K</span>' : '';
        return `<td class="draft-cell"><div class="draft-pick pos-${pc}"><div class="pick-number">#${overall} <span class="pos-badge pos-badge-${pc}">${pos}</span>${keeperBadge}</div><div class="pick-player">${pick.player_name || '—'}</div></div></td>`;
      }).join('');
      rows += `<tr><td class="draft-round-num">R${round}</td>${cells}</tr>`;
    }

    // Position legend
    const allPositions = [...new Set(draft.map(p => p.position || 'N/A'))];
    const posOrder = ['QB', 'RB', 'WR', 'TE', 'D/ST', 'K', 'N/A'];
    const sortedPositions = posOrder.filter(p => allPositions.includes(p));
    const counts = {};
    for (const p of draft) { const pos = p.position || 'N/A'; counts[pos] = (counts[pos] || 0) + 1; }

    const legendHtml = sortedPositions.map(pos => {
      const pc = posClass(pos);
      return `<div class="legend-item"><span class="legend-dot pos-dot-${pc}"></span><span class="pos-badge pos-badge-${pc}">${pos}</span><span style="color:var(--text-muted);font-size:0.75rem">${counts[pos] || 0} picks</span></div>`;
    }).join('');

    document.getElementById('draftBoard').innerHTML = `
      <div class="draft-legend card" style="margin-bottom:1.5rem">
        <div class="card-title">Position Key</div>
        <div class="draft-legend-grid">${legendHtml}</div>
      </div>
      <div class="draft-board-wrap">
        <table class="draft-board-table">
          <thead><tr><th class="draft-round-num draft-round-num-header"></th>${headerCells}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  renderDraft(defaultYear);

})();
