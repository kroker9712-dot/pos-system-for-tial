from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import func

from app.extensions import db
from app.models import Product, Sale, SaleItem, Shop, User
from app.services.users import UserValidationError, create_user_record, validate_password
from app.utils.decorators import get_current_user, role_required

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


def _users_query_for(actor):
    query = User.query
    if actor.role == "manager":
        query = query.filter(User.shop_id == actor.shop_id)
    return query.order_by(User.email)


@admin_bp.get("/users")
@jwt_required()
@role_required("admin", "manager")
def list_users():
    users = _users_query_for(get_current_user()).all()
    return jsonify([u.to_dict() for u in users])


@admin_bp.post("/users")
@jwt_required()
@role_required("admin", "manager")
def create_user():
    actor = get_current_user()
    data = request.get_json() or {}

    email = data.get("email")
    password = data.get("password")
    full_name = data.get("full_name")
    role = data.get("role", "cashier")
    shop_id = data.get("shop_id")
    is_active = data.get("is_active", True)

    if actor.role == "manager":
        if role != "cashier":
            return jsonify({"error": "Managers can only create cashier accounts"}), 403
        shop_id = actor.shop_id

    try:
        user = create_user_record(email, password, full_name, role, shop_id, is_active)
    except UserValidationError as e:
        return jsonify({"error": e.message}), e.status_code

    return jsonify(user.to_dict()), 201


@admin_bp.patch("/users/<int:user_id>")
@jwt_required()
@role_required("admin", "manager")
def update_user(user_id):
    actor = get_current_user()
    user = User.query.get_or_404(user_id)

    if actor.role == "manager":
        if user.shop_id != actor.shop_id:
            return jsonify({"error": "Forbidden"}), 403
        if user.role == "admin":
            return jsonify({"error": "Forbidden"}), 403

    data = request.get_json() or {}

    if actor.role == "manager" and data.get("role") == "admin":
        return jsonify({"error": "Cannot assign admin role"}), 403

    if actor.role == "manager" and "role" in data and data["role"] != "cashier":
        return jsonify({"error": "Managers can only assign the cashier role"}), 403

    if "full_name" in data:
        user.full_name = data["full_name"].strip()
    if "role" in data:
        user.role = data["role"]
        if data["role"] == "admin":
            user.shop_id = None
    if "shop_id" in data and user.role != "admin":
        if actor.role == "manager":
            user.shop_id = actor.shop_id
        else:
            user.shop_id = data["shop_id"]
    if "is_active" in data:
        user.is_active = bool(data["is_active"])
    if "password" in data and data["password"]:
        try:
            validate_password(data["password"])
        except UserValidationError as e:
            return jsonify({"error": e.message}), e.status_code
        user.set_password(data["password"])

    db.session.commit()
    return jsonify(user.to_dict())


@admin_bp.delete("/users/<int:user_id>")
@jwt_required()
@role_required("admin", "manager")
def delete_user(user_id):
    actor = get_current_user()
    user = User.query.get_or_404(user_id)

    if actor.id == user.id:
        return jsonify({"error": "Cannot delete your own account"}), 400

    if actor.role == "manager":
        if user.shop_id != actor.shop_id or user.role == "admin":
            return jsonify({"error": "Forbidden"}), 403

    db.session.delete(user)
    db.session.commit()
    return "", 204


@admin_bp.get("/low-stock")
@jwt_required()
@role_required("admin", "manager")
def low_stock():
    actor = get_current_user()
    threshold = request.args.get("threshold", 5, type=int)
    shop_id = request.args.get("shop_id", type=int)

    query = Product.query.filter(Product.stock_qty <= threshold)
    if actor.role == "manager":
        query = query.filter(Product.shop_id == actor.shop_id)
    elif shop_id:
        query = query.filter(Product.shop_id == shop_id)

    items = query.order_by(Product.stock_qty.asc()).limit(50).all()
    return jsonify(
        {
            "threshold": threshold,
            "count": len(items),
            "items": [p.to_dict() for p in items],
        }
    )


@admin_bp.get("/dashboard")
@jwt_required()
@role_required("admin", "manager")
def dashboard():
    user = get_current_user()
    today = datetime.now(timezone.utc).date()

    sale_query = Sale.query.filter(func.date(Sale.created_at) == today)
    product_query = Product.query

    if user.role == "manager":
        sale_query = sale_query.filter(Sale.shop_id == user.shop_id)
        product_query = product_query.filter(Product.shop_id == user.shop_id)

    shop_id = request.args.get("shop_id", type=int)
    if user.role == "admin" and shop_id:
        sale_query = sale_query.filter(Sale.shop_id == shop_id)
        product_query = product_query.filter(Product.shop_id == shop_id)

    today_sales = sale_query.count()
    today_revenue = (
        db.session.query(func.coalesce(func.sum(Sale.total), 0)).filter(
            func.date(Sale.created_at) == today,
            *([Sale.shop_id == user.shop_id] if user.role == "manager" else []),
            *([Sale.shop_id == shop_id] if user.role == "admin" and shop_id else []),
        ).scalar()
    )

    low_stock = (
        product_query.filter(Product.stock_qty <= 5).order_by(Product.stock_qty).limit(10).all()
    )

    top_products = (
        db.session.query(
            Product.name,
            func.sum(SaleItem.quantity).label("qty_sold"),
        )
        .join(SaleItem, SaleItem.product_id == Product.id)
        .join(Sale, Sale.id == SaleItem.sale_id)
        .filter(func.date(Sale.created_at) == today)
    )

    if user.role == "manager":
        top_products = top_products.filter(Product.shop_id == user.shop_id)
    elif shop_id:
        top_products = top_products.filter(Product.shop_id == shop_id)

    top_products = (
        top_products.group_by(Product.name).order_by(func.sum(SaleItem.quantity).desc()).limit(5).all()
    )

    yesterday = today - timedelta(days=1)
    yesterday_filters = [func.date(Sale.created_at) == yesterday]
    if user.role == "manager":
        yesterday_filters.append(Sale.shop_id == user.shop_id)
    if user.role == "admin" and shop_id:
        yesterday_filters.append(Sale.shop_id == shop_id)

    yesterday_sales = db.session.query(func.count(Sale.id)).filter(*yesterday_filters).scalar() or 0
    yesterday_revenue = float(
        db.session.query(func.coalesce(func.sum(Sale.total), 0)).filter(*yesterday_filters).scalar() or 0
    )

    payment_filters = [func.date(Sale.created_at) == today]
    if user.role == "manager":
        payment_filters.append(Sale.shop_id == user.shop_id)
    if user.role == "admin" and shop_id:
        payment_filters.append(Sale.shop_id == shop_id)

    payment_rows = (
        db.session.query(Sale.payment_method, func.count(Sale.id), func.sum(Sale.total))
        .filter(*payment_filters)
        .group_by(Sale.payment_method)
        .all()
    )
    payment_breakdown = [
        {"method": m, "count": int(c), "total": float(t or 0)} for m, c, t in payment_rows
    ]

    chart = []
    for offset in range(6, -1, -1):
        day = today - timedelta(days=offset)
        day_filters = [func.date(Sale.created_at) == day]
        if user.role == "manager":
            day_filters.append(Sale.shop_id == user.shop_id)
        if user.role == "admin" and shop_id:
            day_filters.append(Sale.shop_id == shop_id)
        day_count = db.session.query(func.count(Sale.id)).filter(*day_filters).scalar() or 0
        day_revenue = float(
            db.session.query(func.coalesce(func.sum(Sale.total), 0)).filter(*day_filters).scalar() or 0
        )
        chart.append({"date": day.isoformat(), "sales_count": day_count, "revenue": day_revenue})

    recent_filters = []
    if user.role == "manager":
        recent_filters.append(Sale.shop_id == user.shop_id)
    if user.role == "admin" and shop_id:
        recent_filters.append(Sale.shop_id == shop_id)

    recent_sales = (
        Sale.query.filter(*recent_filters).order_by(Sale.created_at.desc()).limit(8).all()
    )

    avg_order = float(today_revenue or 0) / today_sales if today_sales else 0

    return jsonify(
        {
            "today_sales_count": today_sales,
            "today_revenue": float(today_revenue or 0),
            "yesterday_sales_count": yesterday_sales,
            "yesterday_revenue": yesterday_revenue,
            "avg_order_value": round(avg_order, 2),
            "low_stock": [p.to_dict() for p in low_stock],
            "top_products": [{"name": name, "qty_sold": int(qty)} for name, qty in top_products],
            "payment_breakdown": payment_breakdown,
            "sales_chart": chart,
            "recent_sales": [s.to_dict(include_items=False) for s in recent_sales],
        }
    )
