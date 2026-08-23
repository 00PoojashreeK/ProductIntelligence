const API = "https://productintelligence-lzcn.onrender.com";


// ============================================================
// SETTINGS
// ============================================================

// KEEP THIS FIXED AS REQUESTED
const PRODUCTS_PER_PAGE = 50;


// ============================================================
// GLOBAL DATA
// ============================================================

let reportData = null;

let products = [];

let currentPage = 1;

let totalPages = 1;

let currentProductIndex = -1;

let datasetColumns = [];


// ============================================================
// LOAD REPORT
// ============================================================

async function loadReport() {

    const individualReport =
        document.getElementById("individualReport");

    if (individualReport) {

        individualReport.classList.add(
            "report-hidden"
        );

        individualReport.style.display =
            "none";
    }


    const productGroups =
        document.getElementById(
            "productGroups"
        );


    try {

        if (!productGroups) {

            console.error(
                "productGroups element not found."
            );

            return;
        }


        productGroups.innerHTML = `
            <div class="empty-box">
                Loading report...
            </div>
        `;


        const response =
            await fetch(
                `${API}/report`
            );


        if (!response.ok) {

            throw new Error(
                `Backend returned ${response.status}`
            );
        }


        const data =
            await response.json();


        console.log(
            "Dynamic report data:",
            data
        );


        if (
            !data ||
            !data.success ||
            !data.dataset
        ) {

            showNoDataset();

            return;
        }


        reportData = data;


        products =
            Array.isArray(data.products)
                ? data.products
                : [];


        // ====================================================
        // DETECT DATASET COLUMNS
        // ====================================================

        datasetColumns =
            detectDatasetColumns(
                data,
                products
            );


        // ====================================================
        // DATASET INFORMATION
        // ====================================================

        renderDatasetInformation(
            data
        );


        // ====================================================
        // STATISTICS
        // ====================================================

        renderStatistics(
            data,
            products
        );


        // ====================================================
        // CONFIDENCE
        // ====================================================

        const averageConfidence =
            calculateAverageConfidence(
                data,
                products
            );


        setAverageConfidence(
            averageConfidence
        );


        // ====================================================
        // DYNAMIC SUMMARY
        // ====================================================

        generateDynamicInsights(
            data,
            products,
            datasetColumns,
            averageConfidence
        );


        // ====================================================
        // PAGINATION
        // ====================================================

        totalPages =
            Math.ceil(
                products.length /
                PRODUCTS_PER_PAGE
            );


        if (
            totalPages === 0
        ) {

            totalPages = 1;
        }


        currentPage = 1;


        // ====================================================
        // BUILD PRODUCT PAGE
        // ====================================================

        buildProductPage();

    }


    catch (error) {

        console.error(
            "Report loading error:",
            error
        );


        if (productGroups) {

            productGroups.innerHTML = `

                <div class="empty-box">

                    <h2>
                        Unable to Load Reports
                    </h2>

                    <p>
                        ${escapeHTML(
                            error.message
                        )}
                    </p>

                    <button
                        class="button"
                        onclick="loadReport()"
                    >
                        Try Again
                    </button>

                </div>

            `;
        }
    }
}


// ============================================================
// DETECT DATASET COLUMNS
// ============================================================

function detectDatasetColumns(
    data,
    productList
) {

    const columns = [];


    // --------------------------------------------------------
    // Backend dataset columns
    // --------------------------------------------------------

    if (
        data &&
        data.dataset &&
        Array.isArray(
            data.dataset.columns
        )
    ) {

        columns.push(
            ...data.dataset.columns
        );
    }


    // --------------------------------------------------------
    // If backend gives numeric column count,
    // detect columns from actual product records.
    // --------------------------------------------------------

    if (
        productList.length > 0
    ) {

        productList.forEach(
            product => {

                if (
                    product &&
                    typeof product === "object"
                ) {

                    Object.keys(
                        product
                    ).forEach(
                        key => {

                            if (
                                !columns.includes(
                                    key
                                )
                            ) {

                                columns.push(
                                    key
                                );
                            }

                        }
                    );
                }

            }
        );
    }


    // --------------------------------------------------------
    // Remove internal fields if they are not dataset fields
    // --------------------------------------------------------

    const ignoredFields = [
        "raw_data"
    ];


    return columns.filter(
        column =>
            !ignoredFields.includes(
                column
            )
    );
}


// ============================================================
// DATASET INFORMATION
// ============================================================

function renderDatasetInformation(
    data
) {

    const dataset =
        data.dataset || {};


    const filename =
        getFirstAvailableValue(
            dataset,
            [
                "filename",
                "file_name",
                "name",
                "dataset_name"
            ]
        );


    const datasetName =
        filename ||
        "Uploaded Dataset";


    // --------------------------------------------------------
    // Main dataset name
    // --------------------------------------------------------

    const datasetNameElement =
        document.getElementById(
            "datasetName"
        );


    if (datasetNameElement) {

        datasetNameElement.innerText =
            datasetName;
    }


    const datasetNameCard =
        document.getElementById(
            "datasetNameCard"
        );


    if (datasetNameCard) {

        datasetNameCard.innerText =
            datasetName;
    }


    // --------------------------------------------------------
    // Overview title
    // --------------------------------------------------------

    const overviewTitle =
        document.getElementById(
            "overviewTitle"
        );


    if (overviewTitle) {

        overviewTitle.innerText =
            "Dataset Intelligence Overview";
    }


    // --------------------------------------------------------
    // Header description
    // --------------------------------------------------------

    const reportDescription =
        document.getElementById(
            "reportDescription"
        );


    if (reportDescription) {

        reportDescription.innerText =
            `Intelligence generated from ${datasetName}.`;
    }


    // --------------------------------------------------------
    // Hero description
    // --------------------------------------------------------

    const heroDescription =
        document.getElementById(
            "heroDescription"
        );


    if (heroDescription) {

        heroDescription.innerText =
            buildDatasetDescription(
                data,
                products
            );
    }


    // --------------------------------------------------------
    // Uploaded date
    // --------------------------------------------------------

    const uploadedAt =
        document.getElementById(
            "uploadedAt"
        );


    if (uploadedAt) {

        const date =
            getFirstAvailableValue(
                dataset,
                [
                    "uploaded_at",
                    "upload_date",
                    "created_at",
                    "createdAt",
                    "timestamp"
                ]
            );


        uploadedAt.innerText =
            formatDate(
                date
            );
    }


    // --------------------------------------------------------
    // Dataset status
    // --------------------------------------------------------

    const status =
        getDatasetStatus(
            data
        );


    const datasetStatus =
        document.getElementById(
            "datasetStatus"
        );


    if (datasetStatus) {

        datasetStatus.innerText =
            status;

        datasetStatus.className =
            "status-badge";

        const normalized =
            String(status)
                .toLowerCase();


        if (
            normalized.includes(
                "ready"
            ) ||
            normalized.includes(
                "complete"
            ) ||
            normalized.includes(
                "success"
            )
        ) {

            datasetStatus.classList.add(
                "status-verified"
            );

        }

        else if (
            normalized.includes(
                "review"
            ) ||
            normalized.includes(
                "warning"
            )
        ) {

            datasetStatus.classList.add(
                "status-review"
            );

        }

        else {

            datasetStatus.classList.add(
                "status-critical"
            );
        }
    }


    const datasetStatusText =
        document.getElementById(
            "datasetStatusText"
        );


    if (datasetStatusText) {

        datasetStatusText.innerText =
            status;
    }


    // --------------------------------------------------------
    // Dynamic columns
    // --------------------------------------------------------

    const columnsElement =
        document.getElementById(
            "datasetColumnsList"
        );


    if (columnsElement) {

        if (
            datasetColumns.length > 0
        ) {

            columnsElement.innerText =
                datasetColumns
                    .map(
                        column =>
                            formatFieldName(
                                column
                            )
                    )
                    .join(
                        ", "
                    );

        }

        else {

            columnsElement.innerText =
                "No column information available";
        }
    }
}


// ============================================================
// DATASET DESCRIPTION
// ============================================================

function buildDatasetDescription(
    data,
    productList
) {

    const total =
        productList.length;


    const columns =
        datasetColumns.length;


    if (
        total === 0
    ) {

        return "The uploaded dataset does not currently contain product records.";
    }


    if (
        columns === 0
    ) {

        return `The uploaded dataset contains ${total} product records.`;
    }


    return `The uploaded dataset contains ${total} product records across ${columns} detected fields. The report below is generated directly from the available dataset information.`;
}


// ============================================================
// STATISTICS
// ============================================================

function renderStatistics(
    data,
    productList
) {

    const total =
        productList.length;


    const totalProducts =
        document.getElementById(
            "totalProducts"
        );


    if (totalProducts) {

        totalProducts.innerText =
            total;
    }


    const totalColumns =
        document.getElementById(
            "totalColumns"
        );


    if (totalColumns) {

        let count =
            datasetColumns.length;


        // If actual backend column count is larger
        // and column names are not supplied

        if (
            count === 0 &&
            data.dataset &&
            typeof data.dataset.columns === "number"
        ) {

            count =
                data.dataset.columns;
        }


        totalColumns.innerText =
            count;
    }


    const verified =
        productList.filter(
            product =>
                isVerifiedProduct(
                    product
                )
        ).length;


    const needsReview =
        Math.max(
            0,
            total - verified
        );


    const verifiedElement =
        document.getElementById(
            "verifiedProducts"
        );


    if (verifiedElement) {

        verifiedElement.innerText =
            verified;
    }


    const reviewElement =
        document.getElementById(
            "needsReview"
        );


    if (reviewElement) {

        reviewElement.innerText =
            needsReview;
    }
}


// ============================================================
// VERIFIED PRODUCT DETECTION
// ============================================================

function isVerifiedProduct(
    product
) {

    if (
        !product ||
        typeof product !== "object"
    ) {

        return false;
    }


    const status =
        getFirstAvailableValue(
            product,
            [
                "status",
                "validation_status",
                "validationStatus"
            ]
        );


    if (
        status !== null &&
        status !== undefined
    ) {

        const normalized =
            String(status)
                .trim()
                .toLowerCase();


        if (
            normalized === "verified" ||
            normalized === "pass" ||
            normalized === "passed" ||
            normalized === "valid" ||
            normalized === "success"
        ) {

            return true;
        }


        return false;
    }


    const confidence =
        getProductConfidence(
            product
        );


    if (
        !isNaN(confidence)
    ) {

        return confidence >= 80;
    }


    return false;
}


// ============================================================
// DYNAMIC INSIGHTS
// ============================================================

function generateDynamicInsights(
    data,
    productList,
    columns,
    averageConfidence
) {

    const container =
        document.getElementById(
            "dynamicInsights"
        );


    if (!container) {

        return;
    }


    container.innerHTML =
        "";


    if (
        productList.length === 0
    ) {

        container.innerHTML = `

            <div class="insight-item">

                <span class="insight-dot warning-dot"></span>

                <div>

                    <strong>
                        No product records
                    </strong>

                    <p>
                        The uploaded dataset does not contain
                        product records available for analysis.
                    </p>

                </div>

            </div>

        `;

        return;
    }


    const verified =
        productList.filter(
            isVerifiedProduct
        ).length;


    const review =
        productList.length -
        verified;


    const completeness =
        calculateDatasetCompleteness(
            productList,
            columns
        );


    const insights = [];


    // --------------------------------------------------------
    // Dataset size
    // --------------------------------------------------------

    insights.push({

        type:
            "success",

        title:
            "Dataset Coverage",

        message:
            `${productList.length} product records were detected in the uploaded dataset${columns.length ? ` across ${columns.length} fields` : ""}.`

    });


    // --------------------------------------------------------
    // Validation
    // --------------------------------------------------------

    if (
        verified > 0
    ) {

        insights.push({

            type:
                "success",

            title:
                "Validation Coverage",

            message:
                `${verified} of ${productList.length} product records are currently marked as verified.`

        });

    }


    if (
        review > 0
    ) {

        insights.push({

            type:
                "warning",

            title:
                "Review Queue",

            message:
                `${review} product record${review === 1 ? "" : "s"} require${review === 1 ? "s" : ""} additional review based on the available validation information.`

        });

    }


    // --------------------------------------------------------
    // Confidence
    // --------------------------------------------------------

    insights.push({

        type:
            getConfidenceInsightType(
                averageConfidence
            ),

        title:
            "Average Confidence",

        message:
            `The average confidence across records with available confidence information is ${formatPercentage(averageConfidence)}.`

    });


    // --------------------------------------------------------
    // Completeness
    // --------------------------------------------------------

    if (
        columns.length > 0
    ) {

        insights.push({

            type:
                getCompletenessType(
                    completeness
                ),

            title:
                "Dataset Completeness",

            message:
                `${formatPercentage(completeness)} of the detected dataset fields contain values across the available product records.`

        });
    }


    // --------------------------------------------------------
    // Render
    // --------------------------------------------------------

    insights.forEach(
        insight => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "insight-item";


            const dot =
                document.createElement(
                    "span"
                );


            dot.className =
                "insight-dot " +
                getInsightDotClass(
                    insight.type
                );


            const content =
                document.createElement(
                    "div"
                );


            const title =
                document.createElement(
                    "strong"
                );


            title.innerText =
                insight.title;


            const message =
                document.createElement(
                    "p"
                );


            message.innerText =
                insight.message;


            content.appendChild(
                title
            );

            content.appendChild(
                message
            );


            item.appendChild(
                dot
            );

            item.appendChild(
                content
            );


            container.appendChild(
                item
            );

        }
    );
}


// ============================================================
// DATASET COMPLETENESS
// ============================================================

function calculateDatasetCompleteness(
    productList,
    columns
) {

    if (
        !productList.length ||
        !columns.length
    ) {

        return 0;
    }


    let available =
        0;


    let possible =
        productList.length *
        columns.length;


    productList.forEach(
        product => {

            columns.forEach(
                column => {

                    const value =
                        getNestedProductValue(
                            product,
                            column
                        );


                    if (
                        hasUsableValue(
                            value
                        )
                    ) {

                        available++;
                    }

                }
            );

        }
    );


    if (
        possible === 0
    ) {

        return 0;
    }


    return (
        available /
        possible
    ) *
    100;
}


// ============================================================
// CALCULATE AVERAGE CONFIDENCE
// ============================================================

function calculateAverageConfidence(
    data,
    productList
) {

    if (
        data &&
        data.summary &&
        data.summary.average_confidence !==
            undefined &&
        data.summary.average_confidence !==
            null
    ) {

        const backendValue =
            parseConfidence(
                data.summary.average_confidence
            );


        if (
            !isNaN(backendValue)
        ) {

            return normalizePercentage(
                backendValue
            );
        }
    }


    const confidenceValues = [];


    productList.forEach(
        product => {

            const confidence =
                getProductConfidence(
                    product
                );


            if (
                !isNaN(confidence)
            ) {

                confidenceValues.push(
                    normalizePercentage(
                        confidence
                    )
                );
            }

        }
    );


    if (
        confidenceValues.length === 0
    ) {

        return 0;
    }


    const total =
        confidenceValues.reduce(
            (
                sum,
                value
            ) =>
                sum + value,
            0
        );


    return (
        total /
        confidenceValues.length
    );
}


// ============================================================
// GET PRODUCT CONFIDENCE
// ============================================================

function getProductConfidence(
    product
) {

    if (
        !product ||
        typeof product !== "object"
    ) {

        return NaN;
    }


    const possibleKeys = [

        "confidence",

        "confidence_score",

        "confidenceScore",

        "score",

        "quality_score",

        "qualityScore",

        "validation_score",

        "validationScore"

    ];


    for (
        const key of possibleKeys
    ) {

        if (
            product[key] !== undefined &&
            product[key] !== null
        ) {

            const value =
                parseConfidence(
                    product[key]
                );


            if (
                !isNaN(value)
            ) {

                return value;
            }
        }
    }


    // --------------------------------------------------------
    // Check raw_data too
    // --------------------------------------------------------

    if (
        product.raw_data &&
        typeof product.raw_data === "object"
    ) {

        for (
            const key of possibleKeys
        ) {

            if (
                product.raw_data[key] !==
                    undefined &&
                product.raw_data[key] !==
                    null
            ) {

                const value =
                    parseConfidence(
                        product.raw_data[key]
                    );


                if (
                    !isNaN(value)
                ) {

                    return value;
                }
            }
        }
    }


    return NaN;
}


// ============================================================
// PARSE CONFIDENCE
// ============================================================

function parseConfidence(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return NaN;
    }


    if (
        typeof value === "number"
    ) {

        return value;
    }


    const cleaned =
        String(value)
            .replace(
                "%",
                ""
            )
            .trim();


    const number =
        parseFloat(
            cleaned
        );


    return number;
}


// ============================================================
// NORMALIZE PERCENTAGE
// ============================================================

function normalizePercentage(
    value
) {

    let number =
        parseFloat(
            value
        );


    if (
        isNaN(number)
    ) {

        return 0;
    }


    // If backend sends 0-1 instead of 0-100

    if (
        number >= 0 &&
        number <= 1
    ) {

        number *= 100;
    }


    return Math.max(
        0,
        Math.min(
            100,
            number
        )
    );
}


// ============================================================
// SET AVERAGE CONFIDENCE
// ============================================================

function setAverageConfidence(
    value
) {

    const element =
        document.getElementById(
            "averageConfidence"
        );


    if (!element) {

        return;
    }


    const confidence =
        normalizePercentage(
            value
        );


    const displayConfidence =
        Number.isInteger(
            confidence
        )
            ? confidence
            : confidence.toFixed(1);


    element.textContent =
        `${displayConfidence}%`;


    // Keep your visibility fix

    element.style.display =
        "block";

    element.style.visibility =
        "visible";

    element.style.opacity =
        "1";

    element.style.color =
        "#111827";

    element.style.fontSize =
        "2.2rem";

    element.style.fontWeight =
        "800";

    element.style.lineHeight =
        "1.2";

    element.style.position =
        "relative";

    element.style.zIndex =
        "10";

    element.style.textAlign =
        "center";


    const reportScore =
        element.closest(
            ".report-score"
        );


    if (reportScore) {

        reportScore.style.visibility =
            "visible";

        reportScore.style.opacity =
            "1";

        reportScore.style.position =
            "relative";

        reportScore.style.zIndex =
            "5";
    }
}


// ============================================================
// BUILD PRODUCT PAGE
// ============================================================

function buildProductPage() {

    const container =
        document.getElementById(
            "productGroups"
        );


    if (!container) {

        return;
    }


    container.innerHTML =
        "";


    if (
        products.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-box">

                <h2>
                    No Products Available
                </h2>

                <p>
                    No product records were found
                    in the uploaded dataset.
                </p>

            </div>

        `;

        return;
    }


    const startIndex =
        (
            currentPage - 1
        ) *
        PRODUCTS_PER_PAGE;


    const endIndex =
        Math.min(
            startIndex +
            PRODUCTS_PER_PAGE,
            products.length
        );


    const pageProducts =
        products.slice(
            startIndex,
            endIndex
        );


    const group =
        document.createElement(
            "section"
        );


    group.className =
        "products-report-card";


    group.innerHTML = `

        <div class="report-card-title">

            <div>

                <span class="section-eyebrow">
                    PRODUCT REPORTS
                </span>

                <h2>
                    Product Reports
                </h2>

                <p>
                    Showing
                    ${startIndex + 1}–${endIndex}
                    of
                    ${products.length}
                    products
                </p>

            </div>


            <div class="report-page-indicator">

                Page
                ${currentPage}
                of
                ${totalPages}

            </div>

        </div>


        <div
            class="product-list"
            id="productList"
        ></div>


        <div class="page-navigation">

            <button
                id="previousPage"
                class="button secondary-button"
                onclick="previousPage()"
            >
                ← Previous
            </button>


            <span id="pageNumber">

                Page
                ${currentPage}
                of
                ${totalPages}

            </span>


            <button
                id="nextPage"
                class="button"
                onclick="nextPage()"
            >
                Next →

            </button>

        </div>

    `;


    container.appendChild(
        group
    );


    const list =
        document.getElementById(
            "productList"
        );


    pageProducts.forEach(
        (
            product,
            localIndex
        ) => {

            const actualIndex =
                startIndex +
                localIndex;


            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "product-report-button";


            button.onclick =
                function() {

                    showProductReport(
                        actualIndex
                    );

                };


            const productName =
                getProductName(
                    product,
                    actualIndex
                );


            const confidence =
                getProductConfidence(
                    product
                );


            const status =
                getProductStatus(
                    product
                );


            button.innerHTML = `

                <div class="product-number">

                    Product
                    ${actualIndex + 1}

                </div>


                <div class="product-name">

                    ${escapeHTML(
                        productName
                    )}

                </div>


                <div class="product-report-meta">

                    <span>
                        ${escapeHTML(
                            status
                        )}
                    </span>

                    <span>
                        ${
                            isNaN(confidence)
                                ? "—"
                                : `${formatPercentage(confidence)}`
                        }
                    </span>

                </div>

            `;


            list.appendChild(
                button
            );

        }
    );


    const previousButton =
        document.getElementById(
            "previousPage"
        );


    const nextButton =
        document.getElementById(
            "nextPage"
        );


    if (previousButton) {

        previousButton.disabled =
            currentPage === 1;
    }


    if (nextButton) {

        nextButton.disabled =
            currentPage === totalPages;
    }
}


// ============================================================
// NEXT PAGE
// ============================================================

function nextPage() {

    if (
        currentPage >=
        totalPages
    ) {

        return;
    }


    currentPage++;


    buildProductPage();


    const productGroups =
        document.getElementById(
            "productGroups"
        );


    if (productGroups) {

        productGroups.scrollIntoView({

            behavior:
                "smooth",

            block:
                "start"

        });
    }
}


// ============================================================
// PREVIOUS PAGE
// ============================================================

function previousPage() {

    if (
        currentPage <= 1
    ) {

        return;
    }


    currentPage--;


    buildProductPage();


    const productGroups =
        document.getElementById(
            "productGroups"
        );


    if (productGroups) {

        productGroups.scrollIntoView({

            behavior:
                "smooth",

            block:
                "start"

        });
    }
}


// ============================================================
// GET PRODUCT NAME DYNAMICALLY
// ============================================================

function getProductName(
    product,
    index
) {

    if (
        !product ||
        typeof product !== "object"
    ) {

        return `Product ${index + 1}`;
    }


    const preferredKeys = [

        "name",

        "product_name",

        "productName",

        "title",

        "product",

        "item_name",

        "itemName",

        "description"

    ];


    for (
        const key of preferredKeys
    ) {

        const value =
            product[key];


        if (
            hasUsableValue(
                value
            )
        ) {

            return String(
                value
            );
        }
    }


    // --------------------------------------------------------
    // Search raw_data
    // --------------------------------------------------------

    if (
        product.raw_data &&
        typeof product.raw_data === "object"
    ) {

        for (
            const key of preferredKeys
        ) {

            const value =
                product.raw_data[key];


            if (
                hasUsableValue(
                    value
                )
            ) {

                return String(
                    value
                );
            }
        }
    }


    return `Product ${index + 1}`;
}


// ============================================================
// SHOW INDIVIDUAL REPORT
// ============================================================

function showProductReport(
    index
) {

    if (
        index < 0 ||
        index >= products.length
    ) {

        return;
    }


    currentProductIndex =
        index;


    const product =
        products[index];


    const report =
        document.getElementById(
            "individualReport"
        );


    if (!report) {

        return;
    }


    report.classList.remove(
        "report-hidden"
    );


    report.style.display =
        "block";

    report.style.visibility =
        "visible";

    report.style.opacity =
        "1";


    const name =
        getProductName(
            product,
            index
        );


    const nameElement =
        document.getElementById(
            "individualProductName"
        );


    if (nameElement) {

        nameElement.innerText =
            name;
    }


    const description =
        document.getElementById(
            "individualDescription"
        );


    if (description) {

        description.innerText =
            `Detailed analysis generated from the available fields for ${name}.`;
    }


    const confidence =
        getProductConfidence(
            product
        );


    const finalConfidence =
        isNaN(confidence)
            ? 0
            : normalizePercentage(
                confidence
            );


    const score =
        document.getElementById(
            "individualScore"
        );


    if (score) {

        score.innerText =
            formatPercentage(
                finalConfidence
            );


        score.className =
            "";


        score.classList.add(
            "score-box"
        );


        if (
            finalConfidence >= 80
        ) {

            score.classList.add(
                "score-good"
            );

        }

        else if (
            finalConfidence >= 50
        ) {

            score.classList.add(
                "score-medium"
            );

        }

        else {

            score.classList.add(
                "score-low"
            );
        }
    }


    buildProductInformation(
        product
    );


    buildProductSummary(
        product
    );


    updateProductNavigation();


    const top =
        report.getBoundingClientRect().top +
        window.pageYOffset -
        24;


    window.scrollTo({

        top:
            top,

        behavior:
            "smooth"

    });
}


// ============================================================
// BUILD PRODUCT INFORMATION DYNAMICALLY
// ============================================================

function buildProductInformation(
    product
) {

    const table =
        document.getElementById(
            "productReportTable"
        );


    if (!table) {

        return;
    }


    table.innerHTML =
        "";


    if (
        !product ||
        typeof product !== "object"
    ) {

        table.innerHTML =
            "<p>No product information available.</p>";

        return;
    }


    // --------------------------------------------------------
    // Use raw_data if available
    // because it represents the original uploaded dataset.
    // --------------------------------------------------------

    let source =
        product;


    if (
        product.raw_data &&
        typeof product.raw_data === "object" &&
        Object.keys(
            product.raw_data
        ).length > 0
    ) {

        source =
            product.raw_data;
    }


    const entries =
        Object.entries(
            source
        );


    if (
        entries.length === 0
    ) {

        table.innerHTML =
            "<p>No product information available.</p>";

        return;
    }


    entries.forEach(
        (
            [key, value]
        ) => {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "product-info-row";


            const label =
                document.createElement(
                    "span"
                );


            label.className =
                "product-info-label";


            label.innerText =
                formatFieldName(
                    key
                );


            const valueElement =
                document.createElement(
                    "strong"
                );


            valueElement.className =
                "product-info-value";


            valueElement.innerText =
                displayValue(
                    value
                );


            row.appendChild(
                label
            );


            row.appendChild(
                valueElement
            );


            table.appendChild(
                row
            );

        }
    );
}


// ============================================================
// DYNAMIC PRODUCT SUMMARY
// ============================================================

function buildProductSummary(
    product
) {

    const summary =
        document.getElementById(
            "productSummary"
        );


    if (!summary) {

        return;
    }


    if (
        !product ||
        typeof product !== "object"
    ) {

        summary.innerHTML =
            "<p>No product information is available.</p>";

        return;
    }


    let source =
        product;


    if (
        product.raw_data &&
        typeof product.raw_data === "object" &&
        Object.keys(
            product.raw_data
        ).length > 0
    ) {

        source =
            product.raw_data;
    }


    const fields =
        Object.keys(
            source
        );


    const totalFields =
        fields.length;


    const availableFields =
        fields.filter(
            field =>
                hasUsableValue(
                    source[field]
                )
        ).length;


    const missingFields =
        totalFields -
        availableFields;


    const completeness =
        totalFields > 0
            ? (
                availableFields /
                totalFields
            ) * 100
            : 0;


    const confidence =
        getProductConfidence(
            product
        );


    const status =
        getProductStatus(
            product
        );


    const productName =
        getProductName(
            product,
            currentProductIndex
        );


    const summaryItems = [];


    summaryItems.push({

        title:
            "Record Status",

        text:
            `${productName} is currently marked as ${status}.`

    });


    if (
        !isNaN(confidence)
    ) {

        summaryItems.push({

            title:
                "Confidence",

            text:
                `The available confidence score for this record is ${formatPercentage(confidence)}.`

        });

    }


    summaryItems.push({

        title:
            "Field Completeness",

        text:
            `${formatPercentage(completeness)} of the detected fields contain usable values.`

    });


    if (
        missingFields > 0
    ) {

        summaryItems.push({

            title:
                "Missing Information",

            text:
                `${missingFields} of ${totalFields} detected fields do not currently contain usable values.`

        });

    }

    else {

        summaryItems.push({

            title:
                "Data Availability",

            text:
                `All ${totalFields} detected fields contain usable values for this record.`

        });

    }


    summaryItems.push({

        title:
            "Detected Fields",

        text:
            `${totalFields} dataset fields are available for this product record.`

    });


    summary.innerHTML =
        "";


    summaryItems.forEach(
        item => {

            const paragraph =
                document.createElement(
                    "p"
                );


            const strong =
                document.createElement(
                    "strong"
                );


            strong.innerText =
                `${item.title}: `;


            paragraph.appendChild(
                strong
            );


            paragraph.appendChild(
                document.createTextNode(
                    item.text
                )
            );


            summary.appendChild(
                paragraph
            );

        }
    );
}


// ============================================================
// PRODUCT STATUS
// ============================================================

function getProductStatus(
    product
) {

    if (
        !product ||
        typeof product !== "object"
    ) {

        return "Not Available";
    }


    const value =
        getFirstAvailableValue(
            product,
            [
                "status",
                "validation_status",
                "validationStatus",
                "result"
            ]
        );


    if (
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
    ) {

        return String(
            value
        );
    }


    const confidence =
        getProductConfidence(
            product
        );


    if (
        !isNaN(confidence)
    ) {

        const normalized =
            normalizePercentage(
                confidence
            );


        if (
            normalized >= 80
        ) {

            return "Verified";
        }


        if (
            normalized >= 50
        ) {

            return "Needs Review";
        }


        return "Critical";
    }


    return "Not Available";
}


// ============================================================
// INDIVIDUAL PRODUCT PREVIOUS
// ============================================================

function showPreviousProduct() {

    if (
        currentProductIndex <= 0
    ) {

        return;
    }


    showProductReport(
        currentProductIndex - 1
    );
}


// ============================================================
// INDIVIDUAL PRODUCT NEXT
// ============================================================

function showNextProduct() {

    if (
        currentProductIndex >=
        products.length - 1
    ) {

        return;
    }


    showProductReport(
        currentProductIndex + 1
    );
}


// ============================================================
// UPDATE PRODUCT NAVIGATION
// ============================================================

function updateProductNavigation() {

    const previous =
        document.getElementById(
            "previousProduct"
        );


    const next =
        document.getElementById(
            "nextProduct"
        );


    const position =
        document.getElementById(
            "individualProductPosition"
        );


    if (previous) {

        previous.disabled =
            currentProductIndex <= 0;
    }


    if (next) {

        next.disabled =
            currentProductIndex >=
            products.length - 1;
    }


    if (position) {

        position.innerText =
            `Product ${
                currentProductIndex + 1
            } of ${
                products.length
            }`;
    }
}


// ============================================================
// DISPLAY VALUE
// ============================================================

function displayValue(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "Not Available";
    }


    if (
        typeof value === "object"
    ) {

        try {

            return JSON.stringify(
                value
            );

        }
        catch {

            return "Not Available";
        }
    }


    const text =
        String(value)
            .trim();


    if (
        text === "" ||
        text.toLowerCase() ===
            "not available" ||
        text.toLowerCase() ===
            "nan" ||
        text.toLowerCase() ===
            "null"
    ) {

        return "Not Available";
    }


    return text;
}


// ============================================================
// GET NESTED VALUE
// ============================================================

function getNestedProductValue(
    product,
    key
) {

    if (
        product &&
        Object.prototype.hasOwnProperty.call(
            product,
            key
        )
    ) {

        return product[key];
    }


    if (
        product &&
        product.raw_data &&
        typeof product.raw_data === "object" &&
        Object.prototype.hasOwnProperty.call(
            product.raw_data,
            key
        )
    ) {

        return product.raw_data[key];
    }


    return undefined;
}


// ============================================================
// GET FIRST AVAILABLE VALUE
// ============================================================

function getFirstAvailableValue(
    object,
    keys
) {

    if (
        !object ||
        typeof object !== "object"
    ) {

        return null;
    }


    for (
        const key of keys
    ) {

        if (
            object[key] !== undefined &&
            object[key] !== null &&
            String(
                object[key]
            ).trim() !== ""
        ) {

            return object[key];
        }
    }


    return null;
}


// ============================================================
// GET DATASET STATUS
// ============================================================

function getDatasetStatus(
    data
) {

    if (
        data &&
        data.dataset
    ) {

        const explicitStatus =
            getFirstAvailableValue(
                data.dataset,
                [
                    "status",
                    "dataset_status",
                    "state"
                ]
            );


        if (
            explicitStatus
        ) {

            return String(
                explicitStatus
            );
        }
    }


    if (
        data &&
        data.status
    ) {

        return String(
            data.status
        );
    }


    if (
        products.length > 0
    ) {

        return "Ready";
    }


    return "No Data";
}


// ============================================================
// FORMAT FIELD NAME
// ============================================================

function formatFieldName(
    field
) {

    if (
        field === null ||
        field === undefined
    ) {

        return "";
    }


    return String(field)

        .replace(
            /[_-]+/g,
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
            /^./,
            character =>
                character.toUpperCase()
        );
}


// ============================================================
// FORMAT DATE
// ============================================================

function formatDate(
    value
) {

    if (
        !value
    ) {

        return "Not Available";
    }


    const date =
        new Date(
            value
        );


    if (
        isNaN(
            date.getTime()
        )
    ) {

        return String(
            value
        );
    }


    return date.toLocaleString();
}


// ============================================================
// FORMAT PERCENTAGE
// ============================================================

function formatPercentage(
    value
) {

    if (
        value === null ||
        value === undefined ||
        isNaN(
            parseFloat(value)
        )
    ) {

        return "Not Available";
    }


    const number =
        normalizePercentage(
            value
        );


    return Number.isInteger(
        number
    )
        ? `${number}%`
        : `${number.toFixed(1)}%`;
}


// ============================================================
// CONFIDENCE INSIGHT TYPE
// ============================================================

function getConfidenceInsightType(
    confidence
) {

    if (
        confidence >= 80
    ) {

        return "success";
    }


    if (
        confidence >= 50
    ) {

        return "warning";
    }


    return "critical";
}


// ============================================================
// COMPLETENESS INSIGHT TYPE
// ============================================================

function getCompletenessType(
    completeness
) {

    if (
        completeness >= 80
    ) {

        return "success";
    }


    if (
        completeness >= 50
    ) {

        return "warning";
    }


    return "critical";
}


// ============================================================
// INSIGHT DOT CLASS
// ============================================================

function getInsightDotClass(
    type
) {

    if (
        type === "success"
    ) {

        return "success-dot";
    }


    if (
        type === "warning"
    ) {

        return "warning-dot";
    }


    return "info-dot";
}


// ============================================================
// HAS USABLE VALUE
// ============================================================

function hasUsableValue(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return false;
    }


    if (
        typeof value === "number" &&
        isNaN(value)
    ) {

        return false;
    }


    const text =
        String(value)
            .trim()
            .toLowerCase();


    return (
        text !== "" &&
        text !== "nan" &&
        text !== "null" &&
        text !== "none" &&
        text !== "not available"
    );
}


// ============================================================
// NO DATASET
// ============================================================

function showNoDataset() {

    products = [];

    datasetColumns = [];


    const datasetName =
        document.getElementById(
            "datasetName"
        );


    if (datasetName) {

        datasetName.innerText =
            "No dataset uploaded";
    }


    const datasetNameCard =
        document.getElementById(
            "datasetNameCard"
        );


    if (datasetNameCard) {

        datasetNameCard.innerText =
            "No dataset uploaded";
    }


    const totalProducts =
        document.getElementById(
            "totalProducts"
        );


    if (totalProducts) {

        totalProducts.innerText =
            "0";
    }


    const totalColumns =
        document.getElementById(
            "totalColumns"
        );


    if (totalColumns) {

        totalColumns.innerText =
            "0";
    }


    const verifiedProducts =
        document.getElementById(
            "verifiedProducts"
        );


    if (verifiedProducts) {

        verifiedProducts.innerText =
            "0";
    }


    const needsReview =
        document.getElementById(
            "needsReview"
        );


    if (needsReview) {

        needsReview.innerText =
            "0";
    }


    setAverageConfidence(
        0
    );


    const dynamicInsights =
        document.getElementById(
            "dynamicInsights"
        );


    if (dynamicInsights) {

        dynamicInsights.innerHTML = `

            <div class="insight-item">

                <span class="insight-dot warning-dot"></span>

                <div>

                    <strong>
                        Dataset unavailable
                    </strong>

                    <p>
                        Upload a dataset to generate
                        product intelligence.
                    </p>

                </div>

            </div>

        `;
    }


    const productGroups =
        document.getElementById(
            "productGroups"
        );


    if (productGroups) {

        productGroups.innerHTML = `

            <div class="empty-box">

                <h2>
                    No Dataset Available
                </h2>

                <p>
                    Upload a dataset to generate reports.
                </p>

                <a
                    href="upload.html"
                    class="button"
                >
                    Upload Dataset
                </a>

            </div>

        `;
    }
}


// ============================================================
// CLOSE INDIVIDUAL REPORT
// ============================================================

function closeIndividualReport() {

    const report =
        document.getElementById(
            "individualReport"
        );


    if (!report) {

        return;
    }


    report.classList.add(
        "report-hidden"
    );


    report.style.display =
        "none";


    currentProductIndex =
        -1;
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

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );
}


// ============================================================
// START
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        loadReport();

    }
);