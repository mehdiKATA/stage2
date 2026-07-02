/**
 * dashboard.js — Dashboard Controller
 * - Subscription-gated year cards (admin always unlocked)
 * - Stats pulled from real API (/progress/me)
 * - Real PDF doc count from subject data
 */

const DashboardController = {

  async renderYears() {
    const container = document.getElementById('years-grid');
    if (!container) return;

    container.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
    const res = await Api.getYears();

    if (!res.ok) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>Erreur de connexion</h3>
        <p>${res.message}</p>
      </div>`;
      return;
    }

    container.innerHTML = res.data.map(y => {
      const unlocked = SubManager.hasYear(y.id);
      return `
        <div class="year-card" onclick="${unlocked
            ? `DashboardController.goYear(${y.id})`
            : `DashboardController.promptUnlock()`
          }"
          style="${unlocked ? '' : 'opacity:.5;filter:grayscale(.5);'}">
          <div class="card-icon" style="color:${y.color}">${y.icon}</div>
          <div class="card-title">${y.label}</div>
          <div class="card-desc">${y.description || ''}</div>
          ${unlocked
            ? `<div class="card-arrow">Voir les matières <span>→</span></div>`
            : `<div class="card-arrow" style="color:var(--text3)">
                 🔒 Non débloqué · <span style="color:var(--accent);font-weight:700">50 DT/mois</span>
               </div>`
          }
        </div>`;
    }).join('');
  },

  promptUnlock() {
    AppController.toast('🔒 Ce niveau nécessite un abonnement.', 'warn', 2500);
    setTimeout(() => window.location.href = 'pricing.html', 900);
  },

  async renderStats() {
    const user = AuthController.currentUser();
    if (!user) return;

    const res = await Api.getMyProgress();
    if (!res.ok) return;

    const watchedEl  = document.getElementById('stat-watched');
    const subjectsEl = document.getElementById('stat-subjects');

    // Use cached value if API call already done on course page
    const watched  = res.data.watched_videos.length;
    const subjects = res.data.subject_progress.length;

    if (watchedEl)  watchedEl.textContent  = watched;
    if (subjectsEl) subjectsEl.textContent = subjects;

    // Also update total PDF count from subjects
    await this._updateDocCount();
  },

  // Pull real PDF count from all subjects
  async _updateDocCount() {
    const docEl = document.getElementById('stat-docs');
    if (!docEl) return;
    const res = await Api.getAllSubjects();
    if (!res.ok) return;
    const total = res.data.reduce((sum, s) => sum + (s.doc_count || 0), 0);
    docEl.textContent = total || '0';
  },

  goYear(yearId) {
    window.location.href = `subjects.html?year=${yearId}`;
  },

  async init() {
    await this.renderYears();
    await this.renderStats();
  },
};

document.addEventListener('DOMContentLoaded', () => DashboardController.init());