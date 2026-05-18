from app.routes.auth import auth_bp
from app.routes.shops import shops_bp
from app.routes.products import products_bp
from app.routes.sales import sales_bp
from app.routes.admin import admin_bp

__all__ = ["auth_bp", "shops_bp", "products_bp", "sales_bp", "admin_bp"]
