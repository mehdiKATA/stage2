# routes/auth.py — signup, login, logout, me (token-based)
from flask import Blueprint, request, g
from werkzeug.security import generate_password_hash, check_password_hash
from database import db
from models import User, Role
from helpers import success, error, login_required, create_token, delete_token, get_session

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/signup', methods=['POST'])
def signup():
    data     = request.get_json() or {}
    username = data.get('username', '').strip()
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not username or not email or not password:
        return error('Tous les champs sont requis.')
    if len(password) < 6:
        return error('Mot de passe : minimum 6 caractères.')
    if User.query.filter_by(email=email).first():
        return error('Cet email est déjà utilisé.')

    user_role = Role.query.filter_by(name='user').first()
    user = User(username=username, email=email,
                password=generate_password_hash(password), role_id=user_role.id)
    db.session.add(user)
    db.session.commit()

    token = create_token(user.id, 'user')
    return success(user.to_dict(), 'Compte créé avec succès !', 201, token=token)


@auth_bp.route('/login', methods=['POST'])
def login():
    data     = request.get_json() or {}
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return error('Email et mot de passe requis.')

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password, password):
        return error('Email ou mot de passe incorrect.')

    token = create_token(user.id, user.role.name)
    return success(user.to_dict(), f'Bienvenue, {user.username} !', token=token)


@auth_bp.route('/logout', methods=['POST'])
def logout():
    token = request.headers.get('X-Session-Token')
    if token:
        delete_token(token)
    return success(None, 'Déconnecté avec succès.')


@auth_bp.route('/me', methods=['GET'])
@login_required
def me():
    user = User.query.get(g.user_id)
    if not user:
        return error('Session invalide.', 401)
    return success(user.to_dict())