/**
 * admin.js — Admin Panel Controller
 * - Upload vidéo/doc depuis PC local
 * - Filtre Année → Matière dans les modals
 * - Ajout de nouvelle matière avec choix d'icône
 */

const AdminController = {

  _years:    [],
  _subjects: [],

  // ── Icons disponibles pour les matières ──
  ICONS: ['📐','⚗️','✍️','🧬','🌍','🧠','🇬🇧','📖','⚡','🎨','🏃','🎵','💻','🔭','🌱','📊','🗺️','🧪','📜','🔢','🏛️','🌐','📝','🎓','🔬','📚','💡','🧲','🌿','🎭'],

  async init() {
    if (!AppController.requireAdmin()) return;
    await this.loadYearsAndSubjects();
    await Promise.all([
      this.renderOverview(),
      this.renderUsersTable(),
      this.renderContentTable(),
    ]);
  },

  async loadYearsAndSubjects() {
    const [yRes, sRes] = await Promise.all([Api.getYears(), Api.getAllSubjects()]);
    if (yRes.ok) this._years    = yRes.data;
    if (sRes.ok) this._subjects = sRes.data;
  },

  async renderOverview() {
    const res = await Api.getAdminStats();
    if (!res.ok) return;
    const d = res.data;
    document.getElementById('admin-users').textContent    = d.total_users;
    document.getElementById('admin-subjects').textContent = d.total_subjects;
    document.getElementById('admin-videos').textContent   = d.total_videos;
    document.getElementById('admin-docs').textContent     = d.total_docs;
  },

  async renderUsersTable() {
    const tbody = document.getElementById('users-tbody');
    const res = await Api.getAdminUsers();
    if (!res.ok) { tbody.innerHTML = `<tr><td colspan="6">${res.message}</td></tr>`; return; }
    tbody.innerHTML = res.data.map(u => `
      <tr>
        <td><strong>${u.username}</strong></td>
        <td>${u.email}</td>
        <td><span class="badge ${u.role==='admin'?'badge-warn':'badge-info'}">${u.role==='admin'?'👑 Admin':'🎓 Étudiant'}</span></td>
        <td>${u.watched_count||0} vidéos</td>
        <td>${new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
        <td>${u.role!=='admin'
          ? `<button class="btn btn-sm btn-danger" onclick="AdminController.deleteUser(${u.id})">Supprimer</button>`
          : '<span class="text-muted">—</span>'}</td>
      </tr>`).join('');
  },

  async renderContentTable() {
    const tbody = document.getElementById('content-tbody');
    const res   = await Api.getAllSubjects();
    if (!res.ok) { tbody.innerHTML = `<tr><td colspan="5">${res.message}</td></tr>`; return; }

    const yearMap = {};
    this._years.forEach(y => yearMap[y.id] = y);

    // Year filter buttons
    const filterBar = document.getElementById('content-filter-bar');
    if (filterBar) {
      filterBar.innerHTML =
        `<button class="btn btn-sm btn-outline active-filter" onclick="AdminController.filterContent(0, this)">Tous</button>` +
        this._years.map(y =>
          `<button class="btn btn-sm btn-ghost" onclick="AdminController.filterContent(${y.id}, this)">${y.icon} ${y.label}</button>`
        ).join('');
    }

    tbody.innerHTML = res.data.map(s => `
      <tr data-year="${s.year_id}">
        <td>${s.icon} <strong>${s.name}</strong></td>
        <td><span class="badge badge-warn">${yearMap[s.year_id]?.icon||''} ${yearMap[s.year_id]?.label||'Année '+s.year_id}</span></td>
        <td><span class="badge badge-info">${s.video_count||0} vidéos</span></td>
        <td><span class="badge badge-success">${s.doc_count||0} docs</span></td>
        <td style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-sm btn-outline"  onclick="AdminController.openAddVideo(${s.id})">🎬 Vidéo</button>
          <button class="btn btn-sm btn-ghost"    onclick="AdminController.openAddDoc(${s.id})">📄 Doc</button>
          <button class="btn btn-sm btn-danger"   onclick="AdminController.deleteSubject(${s.id})">🗑</button>
        </td>
      </tr>`).join('');
  },

  filterContent(yearId, btn) {
    document.querySelectorAll('#content-filter-bar button').forEach(b => {
      b.className = 'btn btn-sm btn-ghost';
    });
    btn.className = 'btn btn-sm btn-outline active-filter';
    document.querySelectorAll('#content-tbody tr').forEach(row => {
      row.style.display = (!yearId || row.dataset.year == yearId) ? '' : 'none';
    });
  },

  async deleteUser(uid) {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    const res = await Api.deleteUser(uid);
    AppController.toast(res.message, res.ok ? 'success' : 'error');
    if (res.ok) { await this.renderUsersTable(); await this.renderOverview(); }
  },

  async deleteSubject(sid) {
    if (!confirm('Désactiver cette matière ?')) return;
    const res = await Api.deleteSubject(sid);
    AppController.toast(res.message, res.ok ? 'success' : 'error');
    if (res.ok) {
      await this.loadYearsAndSubjects();
      await this.renderContentTable();
      await this.renderOverview();
    }
  },

  // ════════════════════════════════════════
  //  MODAL — AJOUTER VIDÉO
  // ════════════════════════════════════════
  openAddVideo(preSubjectId = null) {
    document.getElementById('modal-title').textContent = '🎬 Ajouter une vidéo';

    const firstYearId   = this._years[0]?.id;
    const yearOptions   = this._years.map(y =>
      `<option value="${y.id}">${y.icon} ${y.label}</option>`).join('');

    // Pre-select year based on subject
    let selectedYearId = firstYearId;
    if (preSubjectId) {
      const s = this._subjects.find(s => s.id == preSubjectId);
      if (s) selectedYearId = s.year_id;
    }
    const initSubjects = this._subjects.filter(s => s.year_id == selectedYearId);
    const subjectOptions = initSubjects.map(s =>
      `<option value="${s.id}" ${s.id == preSubjectId ? 'selected':''}>${s.icon} ${s.name}</option>`).join('');

    document.getElementById('modal-form').innerHTML = `
      <div class="form-group">
        <label class="form-label">📂 Année</label>
        <select class="form-input" id="f-year" onchange="AdminController._updateSubjects(this.value,'f-subject')">
          ${this._years.map(y =>
            `<option value="${y.id}" ${y.id==selectedYearId?'selected':''}>${y.icon} ${y.label}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">📚 Matière</label>
        <select class="form-input" id="f-subject">
          ${subjectOptions}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Titre de la vidéo</label>
        <input class="form-input" id="f-title" placeholder="Introduction au chapitre" />
      </div>
      <div class="form-group">
        <label class="form-label">⏱ Durée (ex: 15:30)</label>
        <input class="form-input" id="f-dur" placeholder="15:30" />
      </div>
      <div class="form-group">
        <label class="form-label">📁 Fichier vidéo (MP4, AVI, MKV, MOV...)</label>
        <input type="file" class="form-input" id="f-video-file"
               accept="video/*"
               style="padding:10px;cursor:pointer"
               onchange="AdminController._onVideoFileChange(this)" />
        <div id="f-video-preview" style="display:none;margin-top:10px">
          <video id="f-video-el" controls style="width:100%;border-radius:8px;max-height:160px;background:#000"></video>
          <div id="f-video-meta" style="font-size:.78rem;color:var(--text3);margin-top:6px"></div>
        </div>
      </div>
      <div id="f-upload-progress" style="display:none;margin-bottom:14px">
        <div style="background:var(--bg3);border-radius:6px;overflow:hidden;height:10px">
          <div id="f-progress-bar" style="height:100%;background:var(--accent);width:0%;transition:width .2s"></div>
        </div>
        <div id="f-progress-label" style="font-size:.78rem;color:var(--text3);margin-top:5px">Envoi en cours...</div>
      </div>
      <button class="btn btn-primary w-full" id="f-btn-save"
              onclick="AdminController.saveVideo()"
              style="border-radius:10px;justify-content:center;padding:14px">
        ✅ Ajouter la vidéo
      </button>`;

    this._showModal();
  },

  _onVideoFileChange(input) {
    const file = input.files[0];
    if (!file) return;
    const preview = document.getElementById('f-video-preview');
    const videoEl = document.getElementById('f-video-el');
    const meta    = document.getElementById('f-video-meta');
    preview.style.display = 'block';
    videoEl.src = URL.createObjectURL(file);
    meta.textContent = `📄 ${file.name} — ${(file.size/1024/1024).toFixed(1)} MB`;
    const titleInput = document.getElementById('f-title');
    if (titleInput && !titleInput.value)
      titleInput.value = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  },

  async saveVideo() {
    const file      = document.getElementById('f-video-file')?.files[0];
    const title     = document.getElementById('f-title')?.value.trim();
    const dur       = document.getElementById('f-dur')?.value.trim() || '00:00';
    const subjectId = document.getElementById('f-subject')?.value;

    if (!file)      { AppController.toast('Sélectionnez un fichier vidéo.', 'error'); return; }
    if (!title)     { AppController.toast('Titre requis.', 'error'); return; }
    if (!subjectId) { AppController.toast('Matière requise.', 'error'); return; }

    document.getElementById('f-upload-progress').style.display = 'block';
    const btn = document.getElementById('f-btn-save');
    btn.disabled = true; btn.textContent = '⏳ Envoi...';

    const formData = new FormData();
    formData.append('file',       file);
    formData.append('title',      title);
    formData.append('duration',   dur);
    formData.append('subject_id', subjectId);

    const token = localStorage.getItem('studyhub_token') || '';
    const xhr   = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        document.getElementById('f-progress-bar').style.width  = pct + '%';
        document.getElementById('f-progress-label').textContent = `Envoi : ${pct}% (${(e.loaded/1024/1024).toFixed(1)} / ${(e.total/1024/1024).toFixed(1)} MB)`;
      }
    });

    xhr.onload = async () => {
      btn.disabled = false; btn.textContent = '✅ Ajouter la vidéo';
      try {
        const res = JSON.parse(xhr.responseText);
        AppController.toast(res.message, res.ok ? 'success' : 'error');
        if (res.ok) { this.closeModal(); await this.renderContentTable(); await this.renderOverview(); }
      } catch(e) { AppController.toast('Erreur serveur.', 'error'); }
    };
    xhr.onerror = () => {
      btn.disabled = false;
      AppController.toast('Erreur réseau lors de l\'upload.', 'error');
    };

    xhr.open('POST', 'http://127.0.0.1:5000/api/videos/upload');
    xhr.setRequestHeader('X-Session-Token', token);
    xhr.send(formData);
  },

  // ════════════════════════════════════════
  //  MODAL — AJOUTER DOCUMENT
  // ════════════════════════════════════════
  openAddDoc(preSubjectId = null) {
    document.getElementById('modal-title').textContent = '📄 Ajouter un document';

    let selectedYearId = this._years[0]?.id;
    if (preSubjectId) {
      const s = this._subjects.find(s => s.id == preSubjectId);
      if (s) selectedYearId = s.year_id;
    }
    const initSubjects   = this._subjects.filter(s => s.year_id == selectedYearId);
    const subjectOptions = initSubjects.map(s =>
      `<option value="${s.id}" ${s.id==preSubjectId?'selected':''}>${s.icon} ${s.name}</option>`).join('');

    document.getElementById('modal-form').innerHTML = `
      <div class="form-group">
        <label class="form-label">📂 Année</label>
        <select class="form-input" id="f-year" onchange="AdminController._updateSubjects(this.value,'f-subject')">
          ${this._years.map(y =>
            `<option value="${y.id}" ${y.id==selectedYearId?'selected':''}>${y.icon} ${y.label}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">📚 Matière</label>
        <select class="form-input" id="f-subject">
          ${subjectOptions}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Nom du document</label>
        <input class="form-input" id="f-dname" placeholder="Cours Chapitre 1.pdf" />
      </div>
      <div class="form-group">
        <label class="form-label">📁 Fichier PDF</label>
        <input type="file" class="form-input" id="f-doc-file"
               accept=".pdf"
               style="padding:10px;cursor:pointer"
               onchange="AdminController._onDocFileChange(this)" />
        <div id="f-doc-info" style="font-size:.78rem;color:var(--text3);margin-top:6px"></div>
      </div>
      <div id="f-doc-upload-progress" style="display:none;margin-bottom:14px">
        <div style="background:var(--bg3);border-radius:6px;overflow:hidden;height:10px">
          <div id="f-doc-progress-bar" style="height:100%;background:var(--accent);width:0%;transition:width .2s"></div>
        </div>
        <div id="f-doc-progress-label" style="font-size:.78rem;color:var(--text3);margin-top:5px">Envoi en cours...</div>
      </div>
      <button class="btn btn-primary w-full" id="f-btn-doc-save"
              onclick="AdminController.saveDoc()"
              style="border-radius:10px;justify-content:center;padding:14px">
        ✅ Ajouter le document
      </button>`;

    this._showModal();
  },

  _onDocFileChange(input) {
    const file = input.files[0];
    if (!file) return;
    document.getElementById('f-doc-info').textContent =
      `📄 ${file.name} — ${(file.size/1024).toFixed(0)} KB`;
    const nameInput = document.getElementById('f-dname');
    if (nameInput && !nameInput.value) nameInput.value = file.name;
  },

  async saveDoc() {
    const file      = document.getElementById('f-doc-file')?.files[0];
    const name      = document.getElementById('f-dname')?.value.trim();
    const subjectId = document.getElementById('f-subject')?.value;

    if (!file)      { AppController.toast('Sélectionnez un fichier PDF.', 'error'); return; }
    if (!subjectId) { AppController.toast('Matière requise.', 'error'); return; }

    document.getElementById('f-doc-upload-progress').style.display = 'block';
    const btn = document.getElementById('f-btn-doc-save');
    btn.disabled = true; btn.textContent = '⏳ Envoi...';

    const formData = new FormData();
    formData.append('file',       file);
    formData.append('name',       name || file.name);
    formData.append('subject_id', subjectId);

    const token = localStorage.getItem('studyhub_token') || '';
    const xhr   = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        document.getElementById('f-doc-progress-bar').style.width   = pct + '%';
        document.getElementById('f-doc-progress-label').textContent = `Envoi : ${pct}%`;
      }
    });

    xhr.onload = async () => {
      btn.disabled = false; btn.textContent = '✅ Ajouter le document';
      try {
        const res = JSON.parse(xhr.responseText);
        AppController.toast(res.message, res.ok ? 'success' : 'error');
        if (res.ok) { this.closeModal(); await this.renderContentTable(); await this.renderOverview(); }
      } catch(e) { AppController.toast('Erreur serveur.', 'error'); }
    };
    xhr.onerror = () => {
      btn.disabled = false;
      AppController.toast('Erreur réseau lors de l\'upload.', 'error');
    };

    xhr.open('POST', 'http://127.0.0.1:5000/api/documents/upload');
    xhr.setRequestHeader('X-Session-Token', token);
    xhr.send(formData);
  },

  // ════════════════════════════════════════
  //  MODAL — AJOUTER MATIÈRE
  // ════════════════════════════════════════
  openAddSubject() {
    document.getElementById('modal-title').textContent = '📚 Ajouter une matière';

    const iconGrid = this.ICONS.map(ic =>
      `<div class="icon-option" onclick="AdminController._selectIcon('${ic}',this)"
            style="font-size:1.4rem;padding:8px;border-radius:8px;cursor:pointer;
                   border:2px solid transparent;text-align:center;transition:.15s"
            title="${ic}">${ic}</div>`
    ).join('');

    document.getElementById('modal-form').innerHTML = `
      <div class="form-group">
        <label class="form-label">📂 Année</label>
        <select class="form-input" id="f-subj-year">
          ${this._years.map(y =>
            `<option value="${y.id}">${y.icon} ${y.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Nom de la matière</label>
        <input class="form-input" id="f-subj-name" placeholder="ex: Biologie, Informatique..." />
      </div>
      <div class="form-group">
        <label class="form-label">Icône <span id="f-selected-icon-label" style="font-size:1.2rem;margin-left:8px">📚</span></label>
        <input type="hidden" id="f-subj-icon" value="📚" />
        <div style="display:grid;grid-template-columns:repeat(10,1fr);gap:4px;
                    background:var(--bg3);border-radius:10px;padding:10px;max-height:150px;overflow-y:auto">
          ${iconGrid}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Couleur</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap" id="f-color-row">
          ${['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16']
            .map((c,i) => `<div onclick="AdminController._selectColor('${c}',this)"
              style="width:28px;height:28px;border-radius:50%;background:${c};cursor:pointer;
                     border:3px solid ${i===0?'white':'transparent'};transition:.15s"
              data-color="${c}"></div>`).join('')}
          <input type="color" id="f-custom-color" value="#3b82f6"
                 style="width:28px;height:28px;border-radius:50%;cursor:pointer;border:none;background:none;padding:0"
                 title="Couleur personnalisée"
                 onchange="AdminController._selectColor(this.value, null)" />
        </div>
        <input type="hidden" id="f-subj-color" value="#3b82f6" />
      </div>
      <button class="btn btn-primary w-full" onclick="AdminController.saveSubject()"
              style="border-radius:10px;justify-content:center;padding:14px">
        ✅ Créer la matière
      </button>`;

    this._showModal();
  },

  _selectIcon(icon, el) {
    document.querySelectorAll('.icon-option').forEach(e =>
      e.style.borderColor = 'transparent');
    el.style.borderColor = 'var(--accent)';
    document.getElementById('f-subj-icon').value = icon;
    document.getElementById('f-selected-icon-label').textContent = icon;
  },

  _selectColor(color, el) {
    document.querySelectorAll('#f-color-row div[data-color]').forEach(e =>
      e.style.borderColor = 'transparent');
    if (el) el.style.borderColor = 'white';
    document.getElementById('f-subj-color').value = color;
    document.getElementById('f-custom-color').value = color;
  },

  async saveSubject() {
    const yearId = document.getElementById('f-subj-year')?.value;
    const name   = document.getElementById('f-subj-name')?.value.trim();
    const icon   = document.getElementById('f-subj-icon')?.value || '📚';
    const color  = document.getElementById('f-subj-color')?.value || '#3b82f6';

    if (!name)   { AppController.toast('Nom requis.', 'error'); return; }
    if (!yearId) { AppController.toast('Année requise.', 'error'); return; }

    const res = await Api.addSubject({ name, year_id: parseInt(yearId), icon, color });
    AppController.toast(res.message, res.ok ? 'success' : 'error');
    if (res.ok) {
      this.closeModal();
      await this.loadYearsAndSubjects();
      await this.renderContentTable();
      await this.renderOverview();
    }
  },

  // ── Helpers ──
  _updateSubjects(yearId, selectId) {
    const subjects = this._subjects.filter(s => s.year_id == yearId);
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = subjects.map(s =>
      `<option value="${s.id}">${s.icon} ${s.name}</option>`).join('');
  },

  _showModal() {
    document.getElementById('modal-add').classList.remove('hidden');
    document.getElementById('modal-overlay-bg').style.display = 'block';
  },

  closeModal() {
    document.getElementById('modal-add').classList.add('hidden');
    document.getElementById('modal-overlay-bg').style.display = 'none';
  }
};

document.addEventListener('DOMContentLoaded', () => AdminController.init());