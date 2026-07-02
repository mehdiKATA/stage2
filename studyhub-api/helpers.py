# helpers.py — Auth guards + token-based session (no cookie needed)
import secrets
from functools import wraps
from flask import request, jsonify, g
from models import User

# In-memory token store: { token: user_id }
# In production replace with Redis or a DB table
_sessions = {}

def create_token(user_id, role):
    token = secrets.token_hex(32)
    _sessions[token] = {'user_id': user_id, 'role': role}
    return token

def delete_token(token):
    _sessions.pop(token, None)

def get_session():
    token = request.headers.get('X-Session-Token')
    if not token:
        return None
    return _sessions.get(token)

def success(data=None, msg='OK', status=200, token=None):
    body = {'ok': True, 'message': msg, 'data': data}
    if token:
        body['token'] = token
    return jsonify(body), status

def error(msg='Error', status=400):
    return jsonify({'ok': False, 'message': msg, 'data': None}), status

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        sess = get_session()
        if not sess:
            return error('Non authentifié. Veuillez vous connecter.', 401)
        g.user_id = sess['user_id']
        g.role    = sess['role']
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        sess = get_session()
        if not sess:
            return error('Non authentifié.', 401)
        if sess.get('role') != 'admin':
            return error('Accès refusé. Réservé aux administrateurs.', 403)
        g.user_id = sess['user_id']
        g.role    = sess['role']
        return f(*args, **kwargs)
    return decorated
