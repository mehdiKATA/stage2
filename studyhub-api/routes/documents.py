# routes/documents.py
import os, uuid
from flask import Blueprint, request
from database import db
from models import Document
from helpers import success, error, admin_required

documents_bp = Blueprint('documents', __name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'project', 'assets', 'documents')

@documents_bp.route('/', methods=['GET'])
def get_documents():
    subject_id = request.args.get('subject_id', type=int)
    if not subject_id:
        return error('subject_id requis.')
    docs = Document.query.filter_by(subject_id=subject_id, is_active=True)\
                         .order_by(Document.sort_order).all()
    return success([d.to_dict() for d in docs])

@documents_bp.route('/upload', methods=['POST'])
@admin_required
def upload_document():
    if 'file' not in request.files:
        return error('Fichier requis.')
    file       = request.files['file']
    name       = request.form.get('name', '').strip()
    subject_id = request.form.get('subject_id', type=int)

    if not file or not subject_id:
        return error('subject_id et fichier requis.')
    if not file.filename.lower().endswith('.pdf'):
        return error('Seuls les fichiers PDF sont acceptés.')

    # Use original filename if no name given
    if not name:
        name = file.filename

    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    filename  = f"{uuid.uuid4().hex}.pdf"
    filepath  = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)
    file_size = f"{round(os.path.getsize(filepath) / 1024, 0):.0f} KB"

    url = f"/uploads/documents/{filename}"
    doc = Document(name=name, url=url, subject_id=subject_id, file_size=file_size)
    db.session.add(doc)
    db.session.commit()
    return success(doc.to_dict(), 'Document ajouté.', 201)

@documents_bp.route('/', methods=['POST'])
@admin_required
def add_document():
    data       = request.get_json()
    name       = (data.get('name') or '').strip()
    url        = (data.get('url')  or '').strip()
    subject_id =  data.get('subject_id')
    file_size  =  data.get('file_size', '')
    if not name or not url or not subject_id:
        return error('name, url et subject_id requis.')
    doc = Document(name=name, url=url, subject_id=subject_id, file_size=file_size)
    db.session.add(doc)
    db.session.commit()
    return success(doc.to_dict(), 'Document ajouté.', 201)

@documents_bp.route('/<int:doc_id>', methods=['DELETE'])
@admin_required
def delete_document(doc_id):
    doc = Document.query.get_or_404(doc_id)
    if doc.url and doc.url.startswith('/uploads/documents/'):
        filepath = os.path.join(UPLOAD_FOLDER, doc.url.split('/')[-1])
        if os.path.exists(filepath):
            os.remove(filepath)
    doc.is_active = False
    db.session.commit()
    return success(None, 'Document supprimé.')