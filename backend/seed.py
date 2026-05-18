"""Seed demo data. Run after: flask db upgrade"""
import os
import sys

from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from app.extensions import db
from app.models import Product, Shop, User

PRODUCTS = [
    ("Wireless Earbuds", "WE-001", 49.99, 30, "Electronics"),
    ("Phone Case", "PC-002", 19.99, 50, "Accessories"),
    ("USB-C Cable", "UC-003", 12.99, 80, "Accessories"),
    ("Screen Protector", "SP-004", 9.99, 60, "Accessories"),
    ("Portable Charger", "PC-005", 34.99, 25, "Electronics"),
    ("Bluetooth Speaker", "BS-006", 59.99, 20, "Electronics"),
    ("Laptop Sleeve", "LS-007", 24.99, 35, "Accessories"),
    ("HDMI Adapter", "HA-008", 15.99, 40, "Electronics"),
    ("Mouse Pad", "MP-009", 8.99, 100, "Accessories"),
    ("Webcam Cover", "WC-010", 5.99, 75, "Accessories"),
]


def seed():
    app = create_app()
    with app.app_context():
        if User.query.filter_by(email="admin@pos.local").first():
            print("Database already seeded.")
            return

        admin = User(
            email="admin@pos.local",
            full_name="System Admin",
            role="admin",
        )
        admin.set_password("Admin123!")
        db.session.add(admin)

        shop1 = Shop(name="Tech Haven", location="Level 1, Unit 12")
        shop2 = Shop(name="Style Corner", location="Level 2, Unit 8")
        db.session.add_all([shop1, shop2])
        db.session.flush()

        manager1 = User(
            email="manager1@pos.local",
            full_name="Alex Manager",
            role="manager",
            shop_id=shop1.id,
        )
        manager1.set_password("Manager123!")

        cashier1 = User(
            email="cashier1@pos.local",
            full_name="Sam Cashier",
            role="cashier",
            shop_id=shop1.id,
        )
        cashier1.set_password("Cashier123!")

        cashier2 = User(
            email="cashier2@pos.local",
            full_name="Jordan Cashier",
            role="cashier",
            shop_id=shop2.id,
        )
        cashier2.set_password("Cashier123!")

        db.session.add_all([manager1, cashier1, cashier2])

        for shop in [shop1, shop2]:
            for name, sku, price, stock, category in PRODUCTS:
                prefix = f"S{shop.id}-"
                db.session.add(
                    Product(
                        shop_id=shop.id,
                        name=name,
                        sku=prefix + sku,
                        price=price,
                        stock_qty=stock,
                        category=category,
                    )
                )

        db.session.commit()
        print("Seed complete.")
        print("  admin@pos.local / Admin123!")
        print("  manager1@pos.local / Manager123!")
        print("  cashier1@pos.local / Cashier123!")
        print("  cashier2@pos.local / Cashier123!")


if __name__ == "__main__":
    seed()
