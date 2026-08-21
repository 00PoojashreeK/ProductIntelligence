from sqlalchemy import Column, Integer, String, Float, Text

from database import Base


class Product(Base):

    __tablename__ = "products"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    product_id = Column(
        String,
        unique=True,
        index=True
    )

    product_name = Column(String)

    category = Column(String)

    brand = Column(String)

    model_number = Column(String)

    description = Column(Text)

    price_usd = Column(Float)

    stock_quantity = Column(Integer)

    rating = Column(Float)

    voltage_v = Column(Float)

    power_kw = Column(Float)

    weight_kg = Column(Float)

    material = Column(String)

    country_of_origin = Column(String)

    warranty_months = Column(Integer)

    source_document = Column(String)

    ai_confidence_score = Column(Float)

    validation_status = Column(String)