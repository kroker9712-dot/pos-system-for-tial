from decimal import Decimal

from app.extensions import db
from app.models import Product, Sale, SaleItem


class CheckoutError(Exception):
    def __init__(self, message, status_code=400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def process_checkout(user, shop_id, items, payment_method):
    if payment_method not in ("cash", "card"):
        raise CheckoutError("Invalid payment method")

    if not items:
        raise CheckoutError("Cart is empty")

    if user.role == "cashier" and user.shop_id != shop_id:
        raise CheckoutError("Cannot sell for another shop", 403)

    if user.role == "manager" and user.shop_id != shop_id:
        raise CheckoutError("Cannot sell for another shop", 403)

    sale = Sale(shop_id=shop_id, user_id=user.id, payment_method=payment_method, total=Decimal("0"))
    db.session.add(sale)
    db.session.flush()
    total = Decimal("0")

    for cart_item in items:
        product_id = cart_item.get("product_id")
        quantity = cart_item.get("quantity", 0)

        if not product_id or quantity <= 0:
            raise CheckoutError("Invalid cart item")

        product = Product.query.filter_by(id=product_id, shop_id=shop_id).first()
        if not product:
            raise CheckoutError(f"Product {product_id} not found in this shop")

        if product.stock_qty < quantity:
            raise CheckoutError(f"Insufficient stock for {product.name}")

        unit_price = Decimal(str(product.price))
        line_total = unit_price * quantity
        total += line_total

        product.stock_qty -= quantity

        sale_item = SaleItem(
            sale_id=sale.id,
            product_id=product.id,
            quantity=quantity,
            unit_price=unit_price,
            line_total=line_total,
        )
        db.session.add(sale_item)

    sale.total = total
    db.session.commit()
    return sale
