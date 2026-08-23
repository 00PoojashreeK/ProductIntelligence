// ============================================================
// PRODUCT DETAILS.JS
// Dynamic Dataset Record Details
// Works with ANY dataset structure
// ============================================================

const API_BASE_URL =
    ((window.location.protocol === "file:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://127.0.0.1:8000" : "https://productintelligence-lzcn.onrender.com");


// ============================================================
// GET RECORD ID FROM URL
// ============================================================

const urlParams =
    new URLSearchParams(
        window.location.search
    );

const recordId =
    urlParams.get("id");

console.log(
    "Record ID from URL:",
    recordId
);


// ============================================================
// MAIN CONTAINER
// ============================================================

const container =
    document.getElementById(
        "productDetails"
    );


// ============================================================
// SAFE VALUE
// ============================================================

function getValue(
    value,
    fallback = "Not Available"
) {

    if (
        value === null ||
        value === undefined
    ) {
        return fallback;
    }

    if (
        typeof value === "string" &&
        value.trim() === ""
    ) {
        return fallback;
    }

    return String(value);
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ============================================================
// FORMAT FIELD NAME
// ============================================================

function formatFieldName(field) {

    return String(field)

        .replace(/_/g, " ")

        .replace(/-/g, " ")

        .replace(
            /([a-z])([A-Z])/g,
            "$1 $2"
        )

        .replace(/\s+/g, " ")

        .trim()

        .replace(
            /\b\w/g,
            letter =>
                letter.toUpperCase()
        );
}


// ============================================================
// GET RECORD DATA
// ============================================================

function getRecordData(record) {

    if (
        record &&
        record.raw_data &&
        typeof record.raw_data === "object" &&
        !Array.isArray(record.raw_data)
    ) {

        return record.raw_data;

    }


    if (
        record &&
        record.data &&
        typeof record.data === "object" &&
        !Array.isArray(record.data)
    ) {

        return record.data;

    }


    if (
        record &&
        record.fields &&
        typeof record.fields === "object" &&
        !Array.isArray(record.fields)
    ) {

        return record.fields;

    }


    return record || {};
}


// ============================================================
// GET DISPLAY NAME
// ============================================================

function getDisplayName(record) {

    const data =
        getRecordData(record);

    const keys =
        Object.keys(data);


    if (keys.length === 0) {
        return "Record";
    }


    // --------------------------------------------------------
    // Common name fields
    // --------------------------------------------------------

    const preferredFields = [

        "product_name",
        "product name",

        "name",

        "title",

        "full_name",
        "full name",

        "student_name",
        "student name",

        "employee_name",
        "employee name",

        "customer_name",
        "customer name",

        "item_name",
        "item name",

        "company_name",
        "company name",

        "description",

        "label"

    ];


    for (
        const preferred
        of preferredFields
    ) {

        const matchingKey =
            keys.find(
                key =>
                    key
                        .toLowerCase()
                        .trim() ===
                    preferred
                        .toLowerCase()
                        .trim()
            );


        if (
            matchingKey &&
            hasDisplayValue(
                data[matchingKey]
            )
        ) {

            return String(
                data[matchingKey]
            );

        }

    }


    // --------------------------------------------------------
    // Any field containing "name"
    // --------------------------------------------------------

    const nameKey =
        keys.find(key => {

            const normalized =
                key
                    .toLowerCase()
                    .replace(/[_-]/g, " ")
                    .trim();

            return (
                normalized.includes("name") &&
                hasDisplayValue(data[key])
            );

        });


    if (nameKey) {

        return String(
            data[nameKey]
        );

    }


    // --------------------------------------------------------
    // Title / label
    // --------------------------------------------------------

    const titleKey =
        keys.find(key => {

            const normalized =
                key
                    .toLowerCase()
                    .replace(/[_-]/g, " ")
                    .trim();

            return (
                (
                    normalized.includes("title") ||
                    normalized.includes("label")
                ) &&
                hasDisplayValue(data[key])
            );

        });


    if (titleKey) {

        return String(
            data[titleKey]
        );

    }


    // --------------------------------------------------------
    // First meaningful text value
    // --------------------------------------------------------

    for (
        const key of keys
    ) {

        const value =
            data[key];


        if (
            hasDisplayValue(value) &&
            isNaN(Number(value))
        ) {

            return String(value);

        }

    }


    // --------------------------------------------------------
    // First meaningful value
    // --------------------------------------------------------

    for (
        const key of keys
    ) {

        const value =
            data[key];


        if (
            hasDisplayValue(value)
        ) {

            return String(value);

        }

    }


    return "Record";
}


// ============================================================
// CHECK DISPLAY VALUE
// ============================================================

function hasDisplayValue(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return false;
    }


    const text =
        String(value).trim();


    if (
        text === "" ||
        text.toLowerCase() === "null" ||
        text.toLowerCase() === "undefined" ||
        text.toLowerCase() === "n/a" ||
        text.toLowerCase() === "not available"
    ) {

        return false;

    }


    return true;
}


// ============================================================
// GET CONFIDENCE
// ============================================================

function getConfidence(record) {

    let confidence;


    if (
        record &&
        record.confidence !== undefined &&
        record.confidence !== null
    ) {

        confidence =
            Number(
                record.confidence
            );

    }


    // --------------------------------------------------------
    // Calculate from actual fields if backend
    // confidence does not exist
    // --------------------------------------------------------

    if (
        confidence === undefined ||
        Number.isNaN(confidence)
    ) {

        const data =
            getRecordData(record);

        const keys =
            Object.keys(data);


        if (keys.length === 0) {
            return 0;
        }


        const populated =
            keys.filter(
                key =>
                    hasDisplayValue(
                        data[key]
                    )
            ).length;


        confidence =
            (
                populated /
                keys.length
            ) * 100;

    }


    // Backend may return 0.85 instead of 85

    if (
        confidence >= 0 &&
        confidence <= 1
    ) {

        confidence =
            confidence * 100;

    }


    return Math.max(
        0,
        Math.min(
            100,
            Math.round(
                confidence
            )
        )
    );
}


// ============================================================
// GET STATUS
// ============================================================

function getStatus(record) {

    if (
        record &&
        record.status !== undefined &&
        record.status !== null &&
        String(record.status).trim() !== ""
    ) {

        return String(
            record.status
        );

    }


    const confidence =
        getConfidence(record);


    if (confidence >= 85) {
        return "Verified";
    }


    if (confidence >= 60) {
        return "Needs Review";
    }


    return "Incomplete";
}


// ============================================================
// STATUS CLASS
// ============================================================

function getStatusClass(status) {

    const value =
        String(status || "")
            .toLowerCase();


    if (
        value.includes("verified") ||
        value.includes("pass") ||
        value.includes("complete")
    ) {

        return "status-verified";

    }


    if (
        value.includes("critical") ||
        value.includes("incomplete") ||
        value.includes("fail")
    ) {

        return "status-critical";

    }


    return "status-review";
}


// ============================================================
// GET RECORD ID
// ============================================================

function getRecordIdentifier(record) {

    return (
        record.id ??
        record.product_id ??
        record.record_id ??
        record.row_number ??
        record.row ??
        "-"
    );

}


// ============================================================
// BUILD INFORMATION CARDS
// ============================================================

function buildInformationCards(
    data
) {

    const entries =
        Object.entries(data);


    if (
        entries.length === 0
    ) {

        return `

            <div class="no-data-message">

                No dataset fields are available.

            </div>

        `;

    }


    return entries

        .filter(
            ([key, value]) =>
                hasDisplayValue(value)
        )

        .map(
            ([key, value]) => `

                <div
                    style="
                        padding:18px;
                        border:1px solid #e2e8f0;
                        border-radius:12px;
                        background:#f8fafc;
                    "
                >

                    <div
                        style="
                            color:#64748b;
                            font-size:13px;
                            margin-bottom:7px;
                        "
                    >
                        ${escapeHTML(
                            formatFieldName(key)
                        )}
                    </div>

                    <div
                        style="
                            font-weight:600;
                            color:#0f172a;
                            word-break:break-word;
                        "
                    >
                        ${escapeHTML(
                            getValue(value)
                        )}
                    </div>

                </div>

            `
        )

        .join("");

}


// ============================================================
// BUILD RAW DATA TABLE
// ============================================================

function buildRawData(
    data
) {

    const entries =
        Object.entries(data);


    if (
        entries.length === 0
    ) {

        return `

            <tr>

                <td colspan="2">

                    No original dataset information available.

                </td>

            </tr>

        `;

    }


    return entries

        .map(
            ([key, value]) => `

                <tr>

                    <td>

                        <strong>
                            ${escapeHTML(
                                formatFieldName(key)
                            )}
                        </strong>

                    </td>


                    <td>

                        ${escapeHTML(
                            getValue(value)
                        )}

                    </td>

                </tr>

            `
        )

        .join("");

}


// ============================================================
// LOAD RECORD
// ============================================================

async function loadProduct() {

    if (!container) {

        console.error(
            "productDetails container not found."
        );

        return;

    }


    // --------------------------------------------------------
    // Check ID
    // --------------------------------------------------------

    if (
        !recordId ||
        recordId === "undefined" ||
        recordId === "null"
    ) {

        showError(
            "No record ID was provided."
        );

        return;

    }


    // --------------------------------------------------------
    // Loading
    // --------------------------------------------------------

    container.innerHTML = `

        <div class="product-card">

            <h2>
                Loading Record...
            </h2>

            <p>
                Fetching record information.
            </p>

        </div>

    `;


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/products/${encodeURIComponent(recordId)}`,
                {
                    method: "GET",
                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );


        console.log(
            "Product API status:",
            response.status
        );


        if (!response.ok) {

            let message =
                `Unable to load record. HTTP ${response.status}`;


            try {

                const errorData =
                    await response.json();


                if (
                    errorData &&
                    errorData.detail
                ) {

                    message =
                        errorData.detail;

                }

            }
            catch {
                // Ignore JSON parsing errors
            }


            throw new Error(
                message
            );

        }


        const product =
            await response.json();


        console.log(
            "Record received:",
            product
        );


        // Some APIs return:
        // { product: {...} }

        const record =
            product.product ||
            product.record ||
            product.data ||
            product;


        displayProduct(
            record
        );

    }
    catch (error) {

        console.error(
            "Record loading error:",
            error
        );


        showError(
            error.message ||
            "Unable to load record."
        );

    }

}


// ============================================================
// DISPLAY RECORD
// ============================================================

function displayProduct(
    record
) {

    const data =
        getRecordData(record);


    const name =
        getDisplayName(record);


    const status =
        getStatus(record);


    const confidence =
        getConfidence(record);


    const identifier =
        getRecordIdentifier(record);


    container.innerHTML = `

        <!-- ==================================================
             HEADER
        =================================================== -->

        <div class="product-card">

            <div
                style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    gap:20px;
                    flex-wrap:wrap;
                "
            >

                <div>

                    <p
                        style="
                            margin:0 0 8px;
                            color:#64748b;
                            font-size:14px;
                        "
                    >
                        Record #${escapeHTML(
                            identifier
                        )}
                    </p>


                    <h1
                        style="
                            margin:0;
                        "
                    >
                        ${escapeHTML(name)}
                    </h1>

                </div>


                <div>

                    <span
                        class="status-badge ${getStatusClass(status)}"
                    >
                        ${escapeHTML(status)}
                    </span>

                </div>

            </div>

        </div>


        <!-- ==================================================
             DATA QUALITY
        =================================================== -->

        <div class="product-card">

            <h2>
                Data Quality
            </h2>


            <div
                style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    margin-top:20px;
                    margin-bottom:8px;
                "
            >

                <span>
                    Information Completeness
                </span>


                <strong>
                    ${confidence}%
                </strong>

            </div>


            <div
                style="
                    width:100%;
                    height:12px;
                    background:#e2e8f0;
                    border-radius:10px;
                    overflow:hidden;
                "
            >

                <div
                    style="
                        width:${confidence}%;
                        height:100%;
                        background:#2563eb;
                        border-radius:10px;
                    "
                ></div>

            </div>


            <p
                style="
                    color:#64748b;
                    font-size:14px;
                    margin-top:12px;
                    line-height:1.6;
                "
            >
                This score represents the completeness of the
                information available for this record.
            </p>

        </div>


        <!-- ==================================================
             ACTIONS
        =================================================== -->

        <div
            style="
                margin-top:25px;
                display:flex;
                gap:12px;
                flex-wrap:wrap;
            "
        >

            <a
                href="products.html"
                class="button"
            >
                ← Back to Records
            </a>


            <a
                href="validation.html"
                class="button"
            >
                🔍 Validate Record
            </a>

        </div>

    `;

}


// ============================================================
// ERROR
// ============================================================

function showError(
    message
) {

    if (!container) {
        return;
    }


    container.innerHTML = `

        <div class="product-card">

            <h2>
                Unable to load record
            </h2>


            <p
                style="
                    color:#dc2626;
                    margin-top:12px;
                "
            >
                ${escapeHTML(
                    message
                )}
            </p>


            <div
                style="
                    margin-top:20px;
                "
            >

                <a
                    href="products.html"
                    class="button"
                >
                    ← Back to Records
                </a>

            </div>

        </div>

    `;

}


// ============================================================
// START
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        loadProduct();

    }
);