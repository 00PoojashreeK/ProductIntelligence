from fastapi import (
    FastAPI,
    UploadFile,
    File,
    Form,
    HTTPException,
    Query
)

from fastapi.middleware.cors import CORSMiddleware

import os
import json
import uuid
import math
import re
import sqlite3
from datetime import datetime

import pandas as pd


# ============================================================
# APPLICATION
# ============================================================

app = FastAPI(
    title="Product Intelligence AI",
    description="Dynamic AI-powered Product Intelligence Platform",
    version="3.0"
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

os.makedirs(
    UPLOAD_FOLDER,
    exist_ok=True
)


# ============================================================
# DATABASE
#
# Render:
#   DATABASE_URL = PostgreSQL URL
#
# Local:
#   SQLite is used automatically.
# ============================================================

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

USE_POSTGRES = (
    DATABASE_URL.startswith("postgres://")
    or
    DATABASE_URL.startswith("postgresql://")
)


if USE_POSTGRES:

    import psycopg2
    from psycopg2.extras import RealDictCursor

else:

    DATABASE_PATH = os.path.join(
        BASE_DIR,
        "product_intelligence.db"
    )


# ============================================================
# DATABASE CONNECTION
# ============================================================

def get_connection():

    if USE_POSTGRES:

        url = DATABASE_URL

        # Render sometimes supplies postgres://
        # psycopg2 accepts postgresql://
        if url.startswith("postgres://"):
            url = url.replace(
                "postgres://",
                "postgresql://",
                1
            )

        return psycopg2.connect(
            url,
            cursor_factory=RealDictCursor
        )

    connection = sqlite3.connect(
        DATABASE_PATH
    )

    connection.row_factory = sqlite3.Row

    return connection


def placeholder():

    if USE_POSTGRES:
        return "%s"

    return "?"


# ============================================================
# DATABASE INITIALIZATION
# ============================================================

def create_database():

    connection = get_connection()

    cursor = connection.cursor()

    if USE_POSTGRES:

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

                row_number INTEGER,

                data_json TEXT,

                FOREIGN KEY(dataset_id)
                REFERENCES datasets(dataset_id)
                ON DELETE CASCADE

            )
        """)

    else:

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS datasets (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

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

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                dataset_id TEXT NOT NULL,

                row_number INTEGER,

                data_json TEXT,

                FOREIGN KEY(dataset_id)
                REFERENCES datasets(dataset_id)

            )
        """)

    connection.commit()
    cursor.close()
    connection.close()


create_database()


# ============================================================
# HELPERS
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

        return value.isoformat()

    if isinstance(
        value,
        float
    ):

        if math.isnan(value):
            return None

        return value

    if isinstance(
        value,
        (int, bool)
    ):

        return value

    return str(value).strip()


def safe_json(value):

    try:
        return json.loads(value)
    except Exception:
        return {}


def is_empty(value):

    if value is None:
        return True

    text = str(value).strip()

    return (
        text == ""
        or
        text.lower()
        in [
            "nan",
            "none",
            "null",
            "n/a",
            "na",
            "not available",
            "-"
        ]
    )


def normalize_column(column):

    text = str(column).strip()

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text


# ============================================================
# DYNAMIC COLUMN DETECTION
# ============================================================

def find_column(columns, keywords):

    normalized = []

    for column in columns:

        clean = re.sub(
            r"[^a-z0-9]",
            "",
            str(column).lower()
        )

        normalized.append(
            (column, clean)
        )

    # Exact / strong match
    for keyword in keywords:

        key = re.sub(
            r"[^a-z0-9]",
            "",
            keyword.lower()
        )

        for original, clean in normalized:

            if clean == key:
                return original

    # Partial match
    for keyword in keywords:

        key = re.sub(
            r"[^a-z0-9]",
            "",
            keyword.lower()
        )

        for original, clean in normalized:

            if key in clean:
                return original

    return None


def detect_product_name(columns):

    return find_column(
        columns,
        [
            "product name",
            "product_name",
            "product",
            "name",
            "item name",
            "item",
            "title",
            "model name",
            "device name"
        ]
    )


def detect_brand(columns):

    return find_column(
        columns,
        [
            "brand",
            "manufacturer",
            "company",
            "maker",
            "vendor"
        ]
    )


def detect_model(columns):

    return find_column(
        columns,
        [
            "model number",
            "model_number",
            "model",
            "sku",
            "product id",
            "product_id",
            "item id",
            "item_id"
        ]
    )


# ============================================================
# DATASET QUALITY
# ============================================================

def calculate_row_quality(data):

    if not data:
        return 0

    total = len(data)

    filled = 0

    for value in data.values():

        if not is_empty(value):
            filled += 1

    score = (
        filled / total
    ) * 100

    return round(
        score,
        1
    )


def row_status(score):

    if score >= 90:
        return "Verified"

    if score >= 70:
        return "Good"

    if score >= 50:
        return "Needs Review"

    return "Incomplete"


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

    if extension == ".xlsx":

        return pd.read_excel(
            file_path
        )

    if extension == ".xls":

        return pd.read_excel(
            file_path
        )

    if extension == ".tsv":

        return pd.read_csv(
            file_path,
            sep="\t"
        )

    if extension == ".json":

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
        "Use CSV, XLSX, XLS, JSON or TSV."
    )


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():

    return {
        "success": True,
        "message": "Product Intelligence AI API is running",
        "version": "3.0",
        "database": (
            "PostgreSQL"
            if USE_POSTGRES
            else "SQLite"
        )
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health():

    try:

        connection = get_connection()

        connection.close()

        return {
            "success": True,
            "database": True,
            "database_type": (
                "PostgreSQL"
                if USE_POSTGRES
                else "SQLite"
            ),
            "message": "Backend is healthy"
        }

    except Exception as e:

        return {
            "success": False,
            "database": False,
            "message": str(e)
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

    if not user or not password:

        return {
            "success": False,
            "message": "Please enter username and password"
        }

    return {

        "success": True,

        "message": "Login successful",

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

    supported = [
        ".csv",
        ".xlsx",
        ".xls",
        ".json",
        ".tsv"
    ]

    if extension not in supported:

        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported file type. "
                "Use CSV, XLSX, XLS, JSON or TSV."
            )
        )

    dataset_id = str(
        uuid.uuid4()
    )

    saved_name = (
        dataset_id
        + "_"
        + filename
    )

    file_path = os.path.join(
        UPLOAD_FOLDER,
        saved_name
    )

    try:

        contents = await file.read()

        with open(
            file_path,
            "wb"
        ) as output:

            output.write(contents)

        df = read_dataset(
            file_path,
            filename
        )

        if df is None or df.empty:

            raise ValueError(
                "The uploaded dataset is empty."
            )

        # Clean column names
        df.columns = [
            normalize_column(column)
            for column in df.columns
        ]

        # Remove unnamed columns
        df = df.loc[
            :,
            [
                column
                for column in df.columns
                if not str(column)
                .lower()
                .startswith("unnamed:")
            ]
        ]

        # Remove completely empty columns
        df = df.dropna(
            axis=1,
            how="all"
        )

        columns = [
            str(column)
            for column in df.columns
        ]

        rows_count = len(df)

        columns_count = len(columns)

        # ----------------------------------------------------
        # DELETE PREVIOUS CURRENT DATASET
        # ----------------------------------------------------

        connection = get_connection()

        cursor = connection.cursor()

        cursor.execute(
            """
            DELETE FROM dataset_rows
            WHERE dataset_id IN (
                SELECT dataset_id
                FROM datasets
            )
            """
        )

        cursor.execute(
            """
            DELETE FROM datasets
            """
        )

        # ----------------------------------------------------
        # INSERT NEW DATASET
        # ----------------------------------------------------

        p = placeholder()

        cursor.execute(
            f"""
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
            VALUES (
                {p},
                {p},
                {p},
                {p},
                {p},
                {p},
                {p}
            )
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

        # ----------------------------------------------------
        # SAVE ROWS
        # ----------------------------------------------------

        for index, row in df.iterrows():

            row_data = {}

            for column in columns:

                row_data[column] = clean_value(
                    row[column]
                )

            cursor.execute(
                f"""
                INSERT INTO dataset_rows
                (
                    dataset_id,
                    row_number,
                    data_json
                )
                VALUES (
                    {p},
                    {p},
                    {p}
                )
                """,
                (
                    dataset_id,
                    index + 1,
                    json.dumps(
                        row_data,
                        default=str
                    )
                )
            )

        connection.commit()

        cursor.close()
        connection.close()

        # ----------------------------------------------------
        # QUALITY
        # ----------------------------------------------------

        missing_values = int(
            df.isna()
            .sum()
            .sum()
        )

        duplicate_rows = int(
            df.duplicated()
            .sum()
        )

        numeric_columns = [
            str(column)
            for column
            in df.select_dtypes(
                include="number"
            ).columns
        ]

        text_columns = [
            str(column)
            for column
            in df.select_dtypes(
                include="object"
            ).columns
        ]

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
# OLD UPLOAD ENDPOINT
# ============================================================

@app.post("/upload-csv")
async def upload_csv(
    file: UploadFile = File(...)
):

    return await upload_dataset(file)


# ============================================================
# GET CURRENT DATASET
# ============================================================

@app.get("/dataset")
def get_dataset():

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT *
        FROM datasets
        ORDER BY id DESC
        LIMIT 1
        """
    )

    dataset = cursor.fetchone()

    if not dataset:

        cursor.close()
        connection.close()

        return {
            "success": True,
            "dataset": None,
            "columns": [],
            "rows": []
        }

    dataset_id = dataset["dataset_id"]

    p = placeholder()

    cursor.execute(
        f"""
        SELECT
            row_number,
            data_json
        FROM dataset_rows
        WHERE dataset_id = {p}
        ORDER BY row_number
        """,
        (dataset_id,)
    )

    rows = cursor.fetchall()

    result_rows = []

    for row in rows:

        data = safe_json(
            row["data_json"]
        )

        result_rows.append({
            "id": row["row_number"],
            "row_number": row["row_number"],
            "data": data,
            "quality": calculate_row_quality(data),
            "status": row_status(
                calculate_row_quality(data)
            )
        })

    columns = safe_json(
        dataset["columns_json"]
    )

    cursor.close()
    connection.close()

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
            result_rows

    }


# ============================================================
# PRODUCT RESPONSE HELPERS
# ============================================================

def build_product_from_row(row, columns):
    data = row["data"]

    name_column = detect_product_name(columns)
    brand_column = detect_brand(columns)
    model_column = detect_model(columns)
    category_column = find_column(
        columns,
        [
            "category",
            "type",
            "product type",
            "department"
        ]
    )

    display_name = (
        data.get(name_column)
        if name_column
        else None
    )

    # Never return "Not Available" when the dataset has a
    # usable value under another column.
    if is_empty(display_name):
        for column in columns:
            value = data.get(column)
            if not is_empty(value):
                display_name = value
                break

    if is_empty(display_name):
        display_name = f"Product {row['row_number']}"

    return {
        "id": row["id"],
        "row_number": row["row_number"],
        "name": str(display_name),
        "product_name": str(display_name),
        "brand": data.get(brand_column) if brand_column else None,
        "model": data.get(model_column) if model_column else None,
        "category": data.get(category_column) if category_column else None,
        "confidence": row["quality"],
        "status": row["status"],
        "data": data,
        "raw_data": data
    }


# ============================================================
# PRODUCTS
#
# IMPORTANT:
# This endpoint returns an ARRAY.
# products.js expects an array.
# ============================================================

@app.get("/products")
def get_products():
    dataset_response = get_dataset()

    if not dataset_response["dataset"]:
        return []

    columns = dataset_response["columns"]

    return [
        build_product_from_row(row, columns)
        for row in dataset_response["rows"]
    ]


# ============================================================
# PRODUCT DETAILS
# ============================================================

@app.get("/products/{product_id}")
def get_product(product_id: int):
    dataset_response = get_dataset()

    if not dataset_response["dataset"]:
        raise HTTPException(
            status_code=404,
            detail="No dataset uploaded."
        )

    for row in dataset_response["rows"]:
        if int(row["id"]) == int(product_id):
            return build_product_from_row(
                row,
                dataset_response["columns"]
            )

    raise HTTPException(
        status_code=404,
        detail="Product not found."
    )


# ============================================================
# VALIDATE PRODUCT
# ============================================================

@app.get("/validate/{product_id}")
def validate_product(product_id: int):

    dataset_response = get_dataset()

    if not dataset_response["dataset"]:

        raise HTTPException(
            status_code=404,
            detail="No dataset uploaded."
        )

    target = None

    for row in dataset_response["rows"]:

        if int(row["id"]) == int(product_id):

            target = row
            break

    if target is None:

        raise HTTPException(
            status_code=404,
            detail="Product not found."
        )

    data = target["data"]

    columns = dataset_response["columns"]

    issues = []

    warnings = []

    recommendations = []

    # --------------------------------------------------------
    # EMPTY FIELD CHECK
    # --------------------------------------------------------

    missing_fields = []

    for column in columns:

        value = data.get(column)

        if is_empty(value):

            missing_fields.append(
                column
            )

    for field in missing_fields:

        issues.append(
            f"{field} is missing."
        )

    # --------------------------------------------------------
    # DUPLICATE CHECK
    # --------------------------------------------------------

    duplicate_count = 0

    for row in dataset_response["rows"]:

        if row["id"] == target["id"]:
            continue

        if row["data"] == data:

            duplicate_count += 1

    if duplicate_count > 0:

        warnings.append(
            "This product appears to have a duplicate record."
        )

    # --------------------------------------------------------
    # NUMERIC CHECKS
    # --------------------------------------------------------

    numeric_columns = []

    for column in columns:

        value = data.get(column)

        if is_empty(value):
            continue

        # Detect numeric-looking values
        text = str(value).replace(
            ",",
            ""
        ).strip()

        try:

            float(text)

            numeric_columns.append(
                column
            )

        except Exception:

            # If column contains numeric
            # keywords but value is not numeric
            lower = column.lower()

            numeric_keywords = [
                "price",
                "cost",
                "weight",
                "height",
                "width",
                "length",
                "power",
                "voltage",
                "current",
                "rating",
                "quantity",
                "stock",
                "speed",
                "rpm",
                "capacity",
                "temperature"
            ]

            if any(
                key in lower
                for key in numeric_keywords
            ):

                warnings.append(
                    f"{column} contains a non-numeric value."
                )

    # --------------------------------------------------------
    # TEXT QUALITY
    # --------------------------------------------------------

    for column in columns:

        value = data.get(column)

        if is_empty(value):
            continue

        if isinstance(value, str):

            if len(value.strip()) < 2:

                warnings.append(
                    f"{column} contains very little information."
                )

    # --------------------------------------------------------
    # RECOMMENDATIONS
    # --------------------------------------------------------

    if missing_fields:

        recommendations.append(
            "Complete all missing product information."
        )

    if duplicate_count > 0:

        recommendations.append(
            "Review duplicate records and keep only the correct product entry."
        )

    if warnings:

        recommendations.append(
            "Review fields marked with warnings before publishing the product."
        )

    if not issues and not warnings:

        recommendations.append(
            "Product information looks complete and consistent."
        )

    # --------------------------------------------------------
    # QUALITY SCORE
    # --------------------------------------------------------

    total_fields = len(columns)

    filled_fields = (
        total_fields
        - len(missing_fields)
    )

    completeness = (
        filled_fields / total_fields * 100
        if total_fields
        else 0
    )

    quality_score = max(
        0,
        round(
            completeness
            - min(
                len(warnings) * 3,
                20
            )
            - min(
                duplicate_count * 10,
                20
            )
        )
    )

    if quality_score >= 90:

        status = "Verified"

    elif quality_score >= 70:

        status = "Needs Review"

    else:

        status = "Incomplete"

    # --------------------------------------------------------
    # BUILD FRONTEND-FRIENDLY PRODUCT DETAILS + CHECKS
    # --------------------------------------------------------

    product = build_product_from_row(
        target,
        columns
    )

    checks = []

    # Missing-field check
    checks.append({
        "title": "Required fields",
        "status": "FAIL" if missing_fields else "PASS",
        "icon": "✕" if missing_fields else "✓",
        "message": (
            f"{len(missing_fields)} field(s) are missing: "
            + ", ".join(missing_fields)
            if missing_fields
            else "All dataset fields contain values."
        )
    })

    # Duplicate check
    checks.append({
        "title": "Duplicate record check",
        "status": "WARNING" if duplicate_count else "PASS",
        "icon": "!" if duplicate_count else "✓",
        "message": (
            f"{duplicate_count} duplicate record(s) found."
            if duplicate_count
            else "No duplicate record was found."
        )
    })

    # Numeric validation check
    numeric_warning_messages = [
        warning
        for warning in warnings
        if "non-numeric value" in warning
    ]

    checks.append({
        "title": "Numeric field validation",
        "status": "FAIL" if numeric_warning_messages else "PASS",
        "icon": "✕" if numeric_warning_messages else "✓",
        "message": (
            " ".join(numeric_warning_messages)
            if numeric_warning_messages
            else "Numeric-looking fields contain valid numeric values."
        )
    })

    # Text quality check
    short_text_warnings = [
        warning
        for warning in warnings
        if "very little information" in warning
    ]

    checks.append({
        "title": "Text quality",
        "status": "WARNING" if short_text_warnings else "PASS",
        "icon": "!" if short_text_warnings else "✓",
        "message": (
            " ".join(short_text_warnings)
            if short_text_warnings
            else "Text fields contain sufficient information."
        )
    })

    return {

        "success":
            True,

        "id":
            product_id,

        "product_name":
            product["name"],

        "product":
            product,

        "status":
            status,

        "score":
            quality_score,

        "quality_score":
            quality_score,

        "checks":
            checks,

        "issues":
            issues,

        "warnings":
            warnings,

        "recommendations":
            recommendations,

        "missing_fields":
            missing_fields,

        "duplicate_count":
            duplicate_count,

        "total_fields":
            total_fields,

        "filled_fields":
            filled_fields,

        "completeness":
            round(
                completeness,
                1
            ),

        "data":
            data

    }


# ============================================================
# DELETE CURRENT DATASET
# ============================================================

@app.delete("/dataset")
def delete_dataset():

    connection = get_connection()

    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            DELETE FROM dataset_rows
            """
        )

        cursor.execute(
            """
            DELETE FROM datasets
            """
        )

        connection.commit()

        return {

            "success": True,

            "message":
                "Current dataset deleted successfully."

        }

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        cursor.close()
        connection.close()


# ============================================================
# DATASET LIST
# ============================================================

@app.get("/datasets")
def get_datasets():

    connection = get_connection()

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
    connection.close()

    return {

        "success":
            True,

        "count":
            len(result),

        "datasets":
            result

    }


# ============================================================
# DASHBOARD
# ============================================================

@app.get("/dashboard")
def dashboard():

    dataset = get_dataset()

    if not dataset["dataset"]:

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

    rows = dataset["rows"]

    missing = 0

    verified = 0

    needs_review = 0

    scores = []

    for row in rows:

        data = row["data"]

        for value in data.values():

            if is_empty(value):

                missing += 1

        score = row["quality"]

        scores.append(score)

        if row["status"] == "Verified":

            verified += 1

        else:

            needs_review += 1

    average_confidence = (
        round(
            sum(scores) / len(scores),
            1
        )
        if scores
        else 0
    )

    return {

        "success":
            True,

        "total_products":
            len(rows),

        "total_rows":
            len(rows),

        "total_columns":
            dataset["dataset"]["columns_count"],

        "dataset_name":
            dataset["dataset"]["filename"],

        "missing_values":
            missing,

        "verified":
            verified,

        "needs_review":
            needs_review,

        "average_confidence":
            average_confidence

    }


# ============================================================
# REPORT
# ============================================================

@app.get("/report")
def report(summary: bool = Query(False)):
    """Return report summary. Use summary=true to keep the response small; products are loaded separately."""
    dataset = get_dataset()

    if not dataset["dataset"]:
        return {
            "success": True,
            "dataset": None,
            "products": [],
            "report": {
                "dataset_name": "No dataset uploaded",
                "total_products": 0,
                "total_columns": 0,
                "verified": 0,
                "needs_review": 0,
                "average_confidence": 0,
                "missing_values": 0,
                "duplicate_rows": 0,
                "columns": []
            }
        }

    rows = dataset["rows"]

    scores = [
        row["quality"]
        for row in rows
    ]

    verified = sum(
        1
        for row in rows
        if row["status"] == "Verified"
    )

    missing_values = 0

    for row in rows:
        for value in row["data"].values():
            if is_empty(value):
                missing_values += 1

    # Count exact duplicate records.
    seen = set()
    duplicate_rows = 0

    for row in rows:
        try:
            signature = json.dumps(
                row["data"],
                sort_keys=True,
                default=str
            )
        except Exception:
            signature = str(row["data"])

        if signature in seen:
            duplicate_rows += 1
        else:
            seen.add(signature)

    product_list = [] if summary else [
        build_product_from_row(
            row,
            dataset["columns"]
        )
        for row in rows
    ]

    dataset_info = {
        "dataset_id": dataset["dataset"]["dataset_id"],
        "filename": dataset["dataset"]["filename"],
        "file_type": dataset["dataset"]["file_type"],
        "rows": dataset["dataset"]["rows_count"],
        "columns": dataset["columns"],
        "columns_count": dataset["dataset"]["columns_count"],
        "uploaded_at": dataset["dataset"]["uploaded_at"]
    }

    report_info = {
        "dataset_name":
            dataset["dataset"]["filename"],

        "total_products":
            len(rows),

        "total_columns":
            dataset["dataset"]["columns_count"],

        "verified":
            verified,

        "needs_review":
            len(rows) - verified,

        "average_confidence":
            round(
                sum(scores) / len(scores),
                1
            )
            if scores
            else 0,

        "missing_values":
            missing_values,

        "duplicate_rows":
            duplicate_rows,

        "columns":
            dataset["columns"]
    }

    # Keep report generation fast and reliable. The browser loads
    # the product records separately from /products, so a large
    # dataset cannot make the report response unnecessarily huge.
    return {
        "success": True,
        "dataset": dataset_info,
        "products": [] if summary else product_list,
        "report": report_info
    }

