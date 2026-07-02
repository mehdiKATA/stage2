# StudyHub — Flask REST API

## Setup rapide

### 1. Prérequis
- Python 3.10+
- MySQL 8.0 running
- pip

### 2. Installation
```bash
cd studyhub-api
pip install -r requirements.txt
```

### 3. Configuration
Éditez `config.py` et changez cette ligne avec vos identifiants MySQL :
```python
'mysql+pymysql://root:your_password@localhost:3306/studyhub_db'
```
Créez d'abord la base dans MySQL Workbench :
```sql
CREATE DATABASE studyhub_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Lancer l'API
```bash
python app.py
```
L'API tourne sur http://localhost:5000

### 5. Lancer le frontend
Ouvrez `project/index.html` dans votre navigateur.
(ou utilisez un serveur local : `python -m http.server 8080` dans le dossier project/)

---

## Endpoints REST

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | /api/auth/signup | Inscription |
| POST | /api/auth/login  | Connexion |
| POST | /api/auth/logout | Déconnexion |
| GET  | /api/auth/me     | Utilisateur courant |
| GET  | /api/years/      | Tous les niveaux |
| GET  | /api/subjects/?year_id=1 | Matières d'un niveau |
| GET  | /api/videos/?subject_id=1 | Vidéos d'une matière |
| GET  | /api/documents/?subject_id=1 | Docs d'une matière |
| POST | /api/progress/watch | Marquer vidéo comme vue |
| GET  | /api/progress/me    | Ma progression complète |
| GET  | /api/admin/stats    | Stats admin (admin only) |
| GET  | /api/admin/users    | Liste utilisateurs (admin only) |

---

## Architecture

```
Browser (HTML/JS)
      │  fetch() avec cookie de session
      ▼
Flask REST API (app.py, routes/)
      │  SQLAlchemy ORM
      ▼
MySQL Database (studyhub_db)
```
