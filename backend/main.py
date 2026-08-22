from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor, execute_values

import json
import os
import uuid
import math
import csv
import io
import re

from datetime import datetime


# ============================================================
# APPLICATION
# ============================================================

app = FastAPI(
    title="Product Intelligence AI",
    description="AI-powered product intelligence platform",
    version="4.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

UPLOAD_FOLDER = os.path.join(
    BASE_DIR,
    "uploads"
)

DATABASE_URL = os.getenv("DATABASE_URL")

os.makedirs(
    UPLOAD_FOLDER,
    exist_ok=True
)


# ============================================================
# DATABASE CONNECTION
# ============================================================

def get_connection():

    if not DATABASE_URL:
        raise RuntimeError(
            "DATABASE_URL environment variable is not configured."
        )

    connection = psycopg2.connect(
        DATABASE_URL,
        cursor_factory=RealDictCursor
    )

    return connection


# ============================================================
# CREATE DATABASE TABLES
# ============================================================

def create_database():

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS datasets (

                id SERIAL PRIMARY KEY,

                dataset_id TEXT UNIQUE NOT NULL,

                filename TEXT NOT NULL,

                file_type TEXT,

                rows_count INTEGER DEFAULT 0,

                columns_count INTEGER DEFAULT 0,

                columns_json TEXT,

                uploaded_at TEXT
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS dataset_rows (

                id SERIAL PRIMARY KEY,

                dataset_id TEXT NOT NULL,

                row_number INTEGER NOT NULL,

                data_json TEXT NOT NULL
            )
        """)

        # Useful index for faster dataset lookup
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_dataset_rows_dataset_id
            ON dataset_rows(dataset_id)
        """)

        connection.commit()

        cursor.close()

    finally:

        connection.close()


# ============================================================
# STARTUP
# ============================================================

@app.on_event("startup")
def startup_event():

    create_database()


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():

    return {

        "success": True,

        "message":
            "Product Intelligence AI API is running",

        "version":
            "4.0"
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health():

    connection = None

    try:

        connection = get_connection()

        cursor = connection.cursor()

        cursor.execute(
            "SELECT 1"
        )

        cursor.fetchone()

        database_ok = True

        cursor.close()

    except Exception:

        database_ok = False

    finally:

        if connection:
            connection.close()

    return {

        "success": True,

        "database":
            database_ok,

        "message":
            "Backend is healthy"
    }


# ============================================================
# LOGIN
# ============================================================

@app.post("/login")
async def login(

    username: str = Form(None),

    email: str = Form(None),

    password: str = Form(...)
):

    user = (
        username
        or email
        or ""
    ).strip()

    password = password.strip()

    if user == "" or password == "":

        return {

            "success": False,

            "message":
                "Please enter username and password"
        }

    return {

        "success": True,

        "message":
            "Login successful",

        "user": {

            "name":
                user.split("@")[0],

            "username":
                user,

            "email":
                user if "@" in user else ""
        }
    }


# ============================================================
# READ DATASET
# ============================================================

def read_dataset(
    file_path,
    filename
):

    extension = os.path.splitext(
        filename
    )[1].lower()

    if extension == ".csv":

        try:

            return pd.read_csv(
                file_path,
                encoding="utf-8"
            )

        except UnicodeDecodeError:

            return pd.read_csv(
                file_path,
                encoding="latin1"
            )

    elif extension in [".xlsx", ".xls"]:

        return pd.read_excel(
            file_path
        )

    elif extension == ".tsv":

        return pd.read_csv(
            file_path,
            sep="\t"
        )

    elif extension == ".json":

        with open(
            file_path,
            "r",
            encoding="utf-8"
        ) as file:

            data = json.load(file)

        if isinstance(data, list):

            return pd.DataFrame(data)

        if isinstance(data, dict):

            if all(
                isinstance(value, list)
                for value in data.values()
            ):

                return pd.DataFrame(data)

            return pd.json_normalize(data)

    raise ValueError(
        "Unsupported file type. "
        "Please upload CSV, Excel, JSON or TSV."
    )


# ============================================================
# CLEAN VALUE
# ============================================================

def clean_value(value):

    if value is None:

        return None

    try:

        if pd.isna(value):

            return None

    except Exception:

        pass

    if isinstance(
        value,
        pd.Timestamp
    ):

        return str(value)

    if isinstance(
        value,
        (int, float)
    ):

        if isinstance(value, float):

            if math.isnan(value):

                return None

        return value

    return str(value)


# ============================================================
# CURRENT DATASET
# ============================================================

def get_current_rows():

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute("""
            SELECT *
            FROM datasets
            ORDER BY id DESC
            LIMIT 1
        """)

        dataset = cursor.fetchone()

        if not dataset:

            cursor.close()

            return None, []

        dataset_id = dataset["dataset_id"]

        cursor.execute(
            """
            SELECT
                id,
                row_number,
                data_json
            FROM dataset_rows
            WHERE dataset_id = %s
            ORDER BY row_number
            """,
            (dataset_id,)
        )

        rows = cursor.fetchall()

        result = []

        for row in rows:

            try:

                data = json.loads(
                    row["data_json"]
                )

            except Exception:

                data = {}

            result.append({

                "id":
                    row["id"],

                "row_number":
                    row["row_number"],

                "data":
                    data
            })

        cursor.close()

        return dataset, result

    finally:

        connection.close()


# ============================================================
# UPLOAD DATASET
# ============================================================

@app.post("/upload-dataset")
async def upload_dataset(
    file: UploadFile = File(...)
):

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="No file selected."
        )

    filename = os.path.basename(
        file.filename
    )

    extension = os.path.splitext(
        filename
    )[1].lower()

    supported_extensions = [
        ".csv",
        ".xlsx",
        ".xls",
        ".json",
        ".tsv"
    ]

    if extension not in supported_extensions:

        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported file type. "
                "Supported formats: CSV, XLSX, XLS, JSON and TSV."
            )
        )

    dataset_id = str(
        uuid.uuid4()
    )

    safe_filename = (
        dataset_id
        + "_"
        + filename
    )

    file_path = os.path.join(
        UPLOAD_FOLDER,
        safe_filename
    )

    try:

        # ----------------------------------------------------
        # READ UPLOADED FILE
        # ----------------------------------------------------

        contents = await file.read()

        with open(
            file_path,
            "wb"
        ) as output_file:

            output_file.write(
                contents
            )

        # ----------------------------------------------------
        # READ DATASET
        # ----------------------------------------------------

        df = read_dataset(
            file_path,
            filename
        )

        if df is None or df.empty:

            raise ValueError(
                "The uploaded dataset is empty."
            )

        # ----------------------------------------------------
        # CLEAN COLUMN NAMES
        # ----------------------------------------------------

        df.columns = [
            str(column).strip()
            for column in df.columns
        ]

        # Remove completely empty columns

        df = df.dropna(
            axis=1,
            how="all"
        )

        if len(df.columns) == 0:

            raise ValueError(
                "Dataset contains no usable columns."
            )

        columns = [
            str(column)
            for column in df.columns
        ]

        rows_count = len(df)

        columns_count = len(columns)

        # ----------------------------------------------------
        # DATASET STATISTICS
        # ----------------------------------------------------

        missing_values = int(
            df.isna().sum().sum()
        )

        duplicate_rows = int(
            df.duplicated().sum()
        )

        numeric_columns = [
            str(column)
            for column in
            df.select_dtypes(
                include="number"
            ).columns
        ]

        text_columns = [
            str(column)
            for column in
            df.select_dtypes(
                include="object"
            ).columns
        ]

        # ----------------------------------------------------
        # DATABASE
        # ----------------------------------------------------

        connection = get_connection()

        try:

            cursor = connection.cursor()

            # Delete previous dataset

            cursor.execute(
                "DELETE FROM dataset_rows"
            )

            cursor.execute(
                "DELETE FROM datasets"
            )

            # ------------------------------------------------
            # INSERT DATASET
            # ------------------------------------------------

            cursor.execute(
                """
                INSERT INTO datasets
                (
                    dataset_id,
                    filename,
                    file_type,
                    rows_count,
                    columns_count,
                    columns_json,
                    uploaded_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    dataset_id,
                    filename,
                    extension,
                    rows_count,
                    columns_count,
                    json.dumps(columns),
                    datetime.now().isoformat()
                )
            )

            # ------------------------------------------------
            # PREPARE ALL ROWS
            # ------------------------------------------------

            rows_to_insert = []

            for index, row in df.iterrows():

                row_data = {}

                for column in columns:

                    row_data[column] = clean_value(
                        row[column]
                    )

                rows_to_insert.append(
                    (
                        dataset_id,
                        index + 1,
                        json.dumps(
                            row_data,
                            default=str
                        )
                    )
                )

            # ------------------------------------------------
            # FAST BULK INSERT
            # ------------------------------------------------

            if rows_to_insert:

                execute_values(
                    cursor,
                    """
                    INSERT INTO dataset_rows
                    (
                        dataset_id,
                        row_number,
                        data_json
                    )
                    VALUES %s
                    """,
                    rows_to_insert,
                    page_size=500
                )

            connection.commit()

            cursor.close()

        except Exception:

            connection.rollback()

            raise

        finally:

            connection.close()

        # ----------------------------------------------------
        # RETURN RESPONSE
        # ----------------------------------------------------

        return {

            "success": True,

            "message":
                "Dataset uploaded successfully",

            "dataset_id":
                dataset_id,

            "filename":
                filename,

            "file_type":
                extension,

            "rows":
                rows_count,

            "columns":
                columns_count,

            "column_names":
                columns,

            "missing_values":
                missing_values,

            "duplicate_rows":
                duplicate_rows,

            "numeric_columns":
                numeric_columns,

            "text_columns":
                text_columns
        }

    except HTTPException:

        raise

    except Exception as e:

        if os.path.exists(file_path):

            try:

                os.remove(file_path)

            except Exception:

                pass

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# OLD UPLOAD URL
# ============================================================

@app.post("/upload-csv")
async def upload_csv(
    file: UploadFile = File(...)
):

    return await upload_dataset(file)


# ============================================================
# FIND COLUMN
# ============================================================

def find_column(
    data,
    possible_names
):

    # Exact

    for name in possible_names:

        if name in data:

            return data[name]

    # Case insensitive

    lower_map = {

        str(key).lower().strip():
            key

        for key in data.keys()
    }

    for name in possible_names:

        key = lower_map.get(
            name.lower().strip()
        )

        if key is not None:

            return data[key]

    # Partial

    for key in data.keys():

        key_lower = (
            str(key)
            .lower()
            .strip()
            .replace("_", " ")
            .replace("-", " ")
        )

        for name in possible_names:

            name_lower = (
                name.lower()
                .strip()
                .replace("_", " ")
                .replace("-", " ")
            )

            if (
                name_lower in key_lower
                or key_lower in name_lower
            ):

                return data[key]

    return None


# ============================================================
# DISPLAY VALUE
# ============================================================

def display_value(
    value,
    default="Not Available"
):

    if value is None:

        return default

    text = str(value).strip()

    if text == "":

        return default

    return text


# ============================================================
# PRODUCT RESPONSE
# ============================================================

def build_product_response(
    row_id,
    row_number,
    data
):

    name = find_column(
        data,
        [
            "name",
            "product_name",
            "product name",
            "product",
            "title",
            "item_name",
            "item name"
        ]
    )

    brand = find_column(
        data,
        [
            "brand",
            "manufacturer",
            "maker"
        ]
    )

    model = find_column(
        data,
        [
            "model",
            "model_number",
            "model number",
            "sku",
            "product_id",
            "product id"
        ]
    )

    category = find_column(
        data,
        [
            "category",
            "product_category",
            "product category",
            "type"
        ]
    )

    power = find_column(
        data,
        [
            "power",
            "power_kw",
            "power kw",
            "wattage",
            "watt",
            "watts"
        ]
    )

    voltage = find_column(
        data,
        [
            "voltage",
            "voltage_v",
            "voltage v"
        ]
    )

    weight = find_column(
        data,
        [
            "weight",
            "weight_kg",
            "weight kg"
        ]
    )

    material = find_column(
        data,
        [
            "material"
        ]
    )

    description = find_column(
        data,
        [
            "description",
            "product_description",
            "product description",
            "details"
        ]
    )

    applications = find_column(
        data,
        [
            "applications",
            "application",
            "use",
            "uses"
        ]
    )

    price = find_column(
        data,
        [
            "price",
            "price_usd",
            "price usd",
            "cost"
        ]
    )

    country = find_column(
        data,
        [
            "country_of_origin",
            "country of origin",
            "country"
        ]
    )

    rating = find_column(
        data,
        [
            "rating",
            "review_rating",
            "review rating"
        ]
    )

    stock = find_column(
        data,
        [
            "stock",
            "stock_quantity",
            "stock quantity",
            "quantity"
        ]
    )

    warranty = find_column(
        data,
        [
            "warranty",
            "warranty_months",
            "warranty months"
        ]
    )

    flow_rate = find_column(
        data,
        [
            "flow_rate",
            "flow rate"
        ]
    )

    rpm = find_column(
        data,
        [
            "rpm",
            "speed"
        ]
    )

    # ========================================================
    # CONFIDENCE
    # ========================================================

    important_fields = [
        name,
        brand,
        model,
        category,
        power,
        voltage,
        weight,
        material
    ]

    available = sum(
        1
        for value in important_fields
        if value is not None
        and str(value).strip() != ""
    )

    confidence = round(
        available /
        len(important_fields)
        * 100
    )

    if confidence >= 85:

        status = "Verified"

    elif confidence >= 60:

        status = "Needs Review"

    else:

        status = "Incomplete"

    return {

        "id":
            row_id,

        "row_number":
            row_number,

        "name":
            display_value(name),

        "brand":
            display_value(brand),

        "model":
            display_value(model),

        "category":
            display_value(category),

        "power":
            display_value(power),

        "voltage":
            display_value(voltage),

        "weight":
            display_value(weight),

        "material":
            display_value(material),

        "description":
            display_value(description),

        "applications":
            display_value(applications),

        "price":
            display_value(price),

        "rating":
            display_value(rating),

        "stock":
            display_value(stock),

        "warranty":
            display_value(warranty),

        "country":
            display_value(country),

        "flow_rate":
            display_value(flow_rate),

        "rpm":
            display_value(rpm),

        "confidence":
            confidence,

        "status":
            status,

        "raw_data":
            data
    }


# ============================================================
# GET DATASET
# ============================================================

@app.get("/dataset")
def get_dataset():

    dataset, rows = get_current_rows()

    if not dataset:

        return {

            "success": True,

            "dataset": None,

            "columns": [],

            "rows": []
        }

    columns = json.loads(
        dataset["columns_json"] or "[]"
    )

    return {

        "success": True,

        "dataset": {

            "dataset_id":
                dataset["dataset_id"],

            "filename":
                dataset["filename"],

            "file_type":
                dataset["file_type"],

            "rows_count":
                dataset["rows_count"],

            "columns_count":
                dataset["columns_count"],

            "uploaded_at":
                dataset["uploaded_at"]
        },

        "columns":
            columns,

        "rows":
            [
                item["data"]
                for item in rows
            ]
    }


# ============================================================
# PRODUCTS
# ============================================================

@app.get("/products")
def get_products():

    dataset, rows = get_current_rows()

    if not dataset:

        return []

    return [

        build_product_response(
            item["id"],
            item["row_number"],
            item["data"]
        )

        for item in rows
    ]


# ============================================================
# SINGLE PRODUCT
# ============================================================

@app.get("/products/{product_id}")
def get_product(
    product_id: int
):

    dataset, rows = get_current_rows()

    if not dataset:

        raise HTTPException(
            status_code=404,
            detail="No dataset uploaded."
        )

    # Search using database ID

    for item in rows:

        if int(item["id"]) == int(product_id):

            return build_product_response(
                item["id"],
                item["row_number"],
                item["data"]
            )

    # Search using row number

    for item in rows:

        if int(item["row_number"]) == int(product_id):

            return build_product_response(
                item["id"],
                item["row_number"],
                item["data"]
            )

    raise HTTPException(
        status_code=404,
        detail=(
            f"Product {product_id} was not found "
            "in the current dataset."
        )
    )


# ============================================================
# DASHBOARD
# ============================================================

@app.get("/dashboard")
def dashboard():

    dataset, rows = get_current_rows()

    if not dataset:

        return {

            "success": True,

            "total_products": 0,

            "total_rows": 0,

            "total_columns": 0,

            "dataset_name":
                "No dataset uploaded",

            "missing_values": 0,

            "verified": 0,

            "needs_review": 0,

            "average_confidence": 0
        }

    products = [

        build_product_response(
            item["id"],
            item["row_number"],
            item["data"]
        )

        for item in rows
    ]

    verified = sum(

        1

        for product in products

        if product["status"] == "Verified"
    )

    needs_review = (
        len(products)
        - verified
    )

    average_confidence = (

        round(

            sum(
                p["confidence"]
                for p in products
            )
            /
            len(products)

        )

        if products

        else 0
    )

    missing_values = 0

    for item in rows:

        for value in item["data"].values():

            if (
                value is None
                or str(value).strip() == ""
            ):

                missing_values += 1

    return {

        "success": True,

        "total_products":
            len(products),

        "total_rows":
            len(products),

        "total_columns":
            dataset["columns_count"],

        "dataset_name":
            dataset["filename"],

        "missing_values":
            missing_values,

        "verified":
            verified,

        "needs_review":
            needs_review,

        "average_confidence":
            average_confidence
    }


# ============================================================
# NUMERIC EXTRACTION
# ============================================================

def extract_number(value):

    if value is None:
        return None

    match = re.search(
        r"-?\d+(?:\.\d+)?",
        str(value)
    )

    if not match:
        return None

    try:
        return float(
            match.group()
        )

    except Exception:
        return None

# ============================================================
# PRODUCT VALIDATION ENGINE
# ============================================================

def generate_validation(
    product,
    all_rows
):

    checks = []

    # ========================================================
    # 1. PRODUCT NAME
    # ========================================================

    name = product["name"]

    if name == "Not Available":

        checks.append({

            "title":
                "Product Name",

            "status":
                "FAIL",

            "icon":
                "❌",

            "message":
                "Product name is missing."
        })

    else:

        checks.append({

            "title":
                "Product Name",

            "status":
                "PASS",

            "icon":
                "✓",

            "message":
                "Product name is available."
        })

    # ========================================================
    # 2. BRAND
    # ========================================================

    if product["brand"] == "Not Available":

        checks.append({

            "title":
                "Brand Information",

            "status":
                "WARNING",

            "icon":
                "⚠️",

            "message":
                "Brand information is not available."
        })

    else:

        checks.append({

            "title":
                "Brand Information",

            "status":
                "PASS",

            "icon":
                "✓",

            "message":
                "Brand information is available."
        })

    # ========================================================
    # 3. MODEL
    # ========================================================

    if product["model"] == "Not Available":

        checks.append({

            "title":
                "Model / SKU",

            "status":
                "FAIL",

            "icon":
                "❌",

            "message":
                "Model or SKU is missing."
        })

    elif len(product["model"]) < 2:

        checks.append({

            "title":
                "Model / SKU",

            "status":
                "WARNING",

            "icon":
                "⚠️",

            "message":
                "Model identifier appears unusually short."
        })

    else:

        checks.append({

            "title":
                "Model / SKU",

            "status":
                "PASS",

            "icon":
                "✓",

            "message":
                "Model identifier is available."
        })

    # ========================================================
    # 4. CATEGORY
    # ========================================================

    if product["category"] == "Not Available":

        checks.append({

            "title":
                "Product Category",

            "status":
                "WARNING",

            "icon":
                "⚠️",

            "message":
                "Product category has not been classified."
        })

    else:

        checks.append({

            "title":
                "Product Category",

            "status":
                "PASS",

            "icon":
                "✓",

            "message":
                "Product category is available."
        })

    # ========================================================
    # 5. POWER
    # ========================================================

    power = product["power"]

    if power == "Not Available":

        checks.append({

            "title":
                "Power Specification",

            "status":
                "WARNING",

            "icon":
                "⚠️",

            "message":
                "No power specification was found for this product."
        })

    else:

        number = extract_number(power)

        if number is not None and number <= 0:

            checks.append({

                "title":
                    "Power Specification",

                "status":
                    "FAIL",

                "icon":
                    "❌",

                "message":
                    "Power value must be greater than zero."
            })

        elif number is None:

            checks.append({

                "title":
                    "Power Specification",

                "status":
                    "WARNING",

                "icon":
                    "⚠️",

                "message":
                    "Power is present but could not be interpreted numerically."
            })

        else:

            checks.append({

                "title":
                    "Power Specification",

                "status":
                    "PASS",

                "icon":
                    "✓",

                "message":
                    "Power specification is present."
            })

    # ========================================================
    # 6. VOLTAGE
    # ========================================================

    voltage = product["voltage"]

    if voltage == "Not Available":

        checks.append({

            "title":
                "Voltage Specification",

            "status":
                "WARNING",

            "icon":
                "⚠️",

            "message":
                "Voltage specification is not available."
        })

    else:

        number = extract_number(voltage)

        if number is not None and number <= 0:

            checks.append({

                "title":
                    "Voltage Specification",

                "status":
                    "FAIL",

                "icon":
                    "❌",

                "message":
                    "Voltage must be greater than zero."
            })

        elif number is not None and number > 1000:

            checks.append({

                "title":
                    "Voltage Specification",

                "status":
                    "WARNING",

                "icon":
                    "⚠️",

                "message":
                    "Voltage value is unusually high. Verify the source specification."
            })

        else:

            checks.append({

                "title":
                    "Voltage Specification",

                "status":
                    "PASS",

                "icon":
                    "✓",

                "message":
                    "Voltage specification is available."
            })

    # ========================================================
    # 7. DESCRIPTION
    # ========================================================

    description = product["description"]

    if description == "Not Available":

        checks.append({

            "title":
                "Product Description",

            "status":
                "WARNING",

            "icon":
                "⚠️",

            "message":
                "Product description is not available."
        })

    elif len(description) < 20:

        checks.append({

            "title":
                "Product Description",

            "status":
                "WARNING",

            "icon":
                "⚠️",

            "message":
                "Product description is present but may be too brief for complete product representation."
        })

    else:

        checks.append({

            "title":
                "Product Description",

            "status":
                "PASS",

            "icon":
                "✓",

            "message":
                "Product description contains sufficient information."
        })

    # ========================================================
    # 8. MATERIAL
    # ========================================================

    if product["material"] != "Not Available":

        checks.append({

            "title":
                "Material Specification",

            "status":
                "PASS",

            "icon":
                "✓",

            "message":
                "Material information is available."
        })

    # ========================================================
    # 9. DUPLICATE CHECK
    # ========================================================

    product_name = (
        product["name"]
        .strip()
        .lower()
    )

    model = (
        product["model"]
        .strip()
        .lower()
    )

    duplicate_count = 0

    for item in all_rows:

        other = item["data"]

        other_name = find_column(
            other,
            [
                "name",
                "product_name",
                "product name",
                "product",
                "title"
            ]
        )

        other_model = find_column(
            other,
            [
                "model",
                "model_number",
                "model number",
                "sku",
                "product_id"
            ]
        )

        if (
            other_name is not None
            and other_model is not None
            and product_name != "not available"
            and model != "not available"
            and str(other_name).strip().lower()
                == product_name
            and str(other_model).strip().lower()
                == model
        ):

            duplicate_count += 1

    if duplicate_count > 1:

        checks.append({

            "title":
                "Duplicate Product Check",

            "status":
                "WARNING",

            "icon":
                "⚠️",

            "message":
                "Another record appears to use the same product name and model."
        })

    else:

        checks.append({

            "title":
                "Duplicate Product Check",

            "status":
                "PASS",

            "icon":
                "✓",

            "message":
                "No matching duplicate product record was detected."
        })

    # ========================================================
    # QUALITY SCORE
    # ========================================================

    total_checks = len(checks)

    passed = sum(
        1
        for check in checks
        if check["status"] == "PASS"
    )

    failed = sum(
        1
        for check in checks
        if check["status"] == "FAIL"
    )

    warnings = sum(
        1
        for check in checks
        if check["status"] == "WARNING"
    )

    if total_checks:

        quality_score = round(

            (
                passed
                + warnings * 0.5
            )
            /
            total_checks
            * 100
        )

    else:

        quality_score = 0

    if failed > 0:

        status = "Critical Issues"

    elif quality_score >= 85:

        status = "Verified"

    elif quality_score >= 60:

        status = "Needs Review"

    else:

        status = "Critical Issues"

    return {

        "quality_score":
            quality_score,

        "status":
            status,

        "checks":
            checks,

        "passed":
            passed,

        "warnings":
            warnings,

        "failed":
            failed
    }


# ============================================================
# VALIDATE PRODUCT - NEW API
# ============================================================

@app.post("/validate-product")
async def validate_product_new(
    payload: dict
):

    product_data = payload.get(
        "product",
        {}
    )

    all_rows_data = payload.get(
        "all_rows",
        []
    )

    if not product_data:

        raise HTTPException(
            status_code=400,
            detail="Product data is missing."
        )

    if "raw_data" in product_data:

        raw_data = product_data["raw_data"]

        product = build_product_response(
            product_data.get("id", 0),
            product_data.get("row_number", 0),
            raw_data
        )

    else:

        product = build_product_response(
            product_data.get("id", 0),
            product_data.get("row_number", 0),
            product_data
        )

    all_rows = []

    for row in all_rows_data:

        if isinstance(row, dict):

            if "raw_data" in row:

                all_rows.append({
                    "data":
                        row["raw_data"]
                })

            elif "data" in row:

                all_rows.append({
                    "data":
                        row["data"]
                })

            else:

                all_rows.append({
                    "data":
                        row
                })

    result = generate_validation(
        product,
        all_rows
    )

    return {

        "success": True,

        "product_id":
            product["id"],

        "product_name":
            product["name"],

        "status":
            result["status"],

        "quality_score":
            result["quality_score"],

        "checks":
            result["checks"],

        "product":
            product
    }


# ============================================================
# VALIDATE PRODUCT BY ID
# ============================================================

@app.get("/validate/{product_id}")
def validate_product_by_id(
    product_id: int
):

    dataset, rows = get_current_rows()

    if not dataset:

        raise HTTPException(
            status_code=404,
            detail="No dataset uploaded."
        )

    selected = None

    for item in rows:

        if int(item["id"]) == int(product_id):

            selected = item

            break

    if not selected:

        raise HTTPException(
            status_code=404,
            detail="Product not found."
        )

    product = build_product_response(
        selected["id"],
        selected["row_number"],
        selected["data"]
    )

    result = generate_validation(
        product,
        rows
    )

    return {

        "success": True,

        "product_id":
            product_id,

        "product_name":
            product["name"],

        "status":
            result["status"],

        "quality_score":
            result["quality_score"],

        "checks":
            result["checks"],

        "product":
            product
    }


# ============================================================
# DATASET REPORT
# ============================================================

@app.get("/report")
def get_report():

    dataset, rows = get_current_rows()

    if not dataset:

        return {

            "success": True,

            "has_data": False,

            "dataset": None,

            "summary": {},

            "columns": [],

            "rows": [],

            "products": []
        }

    products = [

        build_product_response(
            item["id"],
            item["row_number"],
            item["data"]
        )

        for item in rows
    ]

    # --------------------------------------------------------
    # MISSING VALUES
    # --------------------------------------------------------

    missing_values = 0

    for item in rows:

        for value in item["data"].values():

            if (
                value is None
                or str(value).strip() == ""
            ):

                missing_values += 1

    # --------------------------------------------------------
    # DUPLICATES
    # --------------------------------------------------------

    duplicate_rows = 0

    seen = set()

    for item in rows:

        normalized = json.dumps(
            item["data"],
            sort_keys=True,
            default=str
        )

        if normalized in seen:

            duplicate_rows += 1

        else:

            seen.add(normalized)

    # --------------------------------------------------------
    # VALIDATION SUMMARY
    # --------------------------------------------------------

    validation_results = []

    for product in products:

        result = generate_validation(
            product,
            rows
        )

        validation_results.append(
            result
        )

    verified = sum(
        1
        for result in validation_results
        if result["status"] == "Verified"
    )

    needs_review = sum(
        1
        for result in validation_results
        if result["status"] == "Needs Review"
    )

    critical = sum(
        1
        for result in validation_results
        if result["status"] == "Critical Issues"
    )

    average_quality = (

        round(

            sum(
                result["quality_score"]
                for result in validation_results
            )
            /
            len(validation_results)

        )

        if validation_results

        else 0
    )

    # --------------------------------------------------------
    # OVERALL DATASET QUALITY
    # --------------------------------------------------------

    total_cells = (
        dataset["rows_count"]
        *
        dataset["columns_count"]
    )

    completeness = (

        round(

            (
                total_cells
                - missing_values
            )
            /
            total_cells
            *
            100

        )

        if total_cells > 0

        else 0
    )

    duplicate_score = round(

        (
            1
            -
            duplicate_rows
            /
            max(
                dataset["rows_count"],
                1
            )
        )
        *
        100
    )

    overall_quality = round(

        (
            completeness * 0.45
            +
            duplicate_score * 0.10
            +
            average_quality * 0.45
        )
    )

    return {

        "success": True,

        "has_data": True,

        "dataset": {

            "dataset_id":
                dataset["dataset_id"],

            "filename":
                dataset["filename"],

            "rows_count":
                dataset["rows_count"],

            "columns_count":
                dataset["columns_count"],

            "file_type":
                dataset["file_type"],

            "uploaded_at":
                dataset["uploaded_at"]
        },

        "summary": {

            "total_products":
                len(products),

            "total_columns":
                dataset["columns_count"],

            "missing_values":
                missing_values,

            "duplicate_rows":
                duplicate_rows,

            "verified":
                verified,

            "needs_review":
                needs_review,

            "critical_issues":
                critical,

            "average_quality_score":
                average_quality,

            "data_quality_score":
                overall_quality
        },

        "columns":
            json.loads(
                dataset["columns_json"] or "[]"
            ),

        "rows":
            [
                item["data"]
                for item in rows
            ],

        "products":
            products
    }


# ============================================================
# REPORT ALIAS
# ============================================================

@app.get("/reports")
def get_reports():

    return get_report()


# ============================================================
# INDIVIDUAL PRODUCT REPORT
# ============================================================

@app.get("/reports/product/{product_id}")
def individual_product_report(
    product_id: int
):

    dataset, rows = get_current_rows()

    if not dataset:

        raise HTTPException(
            status_code=404,
            detail="No dataset uploaded."
        )

    selected = None

    for item in rows:

        if int(item["id"]) == int(product_id):

            selected = item

            break

    if not selected:

        raise HTTPException(
            status_code=404,
            detail="Product not found."
        )

    product = build_product_response(
        selected["id"],
        selected["row_number"],
        selected["data"]
    )

    validation = generate_validation(
        product,
        rows
    )

    return {

        "success": True,

        "dataset": {

            "filename":
                dataset["filename"]
        },

        "product":
            product,

        "report": {

            "quality_score":
                validation["quality_score"],

            "status":
                validation["status"],

            "passed_checks":
                validation["passed"],

            "warnings":
                validation["warnings"],

            "failed_checks":
                validation["failed"],

            "checks":
                validation["checks"]
        }
    }


# ============================================================
# CSV REPORT
# ============================================================

@app.get("/report/csv")
def report_csv():

    dataset, rows = get_current_rows()

    if not dataset:

        raise HTTPException(
            status_code=404,
            detail="No dataset available."
        )

    output = io.StringIO()

    columns = json.loads(
        dataset["columns_json"] or "[]"
    )

    writer = csv.writer(
        output
    )

    writer.writerow(columns)

    for item in rows:

        data = item["data"]

        writer.writerow([

            data.get(
                column,
                ""
            )

            for column in columns
        ])

    return {

        "success": True,

        "filename":
            "product-intelligence-report.csv",

        "csv":
            output.getvalue()
    }


# ============================================================
# JSON REPORT
# ============================================================

@app.get("/report/json")
def report_json():

    return get_report()


# ============================================================
# DATASET LIST
# ============================================================

@app.get("/datasets")
def get_datasets():

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                id,
                dataset_id,
                filename,
                file_type,
                rows_count,
                columns_count,
                uploaded_at
            FROM datasets
            ORDER BY id DESC
            """
        )

        datasets = cursor.fetchall()

        result = [
            dict(dataset)
            for dataset in datasets
        ]

        cursor.close()

        return {

            "success": True,

            "count":
                len(result),

            "datasets":
                result
        }

    finally:

        connection.close()


# ============================================================
# DELETE CURRENT DATASET
# ============================================================

@app.delete("/dataset")
def delete_current_dataset():

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT dataset_id
            FROM datasets
            ORDER BY id DESC
            LIMIT 1
            """
        )

        dataset = cursor.fetchone()

        if not dataset:

            return {

                "success": False,

                "message":
                    "No dataset found."
            }

        dataset_id = dataset[
            "dataset_id"
        ]

        cursor.execute(
            """
            DELETE FROM dataset_rows
            WHERE dataset_id = %s
            """,
            (dataset_id,)
        )

        cursor.execute(
            """
            DELETE FROM datasets
            WHERE dataset_id = %s
            """,
            (dataset_id,)
        )

        connection.commit()

        cursor.close()

        # Delete uploaded file

        for filename in os.listdir(
            UPLOAD_FOLDER
        ):

            if filename.startswith(
                dataset_id + "_"
            ):

                path = os.path.join(
                    UPLOAD_FOLDER,
                    filename
                )

                try:

                    os.remove(path)

                except Exception:

                    pass

        return {

            "success": True,

            "message":
                "Dataset deleted successfully."
        }

    except Exception:

        connection.rollback()

        raise

    finally:

        connection.close()


# ============================================================
# DELETE ALL DATASETS
# ============================================================

@app.delete("/datasets")
def delete_all_datasets():

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            "DELETE FROM dataset_rows"
        )

        cursor.execute(
            "DELETE FROM datasets"
        )

        connection.commit()

        cursor.close()

        # Delete uploaded files

        for filename in os.listdir(
            UPLOAD_FOLDER
        ):

            path = os.path.join(
                UPLOAD_FOLDER,
                filename
            )

            try:

                if os.path.isfile(path):

                    os.remove(path)

            except Exception:

                pass

        return {

            "success": True,

            "message":
                "All datasets deleted successfully."
        }

    except Exception:

        connection.rollback()

        raise

    finally:

        connection.close()