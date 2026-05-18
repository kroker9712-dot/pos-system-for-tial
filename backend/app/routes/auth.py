from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity, jwt_required

from app.extensions import db
from app.models import User
from app.utils.decorators import get_current_user, role_required

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.post("/login")
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.is_active or not user.check_password(password):
        return jsonify({"error": "Invalid credentials"}), 401

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify(
        {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": user.to_dict(),
        }
    )


@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user or not user.is_active:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify({"access_token": create_access_token(identity=str(user.id))})


@auth_bp.get("/me")
@jwt_required()
def me():
    user = get_current_user()
    if not user or not user.is_active:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify(user.to_dict())


@auth_bp.patch("/me")
@jwt_required()
def update_me():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json() or {}
    if "full_name" in data:
        user.full_name = data["full_name"].strip()
    if "password" in data and data["password"]:
        user.set_password(data["password"])

    db.session.commit()
    return jsonify(user.to_dict())


@auth_bp.post("/register")
@jwt_required()
@role_required("admin", "manager")
def register():
    from app.services.users import UserValidationError, create_user_record

    actor = get_current_user()
    data = request.get_json() or {}
    role = data.get("role", "cashier")
    shop_id = data.get("shop_id")

    if actor.role == "manager":
        role = "cashier"
        shop_id = actor.shop_id

    try:
        user = create_user_record(
            data.get("email"),
            data.get("password"),
            data.get("full_name"),
            role,
            shop_id,
            data.get("is_active", True),
        )
    except UserValidationError as e:
        return jsonify({"error": e.message}), e.status_code

    return jsonify(user.to_dict()), 201
