/**
 * app.js — Core Application Controller
 */

// ── Subscription Manager (admin always unlocked) ──
const SubManager = {
  KEY: 'studyhub_subscriptions',
  getAll() {
    try { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); } catch { return []; }
  },
  has(planId) {
    // planId = 'year_1', 'year_2', 'year_3', 'year_4', 'all'
    const u = AuthController.currentUser();
    if (u?.role === 'admin') return true;
    const subs = this.getAll();
    if (subs.includes('all')) return true;
    return subs.includes(planId);
  },
  hasYear(yearId) {
    const u = AuthController.currentUser();
    if (u?.role === 'admin') return true;
    const subs = this.getAll();
    if (subs.includes('all')) return true;
    return subs.includes('year_' + yearId);
  },
  add(planId) {
    const subs = this.getAll();
    if (!subs.includes(planId)) {
      subs.push(planId);
      localStorage.setItem(this.KEY, JSON.stringify(subs));
    }
  },
};

// ── Notification Manager ──
const NotifManager = {
  KEY: 'studyhub_notifications',
  getAll() {
    try { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); } catch { return []; }
  },
  add(notif) {
    const all = this.getAll();
    all.unshift({ id: Date.now(), ...notif, read: false, time: new Date().toISOString() });
    localStorage.setItem(this.KEY, JSON.stringify(all.slice(0, 50)));
    NotifManager._updateBadge();
  },
  markAllRead() {
    const all = this.getAll().map(n => ({ ...n, read: true }));
    localStorage.setItem(this.KEY, JSON.stringify(all));
    NotifManager._updateBadge();
  },
  unreadCount() { return this.getAll().filter(n => !n.read).length; },
  _updateBadge() {
    const badge = document.getElementById('notif-badge');
    const count = NotifManager.unreadCount();
    if (!badge) return;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  },
};

// ──────────────────────────────────────────────────────────
const AppController = {

  // ── Toast notifications ──
  toast(msg, type = 'info', duration = 3500) {
    const icons = { success: '✅', error: '❌', warn: '⚠️', info: 'ℹ️' };
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-icon">${icons[type]}</span>
                    <span class="toast-msg">${msg}</span>
                    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
    container.appendChild(el);
    setTimeout(() => el.remove(), duration);
  },

  // ── Sidebar mobile toggle ──
  initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const toggle  = document.getElementById('menu-toggle');
    if (!sidebar) return;
    const open  = () => { sidebar.classList.add('open');    overlay.classList.add('visible'); };
    const close = () => { sidebar.classList.remove('open'); overlay.classList.remove('visible'); };
    toggle?.addEventListener('click', open);
    overlay?.addEventListener('click', close);
  },

  // ── Render sidebar ──
  renderSidebar() {
    const user    = AuthController.currentUser();
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const page     = window.location.pathname.split('/').pop() || 'index.html';
    const isActive = (href) => page === href ? 'active' : '';

    // Mes Niveaux — only unlocked (or all for admin)
    const yearDefs = [
      { id: 1, icon: '🌱', label: '1ère Année' },
      { id: 2, icon: '📚', label: '2ème Année' },
      { id: 3, icon: '🔬', label: '3ème Année' },
      { id: 4, icon: '🎓', label: 'Baccalauréat' },
    ];
    const unlockedYears = user ? yearDefs.filter(y => SubManager.hasYear(y.id)) : [];
    const niveauxLinks = unlockedYears.length
      ? unlockedYears.map(y =>
          `<a href="subjects.html?year=${y.id}" class="nav-link" style="padding-left:28px;font-size:.85rem">
             <span class="nav-icon">${y.icon}</span>${y.label}
           </a>`).join('')
      : `<a href="pricing.html" class="nav-link" style="padding-left:28px;font-size:.82rem;color:var(--accent)">
           <span class="nav-icon">🔒</span>Débloquer un niveau
         </a>`;

    const adminLink = user?.role === 'admin'
      ? `<span class="nav-section-label">Administration</span>
         <a href="admin.html" class="nav-link ${isActive('admin.html')}">
           <span class="nav-icon">⚙️</span>Panneau Admin
         </a>`
      : '';

    const authSection = user
      ? `<span class="nav-section-label">Compte</span>
         <a href="pricing.html"  class="nav-link ${isActive('pricing.html')}"><span class="nav-icon">💳</span>Abonnements</a>
         <a href="settings.html" class="nav-link ${isActive('settings.html')}"><span class="nav-icon">⚙️</span>Paramètres</a>
         <a href="profile.html"  class="nav-link ${isActive('profile.html')}"><span class="nav-icon">👤</span>Mon Profil</a>
         <button class="nav-link" onclick="AppController.logout()"><span class="nav-icon">🚪</span>Déconnexion</button>`
      : `<span class="nav-section-label">Compte</span>
         <a href="login.html"  class="nav-link ${isActive('login.html')}"><span class="nav-icon">🔑</span>Connexion</a>
         <a href="signup.html" class="nav-link ${isActive('signup.html')}"><span class="nav-icon">✨</span>Inscription</a>`;

    const userFooter = user
      ? `<div class="user-mini" onclick="window.location='profile.html'">
           <div class="avatar">${user.username[0].toUpperCase()}</div>
           <div class="user-info">
             <div class="user-name">${user.username}</div>
             <div class="user-role">${user.role === 'admin' ? '👑 Admin' : '🎓 Étudiant'}</div>
           </div>
         </div>`
      : `<a href="login.html" class="btn btn-primary" style="width:100%;border-radius:8px;justify-content:center">Se connecter</a>`;

    sidebar.innerHTML = `
      <div class="sidebar-logo">
        <div class="logo-icon">S</div>
        <span>Study<em>Hub</em></span>
      </div>
      <nav class="sidebar-nav">
        <span class="nav-section-label">Navigation</span>
        <a href="index.html" class="nav-link ${isActive('index.html')}">
          <span class="nav-icon">🏠</span>Tableau de bord
        </a>
        <span class="nav-section-label">Mes Niveaux</span>
        ${niveauxLinks}
        ${adminLink}
        ${authSection}
      </nav>
      <div class="sidebar-footer">${userFooter}</div>`;
  },

  // ── Notification bell ──
  initNotifBell() {
    const btn = document.getElementById('btn-notif');
    if (!btn) return;
    NotifManager._updateBadge();

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Toggle
      const existing = document.getElementById('notif-panel');
      if (existing) { existing.remove(); return; }

      const notifs = NotifManager.getAll();
      NotifManager.markAllRead();

      const panel = document.createElement('div');
      panel.id = 'notif-panel';
      panel.style.cssText = `
        position:fixed; top:64px; right:16px; width:320px; max-height:420px;
        overflow-y:auto; background:var(--bg2); border:1px solid var(--border);
        border-radius:14px; box-shadow:var(--shadow-lg); z-index:400; padding:16px;
        animation: fadeInDown .15s ease;
      `;

      const timeAgo = (iso) => {
        const s = Math.floor((Date.now() - new Date(iso)) / 1000);
        if (s < 60) return 'À l\'instant';
        if (s < 3600) return `Il y a ${Math.floor(s/60)} min`;
        if (s < 86400) return `Il y a ${Math.floor(s/3600)} h`;
        return new Date(iso).toLocaleDateString('fr-FR');
      };

      panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <span style="font-family:'Sora',sans-serif;font-weight:700;font-size:.95rem">🔔 Notifications</span>
          <button onclick="document.getElementById('notif-panel').remove()"
                  style="color:var(--text3);font-size:1.1rem;cursor:pointer;padding:2px 6px;border-radius:4px">✕</button>
        </div>
        ${notifs.length === 0
          ? `<div style="text-align:center;padding:28px 0;color:var(--text3);font-size:.88rem">
               <div style="font-size:2rem;margin-bottom:8px">🔕</div>
               Aucune notification pour le moment
             </div>`
          : notifs.map(n => `
              <div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
                <span style="font-size:1.4rem;flex-shrink:0;line-height:1">${n.icon || '🔔'}</span>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:600;font-size:.85rem">${n.title}</div>
                  <div style="font-size:.78rem;color:var(--text2);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${n.body || ''}</div>
                  <div style="font-size:.72rem;color:var(--text3);margin-top:4px">${timeAgo(n.time)}</div>
                </div>
              </div>`).join('')
        }`;

      document.body.appendChild(panel);

      // Click outside closes
      setTimeout(() => {
        document.addEventListener('click', function handler() {
          document.getElementById('notif-panel')?.remove();
          document.removeEventListener('click', handler);
        });
      }, 50);
    });
  },

  // ── Global search (hits real API) ──
  initSearch() {
    const input   = document.getElementById('global-search');
    const results = document.getElementById('search-results');
    if (!input || !results) return;
    let debounce;

    input.addEventListener('input', () => {
      clearTimeout(debounce);
      const q = input.value.trim().toLowerCase();
      if (q.length < 2) { results.innerHTML = ''; results.classList.add('hidden'); return; }

      debounce = setTimeout(async () => {
        const res = await Api.getAllSubjects();
        const all = res.ok ? res.data : [];
        const matched = all.filter(s => s.name.toLowerCase().includes(q)).slice(0, 6);
        if (!matched.length) {
          results.innerHTML = '<div class="search-result-item"><span class="sr-label">Aucun résultat</span></div>';
        } else {
          results.innerHTML = matched.map(s => `
            <div class="search-result-item" onclick="AppController.goSubject('${s.id}', ${s.year_id})">
              <span style="font-size:1.2rem">${s.icon}</span>
              <div><div class="sr-label">${s.name}</div><div class="sr-sub">Année ${s.year_id}</div></div>
            </div>`).join('');
        }
        results.classList.remove('hidden');
      }, 300);
    });

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !results.contains(e.target))
        results.classList.add('hidden');
    });
  },

  goSubject(subjectId, yearId) {
    const user = AuthController.currentUser();
    if (!user) {
      sessionStorage.setItem('redirect', `course.html?year=${yearId}&subject=${subjectId}`);
      window.location.href = 'login.html';
    } else {
      window.location.href = `course.html?year=${yearId}&subject=${subjectId}`;
    }
  },

  logout() {
    AuthController.logout();
    AppController.toast('Déconnexion réussie.', 'success');
    setTimeout(() => window.location.href = 'login.html', 800);
  },

  requireAuth() {
    if (!AuthController.currentUser()) {
      sessionStorage.setItem('redirect', window.location.href);
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },

  requireAdmin() {
    const user = AuthController.currentUser();
    if (!user || user.role !== 'admin') {
      AppController.toast('Accès réservé aux administrateurs.', 'error');
      setTimeout(() => window.location.href = 'index.html', 1000);
      return false;
    }
    return true;
  },

  getParams() {
    return Object.fromEntries(new URLSearchParams(window.location.search));
  },

  init() {
    this.renderSidebar();
    this.initSidebar();
    this.initSearch();
    this.initNotifBell();
    document.querySelector('.page-content')?.classList.add('page-enter');
  }
};

document.addEventListener('DOMContentLoaded', () => AppController.init());