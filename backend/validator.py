def find_value(product, possible_names):

    for key, value in product.items():

        normalized_key = (
            str(key)
            .lower()
            .strip()
            .replace("_", " ")
            .replace("-", " ")
        )

        if normalized_key in possible_names:
            return value

    return None


def is_missing(value):

    if value is None:
        return True

    value_text = str(value).strip().lower()

    return value_text in [
        "",
        "not available",
        "n/a",
        "na",
        "null",
        "none",
        "-"
    ]


def validate_product(product):

    issues = []


    # ========================================================
    # PRODUCT NAME
    # ========================================================

    name = find_value(
        product,
        [
            "product name",
            "name",
            "product",
            "title"
        ]
    )

    if is_missing(name):

        issues.append(
            "Product name is missing."
        )


    # ========================================================
    # MODEL
    # ========================================================

    model = find_value(
        product,
        [
            "model",
            "model number",
            "model no",
            "model id"
        ]
    )

    if is_missing(model):

        issues.append(
            "Model information is missing."
        )


    # ========================================================
    # POWER
    # ========================================================

    power = find_value(
        product,
        [
            "power",
            "power kw",
            "power (kw)",
            "power rating",
            "wattage"
        ]
    )

    if is_missing(power):

        issues.append(
            "Power information is missing."
        )


    # ========================================================
    # VOLTAGE
    # ========================================================

    voltage = find_value(
        product,
        [
            "voltage",
            "voltage v",
            "voltage (v)"
        ]
    )

    if is_missing(voltage):

        issues.append(
            "Voltage information is missing."
        )


    # ========================================================
    # WEIGHT
    # ========================================================

    weight = find_value(
        product,
        [
            "weight",
            "weight kg",
            "weight (kg)"
        ]
    )

    if is_missing(weight):

        issues.append(
            "Weight information is missing."
        )


    # ========================================================
    # MATERIAL
    # ========================================================

    material = find_value(
        product,
        [
            "material",
            "product material"
        ]
    )

    if is_missing(material):

        issues.append(
            "Material information is missing."
        )


    # ========================================================
    # STATUS
    # ========================================================

    if len(issues) == 0:

        status = "Verified"

    else:

        status = "Needs Review"


    # ========================================================
    # CONFIDENCE
    # ========================================================

    total_fields = 6

    missing_fields = len(issues)

    confidence = round(
        (
            (total_fields - missing_fields)
            / total_fields
        ) * 100
    )


    return {

        "status":
            status,

        "issues":
            issues,

        "confidence":
            confidence

    }