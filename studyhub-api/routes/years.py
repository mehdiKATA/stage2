# routes/years.py — GET /api/years, /api/years/<id>
from flask import Blueprint
from models import Year
from helpers import success, error

years_bp = Blueprint('years', __name__)

@years_bp.route('/', methods=['GET'])
def get_years():
    years = Year.query.order_by(Year.sort_order).all()
    return success([y.to_dict() for y in years])

@years_bp.route('/<int:year_id>', methods=['GET'])
def get_year(year_id):
    year = Year.query.get_or_404(year_id)
    return success(year.to_dict())
