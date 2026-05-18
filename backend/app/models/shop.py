from app.extensions import db


class Shop(db.Model):
    __tablename__ = "shops"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    location = db.Column(db.String(200), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    staff = db.relationship("User", back_populates="shop")
    products = db.relationship("Product", back_populates="shop", cascade="all, delete-orphan")
    sales = db.relationship("Sale", back_populates="shop")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "location": self.location,
            "is_active": self.is_active,
        }
