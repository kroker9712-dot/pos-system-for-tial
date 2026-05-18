from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models import Product
from app.utils.decorators import get_current_user, role_required

products_bp = Blueprint("products", __name__, url_prefix="/api/products")


def _resolve_shop_id(user, requested_shop_id):
    if user.role == "admin":
        return requested_shop_id
    return user.shop_id


@products_bp.get("/categories")
@jwt_required()
def list_categories():
    user = get_current_user()
    shop_id = request.args.get("shop_id", type=int)
    resolved_shop = _resolve_shop_id(user, shop_id)
    if not resolved_shop:
        return jsonify({"error": "Shop ID required"}), 400

    rows = (
        db.session.query(Product.category)
        .filter(Product.shop_id == resolved_shop, Product.category.isnot(None))
        .distinct()
        .order_by(Product.category)
        .all()
    )
    return jsonify([r[0] for r in rows if r[0]])


@products_bp.get("")
@jwt_required()
def list_products():
    user = get_current_user()
    shop_id = request.args.get("shop_id", type=int)
    search = (request.args.get("search") or "").strip().lower()
    category = (request.args.get("category") or "").strip()

    resolved_shop = _resolve_shop_id(user, shop_id)
    if not resolved_shop:
        return jsonify({"error": "Shop ID required"}), 400

    query = Product.query.filter_by(shop_id=resolved_shop)
    if search:
        query = query.filter(
            db.or_(
                Product.name.ilike(f"%{search}%"),
                Product.sku.ilike(f"%{search}%"),
            )
        )
    if category:
        query = query.filter(Product.category == category)

    products = query.order_by(Product.name).all()
    return jsonify([p.to_dict() for p in products])


@products_bp.get("/by-sku/<sku>")
@jwt_required()
def get_by_sku(sku):
    user = get_current_user()
    shop_id = request.args.get("shop_id", type=int)
    resolved_shop = _resolve_shop_id(user, shop_id)
    if not resolved_shop:
        return jsonify({"error": "Shop ID required"}), 400

    product = Product.query.filter_by(shop_id=resolved_shop, sku=sku.strip()).first()
    if not product:
        return jsonify({"error": "Product not found"}), 404
    return jsonify(product.to_dict())


@products_bp.post("")
@jwt_required()
@role_required("admin", "manager")
def create_product():
    user = get_current_user()
    data = request.get_json() or {}

    shop_id = data.get("shop_id") or user.shop_id
    if user.role == "manager" and shop_id != user.shop_id:
        return jsonify({"error": "Forbidden"}), 403

    name = (data.get("name") or "").strip()
    sku = (data.get("sku") or "").strip()
    price = data.get("price")
    stock_qty = data.get("stock_qty", 0)

    if not name or not sku or price is None:
        return jsonify({"error": "Name, SKU, and price required"}), 400

    product = Product(
        shop_id=shop_id,
        name=name,
        sku=sku,
        price=price,
        stock_qty=stock_qty,
        category=data.get("category"),
    )
    db.session.add(product)
    db.session.commit()
    return jsonify(product.to_dict()), 201


@products_bp.get("/<int:product_id>")
@jwt_required()
def get_product(product_id):
    user = get_current_user()
    product = Product.query.get_or_404(product_id)
    if user.role != "admin" and product.shop_id != user.shop_id:
        return jsonify({"error": "Forbidden"}), 403
    return jsonify(product.to_dict())


@products_bp.patch("/<int:product_id>")
@jwt_required()
@role_required("admin", "manager")
def update_product(product_id):
    user = get_current_user()
    product = Product.query.get_or_404(product_id)

    if user.role == "manager" and product.shop_id != user.shop_id:
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json() or {}
    if "name" in data:
        product.name = data["name"].strip()
    if "sku" in data:
        product.sku = data["sku"].strip()
    if "price" in data:
        product.price = data["price"]
    if "stock_qty" in data:
        product.stock_qty = data["stock_qty"]
    if "category" in data:
        product.category = data["category"]

    db.session.commit()
    return jsonify(product.to_dict())


@products_bp.delete("/<int:product_id>")
@jwt_required()
@role_required("admin", "manager")
def delete_product(product_id):
    user = get_current_user()
    product = Product.query.get_or_404(product_id)

    if user.role == "manager" and product.shop_id != user.shop_id:
        return jsonify({"error": "Forbidden"}), 403

    db.session.delete(product)
    db.session.commit()
    return "", 204
