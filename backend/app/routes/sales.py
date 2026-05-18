from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from app.extensions import db
from app.models import Sale
from app.services.checkout import CheckoutError, process_checkout
from app.utils.decorators import get_current_user

sales_bp = Blueprint("sales", __name__, url_prefix="/api/sales")


@sales_bp.post("")
@jwt_required()
def create_sale():
    user = get_current_user()
    data = request.get_json() or {}

    shop_id = data.get("shop_id") or user.shop_id
    if not shop_id:
        return jsonify({"error": "Shop ID required"}), 400

    items = data.get("items", [])
    payment_method = data.get("payment_method", "cash")

    try:
        sale = process_checkout(user, shop_id, items, payment_method)
    except CheckoutError as e:
        db.session.rollback()
        return jsonify({"error": e.message}), e.status_code

    return jsonify(sale.to_dict()), 201


@sales_bp.get("")
@jwt_required()
def list_sales():
    user = get_current_user()
    shop_id = request.args.get("shop_id", type=int)
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")

    query = Sale.query

    if user.role == "admin":
        if shop_id:
            query = query.filter(Sale.shop_id == shop_id)
    else:
        query = query.filter(Sale.shop_id == user.shop_id)

    if date_from:
        query = query.filter(Sale.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.filter(Sale.created_at <= datetime.fromisoformat(date_to + "T23:59:59"))

    sales = query.order_by(Sale.created_at.desc()).limit(500).all()
    return jsonify([s.to_dict() for s in sales])


@sales_bp.get("/<int:sale_id>")
@jwt_required()
def get_sale(sale_id):
    user = get_current_user()
    sale = Sale.query.get_or_404(sale_id)

    if user.role != "admin" and sale.shop_id != user.shop_id:
        return jsonify({"error": "Forbidden"}), 403

    return jsonify(sale.to_dict())
