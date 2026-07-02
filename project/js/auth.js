/**
 * auth.js — Auth Controller
 * Token is stored in localStorage and sent via X-Session-Token header.
 * Works from file://, localhost, or any origin — no cookie issues.
 */

const AuthController = {
  USER_KEY:  'studyhub_user',
  TOKEN_KEY: 'studyhub_token',

  // Return cached user (synchronous — used for UI rendering)
  currentUser() {
    const u = localStorage.getItem(this.USER_KEY);
    return u ? JSON.parse(u) : null;
  },

  _saveSession(user, token) {
    localStorage.setItem(this.USER_KEY,  JSON.stringify(user));
    localStorage.setItem(this.TOKEN_KEY, token);
  },

  _clearSession() {
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
  },

  async signup(username, email, password) {
    const res = await Api.signup(username, email, password);
    if (res.ok) this._saveSession(res.data, res.token);
    return res;
  },

  async login(email, password) {
    const res = await Api.login(email, password);
    if (res.ok) this._saveSession(res.data, res.token);
    return res;
  },

  async logout() {
    await Api.logout();
    this._clearSession();
  },

  // Refresh user data from server
  async fetchCurrentUser() {
    const res = await Api.me();
    if (res.ok) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(res.data));
      return res.data;
    }
    this._clearSession();
    return null;
  },

  async markVideoWatched(videoId) {
    const res = await Api.watchVideo(videoId);
    if (res.ok && res.data?.achievements?.length) {
      const prefs = JSON.parse(localStorage.getItem('studyhub_notifs') || '{}');
      res.data.achievements.forEach(a => {
        AppController.toast(`🏆 Succès débloqué : ${a.name}`, 'warn', 4000);
        if (prefs['n-achievement'] !== false) {
          NotifManager.add({ icon: '🏆', title: 'Succès débloqué !', body: a.name });
        }
      });
    }
    return res;
  },
};