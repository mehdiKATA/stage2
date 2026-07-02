from flask import Blueprint, request, g
from werkzeug.security import generate_password_hash, check_password_hash
from database import db
from models import User
from helpers import success, error, login_required

users_bp = Blueprint('users', __name__)

@users_bp.route('/profile', methods=['GET'])
@login_required
def get_profile():
    user = User.query.get(g.user_id)
    return success(user.to_dict())

@users_bp.route('/profile', methods=['PUT'])
@login_required
def update_profile():
    user = User.query.get(g.user_id)
    data = request.get_json() or {}
    new_username = data.get('username', '').strip()
    new_email    = data.get('email', '').strip().lower()
    if not new_username or not new_email:
        return error('Nom et email requis.')
    existing = User.query.filter_by(email=new_email).first()
    if existing and existing.id != user.id:
        return error('Cet email est déjà utilisé.')
    user.username = new_username
    user.email    = new_email
    db.session.commit()
    return success(user.to_dict(), 'Profil mis à jour.')

@users_bp.route('/change-password', methods=['PUT'])
@login_required
def change_password():
    user = User.query.get(g.user_id)
    data = request.get_json() or {}
    old_pass = data.get('old_password', '')
    new_pass = data.get('new_password', '')
    if not check_password_hash(user.password, old_pass):
        return error('Mot de passe actuel incorrect.')
    if len(new_pass) < 6:
        return error('Nouveau mot de passe : minimum 6 caractères.')
    user.password = generate_password_hash(new_pass)
    db.session.commit()
    return success(None, 'Mot de passe mis à jour.')
