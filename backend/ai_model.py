import re


def find_value(text, keywords):

    text_lower = text.lower()

    for keyword in keywords:

        pattern = rf"{keyword}\s*[:=-]\s*([^\n,]+)"

        match = re.search(
            pattern,
            text_lower,
            re.IGNORECASE
        )

        if match:
            return match.group(1).strip()

    return "Not Available"


def extract_product_information(text):

    data = {

        "name": find_value(
            text,
            ["product name", "product"]
        ),

        "model": find_value(
            text,
            ["model number", "model"]
        ),

        "power": find_value(
            text,
            ["power"]
        ),

        "voltage": find_value(
            text,
            ["voltage"]
        ),

        "weight": find_value(
            text,
            ["weight"]
        ),

        "material": find_value(
            text,
            ["material"]
        ),

        "flow_rate": find_value(
            text,
            ["flow rate"]
        ),

        "rpm": find_value(
            text,
            ["rpm", "speed"]
        ),

        "applications": find_value(
            text,
            ["application", "applications"]
        ),

        "description": text[:1000],

        "confidence": 85.0
    }

    return data