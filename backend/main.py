from fastapi import FastAPI, UploadFile, File, HTTPException
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
    title="Dynamic Data Intelligence AI",
    description="Schema-aware dynamic dataset intelligence platform",
    version="6.0"
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

DATABASE_URL = os.getenv(
    "DATABASE_URL"
)

os.makedirs(
    UPLOAD_FOLDER,
    exist_ok=True
)


# ============================================================
# DATABASE
# ============================================================

def get_connection():

    if not DATABASE_URL:
        raise RuntimeError(
            "DATABASE_URL environment variable is not configured."
        )

    return psycopg2.connect(
        DATABASE_URL,
        cursor_factory=RealDictCursor
    )


def create_database():

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS datasets (

                id SERIAL PRIMARY KEY,

                dataset_id TEXT UNIQUE NOT NULL,

                filename TEXT NOT NULL,

                file_type TEXT,

                rows_count INTEGER DEFAULT 0,

                columns_count INTEGER DEFAULT 0,

                columns_json TEXT,

                schema_json TEXT,

                uploaded_at TEXT

            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS dataset_rows (

                id SERIAL PRIMARY KEY,

                dataset_id TEXT NOT NULL,

                row_number INTEGER NOT NULL,

                data_json TEXT NOT NULL

            )
            """
        )

        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS
            idx_dataset_rows_dataset_id

            ON dataset_rows(dataset_id)
            """
        )

        cursor.execute(
            """
            ALTER TABLE datasets
            ADD COLUMN IF NOT EXISTS schema_json TEXT
            """
        )

        connection.commit()

        cursor.close()

    finally:

        connection.close()


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
        "message": "Dynamic Data Intelligence AI API is running",
        "version": "6.0"
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

        cursor.close()

        database_ok = True

    except Exception:

        database_ok = False

    finally:

        if connection:
            connection.close()

    return {
        "success": True,
        "database": database_ok,
        "message": "Backend is healthy"
    }


# ============================================================
# LOGIN
# ============================================================

@app.post("/login")
async def login(
    username: str = None,
    email: str = None,
    password: str = None
):

    user = (
        username
        or email
        or ""
    ).strip()

    password = (
        password
        or ""
    ).strip()

    if user == "" or password == "":

        return {
            "success": False,
            "message": "Please enter username and password"
        }

    return {
        "success": True,
        "message": "Login successful",
        "user": {
            "name": user.split("@")[0],
            "username": user,
            "email": user if "@" in user else ""
        }
    }


# ============================================================
# TEXT NORMALIZATION
# ============================================================

def normalize_column_name(value):

    text = str(value).strip().lower()

    text = text.replace("_", " ")
    text = text.replace("-", " ")
    text = text.replace("/", " ")
    text = text.replace("\\", " ")

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()


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

    elif extension in [
        ".xlsx",
        ".xls"
    ]:

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

            if data and all(
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

        return value.isoformat()

    if isinstance(
        value,
        datetime
    ):

        return value.isoformat()

    if isinstance(
        value,
        bool
    ):

        return value

    if isinstance(
        value,
        int
    ):

        return value

    if isinstance(
        value,
        float
    ):

        if math.isnan(value):
            return None

        if math.isinf(value):
            return None

        return value

    return str(value)


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
# VALUE PRESENT CHECK
# ============================================================

def has_value(value):

    if value is None:
        return False

    try:

        if pd.isna(value):
            return False

    except Exception:

        pass

    return str(value).strip() != ""


# ============================================================
# DATA TYPE DETECTION
# ============================================================

def detect_series_type(series):

    non_null = series.dropna()

    if len(non_null) == 0:

        return "empty"

    if pd.api.types.is_bool_dtype(series):

        return "boolean"

    if pd.api.types.is_numeric_dtype(series):

        return "numeric"

    if pd.api.types.is_datetime64_any_dtype(series):

        return "date"

    converted = pd.to_datetime(
        non_null,
        errors="coerce"
    )

    if len(non_null) > 0:

        date_ratio = (
            converted.notna().sum()
            / len(non_null)
        )

        if date_ratio >= 0.9:

            return "date"

    return "text"


# ============================================================
# COLUMN STATISTICS
# ============================================================

def analyze_column(
    series,
    column_name
):

    data_type = detect_series_type(
        series
    )

    missing_values = int(
        series.isna().sum()
    )

    non_null_values = int(
        series.notna().sum()
    )

    unique_values = int(
        series.nunique(
            dropna=True
        )
    )

    total_values = int(
        len(series)
    )

    missing_percentage = (
        round(
            missing_values
            / total_values
            * 100,
            2
        )
        if total_values > 0
        else 0
    )

    unique_percentage = (
        round(
            unique_values
            / non_null_values
            * 100,
            2
        )
        if non_null_values > 0
        else 0
    )

    result = {
        "column": str(column_name),

        "normalized_name":
            normalize_column_name(
                column_name
            ),

        "data_type":
            data_type,

        "missing_values":
            missing_values,

        "non_null_values":
            non_null_values,

        "unique_values":
            unique_values,

        "total_values":
            total_values,

        "missing_percentage":
            missing_percentage,

        "unique_percentage":
            unique_percentage
    }

    # --------------------------------------------------------
    # NUMERIC STATISTICS
    # --------------------------------------------------------

    if data_type == "numeric":

        numeric_series = pd.to_numeric(
            series,
            errors="coerce"
        )

        valid = numeric_series.dropna()

        if len(valid) > 0:

            result["statistics"] = {
                "minimum":
                    clean_value(valid.min()),

                "maximum":
                    clean_value(valid.max()),

                "mean":
                    clean_value(valid.mean()),

                "median":
                    clean_value(valid.median()),

                "standard_deviation":
                    clean_value(valid.std())
            }

    # --------------------------------------------------------
    # TEXT STATISTICS
    # --------------------------------------------------------

    elif data_type == "text":

        text_series = (
            series
            .dropna()
            .astype(str)
        )

        if len(text_series) > 0:

            lengths = text_series.str.len()

            result["statistics"] = {
                "minimum_length":
                    int(lengths.min()),

                "maximum_length":
                    int(lengths.max()),

                "average_length":
                    round(
                        float(lengths.mean()),
                        2
                    )
            }

    # --------------------------------------------------------
    # DATE STATISTICS
    # --------------------------------------------------------

    elif data_type == "date":

        dates = pd.to_datetime(
            series,
            errors="coerce"
        ).dropna()

        if len(dates) > 0:

            result["statistics"] = {
                "minimum":
                    dates.min().isoformat(),

                "maximum":
                    dates.max().isoformat()
            }

    return result


# ============================================================
# SCHEMA ANALYSIS
# ============================================================

def analyze_schema(df):

    schema = []

    for column in df.columns:

        schema.append(
            analyze_column(
                df[column],
                column
            )
        )

    return {
        "columns": schema,

        "column_count":
            len(schema),

        "data_type_summary": {
            "numeric": sum(
                1
                for item in schema
                if item["data_type"] == "numeric"
            ),

            "text": sum(
                1
                for item in schema
                if item["data_type"] == "text"
            ),

            "date": sum(
                1
                for item in schema
                if item["data_type"] == "date"
            ),

            "boolean": sum(
                1
                for item in schema
                if item["data_type"] == "boolean"
            ),

            "empty": sum(
                1
                for item in schema
                if item["data_type"] == "empty"
            )
        }
    }


# ============================================================
# COLUMN NAME CLEANING
# ============================================================

def clean_column_names(df):

    cleaned_columns = []

    used_names = set()

    for index, column in enumerate(
        df.columns
    ):

        name = str(
            column
        ).strip()

        if name == "":

            name = (
                f"Column_{index + 1}"
            )

        original_name = name

        counter = 2

        while name.lower() in used_names:

            name = (
                original_name
                + "_"
                + str(counter)
            )

            counter += 1

        used_names.add(
            name.lower()
        )

        cleaned_columns.append(
            name
        )

    df.columns = cleaned_columns

    return df


# ============================================================
# ROW COMPLETENESS
# ============================================================

def calculate_row_completeness(data):

    if not data:

        return 0

    total_fields = len(data)

    populated_fields = sum(
        1
        for value in data.values()
        if has_value(value)
    )

    return round(
        populated_fields
        / total_fields
        * 100
    )


# ============================================================
# GENERIC CONFIDENCE
# ============================================================

def calculate_dynamic_confidence(data):

    return calculate_row_completeness(
        data
    )


# ============================================================
# CONFIDENCE STATUS
# ============================================================

def confidence_status(
    confidence
):

    if confidence >= 85:

        return "Verified"

    if confidence >= 60:

        return "Needs Review"

    return "Incomplete"


# ============================================================
# GENERIC RECORD RESPONSE
# ============================================================

def build_record_response(
    row_id,
    row_number,
    data
):

    confidence = (
        calculate_dynamic_confidence(
            data
        )
    )

    return {
        "id": row_id,

        "row_number":
            row_number,

        "confidence":
            confidence,

        "status":
            confidence_status(
                confidence
            ),

        "field_count":
            len(data),

        "populated_fields":
            sum(
                1
                for value in data.values()
                if has_value(value)
            ),

        "missing_fields":
            sum(
                1
                for value in data.values()
                if not has_value(value)
            ),

        "data":
            data
    }


# ============================================================
# BACKWARD-COMPATIBLE PRODUCT RESPONSE
#
# The endpoint name /products is retained so your existing
# frontend does not immediately break.
#
# But the response is now completely dynamic.
# ============================================================

def build_product_response(
    row_id,
    row_number,
    data
):

    record = build_record_response(
        row_id,
        row_number,
        data
    )

    return {
        "id":
            record["id"],

        "row_number":
            record["row_number"],

        "confidence":
            record["confidence"],

        "status":
            record["status"],

        "field_count":
            record["field_count"],

        "populated_fields":
            record["populated_fields"],

        "missing_fields":
            record["missing_fields"],

        "data":
            record["data"],

        "raw_data":
            record["data"]
    }


# ============================================================
# GET CURRENT DATASET
# ============================================================

def get_current_rows():

    connection = get_connection()

    try:

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

            return None, []

        dataset_id = dataset[
            "dataset_id"
        ]

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
            (
                dataset_id,
            )
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

            result.append(
                {
                    "id":
                        row["id"],

                    "row_number":
                        row["row_number"],

                    "data":
                        data
                }
            )

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
                "Supported formats: "
                "CSV, XLSX, XLS, JSON and TSV."
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
        # SAVE FILE
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

        df = clean_column_names(
            df
        )

        # ----------------------------------------------------
        # REMOVE COMPLETELY EMPTY COLUMNS
        # ----------------------------------------------------

        df = df.dropna(
            axis=1,
            how="all"
        )

        if len(df.columns) == 0:

            raise ValueError(
                "Dataset contains no usable columns."
            )

        # ----------------------------------------------------
        # REMOVE COMPLETELY EMPTY ROWS
        # ----------------------------------------------------

        df = df.dropna(
            axis=0,
            how="all"
        )

        if df.empty:

            raise ValueError(
                "Dataset contains no usable rows."
            )

        # ----------------------------------------------------
        # RESET INDEX
        # ----------------------------------------------------

        df = df.reset_index(
            drop=True
        )

        # ----------------------------------------------------
        # DATASET INFORMATION
        # ----------------------------------------------------

        columns = [
            str(column)
            for column in df.columns
        ]

        rows_count = len(df)

        columns_count = len(
            columns
        )

        # ----------------------------------------------------
        # SCHEMA ANALYSIS
        # ----------------------------------------------------

        schema_analysis = (
            analyze_schema(df)
        )

        # ----------------------------------------------------
        # DATASET STATISTICS
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

        datetime_columns = [
            str(column)
            for column in
            df.select_dtypes(
                include=[
                    "datetime",
                    "datetimetz"
                ]
            ).columns
        ]

        boolean_columns = [
            str(column)
            for column in
            df.select_dtypes(
                include="bool"
            ).columns
        ]

        # ----------------------------------------------------
        # CONVERT ROWS
        # ----------------------------------------------------

        records = df.to_dict(
            orient="records"
        )

        rows_to_insert = []

        for index, record in enumerate(
            records
        ):

            cleaned_record = {}

            for column in columns:

                cleaned_record[column] = (
                    clean_value(
                        record.get(
                            column
                        )
                    )
                )

            rows_to_insert.append(
                (
                    dataset_id,
                    index + 1,
                    json.dumps(
                        cleaned_record,
                        default=str
                    )
                )
            )

        # ----------------------------------------------------
        # DATABASE
        # ----------------------------------------------------

        connection = get_connection()

        try:

            cursor = connection.cursor()

            # Keep one active dataset.
            cursor.execute(
                "DELETE FROM dataset_rows"
            )

            cursor.execute(
                "DELETE FROM datasets"
            )

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
                    schema_json,
                    uploaded_at
                )

                VALUES
                (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s
                )
                """,
                (
                    dataset_id,
                    filename,
                    extension,
                    rows_count,
                    columns_count,
                    json.dumps(
                        columns
                    ),
                    json.dumps(
                        schema_analysis
                    ),
                    datetime.now().isoformat()
                )
            )

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
                    page_size=1000
                )

            connection.commit()

            cursor.close()

        except Exception:

            connection.rollback()

            raise

        finally:

            connection.close()

        # ----------------------------------------------------
        # RESPONSE
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
                text_columns,

            "datetime_columns":
                datetime_columns,

            "boolean_columns":
                boolean_columns,

            "schema":
                schema_analysis
        }

    except HTTPException:

        raise

    except Exception as e:

        if os.path.exists(
            file_path
        ):

            try:

                os.remove(
                    file_path
                )

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

    return await upload_dataset(
        file
    )


# ============================================================
# GET DATASET
# ============================================================

@app.get("/dataset")
def get_dataset():

    dataset, rows = (
        get_current_rows()
    )

    if not dataset:

        return {
            "success": True,
            "dataset": None,
            "columns": [],
            "schema": {},
            "rows": []
        }

    columns = json.loads(
        dataset["columns_json"]
        or "[]"
    )

    try:

        schema = json.loads(
            dataset.get(
                "schema_json"
            )
            or "{}"
        )

    except Exception:

        schema = {}

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

        "schema":
            schema,

        "rows": [
            item["data"]
            for item in rows
        ]
    }


# ============================================================
# GENERIC RECORDS
# ============================================================

@app.get("/records")
def get_records():

    dataset, rows = (
        get_current_rows()
    )

    if not dataset:

        return {
            "success": True,
            "records": []
        }

    records = [
        build_record_response(
            item["id"],
            item["row_number"],
            item["data"]
        )
        for item in rows
    ]

    return {
        "success": True,
        "count": len(records),
        "records": records
    }


# ============================================================
# PRODUCTS
#
# Kept for compatibility with existing frontend.
# Data itself is completely dynamic.
# ============================================================

@app.get("/products")
def get_products():

    dataset, rows = (
        get_current_rows()
    )

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
# SINGLE RECORD
# ============================================================

@app.get("/records/{record_id}")
def get_record(
    record_id: int
):

    dataset, rows = (
        get_current_rows()
    )

    if not dataset:

        raise HTTPException(
            status_code=404,
            detail="No dataset uploaded."
        )

    for item in rows:

        if int(item["id"]) == int(
            record_id
        ):

            return build_record_response(
                item["id"],
                item["row_number"],
                item["data"]
            )

    for item in rows:

        if int(
            item["row_number"]
        ) == int(record_id):

            return build_record_response(
                item["id"],
                item["row_number"],
                item["data"]
            )

    raise HTTPException(
        status_code=404,
        detail=(
            f"Record {record_id} "
            "was not found."
        )
    )


# ============================================================
# SINGLE PRODUCT
#
# Kept for frontend compatibility.
# ============================================================

@app.get("/products/{product_id}")
def get_product(
    product_id: int
):

    return get_record(
        product_id
    )


# ============================================================
# GENERIC VALUE EXTRACTION
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
# GENERIC NUMERIC VALIDATION
# ============================================================

def validate_numeric_values(
    raw_data
):

    issues = []

    for column, value in raw_data.items():

        if not has_value(value):

            continue

        number = extract_number(
            value
        )

        if number is None:

            continue

        if number < 0:

            issues.append(
                f"{column} has a negative value"
            )

    return issues


# ============================================================
# DUPLICATE CHECK
# ============================================================

def serialize_row(data):

    return json.dumps(
        data,
        sort_keys=True,
        default=str
    )


def is_duplicate_row(
    current_data,
    other_data
):

    return (
        serialize_row(
            current_data
        )
        ==
        serialize_row(
            other_data
        )
    )


# ============================================================
# VALIDATION
# ============================================================

def generate_validation(
    record,
    all_rows
):

    raw_data = record.get(
        "data",
        record.get(
            "raw_data",
            {}
        )
    )

    checks = []

    # --------------------------------------------------------
    # COMPLETENESS
    # --------------------------------------------------------

    total_fields = len(
        raw_data
    )

    populated_fields = sum(
        1
        for value in raw_data.values()
        if has_value(value)
    )

    completeness = (
        round(
            populated_fields
            / total_fields
            * 100
        )
        if total_fields > 0
        else 0
    )

    if completeness >= 90:

        checks.append(
            {
                "title":
                    "Dataset Completeness",

                "status":
                    "PASS",

                "icon":
                    "✓",

                "message":
                    (
                        f"{populated_fields} "
                        f"of {total_fields} "
                        "fields contain values."
                    )
            }
        )

    elif completeness >= 60:

        checks.append(
            {
                "title":
                    "Dataset Completeness",

                "status":
                    "WARNING",

                "icon":
                    "⚠️",

                "message":
                    (
                        f"{populated_fields} "
                        f"of {total_fields} "
                        "fields contain values."
                    )
            }
        )

    else:

        checks.append(
            {
                "title":
                    "Dataset Completeness",

                "status":
                    "FAIL",

                "icon":
                    "❌",

                "message":
                    (
                        "A large portion of "
                        "the available fields "
                        "are empty."
                    )
            }
        )

    # --------------------------------------------------------
    # FIELD AVAILABILITY
    # --------------------------------------------------------

    if total_fields > 0:

        checks.append(
            {
                "title":
                    "Column Availability",

                "status":
                    "PASS",

                "icon":
                    "✓",

                "message":
                    (
                        f"{total_fields} "
                        "columns were detected "
                        "in this record."
                    )
            }
        )

    else:

        checks.append(
            {
                "title":
                    "Column Availability",

                "status":
                    "FAIL",

                "icon":
                    "❌",

                "message":
                    "No columns were detected."
            }
        )

    # --------------------------------------------------------
    # NUMERIC VALIDATION
    # --------------------------------------------------------

    numeric_issues = (
        validate_numeric_values(
            raw_data
        )
    )

    if numeric_issues:

        checks.append(
            {
                "title":
                    "Numeric Value Validation",

                "status":
                    "WARNING",

                "icon":
                    "⚠️",

                "message":
                    "; ".join(
                        numeric_issues
                    )
            }
        )

    else:

        checks.append(
            {
                "title":
                    "Numeric Value Validation",

                "status":
                    "PASS",

                "icon":
                    "✓",

                "message":
                    (
                        "No obvious negative "
                        "numeric values were detected."
                    )
            }
        )

    # --------------------------------------------------------
    # EMPTY FIELD CHECK
    # --------------------------------------------------------

    empty_columns = [
        column
        for column, value
        in raw_data.items()
        if not has_value(value)
    ]

    if not empty_columns:

        checks.append(
            {
                "title":
                    "Empty Field Check",

                "status":
                    "PASS",

                "icon":
                    "✓",

                "message":
                    "All fields contain values."
            }
        )

    else:

        checks.append(
            {
                "title":
                    "Empty Field Check",

                "status":
                    "WARNING",

                "icon":
                    "⚠️",

                "message":
                    (
                        f"{len(empty_columns)} "
                        "field(s) are empty."
                    ),

                "empty_columns":
                    empty_columns
            }
        )

    # --------------------------------------------------------
    # DUPLICATE CHECK
    # --------------------------------------------------------

    duplicate_count = 0

    for item in all_rows:

        other_data = item.get(
            "data",
            {}
        )

        if is_duplicate_row(
            raw_data,
            other_data
        ):

            duplicate_count += 1

    if duplicate_count > 1:

        checks.append(
            {
                "title":
                    "Duplicate Check",

                "status":
                    "WARNING",

                "icon":
                    "⚠️",

                "message":
                    (
                        "Another record "
                        "contains the same "
                        "complete set of values."
                    )
            }
        )

    else:

        checks.append(
            {
                "title":
                    "Duplicate Check",

                "status":
                    "PASS",

                "icon":
                    "✓",

                "message":
                    "No duplicate record was detected."
            }
        )

    # --------------------------------------------------------
    # SCORE
    # --------------------------------------------------------

    total_checks = len(
        checks
    )

    passed = sum(
        1
        for check in checks
        if check["status"] == "PASS"
    )

    warnings = sum(
        1
        for check in checks
        if check["status"] == "WARNING"
    )

    failed = sum(
        1
        for check in checks
        if check["status"] == "FAIL"
    )

    if total_checks:

        quality_score = round(
            (
                passed
                + warnings * 0.5
            )
            / total_checks
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
# VALIDATE RECORD - NEW API
# ============================================================

@app.post("/validate-record")
async def validate_record(
    payload: dict
):

    record_data = payload.get(
        "record",
        payload.get(
            "product",
            {}
        )
    )

    all_rows_data = payload.get(
        "all_rows",
        []
    )

    if not record_data:

        raise HTTPException(
            status_code=400,
            detail="Record data is missing."
        )

    if "data" in record_data:

        raw_data = record_data[
            "data"
        ]

    elif "raw_data" in record_data:

        raw_data = record_data[
            "raw_data"
        ]

    else:

        raw_data = record_data

    record = build_record_response(
        record_data.get(
            "id",
            0
        ),

        record_data.get(
            "row_number",
            0
        ),

        raw_data
    )

    all_rows = []

    for row in all_rows_data:

        if not isinstance(
            row,
            dict
        ):

            continue

        if "data" in row:

            all_rows.append(
                {
                    "data":
                        row["data"]
                }
            )

        elif "raw_data" in row:

            all_rows.append(
                {
                    "data":
                        row["raw_data"]
                }
            )

        else:

            all_rows.append(
                {
                    "data":
                        row
                }
            )

    result = generate_validation(
        record,
        all_rows
    )

    return {
        "success": True,

        "record_id":
            record["id"],

        "status":
            result["status"],

        "quality_score":
            result["quality_score"],

        "checks":
            result["checks"],

        "record":
            record
    }


# ============================================================
# OLD VALIDATION ENDPOINT
#
# Kept for compatibility.
# ============================================================

@app.post("/validate-product")
async def validate_product_new(
    payload: dict
):

    return await validate_record(
        payload
    )


# ============================================================
# VALIDATE RECORD BY ID
# ============================================================

@app.get("/validate-record/{record_id}")
def validate_record_by_id(
    record_id: int
):

    dataset, rows = (
        get_current_rows()
    )

    if not dataset:

        raise HTTPException(
            status_code=404,
            detail="No dataset uploaded."
        )

    selected = None

    for item in rows:

        if int(
            item["id"]
        ) == int(record_id):

            selected = item

            break

    if not selected:

        for item in rows:

            if int(
                item["row_number"]
            ) == int(record_id):

                selected = item

                break

    if not selected:

        raise HTTPException(
            status_code=404,
            detail="Record not found."
        )

    record = build_record_response(
        selected["id"],
        selected["row_number"],
        selected["data"]
    )

    result = generate_validation(
        record,
        rows
    )

    return {
        "success": True,

        "record_id":
            record["id"],

        "status":
            result["status"],

        "quality_score":
            result["quality_score"],

        "checks":
            result["checks"],

        "record":
            record
    }


# ============================================================
# OLD VALIDATION ENDPOINT
# ============================================================

@app.get("/validate/{product_id}")
def validate_product_by_id(
    product_id: int
):

    return validate_record_by_id(
        product_id
    )


# ============================================================
# DATASET DASHBOARD
# ============================================================

@app.get("/dashboard")
def dashboard():

    dataset, rows = (
        get_current_rows()
    )

    if not dataset:

        return {
            "success": True,

            "has_data":
                False,

            "total_records":
                0,

            "total_products":
                0,

            "total_rows":
                0,

            "total_columns":
                0,

            "dataset_name":
                "No dataset uploaded",

            "missing_values":
                0,

            "duplicate_rows":
                0,

            "verified":
                0,

            "needs_review":
                0,

            "incomplete":
                0,

            "critical_issues":
                0,

            "average_confidence":
                0,

            "average_quality":
                0
        }

    records = [
        build_record_response(
            item["id"],
            item["row_number"],
            item["data"]
        )
        for item in rows
    ]

    # --------------------------------------------------------
    # STATUS
    # --------------------------------------------------------

    verified = sum(
        1
        for record in records
        if record["status"] == "Verified"
    )

    needs_review = sum(
        1
        for record in records
        if record["status"] == "Needs Review"
    )

    incomplete = sum(
        1
        for record in records
        if record["status"] == "Incomplete"
    )

    # --------------------------------------------------------
    # CONFIDENCE
    # --------------------------------------------------------

    average_confidence = (
        round(
            sum(
                record["confidence"]
                for record in records
            )
            / len(records)
        )
        if records
        else 0
    )

    # --------------------------------------------------------
    # MISSING VALUES
    # --------------------------------------------------------

    missing_values = sum(
        1
        for item in rows
        for value in item["data"].values()
        if not has_value(value)
    )

    # --------------------------------------------------------
    # DUPLICATE ROWS
    # --------------------------------------------------------

    duplicate_rows = int(
        len(rows)
        - len(
            {
                serialize_row(
                    item["data"]
                )
                for item in rows
            }
        )
    )

    # --------------------------------------------------------
    # DATASET COMPLETENESS
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
            / total_cells
            * 100
        )
        if total_cells > 0
        else 0
    )

    return {
        "success": True,

        "has_data":
            True,

        "total_records":
            len(records),

        # Backward-compatible names
        "total_products":
            len(records),

        "total_rows":
            len(records),

        "total_columns":
            dataset["columns_count"],

        "dataset_name":
            dataset["filename"],

        "missing_values":
            missing_values,

        "duplicate_rows":
            duplicate_rows,

        "verified":
            verified,

        "needs_review":
            needs_review,

        "incomplete":
            incomplete,

        "critical_issues":
            incomplete,

        "average_confidence":
            average_confidence,

        "average_quality":
            average_confidence,

        "completeness":
            completeness
    }


# ============================================================
# DATASET REPORT
# ============================================================

@app.get("/report")
def get_report():

    dataset, rows = (
        get_current_rows()
    )

    if not dataset:

        return {
            "success": True,

            "has_data":
                False,

            "dataset":
                None,

            "summary":
                {},

            "columns":
                [],

            "schema":
                {},

            "rows":
                [],

            "records":
                [],

            "products":
                []
        }

    # --------------------------------------------------------
    # RECORDS
    # --------------------------------------------------------

    records = [
        build_record_response(
            item["id"],
            item["row_number"],
            item["data"]
        )
        for item in rows
    ]

    # --------------------------------------------------------
    # MISSING VALUES
    # --------------------------------------------------------

    missing_values = sum(
        1
        for item in rows
        for value in item["data"].values()
        if not has_value(value)
    )

    # --------------------------------------------------------
    # DUPLICATE ROWS
    # --------------------------------------------------------

    unique_rows = len(
        {
            serialize_row(
                item["data"]
            )
            for item in rows
        }
    )

    duplicate_rows = max(
        len(rows)
        - unique_rows,
        0
    )

    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    validation_results = []

    for record in records:

        result = generate_validation(
            record,
            rows
        )

        validation_results.append(
            result
        )

    # --------------------------------------------------------
    # STATUS COUNTS
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # AVERAGE QUALITY
    # --------------------------------------------------------

    average_quality = (
        round(
            sum(
                result["quality_score"]
                for result in validation_results
            )
            / len(validation_results)
        )
        if validation_results
        else 0
    )

    # --------------------------------------------------------
    # COMPLETENESS
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
            / total_cells
            * 100
        )
        if total_cells > 0
        else 0
    )

    # --------------------------------------------------------
    # DUPLICATE SCORE
    # --------------------------------------------------------

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
        * 100
    )

    duplicate_score = max(
        0,
        min(
            100,
            duplicate_score
        )
    )

    # --------------------------------------------------------
    # OVERALL QUALITY
    # --------------------------------------------------------

    overall_quality = round(
        (
            completeness * 0.45
            +
            duplicate_score * 0.10
            +
            average_quality * 0.45
        )
    )

    overall_quality = max(
        0,
        min(
            100,
            overall_quality
        )
    )

    # --------------------------------------------------------
    # SCHEMA
    # --------------------------------------------------------

    columns = json.loads(
        dataset["columns_json"]
        or "[]"
    )

    try:

        schema = json.loads(
            dataset.get(
                "schema_json"
            )
            or "{}"
        )

    except Exception:

        schema = {}

    # --------------------------------------------------------
    # RETURN
    # --------------------------------------------------------

    return {
        "success": True,

        "has_data":
            True,

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

            "total_records":
                len(records),

            # Backward compatibility
            "total_products":
                len(records),

            "total_rows":
                len(records),

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

            "average_confidence":
                round(
                    sum(
                        record["confidence"]
                        for record in records
                    )
                    / len(records)
                )
                if records
                else 0,

            "completeness":
                completeness,

            "duplicate_score":
                duplicate_score,

            "data_quality_score":
                overall_quality
        },

        "columns":
            columns,

        "schema":
            schema,

        "rows": [
            item["data"]
            for item in rows
        ],

        "records":
            records,

        # Backward compatibility
        "products":
            [
                build_product_response(
                    item["id"],
                    item["row_number"],
                    item["data"]
                )
                for item in rows
            ]
    }


# ============================================================
# REPORT ALIAS
# ============================================================

@app.get("/reports")
def get_reports():

    return get_report()


# ============================================================
# INDIVIDUAL RECORD REPORT
# ============================================================

@app.get("/reports/record/{record_id}")
def individual_record_report(
    record_id: int
):

    dataset, rows = (
        get_current_rows()
    )

    if not dataset:

        raise HTTPException(
            status_code=404,
            detail="No dataset uploaded."
        )

    selected = None

    for item in rows:

        if int(
            item["id"]
        ) == int(record_id):

            selected = item

            break

    if not selected:

        for item in rows:

            if int(
                item["row_number"]
            ) == int(record_id):

                selected = item

                break

    if not selected:

        raise HTTPException(
            status_code=404,
            detail="Record not found."
        )

    record = build_record_response(
        selected["id"],
        selected["row_number"],
        selected["data"]
    )

    validation = generate_validation(
        record,
        rows
    )

    return {
        "success": True,

        "dataset": {
            "filename":
                dataset["filename"]
        },

        "record":
            record,

        "report": {
            "quality_score":
                validation[
                    "quality_score"
                ],

            "status":
                validation[
                    "status"
                ],

            "passed_checks":
                validation[
                    "passed"
                ],

            "warnings":
                validation[
                    "warnings"
                ],

            "failed_checks":
                validation[
                    "failed"
                ],

            "checks":
                validation[
                    "checks"
                ]
        }
    }


# ============================================================
# OLD INDIVIDUAL PRODUCT REPORT
# ============================================================

@app.get("/reports/product/{product_id}")
def individual_product_report(
    product_id: int
):

    return individual_record_report(
        product_id
    )


# ============================================================
# CSV REPORT
# ============================================================

@app.get("/report/csv")
def report_csv():

    dataset, rows = (
        get_current_rows()
    )

    if not dataset:

        raise HTTPException(
            status_code=404,
            detail="No dataset available."
        )

    output = io.StringIO()

    columns = json.loads(
        dataset["columns_json"]
        or "[]"
    )

    writer = csv.writer(
        output
    )

    writer.writerow(
        columns
    )

    for item in rows:

        data = item["data"]

        writer.writerow(
            [
                data.get(
                    column,
                    ""
                )
                for column in columns
            ]
        )

    return {
        "success": True,

        "filename":
            "dynamic-dataset-report.csv",

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

            cursor.close()

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
            (
                dataset_id,
            )
        )

        cursor.execute(
            """
            DELETE FROM datasets
            WHERE dataset_id = %s
            """,
            (
                dataset_id,
            )
        )

        connection.commit()

        cursor.close()

        # ----------------------------------------------------
        # DELETE FILE
        # ----------------------------------------------------

        if os.path.exists(
            UPLOAD_FOLDER
        ):

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

                        os.remove(
                            path
                        )

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

        # ----------------------------------------------------
        # DELETE UPLOADED FILES
        # ----------------------------------------------------

        if os.path.exists(
            UPLOAD_FOLDER
        ):

            for filename in os.listdir(
                UPLOAD_FOLDER
            ):

                path = os.path.join(
                    UPLOAD_FOLDER,
                    filename
                )

                try:

                    if os.path.isfile(
                        path
                    ):

                        os.remove(
                            path
                        )

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