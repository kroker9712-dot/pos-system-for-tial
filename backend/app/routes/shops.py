from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models import Shop
from app.utils.decorators import role_required

shops_bp = Blueprint("shops", __name__, url_prefix="/api/shops")


@shops_bp.get("")
@jwt_required()
def list_shops():
    shops = Shop.query.order_by(Shop.name).all()
    return jsonify([s.to_dict() for s in shops])


@shops_bp.post("")
@jwt_required()
@role_required("admin")
def create_shop():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Name required"}), 400

    shop = Shop(name=name, location=data.get("location"), is_active=data.get("is_active", True))
    db.session.add(shop)
    db.session.commit()
    return jsonify(shop.to_dict()), 201


@shops_bp.get("/<int:shop_id>")
@jwt_required()
def get_shop(shop_id):
    shop = Shop.query.get_or_404(shop_id)
    return jsonify(shop.to_dict())


@shops_bp.patch("/<int:shop_id>")
@jwt_required()
@role_required("admin")
def update_shop(shop_id):
    shop = Shop.query.get_or_404(shop_id)
    data = request.get_json() or {}

    if "name" in data:
        shop.name = data["name"].strip()
    if "location" in data:
        shop.location = data["location"]
    if "is_active" in data:
        shop.is_active = bool(data["is_active"])

    db.session.commit()
    return jsonify(shop.to_dict())


@shops_bp.delete("/<int:shop_id>")
@jwt_required()
@role_required("admin")
def delete_shop(shop_id):
    shop = Shop.query.get_or_404(shop_id)
    db.session.delete(shop)
    db.session.commit()
    return "", 204
