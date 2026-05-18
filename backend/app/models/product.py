from decimal import Decimal

from app.extensions import db


class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey("shops.id"), nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    sku = db.Column(db.String(64), nullable=False, index=True)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    stock_qty = db.Column(db.Integer, nullable=False, default=0)
    category = db.Column(db.String(64), nullable=True)

    shop = db.relationship("Shop", back_populates="products")
    sale_items = db.relationship("SaleItem", back_populates="product")

    def to_dict(self):
        return {
            "id": self.id,
            "shop_id": self.shop_id,
            "name": self.name,
            "sku": self.sku,
            "price": float(self.price),
            "stock_qty": self.stock_qty,
            "category": self.category,
        }
