// Orchestrated globally via sequential index.html scripts

// Active player profile ID
let selectedPlayerIdForModal = null;

// ================= APP INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
  // 1. Seed database with mock data if it is empty
  seedDatabaseIfEmpty();

  // 2. Initialize Routing & Event Listeners
  initRouter();
  initFormListeners();
  initSettingsListeners();
  initModalListeners();
  initCalculatorListeners();
  
  // 3. Trigger initial route rendering
  handleRoute();
  
  // 4. Initial Lucide icons load
  refreshIcons();
});

// Helper to update Lucide icons on demand
function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

// ================= ROUTING SYSTEM =================
const VIEWS = {
  '#dashboard': { id: 'view-dashboard', title: 'Dashboard', subtitle: 'Overview of current standings and recent matches' },
  '#log-match': { id: 'view-log-match', title: 'Log Match', subtitle: 'Input details of the played match to adjust Elo standings' },
  '#gamers': { id: 'view-gamers', title: 'Gamer Hub', subtitle: 'View player statistics and register new gamers' },
  '#history': { id: 'view-history', title: 'Match Logs', subtitle: 'Chronological list of all logged matches' },
  '#calculator': { id: 'view-calculator', title: 'Elo Simulator', subtitle: 'Math sandbox to test points exchanges dynamically' },
  '#settings': { id: 'view-settings', title: 'Data Control', subtitle: 'Manage rankings database backups and resets' }
};

function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  
  // Mobile sidebar toggle handler
  const menuBtn = document.getElementById('mobile-sidebar-toggle');
  const sidebar = document.getElementById('app-sidebar');
  
  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // Close mobile sidebar when clicking a nav-item
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      if (sidebar) sidebar.classList.remove('open');
    });
  });
}

function handleRoute() {
  const hash = window.location.hash || '#dashboard';
  const route = VIEWS[hash];
  
  if (!route) return;
  
  // Toggle active class on views
  document.querySelectorAll('.app-view').forEach(view => {
    view.classList.remove('active');
  });
  
  const targetView = document.getElementById(route.id);
  if (targetView) targetView.classList.add('active');
  
  // Toggle active class on sidebar navigation items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Find item with matching href
  const navItem = document.querySelector(`.nav-item[href="${hash}"]`);
  if (navItem) navItem.classList.add('active');
  
  // Update header text
  document.getElementById('view-title').innerText = route.title;
  document.getElementById('view-subtitle').innerText = route.subtitle;
  
  // Perform view-specific data loading
  renderViewData(hash);
}

function renderViewData(hash) {
  if (hash === '#dashboard' || hash === '#dashboard-view') {
    renderDashboard();
  } else if (hash === '#log-match') {
    populateMatchDropdowns();
    restoreMatchForm();
    updateLivePredictor();
  } else if (hash === '#gamers') {
    renderGamersHub();
  } else if (hash === '#history') {
    renderMatchLogs();
  } else if (hash === '#calculator') {
    runSandboxCalculation();
  }
  refreshIcons();
}

// ================= VIEW: DASHBOARD =================
function renderDashboard() {
  const players = getPlayers();
  const matches = getMatches();
  
  // 1. Render podium (Gold, Silver, Bronze spotlight cards)
  const podiumContainer = document.getElementById('podium-container');
  if (podiumContainer) {
    if (players.length >= 3) {
      // Podium ordering: Rank 2 (Silver) on Left, Rank 1 (Gold) in Center, Rank 3 (Bronze) on Right
      const first = players[0];
      const second = players[1];
      const third = players[2];
      
      podiumContainer.innerHTML = `
        <!-- Rank 2: Silver -->
        <div class="podium-node rank-2" data-id="${second.id}">
          <div class="podium-badge silver">2</div>
          <h4>${second.name}</h4>
          <span class="podium-team">${second.team}</span>
          <span class="podium-points">${second.points.toFixed(2)}</span>
          <span class="podium-stats">Room: ${second.room} | GD: ${second.goalDifference >= 0 ? '+' : ''}${second.goalDifference}</span>
        </div>
        
        <!-- Rank 1: Gold -->
        <div class="podium-node rank-1" data-id="${first.id}">
          <div class="podium-badge gold">
            <i data-lucide="crown" style="width:18px;height:18px;color:#fff;"></i>
          </div>
          <h4>${first.name}</h4>
          <span class="podium-team">${first.team}</span>
          <span class="podium-points">${first.points.toFixed(2)}</span>
          <span class="podium-stats">Room: ${first.room} | GD: ${first.goalDifference >= 0 ? '+' : ''}${first.goalDifference}</span>
        </div>
        
        <!-- Rank 3: Bronze -->
        <div class="podium-node rank-3" data-id="${third.id}">
          <div class="podium-badge bronze">3</div>
          <h4>${third.name}</h4>
          <span class="podium-team">${third.team}</span>
          <span class="podium-points">${third.points.toFixed(2)}</span>
          <span class="podium-stats">Room: ${third.room} | GD: ${third.goalDifference >= 0 ? '+' : ''}${third.goalDifference}</span>
        </div>
      `;
      
      // Bind podium click to profile modal
      podiumContainer.querySelectorAll('.podium-node').forEach(node => {
        node.addEventListener('click', () => {
          openPlayerProfileModal(node.dataset.id);
        });
      });
    } else {
      podiumContainer.innerHTML = `
        <div class="card glass-card text-center p-20 grid-col-12" style="width: 100%;">
          <p class="text-secondary">At least 3 players are required to show the Visual Top-3 Podium. Register more players in the Gamer Hub!</p>
        </div>
      `;
    }
  }

  // 2. Render Leaderboard table
  const tbody = document.getElementById('leaderboard-tbody');
  const totalGamersBadge = document.getElementById('total-gamers-badge');
  if (totalGamersBadge) {
    totalGamersBadge.innerText = `${players.length} Players`;
  }
  
  if (tbody) {
    tbody.innerHTML = '';
    
    if (players.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center text-secondary" style="padding: 40px 0;">
            No players found. Head to Gamer Hub to create one!
          </td>
        </tr>
      `;
    } else {
      players.forEach(player => {
        // Build Form Dots (Last 5)
        let formDotsHTML = '';
        player.form.forEach(f => {
          let dotClass = 'draw';
          if (f === 'W') dotClass = 'win';
          if (f === 'L') dotClass = 'loss';
          formDotsHTML += `<span class="form-dot ${dotClass}">${f}</span>`;
        });
        
        // Build Rank change pill
        let changeHTML = '<span class="rank-change flat"><i data-lucide="minus" style="width:12px;"></i></span>';
        if (player.rankChange > 0) {
          changeHTML = `<span class="rank-change up"><i data-lucide="chevron-up" style="width:12px;"></i>${player.rankChange}</span>`;
        } else if (player.rankChange < 0) {
          changeHTML = `<span class="rank-change down"><i data-lucide="chevron-down" style="width:12px;"></i>${Math.abs(player.rankChange)}</span>`;
        }
        
        let rankClass = '';
        if (player.rank === 1) rankClass = 'gold';
        if (player.rank === 2) rankClass = 'silver';
        if (player.rank === 3) rankClass = 'bronze';
        
        const row = document.createElement('tr');
        row.dataset.id = player.id;
        row.innerHTML = `
          <td class="text-center">
            <div class="rank-indicator">
              <span class="rank-number ${rankClass}">${player.rank}</span>
              ${changeHTML}
            </div>
          </td>
          <td>
            <div class="gamer-cell">
              <span class="gamer-name">${player.name}</span>
              <span class="gamer-team">${player.team} (${player.room})</span>
            </div>
          </td>
          <td class="text-center font-heading" style="font-weight: 700;">${player.points.toFixed(2)}</td>
          <td class="text-center text-secondary">${player.matchesPlayed}</td>
          <td class="text-center text-success">${player.wins}</td>
          <td class="text-center text-muted">${player.draws}</td>
          <td class="text-center text-danger">${player.losses}</td>
          <td class="text-center text-secondary">${player.goalDifference >= 0 ? '+' : ''}${player.goalDifference}</td>
          <td>
            <div class="form-indicator-list">
              ${formDotsHTML || '<span class="text-muted" style="font-size: 0.75rem;">None</span>'}
            </div>
          </td>
        `;
        
        row.addEventListener('click', () => {
          openPlayerProfileModal(player.id);
        });
        
        tbody.appendChild(row);
      });
    }
  }

  // 3. Render Analytics Dashboard Sidebar
  const totalMatchesVal = document.getElementById('stat-total-matches');
  const avgGoalsVal = document.getElementById('stat-avg-goals');
  const highestRatingVal = document.getElementById('stat-highest-rating');
  const mostActiveVal = document.getElementById('stat-most-active');
  
  if (totalMatchesVal) totalMatchesVal.innerText = matches.length;
  
  if (avgGoalsVal) {
    if (matches.length > 0) {
      let totalGoals = 0;
      matches.forEach(m => {
        totalGoals += (m.score1 + m.score2);
      });
      avgGoalsVal.innerText = (totalGoals / matches.length).toFixed(1);
    } else {
      avgGoalsVal.innerText = '0.0';
    }
  }
  
  if (highestRatingVal) {
    if (players.length > 0) {
      const highestPoints = Math.max(...players.map(p => p.points));
      highestRatingVal.innerText = Math.round(highestPoints);
    } else {
      highestRatingVal.innerText = '0';
    }
  }
  
  if (mostActiveVal) {
    if (players.length > 0) {
      // Find player with highest matchesPlayed
      const sortedByActivity = [...players].sort((a,b) => b.matchesPlayed - a.matchesPlayed);
      if (sortedByActivity[0].matchesPlayed > 0) {
        mostActiveVal.innerText = `${sortedByActivity[0].name.split(' ')[0]} (${sortedByActivity[0].matchesPlayed})`;
      } else {
        mostActiveVal.innerText = 'None';
      }
    } else {
      mostActiveVal.innerText = '-';
    }
  }

  // 4. Render Recent Matches Dashboard Sidebar
  const recentContainer = document.getElementById('dashboard-recent-matches');
  if (recentContainer) {
    recentContainer.innerHTML = '';
    const recents = matches.slice(0, 5); // Take top 5 newest matches
    
    if (recents.length === 0) {
      recentContainer.innerHTML = '<p class="text-secondary text-center py-10" style="font-size: 0.85rem;">No games logged yet.</p>';
    } else {
      recents.forEach(m => {
        const item = document.createElement('div');
        item.className = 'recent-match-item';
        
        const deltaA = m.player1Delta >= 0 ? `+${m.player1Delta.toFixed(2)}` : m.player1Delta.toFixed(2);
        const deltaB = m.player2Delta >= 0 ? `+${m.player2Delta.toFixed(2)}` : m.player2Delta.toFixed(2);
        
        let psoText = '';
        if (m.isPSO) {
          psoText = `<span class="badge badge-info" style="font-size: 0.6rem; padding: 1px 4px; margin-left: 5px;">PSO (Winner: ${m.psoWinner === 'A' ? 'A' : 'B'})</span>`;
        }
        
        item.innerHTML = `
          <div class="match-item-meta">
            <span>${m.dateString}</span>
            <span>Importance: ${m.importance}</span>
          </div>
          <div class="match-item-scoreline">
            <span class="team-node" title="${m.player1Name}">${m.player1Name}</span>
            <span class="score-node">${m.score1} - ${m.score2}</span>
            <span class="team-node text-right" title="${m.player2Name}">${m.player2Name}</span>
          </div>
          <div class="match-item-deltas">
            <span class="${m.player1Delta >= 0 ? 'text-success' : 'text-danger'}">${deltaA} pts</span>
            ${psoText}
            <span class="${m.player2Delta >= 0 ? 'text-success' : 'text-danger'}">${deltaB} pts</span>
          </div>
        `;
        recentContainer.appendChild(item);
      });
    }
  }
}

// ================= VIEW: LOG MATCH =================
function populateMatchDropdowns() {
  const p1Select = document.getElementById('match-player1');
  const p2Select = document.getElementById('match-player2');
  
  if (!p1Select || !p2Select) return;
  
  const players = getPlayers();
  
  const optionsHTML = players.map(p => `<option value="${p.id}">${p.name} (${p.team})</option>`).join('');
  
  p1Select.innerHTML = '<option value="">Select Player A</option>' + optionsHTML;
  p2Select.innerHTML = '<option value="">Select Player B</option>' + optionsHTML;
}

function resetMatchForm() {
  const form = document.getElementById('match-log-form');
  if (form) form.reset();
  clearMatchFormData();
  
  const psoGroup = document.getElementById('pso-winner-group');
  if (psoGroup) psoGroup.classList.add('hidden');
}

function restoreMatchForm() {
  const saved = localStorage.getItem('match_form_data');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      
      if (data.player1) document.getElementById('match-player1').value = data.player1;
      if (data.player2) document.getElementById('match-player2').value = data.player2;
      if (data.score1) document.getElementById('match-score1').value = data.score1;
      if (data.score2) document.getElementById('match-score2').value = data.score2;
      if (data.importance) document.getElementById('match-importance').value = data.importance;
      if (data.isKnockout) document.getElementById('match-is-knockout').checked = data.isKnockout;
      if (data.isPso) document.getElementById('match-is-pso').checked = data.isPso;
      if (data.psoWinner) {
        const psoRadios = document.getElementsByName('pso-winner');
        psoRadios.forEach(r => r.checked = r.value === data.psoWinner);
      }
      
      // Show/hide PSO winner group based on isPso
      const psoGroup = document.getElementById('pso-winner-group');
      if (psoGroup) {
        if (data.isPso) psoGroup.classList.remove('hidden');
        else psoGroup.classList.add('hidden');
      }
    } catch (e) {
      console.log('Could not restore form data');
    }
  }
}

function saveMatchFormData() {
  const data = {
    player1: document.getElementById('match-player1').value,
    player2: document.getElementById('match-player2').value,
    score1: document.getElementById('match-score1').value,
    score2: document.getElementById('match-score2').value,
    importance: document.getElementById('match-importance').value,
    isKnockout: document.getElementById('match-is-knockout').checked,
    isPso: document.getElementById('match-is-pso').checked,
    psoWinner: Array.from(document.getElementsByName('pso-winner')).find(r => r.checked)?.value || null
  };
  localStorage.setItem('match_form_data', JSON.stringify(data));
}

function clearMatchFormData() {
  localStorage.removeItem('match_form_data');
}

function updateLivePredictor() {
  const p1Select = document.getElementById('match-player1');
  const p2Select = document.getElementById('match-player2');
  const score1Input = document.getElementById('match-score1');
  const score2Input = document.getElementById('match-score2');
  const importanceSelect = document.getElementById('match-importance');
  const isKnockoutCheck = document.getElementById('match-is-knockout');
  const isPsoCheck = document.getElementById('match-is-pso');
  
  const emptyState = document.getElementById('predictor-empty-state');
  const resultsContainer = document.getElementById('predictor-results-container');
  
  if (!p1Select || !p2Select || !emptyState || !resultsContainer) return;
  
  const p1Id = p1Select.value;
  const p2Id = p2Select.value;
  
  if (!p1Id || !p2Id || p1Id === p2Id) {
    emptyState.classList.remove('hidden');
    resultsContainer.classList.add('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  resultsContainer.classList.remove('hidden');
  
  const players = getPlayers();
  const p1 = players.find(p => p.id === p1Id);
  const p2 = players.find(p => p.id === p2Id);
  
  if (!p1 || !p2) return;
  
  // Fill matchup headers
  document.getElementById('pred-p1-name').innerText = p1.name.split(" '")[0]; // Use first name/alias
  document.getElementById('pred-p1-rating').innerText = `${p1.points.toFixed(2)} pts`;
  document.getElementById('pred-p2-name').innerText = p2.name.split(" '")[0];
  document.getElementById('pred-p2-rating').innerText = `${p2.points.toFixed(2)} pts`;
  
  // 1. Calculate Expected probabilities We
  const weA = calculateWe(p1.points, p2.points);
  const weB = 1 - weA;
  
  const weAPercent = Math.round(weA * 100);
  const weBPercent = 100 - weAPercent;
  
  const p1ProbBar = document.getElementById('pred-p1-prob-bar');
  const p2ProbBar = document.getElementById('pred-p2-prob-bar');
  
  p1ProbBar.style.width = `${weAPercent}%`;
  p1ProbBar.innerText = `${weAPercent}%`;
  p2ProbBar.style.width = `${weBPercent}%`;
  p2ProbBar.innerText = `${weBPercent}%`;
  
  // Get other values
  const importance = parseInt(importanceSelect.value) || 15;
  const isKnockout = isKnockoutCheck.checked;
  const isPSO = isPsoCheck.checked;
  
  // Toggle Knockout warning display
  const koAlert = document.getElementById('pred-ko-alert');
  if (koAlert) {
    if (isKnockout) koAlert.classList.remove('hidden');
    else koAlert.classList.add('hidden');
  }
  
  // Toggle PSO row visibility
  const drawRow = document.getElementById('pred-draw-row');
  const psoWinARow = document.getElementById('pred-psoWinA-row');
  const psoWinBRow = document.getElementById('pred-psoWinB-row');
  
  if (isPSO) {
    drawRow.classList.add('hidden');
    psoWinARow.classList.remove('hidden');
    psoWinBRow.classList.remove('hidden');
  } else {
    drawRow.classList.remove('hidden');
    psoWinARow.classList.add('hidden');
    psoWinBRow.classList.add('hidden');
  }
  
  // Scenario 1: A wins (Regular time score e.g. 1-0)
  const winA = calculatePointsExchange(p1.points, p2.points, 1, 0, importance, isKnockout, false);
  setPills('pred-winA-p1', 'pred-winA-p2', winA.deltaA, winA.deltaB);
  
  // Scenario 2: Draw (Regular time score e.g. 1-1)
  const draw = calculatePointsExchange(p1.points, p2.points, 1, 1, importance, isKnockout, false);
  setPills('pred-draw-p1', 'pred-draw-p2', draw.deltaA, draw.deltaB);
  
  // Scenario 3: B wins (Regular time score e.g. 0-1)
  const winB = calculatePointsExchange(p1.points, p2.points, 0, 1, importance, isKnockout, false);
  setPills('pred-winB-p1', 'pred-winB-p2', winB.deltaA, winB.deltaB);
  
  // Scenario 4: PSO Win A (1-1 draw, A wins PSO)
  const psoA = calculatePointsExchange(p1.points, p2.points, 1, 1, importance, isKnockout, true, 'A');
  setPills('pred-psoA-p1', 'pred-psoA-p2', psoA.deltaA, psoA.deltaB);
  
  // Scenario 5: PSO Win B (1-1 draw, B wins PSO)
  const psoB = calculatePointsExchange(p1.points, p2.points, 1, 1, importance, isKnockout, true, 'B');
  setPills('pred-psoB-p1', 'pred-psoB-p2', psoB.deltaA, psoB.deltaB);
}

function setPills(p1PillId, p2PillId, deltaA, deltaB) {
  const p1Pill = document.getElementById(p1PillId);
  const p2Pill = document.getElementById(p2PillId);
  
  if (!p1Pill || !p2Pill) return;
  
  p1Pill.innerText = deltaA >= 0 ? `+${deltaA.toFixed(2)}` : deltaA.toFixed(2);
  p1Pill.className = `outcome-pill ${deltaA > 0 ? 'positive' : deltaA < 0 ? 'negative' : ''}`;
  
  p2Pill.innerText = deltaB >= 0 ? `+${deltaB.toFixed(2)}` : deltaB.toFixed(2);
  p2Pill.className = `outcome-pill ${deltaB > 0 ? 'positive' : deltaB < 0 ? 'negative' : ''}`;
}

// ================= VIEW: GAMERS HUB =================
function renderGamersHub() {
  const players = getPlayers();
  const grid = document.getElementById('gamers-card-grid');
  
  if (!grid) return;
  
  grid.innerHTML = '';
  
  if (players.length === 0) {
    grid.innerHTML = `
      <div class="card glass-card text-center p-30 grid-col-12" style="width: 100%;">
        <i data-lucide="users" class="empty-icon" style="margin: 0 auto 15px auto;"></i>
        <p class="text-secondary">No registered gamers. Add some using the button above!</p>
      </div>
    `;
    return;
  }
  
  players.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card glass-card gamer-card';
    card.dataset.id = p.id;
    
    let avatarClass = '';
    if (p.rank === 1) avatarClass = 'gold';
    if (p.rank === 2) avatarClass = 'silver';
    if (p.rank === 3) avatarClass = 'bronze';
    
    // Win rate percentage
    const winRate = p.matchesPlayed > 0 ? ((p.wins / p.matchesPlayed) * 100).toFixed(0) : '0';
    
    card.innerHTML = `
      <div class="gamer-card-rank">#${p.rank}</div>
      <div class="gamer-card-header">
        <div class="gamer-card-avatar ${avatarClass}">
          ${p.name.charAt(0)}
        </div>
        <div class="gamer-card-identity">
          <h4 title="${p.name}">${p.name}</h4>
          <span>${p.room}</span>
        </div>
      </div>
      
      <div class="gamer-card-points">
        <div class="points-label">Elo Rating</div>
        <div class="points-val font-heading">${p.points.toFixed(2)}</div>
      </div>
      
      <div class="gamer-card-stats">
        <div class="gc-stat">
          <span class="gc-stat-label">Wins</span>
          <span class="gc-stat-val text-success">${p.wins}</span>
        </div>
        <div class="gc-stat">
          <span class="gc-stat-label">Losses</span>
          <span class="gc-stat-val text-danger">${p.losses}</span>
        </div>
        <div class="gc-stat">
          <span class="gc-stat-label">Goal Diff</span>
          <span class="gc-stat-val">${p.goalDifference >= 0 ? '+' : ''}${p.goalDifference}</span>
        </div>
        <div class="gc-stat">
          <span class="gc-stat-label">Win Rate</span>
          <span class="gc-stat-val text-info">${winRate}%</span>
        </div>
      </div>
      
      <div class="gamer-card-footer">
        <span class="gamer-team-badge text-muted text-sm"><i data-lucide="shield" style="width:12px;display:inline;margin-right:4px;"></i>${p.team}</span>
        <a class="profile-link text-info">Profile &rarr;</a>
      </div>
    `;
    
    // Click events to open profile modal
    card.addEventListener('click', (e) => {
      openPlayerProfileModal(p.id);
    });
    
    grid.appendChild(card);
  });
}

// ================= VIEW: MATCH LOGS =================
function renderMatchLogs() {
  const matches = getMatches();
  const searchInput = document.getElementById('history-search');
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  const tbody = document.getElementById('history-tbody');
  const emptyState = document.getElementById('history-empty-state');
  
  if (!tbody || !emptyState) return;
  
  tbody.innerHTML = '';
  
  // Filter matches based on search query
  const filtered = matches.filter(m => {
    return m.player1Name.toLowerCase().includes(query) || m.player2Name.toLowerCase().includes(query);
  });
  
  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  
  filtered.forEach(m => {
    const deltaA = m.player1Delta >= 0 ? `+${m.player1Delta.toFixed(2)}` : m.player1Delta.toFixed(2);
    const deltaB = m.player2Delta >= 0 ? `+${m.player2Delta.toFixed(2)}` : m.player2Delta.toFixed(2);
    
    let psoBadgeHTML = '';
    if (m.isPSO) {
      psoBadgeHTML = `<span class="badge badge-info" style="font-size: 0.65rem; padding: 2px 6px; display: block; margin-top: 4px;">PSO (Winner: ${m.psoWinner === 'A' ? 'A' : 'B'})</span>`;
    }
    
    // Map Importance back to a nice string label
    let typeLabel = 'Friendly';
    if (m.importance === 5) typeLabel = 'Casual Friendly';
    if (m.importance === 10) typeLabel = 'Hostel Derby';
    if (m.importance === 15) typeLabel = 'League Match';
    if (m.importance === 25) typeLabel = 'Cup Qualifier';
    if (m.importance === 35) typeLabel = 'Cup Group Stage';
    if (m.importance === 40) typeLabel = 'Cup Knockout';
    if (m.importance === 50) typeLabel = 'Cup Semifinal';
    if (m.importance === 60) typeLabel = 'Grand Final';
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="text-secondary" style="font-size: 0.85rem;">${m.dateString}</td>
      <td>
        <span class="badge badge-info">${typeLabel}</span>
        ${m.isKnockout ? '<span class="badge badge-success" style="margin-left: 5px; font-size:0.65rem;">Protected</span>' : ''}
      </td>
      <td>
        <div style="display: flex; align-items: center; justify-content: space-between; max-width: 450px; font-weight: 600;">
          <span class="team-node text-right flex-1" style="max-width: 170px;" title="${m.player1Name}">${m.player1Name}</span>
          <span class="score-node" style="margin: 0 15px;">${m.score1} - ${m.score2}</span>
          <span class="team-node flex-1" style="max-width: 170px;" title="${m.player2Name}">${m.player2Name}</span>
        </div>
        ${psoBadgeHTML}
      </td>
      <td class="text-center font-heading" style="font-size: 0.85rem; font-weight: 700; min-width: 180px;">
        <span class="${m.player1Delta >= 0 ? 'text-success' : 'text-danger'}">${m.player1Name.split(" '")[0]}: ${deltaA}</span>
        <span class="text-muted" style="margin: 0 6px;">|</span>
        <span class="${m.player2Delta >= 0 ? 'text-success' : 'text-danger'}">${m.player2Name.split(" '")[0]}: ${deltaB}</span>
      </td>
      <td class="text-center">
        <button class="btn-icon-danger btn-delete-match" data-id="${m.id}" title="Revert this match">
          <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
        </button>
      </td>
    `;
    
    tbody.appendChild(row);
  });
  
  // Wire up revert buttons
  tbody.querySelectorAll('.btn-delete-match').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const matchId = btn.dataset.id;
      if (confirm('Are you sure you want to delete and revert this match result? This will trigger a recalculation of all rankings from that point forward.')) {
        deleteMatch(matchId);
        renderMatchLogs();
      }
    });
  });
}

// ================= VIEW: ELO SIMULATOR SANDBOX =================
function runSandboxCalculation() {
  const ratingAInput = document.getElementById('calc-rating1');
  const ratingBInput = document.getElementById('calc-rating2');
  const score1Input = document.getElementById('calc-score1');
  const score2Input = document.getElementById('calc-score2');
  const importanceSelect = document.getElementById('calc-importance');
  const isKnockoutCheck = document.getElementById('calc-is-knockout');
  const isPsoCheck = document.getElementById('calc-is-pso');
  
  const psoWinnerOptions = document.getElementsByName('calc-pso-winner');
  let psoWinner = 'A';
  for (const option of psoWinnerOptions) {
    if (option.checked) psoWinner = option.value;
  }
  
  const ratingA = parseFloat(ratingAInput.value) || 1000;
  const ratingB = parseFloat(ratingBInput.value) || 1000;
  const scoreA = parseInt(score1Input.value) || 0;
  const scoreB = parseInt(score2Input.value) || 0;
  const importance = parseInt(importanceSelect.value) || 15;
  const isKnockout = isKnockoutCheck.checked;
  const isPSO = isPsoCheck.checked;
  
  // Validate knockout importance
  if (isKnockout && importance < 40) {
    alert("FIFA rankings knockout protection only applies to final tournament stages (Importance I >= 40).");
    isKnockoutCheck.checked = false;
    return;
  }
  
  // Run formula
  const result = calculatePointsExchange(ratingA, ratingB, scoreA, scoreB, importance, isKnockout, isPSO, psoWinner);
  const dr = ratingA - ratingB;
  
  // Update Simulator Output UI
  const deltaAVal = document.getElementById('calc-out-deltaA');
  const deltaBVal = document.getElementById('calc-out-deltaB');
  
  deltaAVal.innerText = result.deltaA >= 0 ? `+${result.deltaA.toFixed(2)}` : result.deltaA.toFixed(2);
  deltaAVal.className = `cp-val ${result.deltaA > 0 ? 'positive' : result.deltaA < 0 ? 'negative' : ''}`;
  
  deltaBVal.innerText = result.deltaB >= 0 ? `+${result.deltaB.toFixed(2)}` : result.deltaB.toFixed(2);
  deltaBVal.className = `cp-val ${result.deltaB > 0 ? 'positive' : result.deltaB < 0 ? 'negative' : ''}`;
  
  document.getElementById('calc-out-weA').innerText = `Expected (We): ${result.weA.toFixed(3)}`;
  document.getElementById('calc-out-weB').innerText = `Expected (We): ${result.weB.toFixed(3)}`;
  
  // Fill breakdown list
  document.getElementById('calc-out-dr').innerText = `${dr >= 0 ? '+' : ''}${dr.toFixed(2)}`;
  document.getElementById('calc-out-weA-val').innerText = result.weA.toFixed(4);
  document.getElementById('calc-out-weB-val').innerText = result.weB.toFixed(4);
  
  let outcomeDesc = `Player A: ${result.wA === 1.0 ? 'Win (1.0)' : result.wA === 0.75 ? 'PSO Win (0.75)' : result.wA === 0.5 ? 'Draw (0.50)' : 'Loss (0.00)'}`;
  outcomeDesc += `, Player B: ${result.wB === 1.0 ? 'Win (1.0)' : result.wB === 0.75 ? 'PSO Win (0.75)' : result.wB === 0.5 ? 'Draw/PSO Loss (0.50)' : 'Loss (0.00)'}`;
  document.getElementById('calc-out-w').innerText = outcomeDesc;
  document.getElementById('calc-out-i').innerText = importance;
}

// ================= PLAYER PROFILE DETAIL MODAL =================
function openPlayerProfileModal(playerId) {
  selectedPlayerIdForModal = playerId;
  
  const players = getPlayers();
  const player = players.find(p => p.id === playerId);
  
  if (!player) return;
  
  // Load texts
  document.getElementById('modal-player-rank').innerText = `#${player.rank}`;
  document.getElementById('modal-player-name').innerText = player.name;
  document.getElementById('modal-player-team').innerText = player.team;
  document.getElementById('modal-player-room').innerText = player.room;
  
  document.getElementById('modal-stat-points').innerText = player.points.toFixed(2);
  document.getElementById('modal-stat-peak').innerText = player.peakPoints.toFixed(2);
  document.getElementById('modal-stat-record').innerText = `${player.wins}W - ${player.draws}D - ${player.losses}L`;
  document.getElementById('modal-stat-goals').innerText = `${player.goalsScored} : ${player.goalsConceded} (${player.goalDifference >= 0 ? '+' : ''}${player.goalDifference})`;
  
  // Win rate radial percentage
  const winRatePercent = player.matchesPlayed > 0 ? Math.round((player.wins / player.matchesPlayed) * 100) : 0;
  document.getElementById('modal-stat-winrate').innerText = `${winRatePercent}%`;
  
  const winRateCircle = document.getElementById('modal-stat-winrate-circle');
  if (winRateCircle) {
    const radius = winRateCircle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    winRateCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    const offset = circumference - (winRatePercent / 100) * circumference;
    winRateCircle.style.strokeDashoffset = offset;
  }
  
  // Load specific player matches list
  const matches = getMatches();
  const playerMatches = matches.filter(m => m.player1Id === playerId || m.player2Id === playerId);
  
  const modalTbody = document.getElementById('modal-player-matches-tbody');
  if (modalTbody) {
    modalTbody.innerHTML = '';
    
    if (playerMatches.length === 0) {
      modalTbody.innerHTML = `<tr><td colspan="5" class="text-center text-secondary">No games played yet.</td></tr>`;
    } else {
      playerMatches.forEach(m => {
        const isPlayer1 = m.player1Id === playerId;
        const opponent = isPlayer1 ? m.player2Name : m.player1Name;
        const delta = isPlayer1 ? m.player1Delta : m.player2Delta;
        const deltaText = delta >= 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2);
        
        let scoreText = `${m.score1} - ${m.score2}`;
        if (m.isPSO) {
          scoreText += ` (PSO)`;
        }
        
        let typeLabel = 'Friendly';
        if (m.importance === 5) typeLabel = 'Casual';
        if (m.importance === 10) typeLabel = 'Derby';
        if (m.importance === 15) typeLabel = 'League';
        if (m.importance >= 40) typeLabel = 'Cup KO';
        
        modalTbody.innerHTML += `
          <tr>
            <td class="text-secondary">${m.dateString.split(' ')[0]}</td>
            <td style="font-weight: 600;">${opponent}</td>
            <td class="text-center font-heading" style="font-weight:700;">${scoreText}</td>
            <td class="text-center"><span class="badge badge-info" style="font-size:0.65rem;">${typeLabel}</span></td>
            <td class="text-center font-heading ${delta >= 0 ? 'text-success' : 'text-danger'}" style="font-weight: 700;">${deltaText}</td>
          </tr>
        `;
      });
    }
  }
  
  // Render Chart points progression
  // Delay slightly to ensure modal animation is completed and canvas dimensions are correct
  setTimeout(() => {
    renderRatingHistoryChart('player-history-canvas', player.ratingHistory);
  }, 100);

  // Unhide modal
  const modal = document.getElementById('player-profile-modal');
  if (modal) modal.classList.remove('hidden');
  
  refreshIcons();
}

function closePlayerProfileModal() {
  const modal = document.getElementById('player-profile-modal');
  if (modal) modal.classList.add('hidden');
  selectedPlayerIdForModal = null;
}

// ================= EVENT LISTENERS SETUP =================

function initFormListeners() {
  const form = document.getElementById('match-log-form');
  const p1Select = document.getElementById('match-player1');
  const p2Select = document.getElementById('match-player2');
  const score1Input = document.getElementById('match-score1');
  const score2Input = document.getElementById('match-score2');
  const importanceSelect = document.getElementById('match-importance');
  const isKnockoutCheck = document.getElementById('match-is-knockout');
  const isPsoCheck = document.getElementById('match-is-pso');
  
  // Add auto-save listeners to all form inputs
  [p1Select, p2Select, score1Input, score2Input, importanceSelect, isKnockoutCheck, isPsoCheck].forEach(input => {
    if (input) input.addEventListener('change', saveMatchFormData);
  });
  
  // Also save on input for text fields
  if (score1Input) score1Input.addEventListener('input', saveMatchFormData);
  if (score2Input) score2Input.addEventListener('input', saveMatchFormData);
  
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const p1Id = p1Select.value;
      const p2Id = p2Select.value;
      const score1 = score1Input.value;
      const score2 = score2Input.value;
      const importance = importanceSelect.value;
      const isKnockout = isKnockoutCheck.checked;
      const isPSO = isPsoCheck.checked;
      
      // Form Validations
      if (p1Id === p2Id) {
        alert("A gamer cannot play a match against themselves! Select two different players.");
        return;
      }
      
      if (isPSO && score1 !== score2) {
        alert("Penalty shootouts can only happen when the match score ends in a draw.");
        return;
      }
      
      let psoWinner = null;
      if (isPSO) {
        const winnerOptions = document.getElementsByName('pso-winner');
        for (const option of winnerOptions) {
          if (option.checked) psoWinner = option.value;
        }
        if (!psoWinner) {
          alert("Please select the penalty shootout winner.");
          return;
        }
      }
      
      if (isKnockout && parseInt(importance) < 40) {
        alert("FIFA knockout stage protection requires match importance to be at least 40 (Cup Knockouts/Final).");
        return;
      }

      // Add match to Database
      try {
        addMatch(p1Id, p2Id, score1, score2, importance, isKnockout, isPSO, psoWinner);
        alert("Match successfully logged and ratings updated!");
        form.reset();
        clearMatchFormData();
        window.location.hash = '#dashboard'; // Back to dashboard
      } catch (err) {
        alert(`Error: ${err.message}`);
      }
    });
  }

  // Bind change listeners to update live predictor in real-time
  const inputsToTrack = [p1Select, p2Select, score1Input, score2Input, importanceSelect, isKnockoutCheck, isPsoCheck];
  inputsToTrack.forEach(element => {
    if (element) {
      element.addEventListener('input', updateLivePredictor);
      element.addEventListener('change', updateLivePredictor);
    }
  });

  // Additional behavior: Toggle PSO winner selectors when PSO checked
  if (isPsoCheck) {
    isPsoCheck.addEventListener('change', () => {
      const psoGroup = document.getElementById('pso-winner-group');
      if (isPsoCheck.checked) {
        psoGroup.classList.remove('hidden');
        // Preset score draw if empty
        if (score1Input.value !== score2Input.value) {
          score2Input.value = score1Input.value || 0;
        }
      } else {
        psoGroup.classList.add('hidden');
      }
      updateLivePredictor();
    });
  }
  
  // Auto-align draw scores if PSO checked
  if (score1Input && score2Input && isPsoCheck) {
    const alignScores = () => {
      if (isPsoCheck.checked) {
        score2Input.value = score1Input.value;
        updateLivePredictor();
      }
    };
    score1Input.addEventListener('input', alignScores);
  }

  // Gamers Hub: Add Player Form Toggle
  const btnShowAdd = document.getElementById('btn-show-add-player');
  const btnCancelAdd = document.getElementById('btn-cancel-add-player');
  const addCard = document.getElementById('add-player-card');
  const addForm = document.getElementById('add-player-form');
  
  if (btnShowAdd && addCard) {
    btnShowAdd.addEventListener('click', () => {
      addCard.classList.remove('hidden');
      btnShowAdd.classList.add('hidden');
    });
  }
  
  if (btnCancelAdd && addCard && btnShowAdd) {
    btnCancelAdd.addEventListener('click', () => {
      addCard.classList.add('hidden');
      btnShowAdd.classList.remove('hidden');
      if (addForm) addForm.reset();
    });
  }

  if (addForm) {
    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const name = document.getElementById('player-name').value;
      const room = document.getElementById('player-room').value;
      const team = document.getElementById('player-team').value;
      const starting = document.getElementById('player-starting-points').value;
      
      if (!name || !room || !team) return;
      
      addPlayer(name, room, team, starting);
      alert(`${name} has been registered!`);
      
      // Reset and collapse form
      addForm.reset();
      addCard.classList.add('hidden');
      btnShowAdd.classList.remove('hidden');
      
      renderGamersHub();
    });
  }

  // Match History Search Listener
  const searchInput = document.getElementById('history-search');
  if (searchInput) {
    searchInput.addEventListener('input', renderMatchLogs);
  }
}

function initCalculatorListeners() {
  const ratingAInput = document.getElementById('calc-rating1');
  const ratingBInput = document.getElementById('calc-rating2');
  const score1Input = document.getElementById('calc-score1');
  const score2Input = document.getElementById('calc-score2');
  const importanceSelect = document.getElementById('calc-importance');
  const isKnockoutCheck = document.getElementById('calc-is-knockout');
  const isPsoCheck = document.getElementById('calc-is-pso');
  
  const calcInputs = [ratingAInput, ratingBInput, score1Input, score2Input, importanceSelect, isKnockoutCheck, isPsoCheck];
  
  // Live update in calculator sandbox on input changes
  calcInputs.forEach(input => {
    if (input) {
      input.addEventListener('input', runSandboxCalculation);
      input.addEventListener('change', runSandboxCalculation);
    }
  });

  // Toggle calc PSO Winner Selector
  if (isPsoCheck) {
    isPsoCheck.addEventListener('change', () => {
      const calcPsoGroup = document.getElementById('calc-pso-winner-group');
      if (isPsoCheck.checked) {
        calcPsoGroup.classList.remove('hidden');
        if (score1Input.value !== score2Input.value) {
          score2Input.value = score1Input.value;
        }
      } else {
        calcPsoGroup.classList.add('hidden');
      }
      runSandboxCalculation();
    });
  }
  
  // Align calculator scores on PSO checked
  if (score1Input && score2Input && isPsoCheck) {
    score1Input.addEventListener('input', () => {
      if (isPsoCheck.checked) {
        score2Input.value = score1Input.value;
        runSandboxCalculation();
      }
    });
  }
  
  // Radio toggles for calc PSO winner
  const calcPsoRadios = document.getElementsByName('calc-pso-winner');
  calcPsoRadios.forEach(radio => {
    radio.addEventListener('change', runSandboxCalculation);
  });
  
  // Trigger button just in case
  const btnRun = document.getElementById('btn-run-calc');
  if (btnRun) {
    btnRun.addEventListener('click', runSandboxCalculation);
  }
}

function initSettingsListeners() {
  const btnSeed = document.getElementById('btn-seed-data');
  const btnReset = document.getElementById('btn-reset-db');
  const btnExport = document.getElementById('btn-export-db');
  
  const fileInput = document.getElementById('import-file-input');
  const fileNameDisplay = document.getElementById('import-file-name');

  if (btnSeed) {
    btnSeed.addEventListener('click', () => {
      if (confirm('Warning: Seeding mock data will wipe your current database and load default players and matches. Continue?')) {
        localStorage.removeItem('efootball_rankings_players');
        localStorage.removeItem('efootball_rankings_matches');
        seedDatabaseIfEmpty();
        alert('Database populated with seed records!');
        handleRoute();
      }
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (confirm('DANGER: This will delete ALL registered players and match logs permanently. There is no undo. Proceed?')) {
        resetDatabase();
        alert('Database successfully wiped.');
        handleRoute();
      }
    });
  }

  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const jsonStr = exportData();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `efootball_rankings_backup_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      if (fileNameDisplay) fileNameDisplay.innerText = file.name;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target.result;
          importData(content);
          alert('Data backup successfully restored!');
          fileInput.value = ''; // Reset
          if (fileNameDisplay) fileNameDisplay.innerText = 'No file chosen';
          handleRoute();
        } catch (err) {
          alert(`Import Failed: ${err.message}`);
        }
      };
      reader.readAsText(file);
    });
  }
}

function initModalListeners() {
  const btnClose = document.getElementById('btn-close-modal');
  const modalBackdrop = document.getElementById('player-profile-modal');
  const btnDeletePlayer = document.getElementById('btn-delete-player-action');
  
  if (btnClose) {
    btnClose.addEventListener('click', closePlayerProfileModal);
  }
  
  if (modalBackdrop) {
    // Close modal when clicking on backdrop area (outside card)
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) {
        closePlayerProfileModal();
      }
    });
  }
  
  if (btnDeletePlayer) {
    btnDeletePlayer.addEventListener('click', () => {
      if (!selectedPlayerIdForModal) return;
      
      if (confirm("Are you sure you want to delete this gamer? Deleting this player will also purge all match history logs involving them and recalculate other players' Elo ratings sequentially. This cannot be undone!")) {
        deletePlayer(selectedPlayerIdForModal);
        alert("Player record and associated matches purged successfully.");
        closePlayerProfileModal();
        handleRoute();
      }
    });
  }
}
