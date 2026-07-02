/**
 * api.js — HTTP Client
 * Uses a session token stored in localStorage (no cookie issues).
 * Works from file://, localhost:8080, or any origin.
 */

const API_BASE = 'http://127.0.0.1:5000/api';

const Api = {

  // ── Core fetch — attaches token header automatically ──
  async _request(method, endpoint, body = null) {
    const headers = { 'Content-Type': 'application/json' };

    const token = localStorage.getItem('studyhub_token');
    if (token) headers['X-Session-Token'] = token;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    try {
      const res  = await fetch(API_BASE + endpoint, opts);
      const json = await res.json();
      return json;
    } catch (err) {
      console.error('API error:', err);
      return { ok: false, message: 'Impossible de contacter le serveur. Vérifiez que Flask tourne sur http://127.0.0.1:5000', data: null };
    }
  },

  get:    (ep)       => Api._request('GET',    ep),
  post:   (ep, body) => Api._request('POST',   ep, body),
  put:    (ep, body) => Api._request('PUT',    ep, body),
  delete: (ep)       => Api._request('DELETE', ep),

  // Auth
  signup:  (username, email, password) => Api.post('/auth/signup', { username, email, password }),
  login:   (email, password)           => Api.post('/auth/login',  { email, password }),
  logout:  ()                          => Api.post('/auth/logout'),
  me:      ()                          => Api.get('/auth/me'),

  // Users
  getProfile:     ()                           => Api.get('/users/profile'),
  updateProfile:  (username, email)            => Api.put('/users/profile', { username, email }),
  changePassword: (old_password, new_password) => Api.put('/users/change-password', { old_password, new_password }),

  // Years & Subjects
  getYears:      ()        => Api.get('/years/'),
  getYear:       (id)      => Api.get(`/years/${id}`),
  getSubjects:   (year_id) => Api.get(`/subjects/?year_id=${year_id}`),
  getAllSubjects: ()        => Api.get('/subjects/'),
  getSubject:    (id)      => Api.get(`/subjects/${id}`),

  // Videos
  getVideos:   (subject_id)                       => Api.get(`/videos/?subject_id=${subject_id}`),
  addVideo:    (subject_id, title, url, duration)  => Api.post('/videos/', { subject_id, title, url, duration }),
  deleteVideo: (id)                                => Api.delete(`/videos/${id}`),

  // Documents
  getDocs:    (subject_id)                        => Api.get(`/documents/?subject_id=${subject_id}`),
  addDoc:     (subject_id, name, url, file_size)  => Api.post('/documents/', { subject_id, name, url, file_size }),
  deleteDoc:  (id)                                => Api.delete(`/documents/${id}`),

  // Progress
  watchVideo:    (video_id) => Api.post('/progress/watch', { video_id }),
  getMyProgress: ()         => Api.get('/progress/me'),
  resetProgress: ()         => Api.delete('/progress/reset'),

  // Admin
  getAdminStats: ()     => Api.get('/admin/stats'),
  getAdminUsers: ()     => Api.get('/admin/users'),
  deleteUser:    (id)   => Api.delete(`/admin/users/${id}`),
  addSubject:    (data) => Api.post('/admin/subjects', data),
  deleteSubject: (id)   => Api.delete(`/admin/subjects/${id}`),

  // Upload (FormData — XHR used in admin.js for progress bar, these are fallbacks)
  uploadVideo: (formData) => {
    const token = localStorage.getItem('studyhub_token') || '';
    return fetch(API_BASE + '/videos/upload', {
      method: 'POST',
      headers: { 'X-Session-Token': token },
      body: formData
    }).then(r => r.json());
  },

  uploadDoc: (formData) => {
    const token = localStorage.getItem('studyhub_token') || '';
    return fetch(API_BASE + '/documents/upload', {
      method: 'POST',
      headers: { 'X-Session-Token': token },
      body: formData
    }).then(r => r.json());
  },
};