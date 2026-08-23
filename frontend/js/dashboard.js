// ============================================================
// DASHBOARD.JS
// Dynamic Dataset Intelligence Dashboard
// Works with ANY dataset
// ============================================================

const API_BASE_URL =
    ((window.location.protocol === "file:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://127.0.0.1:8000" : "https://productintelligence-lzcn.onrender.com");


// ============================================================
// API REQUEST
// ============================================================

async function fetchAPI(
    endpoint
) {

    const response =
        await fetch(
            `${API_BASE_URL}${endpoint}`,
            {
                method: "GET",

                headers: {
                    "Accept":
                        "application/json"
                }
            }
        );


    if (!response.ok) {

        let message =
            `HTTP ${response.status}`;


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


    return await response.json();

}


// ============================================================
// SET TEXT
// ============================================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (!element) {
        return;
    }


    element.textContent =
        value;

}


// ============================================================
// SET MULTIPLE IDS
// ============================================================

function setMultiple(
    ids,
    value
) {

    ids.forEach(
        id => {

            const element =
                document.getElementById(id);


            if (element) {

                element.textContent =
                    value;

            }

        }
    );

}


// ============================================================
// FORMAT NUMBER
// ============================================================

function formatNumber(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "0";

    }


    const number =
        Number(value);


    if (
        Number.isNaN(number)
    ) {

        return String(value);

    }


    return number.toLocaleString();

}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


// ============================================================
// FORMAT FIELD NAME
// ============================================================

function formatFieldName(
    field
) {

    return String(field)

        .replace(
            /_/g,
            " "
        )

        .replace(
            /-/g,
            " "
        )

        .replace(
            /([a-z])([A-Z])/g,
            "$1 $2"
        )

        .replace(
            /\s+/g,
            " "
        )

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

function getRecordData(
    record
) {

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
// DISPLAY VALUE CHECK
// ============================================================

function hasDisplayValue(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return false;

    }


    const text =
        String(value).trim();


    return !(
        text === "" ||
        text.toLowerCase() === "null" ||
        text.toLowerCase() === "undefined" ||
        text.toLowerCase() === "n/a" ||
        text.toLowerCase() === "not available"
    );

}


// ============================================================
// DISPLAY NAME
// ============================================================

function getDisplayName(
    record
) {

    const data =
        getRecordData(record);


    const keys =
        Object.keys(data);


    if (
        keys.length === 0
    ) {

        return "Record";

    }


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


    // Any name field

    const nameKey =
        keys.find(
            key => {

                const normalized =
                    key
                        .toLowerCase()
                        .replace(
                            /[_-]/g,
                            " "
                        )
                        .trim();


                return (
                    normalized.includes("name") &&
                    hasDisplayValue(
                        data[key]
                    )
                );

            }
        );


    if (nameKey) {

        return String(
            data[nameKey]
        );

    }


    // First text field

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


    // First available field

    for (
        const key of keys
    ) {

        if (
            hasDisplayValue(
                data[key]
            )
        ) {

            return String(
                data[key]
            );

        }

    }


    return "Record";

}


// ============================================================
// RECORD CONFIDENCE
// ============================================================

function getRecordConfidence(
    record
) {

    if (
        record &&
        record.confidence !== undefined &&
        record.confidence !== null
    ) {

        let value =
            Number(
                record.confidence
            );


        if (
            value >= 0 &&
            value <= 1
        ) {

            value =
                value * 100;

        }


        return Math.max(
            0,
            Math.min(
                100,
                Math.round(value)
            )
        );

    }


    const data =
        getRecordData(record);


    const keys =
        Object.keys(data);


    if (
        keys.length === 0
    ) {

        return 0;

    }


    const populated =
        keys.filter(
            key =>
                hasDisplayValue(
                    data[key]
                )
        ).length;


    return Math.round(
        (
            populated /
            keys.length
        ) * 100
    );

}


// ============================================================
// RECORD STATUS
// ============================================================

function getRecordStatus(
    record
) {

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
        getRecordConfidence(record);


    if (
        confidence >= 85
    ) {

        return "Verified";

    }


    if (
        confidence >= 60
    ) {

        return "Needs Review";

    }


    return "Incomplete";

}


// ============================================================
// STATUS CLASS
// ============================================================

function statusClass(
    status
) {

    const value =
        String(status || "")
            .toLowerCase();


    if (
        value.includes("verified") ||
        value.includes("pass") ||
        value.includes("complete")
    ) {

        return "verified";

    }


    if (
        value.includes("critical") ||
        value.includes("incomplete") ||
        value.includes("fail")
    ) {

        return "critical";

    }


    return "review";

}


// ============================================================
// TOTAL ROWS
// ============================================================

function getTotalRows(
    data
) {

    return Number(
        data.total_rows ??
        data.total_records ??
        data.total_products ??
        data.rows_count ??
        (
            data.dataset &&
            data.dataset.rows_count
        ) ??
        0
    );

}


// ============================================================
// TOTAL COLUMNS
// ============================================================

function getTotalColumns(
    data
) {

    return Number(
        data.total_columns ??
        data.columns_count ??
        (
            data.dataset &&
            data.dataset.columns_count
        ) ??
        0
    );

}


// ============================================================
// UPDATE DATASET NAME
// ============================================================

function updateDatasetName(
    data
) {

    const dataset =
        data.dataset || {};


    const name =
        data.dataset_name ||
        data.datasetName ||
        data.filename ||
        data.file_name ||
        dataset.filename ||
        dataset.name ||
        "No dataset uploaded";


    setMultiple(
        [
            "datasetName",
            "currentDataset",
            "currentDatasetName",
            "dataset-name",
            "datasetPill"
        ],
        name
    );

}


// ============================================================
// UPDATE ROW COUNT
// ============================================================

function updateRowCount(
    data
) {

    const rows =
        getTotalRows(data);


    setMultiple(
        [
            "totalRows",
            "currentRows",
            "datasetRows",
            "rowsCount",
            "totalRecords",
            "recordCount"
        ],
        formatNumber(rows)
    );

}


// ============================================================
// UPDATE COLUMN COUNT
// ============================================================

function updateColumnCount(
    data
) {

    const columns =
        getTotalColumns(data);


    setMultiple(
        [
            "totalColumns",
            "currentColumns",
            "datasetColumns",
            "columnsCount"
        ],
        formatNumber(columns)
    );

}


// ============================================================
// VERIFIED
// ============================================================

function updateVerified(
    data
) {

    const value =
        Number(
            data.verified ??
            data.verified_products ??
            data.verified_records ??
            0
        );


    setMultiple(
        [
            "verified",
            "verifiedCount",
            "verifiedProducts",
            "verifiedRecords"
        ],
        formatNumber(value)
    );

}


// ============================================================
// NEEDS REVIEW
// ============================================================

function updateNeedsReview(
    data
) {

    const value =
        Number(
            data.needs_review ??
            data.needsReview ??
            data.review ??
            0
        );


    setMultiple(
        [
            "needsReview",
            "needsReviewCount",
            "reviewProducts"
        ],
        formatNumber(value)
    );

}


// ============================================================
// INCOMPLETE
// ============================================================

function updateIncomplete(
    data
) {

    const value =
        Number(
            data.incomplete ??
            data.incomplete_records ??
            0
        );


    setMultiple(
        [
            "incomplete",
            "incompleteCount"
        ],
        formatNumber(value)
    );

}


// ============================================================
// CRITICAL ISSUES
// ============================================================

function updateCriticalIssues(
    data
) {

    const value =
        Number(
            data.critical_issues ??
            data.criticalIssues ??
            0
        );


    setMultiple(
        [
            "criticalIssues",
            "criticalIssuesCount",
            "critical",
            "criticalCount"
        ],
        formatNumber(value)
    );

}


// ============================================================
// MISSING VALUES
// ============================================================

function updateMissingValues(
    data
) {

    const value =
        Number(
            data.missing_values ??
            data.missingValues ??
            data.missing_count ??
            0
        );


    setMultiple(
        [
            "missingValues",
            "missingCount"
        ],
        formatNumber(value)
    );

}


// ============================================================
// DUPLICATES
// ============================================================

function updateDuplicateRows(
    data
) {

    const value =
        Number(
            data.duplicate_rows ??
            data.duplicateRows ??
            data.duplicates ??
            data.duplicate_count ??
            0
        );


    setMultiple(
        [
            "duplicateRows",
            "duplicateCount"
        ],
        formatNumber(value)
    );

}


// ============================================================
// CONFIDENCE
// ============================================================

function updateConfidence(
    data
) {

    let value =
        Number(
            data.average_confidence ??
            data.averageConfidence ??
            data.confidence ??
            0
        );


    if (
        value >= 0 &&
        value <= 1
    ) {

        value =
            value * 100;

    }


    value =
        Math.max(
            0,
            Math.min(
                100,
                Math.round(value)
            )
        );


    setMultiple(
        [
            "averageConfidence",
            "avgConfidence",
            "confidenceScore",
            "confidencePercentage",
            "confidence",
            "heroScore"
        ],
        `${value}%`
    );

}


// ============================================================
// DATA QUALITY
// ============================================================

function calculateDataQuality(
    data
) {

    // --------------------------------------------------------
    // Prefer backend score
    // --------------------------------------------------------

    const qualityFields = [

        "data_quality",
        "data_quality_score",

        "average_quality",
        "average_quality_score",

        "quality_score",
        "quality_percentage",

        "dataQuality",
        "dataQualityScore"

    ];


    for (
        const field
        of qualityFields
    ) {

        if (
            data[field] !== undefined &&
            data[field] !== null &&
            data[field] !== ""
        ) {

            let value =
                Number(
                    data[field]
                );


            if (
                value >= 0 &&
                value <= 1
            ) {

                value =
                    value * 100;

            }


            return Math.max(
                0,
                Math.min(
                    100,
                    Math.round(value)
                )
            );

        }

    }


    // --------------------------------------------------------
    // Fallback to confidence
    // --------------------------------------------------------

    let confidence =
        Number(
            data.average_confidence ??
            data.averageConfidence ??
            0
        );


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
            Math.round(confidence)
        )
    );

}


// ============================================================
// UPDATE DATA QUALITY
// ============================================================

function updateDataQuality(
    data
) {

    const quality =
        calculateDataQuality(data);


    setMultiple(
        [
            "dataQuality",
            "dataQualityScore",
            "qualityScore",
            "averageQuality",
            "averageQualityScore",
            "data-quality",
            "data-quality-score",
            "qualityCircle",
            "heroScore"
        ],
        `${quality}%`
    );


    let title =
        "Excellent Data Quality";


    if (
        quality < 60
    ) {

        title =
            "Poor Data Quality";

    }
    else if (
        quality < 80
    ) {

        title =
            "Needs Improvement";

    }
    else if (
        quality < 90
    ) {

        title =
            "Good Data Quality";

    }


    setText(
        "qualityTitle",
        title
    );


    let description =
        "The dataset has good overall quality.";


    if (
        quality < 60
    ) {

        description =
            "The dataset contains several data quality issues that require attention.";

    }
    else if (
        quality < 80
    ) {

        description =
            "Some records contain missing, incomplete or inconsistent information.";

    }
    else if (
        quality < 90
    ) {

        description =
            "Most records are complete, with a few issues requiring review.";

    }


    setText(
        "qualityDescription",
        description
    );

}


// ============================================================
// PRODUCT / DATASET STATUS
// ============================================================

function updateProductStatus(
    data
) {

    const total =
        getTotalRows(data);


    const verified =
        Number(
            data.verified ??
            data.verified_products ??
            data.verified_records ??
            0
        );


    const review =
        Number(
            data.needs_review ??
            data.needsReview ??
            data.review ??
            0
        );


    const incomplete =
        Number(
            data.incomplete ??
            data.incomplete_records ??
            0
        );


    let status =
        "No Data";


    if (
        total > 0
    ) {

        if (
            verified === total &&
            review === 0 &&
            incomplete === 0
        ) {

            status =
                "Verified";

        }
        else if (
            review > 0
        ) {

            status =
                "Needs Review";

        }
        else if (
            incomplete > 0
        ) {

            status =
                "Incomplete";

        }
        else if (
            verified > 0
        ) {

            status =
                "Partially Verified";

        }
        else {

            status =
                "Needs Review";

        }

    }


    setMultiple(
        [
            "productStatus",
            "status",
            "datasetStatus",
            "currentStatus",
            "product-status",
            "dataset-status"
        ],
        status
    );


    // --------------------------------------------------------
    // Progress bars
    // --------------------------------------------------------

    if (
        total <= 0
    ) {

        return;

    }


    const verifiedPercent =
        Math.max(
            0,
            Math.min(
                100,
                Math.round(
                    (
                        verified /
                        total
                    ) * 100
                )
            )
        );


    const reviewPercent =
        Math.max(
            0,
            Math.min(
                100,
                Math.round(
                    (
                        review /
                        total
                    ) * 100
                )
            )
        );


    const verifiedBar =
        document.getElementById(
            "verifiedBar"
        );


    if (verifiedBar) {

        verifiedBar.style.width =
            `${verifiedPercent}%`;

    }


    const reviewBar =
        document.getElementById(
            "reviewBar"
        );


    if (reviewBar) {

        reviewBar.style.width =
            `${reviewPercent}%`;

    }


    setText(
        "verifiedPercent",
        `${verifiedPercent}%`
    );


    setText(
        "reviewPercent",
        `${reviewPercent}%`
    );

}


// ============================================================
// UPDATE DASHBOARD
// ============================================================

function updateDashboard(
    data
) {

    console.log(
        "Dashboard data:",
        data
    );


    updateDatasetName(data);

    updateRowCount(data);

    updateColumnCount(data);

    updateVerified(data);

    updateNeedsReview(data);

    updateIncomplete(data);

    updateCriticalIssues(data);

    updateMissingValues(data);

    updateDuplicateRows(data);

    updateConfidence(data);

    updateDataQuality(data);

    updateProductStatus(data);

}


// ============================================================
// RENDER RECENT RECORDS
// ============================================================

function renderRecentRecords(
    records
) {

    const container =
        document.getElementById(
            "recentProducts"
        );


    if (!container) {
        return;
    }


    if (
        !Array.isArray(records) ||
        records.length === 0
    ) {

        container.innerHTML = `

            <div class="recent-empty">

                <p>
                    No records found
                </p>

            </div>

        `;

        return;

    }


    const recent =
        records.slice(0, 5);


    container.innerHTML =
        recent

            .map(
                (
                    record,
                    index
                ) => {

                    const name =
                        getDisplayName(
                            record
                        );


                    const data =
                        getRecordData(
                            record
                        );


                    const confidence =
                        getRecordConfidence(
                            record
                        );


                    const status =
                        getRecordStatus(
                            record
                        );


                    const fields =
                        Object.entries(
                            data
                        )

                        .filter(
                            ([key, value]) =>
                                hasDisplayValue(
                                    value
                                )
                        )

                        .slice(0, 3);


                    const informationHTML =
                        fields.length > 0

                        ?

                        fields
                            .map(
                                ([key, value]) => `

                                    <div
                                        class="recent-field"
                                    >

                                        <span
                                            class="recent-field-label"
                                        >
                                            ${escapeHTML(
                                                formatFieldName(
                                                    key
                                                )
                                            )}
                                        </span>


                                        <span
                                            class="recent-field-value"
                                        >
                                            ${escapeHTML(
                                                value
                                            )}
                                        </span>

                                    </div>

                                `
                            )
                            .join("")

                        :

                        `

                            <span
                                class="recent-no-data"
                            >
                                No additional information
                            </span>

                        `;


                    return `

                        <div
                            class="recent-record-card"
                        >

                            <div
                                class="recent-record-number"
                            >
                                ${index + 1}
                            </div>


                            <div
                                class="recent-record-main"
                            >

                                <div
                                    class="recent-record-title"
                                >
                                    ${escapeHTML(
                                        name
                                    )}
                                </div>


                                <div
                                    class="recent-record-fields"
                                >
                                    ${informationHTML}
                                </div>

                            </div>


                            <div
                                class="recent-record-confidence"
                            >

                                <span>
                                    Confidence
                                </span>


                                <strong>
                                    ${confidence}%
                                </strong>

                            </div>


                            <div
                                class="recent-record-status"
                            >

                                <span
                                    class="status-badge ${statusClass(status)}"
                                >
                                    ${escapeHTML(
                                        status
                                    )}
                                </span>

                            </div>

                        </div>

                    `;

                }
            )

            .join("");

}


// ============================================================
// LOADING STATE
// ============================================================

function showLoadingState() {

    const container =
        document.getElementById(
            "recentProducts"
        );


    if (!container) {
        return;
    }


    container.innerHTML = `

        <div class="recent-empty">

            <p>
                Loading records...
            </p>

        </div>

    `;

}


// ============================================================
// ERROR STATE
// ============================================================

function showErrorState(
    error
) {

    const container =
        document.getElementById(
            "recentProducts"
        );


    if (!container) {
        return;
    }


    container.innerHTML = `

        <div class="recent-empty">

            <p>
                Unable to load records
            </p>


            <small>
                ${escapeHTML(
                    error?.message ||
                    "Unknown error"
                )}
            </small>

        </div>

    `;

}


// ============================================================
// LOAD DASHBOARD SUMMARY
// ============================================================

async function loadDashboardSummary() {

    const dashboard =
        await fetchAPI(
            "/dashboard"
        );


    console.log(
        "Dashboard summary:",
        dashboard
    );


    if (
        dashboard &&
        dashboard.success !== false
    ) {

        updateDashboard(
            dashboard
        );

    }


    return dashboard;

}


// ============================================================
// LOAD RECENT RECORDS
// ============================================================

async function loadRecentRecords() {

    const response =
        await fetchAPI(
            "/products"
        );


    console.log(
        "Products response:",
        response
    );


    let records = [];


    if (
        Array.isArray(response)
    ) {

        records =
            response;

    }
    else if (
        response &&
        Array.isArray(
            response.records
        )
    ) {

        records =
            response.records;

    }
    else if (
        response &&
        Array.isArray(
            response.products
        )
    ) {

        records =
            response.products;

    }
    else if (
        response &&
        Array.isArray(
            response.rows
        )
    ) {

        records =
            response.rows;

    }


    renderRecentRecords(
        records
    );


    return records;

}


// ============================================================
// LOAD DATASET INFORMATION
// ============================================================

async function loadDatasetInformation() {

    try {

        const dataset =
            await fetchAPI(
                "/dataset"
            );


        console.log(
            "Dataset information:",
            dataset
        );


        if (
            !dataset ||
            dataset.success === false
        ) {

            return;

        }


        const info =
            dataset.dataset ||
            dataset;


        const filename =
            info.filename ||
            info.file_name ||
            info.name;


        if (filename) {

            setMultiple(
                [
                    "datasetName",
                    "datasetPill",
                    "currentDataset",
                    "currentDatasetName",
                    "dataset-name"
                ],
                filename
            );

        }


        if (
            info.rows_count !== undefined
        ) {

            setMultiple(
                [
                    "totalRows",
                    "currentRows",
                    "datasetRows",
                    "rowsCount",
                    "totalRecords",
                    "recordCount"
                ],
                formatNumber(
                    info.rows_count
                )
            );

        }


        if (
            info.columns_count !== undefined
        ) {

            setMultiple(
                [
                    "totalColumns",
                    "currentColumns",
                    "datasetColumns",
                    "columnsCount"
                ],
                formatNumber(
                    info.columns_count
                )
            );

        }

    }
    catch (error) {

        console.warn(
            "Dataset information could not be loaded:",
            error
        );

    }

}


// ============================================================
// MAIN DASHBOARD
// ============================================================

async function loadDashboard() {

    showLoadingState();


    const results =
        await Promise.allSettled(
            [

                loadDashboardSummary(),

                loadRecentRecords(),

                loadDatasetInformation()

            ]
        );


    if (
        results[0].status ===
        "rejected"
    ) {

        console.error(
            "Dashboard summary failed:",
            results[0].reason
        );

    }


    if (
        results[1].status ===
        "rejected"
    ) {

        console.error(
            "Records failed:",
            results[1].reason
        );


        showErrorState(
            results[1].reason
        );

    }


    if (
        results[2].status ===
        "rejected"
    ) {

        console.warn(
            "Dataset information failed:",
            results[2].reason
        );

    }


    console.log(
        "Dashboard loading completed."
    );

}


// ============================================================
// START
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        loadDashboard();

    }
);