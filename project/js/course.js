/**
 * course.js — Course Page Controller
 * - Local video → <video> tag | YouTube/external → <iframe>
 * - Notification + stats update on video end
 * - PDF open in new tab
 */

const FLASK_BASE = 'http://127.0.0.1:5000';

const CourseController = {
  activeTab: 'videos',
  _currentVideos: [],

  async init() {
    if (!AppController.requireAuth()) return;
    const { year, subject } = AppController.getParams();
    if (!subject) { window.location.href = 'index.html'; return; }

    const [subjRes, yearRes, videoRes, docRes] = await Promise.all([
      Api.getSubject(subject),
      Api.getYear(year),
      Api.getVideos(subject),
      Api.getDocs(subject),
    ]);

    const subjectData = subjRes.data;
    const yearData    = yearRes.data;
    document.getElementById('bc-year').textContent      = yearData?.label || 'Accueil';
    document.getElementById('bc-year').href             = `subjects.html?year=${year}`;
    document.getElementById('bc-subject').textContent   = subjectData?.name || 'Matière';
    document.getElementById('course-title').textContent = subjectData?.name || 'Cours';

    const videos = videoRes.ok ? videoRes.data : [];
    const docs   = docRes.ok  ? docRes.data   : [];
    this._currentVideos = videos;

    this.renderPlaylist(videos, docs);
    if (videos.length) this.loadVideo(videos[0]);
    this.initTabs();
  },

  // Resolve local /uploads/ URLs to full Flask URL
  _resolveUrl(url) {
    if (!url) return '';
    if (url.startsWith('/uploads/')) return FLASK_BASE + url;
    return url;
  },

  renderPlaylist(videos, docs) {
    const vList = document.getElementById('video-list');
    if (!videos.length) {
      vList.innerHTML = '<div class="empty-state" style="padding:30px"><div class="empty-icon">🎬</div><p>Aucune vidéo</p></div>';
    } else {
      vList.innerHTML = videos.map((v, i) => `
        <div class="playlist-item ${i === 0 ? 'active' : ''}" id="vi-${v.id}"
             onclick='CourseController.loadVideo(${JSON.stringify(v).replace(/'/g, "&#39;")})'>
          <span class="item-num">${i + 1}</span>
          <div class="item-thumb">▶️</div>
          <div class="item-info">
            <div class="item-title">${v.title}</div>
            <div class="item-dur">⏱ ${v.duration}</div>
          </div>
        </div>`).join('');
    }

    const dList = document.getElementById('doc-list');
    if (!docs.length) {
      dList.innerHTML = '<div class="empty-state" style="padding:30px"><div class="empty-icon">📄</div><p>Aucun document</p></div>';
    } else {
      dList.innerHTML = docs.map(d => `
        <div class="doc-item" onclick="CourseController.openPDF('${d.url}', '${d.name.replace(/'/g, "\\'")}')">
          <div class="doc-icon">📄</div>
          <div>
            <div class="doc-name">${d.name}</div>
            <div class="doc-size">${d.file_size || ''}</div>
          </div>
          <span style="color:var(--text3);margin-left:auto">👁</span>
        </div>`).join('');
    }
  },

  async loadVideo(video) {
    const url     = this._resolveUrl(video.url);
    const isLocal = video.url?.startsWith('/uploads/');
    const player  = document.getElementById('video-player');

    if (isLocal) {
      player.innerHTML = `
        <video id="main-video" controls
               style="width:100%;height:100%;max-height:480px;border-radius:12px;background:#000">
          <source src="${url}" />
          Votre navigateur ne supporte pas la lecture vidéo.
        </video>`;
      // Fire notification when video ends
      document.getElementById('main-video').addEventListener('ended', () => {
        this._onVideoEnded(video);
      });
    } else {
      // YouTube or external
      const sep = video.url?.includes('?') ? '&' : '?';
      player.innerHTML = `
        <iframe src="${url}${sep}rel=0" allowfullscreen title="${video.title}"
                style="width:100%;height:100%;border:none;border-radius:12px"></iframe>`;
    }

    document.getElementById('video-title').textContent = video.title;
    document.getElementById('video-id').textContent    = `⏱ Durée : ${video.duration}`;

    // Highlight active in playlist
    document.querySelectorAll('.playlist-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`vi-${video.id}`)?.classList.add('active');

    // POST to API: mark watched → also creates subject progress entry
    const res = await AuthController.markVideoWatched(video.id);

    // Update dashboard stats immediately
    await this._refreshStats();

    AppController.toast(`▶️ ${video.title}`, 'info', 2000);
  },

  // Called when a local <video> fires "ended"
  _onVideoEnded(video) {
    const prefs = JSON.parse(localStorage.getItem('studyhub_notifs') || '{}');
    if (prefs['n-video-end'] !== false) {
      // Only notify once per video — check if already in history
      const already = NotifManager.getAll().some(n => n.videoId === video.id);
      if (!already) {
        NotifManager.add({
          icon:    '🎬',
          title:   'Vidéo terminée !',
          body:    `"${video.title}" regardée jusqu\'au bout.`,
          videoId: video.id,
        });
      }
    }
    AppController.toast(`✅ Vidéo terminée : ${video.title}`, 'success', 3500);
  },

  // Refresh stat counters on index.html if user navigates back
  async _refreshStats() {
    const res = await Api.getMyProgress();
    if (!res.ok) return;
    // Cache in user object so dashboard.js can read it
    const user = AuthController.currentUser();
    if (user) {
      user._watchedCount  = res.data.watched_videos.length;
      user._subjectCount  = res.data.subject_progress.length;
      localStorage.setItem('studyhub_user', JSON.stringify(user));
    }
    // Update badge
    NotifManager._updateBadge();
  },

  openPDF(url, name) {
    window.open(this._resolveUrl(url), '_blank');
    AppController.toast('Document ouvert dans un nouvel onglet.', 'info', 2000);
  },

  initTabs() {
    document.getElementById('tab-videos').addEventListener('click', () => this.switchTab('videos'));
    document.getElementById('tab-docs').addEventListener('click',   () => this.switchTab('docs'));
  },

  switchTab(tab) {
    this.activeTab = tab;
    document.getElementById('tab-videos').classList.toggle('active', tab === 'videos');
    document.getElementById('tab-docs').classList.toggle('active',   tab === 'docs');
    document.getElementById('video-list').classList.toggle('hidden', tab !== 'videos');
    document.getElementById('doc-list').classList.toggle('hidden',   tab !== 'docs');
  },
};

document.addEventListener('DOMContentLoaded', () => CourseController.init());