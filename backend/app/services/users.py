from app.extensions import db
from app.models import User


class UserValidationError(Exception):
    def __init__(self, message, status_code=400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def validate_password(password):
    if not password or len(password) < 8:
        raise UserValidationError("Password must be at least 8 characters")


def create_user_record(email, password, full_name, role, shop_id=None, is_active=True):
    email = (email or "").strip().lower()
    full_name = (full_name or "").strip()
    validate_password(password)

    if not email or not full_name:
        raise UserValidationError("Email and full name are required")

    if role not in ("admin", "manager", "cashier"):
        raise UserValidationError("Invalid role")

    if role in ("manager", "cashier") and not shop_id:
        raise UserValidationError("Shop is required for manager and cashier roles")

    if role == "admin":
        shop_id = None

    if User.query.filter_by(email=email).first():
        raise UserValidationError("Email is already registered", 409)

    user = User(
        email=email,
        full_name=full_name,
        role=role,
        shop_id=shop_id,
        is_active=is_active,
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return user
