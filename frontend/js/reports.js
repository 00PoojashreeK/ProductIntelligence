const API = "https://productintelligence-lzcn.onrender.com/";


// ============================================================
// SETTINGS
// ============================================================

const PRODUCTS_PER_PAGE = 50;


// ============================================================
// GLOBAL DATA
// ============================================================

let reportData = null;

let products = [];

let currentPage = 1;

let totalPages = 1;

let currentProductIndex = -1;


// ============================================================
// LOAD REPORT
// ============================================================

async function loadReport() {

    const initialReport =
        document.getElementById("individualReport");

    if (initialReport) {
        initialReport.classList.add("report-hidden");
        initialReport.style.display = "none";
    }

    const productGroups =
        document.getElementById("productGroups");

    try {

        if (!productGroups) {
            console.error("productGroups element not found.");
            return;
        }


        productGroups.innerHTML = `
            <div class="empty-box">
                Loading report...
            </div>
        `;


        const response =
            await fetch(`${API}/report`);


        if (!response.ok) {

            throw new Error(
                `Backend returned ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "Report data:",
            data
        );


        if (
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
        // OVERALL REPORT
        // ====================================================

        const datasetName =
            document.getElementById("datasetName");

        if (datasetName) {

            datasetName.innerText =
                `Dataset: ${data.dataset.filename || "Unknown Dataset"}`;

        }


        const datasetNameCard =
            document.getElementById("datasetNameCard");

        if (datasetNameCard) {

            datasetNameCard.innerText =
                data.dataset.filename || "—";

        }


        const datasetStatusText =
            document.getElementById("datasetStatusText");

        if (datasetStatusText) {

            datasetStatusText.innerText =
                "Ready";

        }


        const totalProducts =
            document.getElementById("totalProducts");

        if (totalProducts) {

            totalProducts.innerText =
                products.length;

        }


        const totalColumns =
            document.getElementById("totalColumns");

        if (totalColumns) {

            totalColumns.innerText =
                data.dataset.columns || 0;

        }


        // ====================================================
        // VERIFIED / NEEDS REVIEW
        // ====================================================

        const verified =
            products.filter(
                product =>
                    product.status === "Verified"
            ).length;


        const needsReview =
            products.filter(
                product =>
                    product.status !== "Verified"
            ).length;


        const verifiedProducts =
            document.getElementById("verifiedProducts");

        if (verifiedProducts) {

            verifiedProducts.innerText =
                verified;

        }


        const needsReviewElement =
            document.getElementById("needsReview");

        if (needsReviewElement) {

            needsReviewElement.innerText =
                needsReview;

        }


        // ====================================================
        // AVERAGE CONFIDENCE
        // ====================================================

        const averageConfidence =
            calculateAverageConfidence(
                data,
                products
            );


        console.log(
            "Final Average Confidence:",
            averageConfidence
        );


        setAverageConfidence(
            averageConfidence
        );


        // ====================================================
        // CALCULATE PAGES
        // ====================================================

        totalPages =
            Math.ceil(
                products.length /
                PRODUCTS_PER_PAGE
            );


        if (totalPages === 0) {

            totalPages = 1;

        }


        currentPage = 1;


        // ====================================================
        // SHOW FIRST PAGE
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
// CALCULATE AVERAGE CONFIDENCE
// ============================================================

function calculateAverageConfidence(
    data,
    productList
) {

    // --------------------------------------------------------
    // First try backend summary
    // --------------------------------------------------------

    if (
        data &&
        data.summary &&
        data.summary.average_confidence !== undefined &&
        data.summary.average_confidence !== null
    ) {

        const backendValue =
            parseConfidence(
                data.summary.average_confidence
            );


        if (
            !isNaN(backendValue)
        ) {

            return backendValue;

        }

    }


    // --------------------------------------------------------
    // Otherwise calculate from products
    // --------------------------------------------------------

    if (
        !Array.isArray(productList) ||
        productList.length === 0
    ) {

        return 0;

    }


    let total = 0;

    let count = 0;


    productList.forEach(
        product => {

            if (!product) {
                return;
            }


            const confidence =
                parseConfidence(
                    product.confidence ??
                    product.score ??
                    product.quality_score
                );


            if (!isNaN(confidence)) {

                total += confidence;

                count++;

            }

        }
    );


    if (count === 0) {

        return 0;

    }


    return total / count;

}


// ============================================================
// PARSE CONFIDENCE
// ============================================================

function parseConfidence(value) {

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
            .replace("%", "")
            .trim();


    const number =
        parseFloat(cleaned);


    return number;

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

        console.error(
            "averageConfidence element was not found in HTML."
        );

        return;

    }


    let confidence =
        parseFloat(value);


    if (
        isNaN(confidence)
    ) {

        confidence = 0;

    }


    // Keep value between 0 and 100

    confidence =
        Math.max(
            0,
            Math.min(
                100,
                confidence
            )
        );


    // Round to 1 decimal only when needed

    const displayConfidence =
        Number.isInteger(confidence)
            ? confidence
            : confidence.toFixed(1);


    // ========================================================
    // SET TEXT
    // ========================================================

    element.textContent =
        `${displayConfidence}%`;


    // ========================================================
    // FORCE VISIBILITY
    // ========================================================

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


    // ========================================================
    // ALSO MAKE PARENT VISIBLE
    // ========================================================

    const reportScore =
        element.closest(
            ".report-score"
        );


    if (reportScore) {

        reportScore.style.visibility =
            "visible";

        reportScore.style.opacity =
            "1";

        reportScore.style.color =
            "#111827";

        reportScore.style.position =
            "relative";

        reportScore.style.zIndex =
            "5";

    }


    console.log(
        "Average confidence displayed:",
        `${displayConfidence}%`
    );

}


// ============================================================
// BUILD 50-PRODUCT PAGE
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
                    Upload a dataset to generate reports.
                </p>

            </div>

        `;

        return;

    }


    // ========================================================
    // CALCULATE RANGE
    // ========================================================

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


    // ========================================================
    // CREATE GROUP
    // ========================================================

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
                    Showing ${startIndex + 1}–${endIndex}
                    of ${products.length} products
                </p>

            </div>


            <div class="report-page-indicator">

                Page ${currentPage}
                of ${totalPages}

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

                Page ${currentPage}
                of ${totalPages}

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


    // ========================================================
    // ADD PRODUCTS
    // ========================================================

    const list =
        document.getElementById(
            "productList"
        );


    pageProducts.forEach(
        (product, localIndex) => {

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

            `;


            list.appendChild(
                button
            );

        }
    );


    // ========================================================
    // DISABLE PAGINATION
    // ========================================================

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
// NEXT 50 PRODUCTS
// ============================================================

function nextPage() {

    if (
        currentPage >= totalPages
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

            behavior: "smooth",

            block: "start"

        });

    }

}


// ============================================================
// PREVIOUS 50 PRODUCTS
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

            behavior: "smooth",

            block: "start"

        });

    }

}


// ============================================================
// GET PRODUCT NAME
// ============================================================

function getProductName(
    product,
    index
) {

    if (
        product &&
        product.name &&
        product.name !== "Not Available"
    ) {

        return product.name;

    }


    if (
        product &&
        product.product_name &&
        product.product_name !== "Not Available"
    ) {

        return product.product_name;

    }


    if (
        product &&
        product.title &&
        product.title !== "Not Available"
    ) {

        return product.title;

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

        console.error(
            "individualReport element not found."
        );

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


    // ========================================================
    // NAME
    // ========================================================

    const nameElement =
        document.getElementById(
            "individualProductName"
        );


    if (nameElement) {

        nameElement.innerText =
            getProductName(
                product,
                index
            );

    }


    // ========================================================
    // CONFIDENCE
    // ========================================================

    const confidence =
        parseConfidence(
            product.confidence ??
            product.score ??
            product.quality_score
        );


    const finalConfidence =
        isNaN(confidence)
            ? 0
            : confidence;


    const score =
        document.getElementById(
            "individualScore"
        );


    if (score) {

        score.innerText =
            `${finalConfidence}%`;


        score.className =
            "score-box";


        score.style.display =
            "flex";

        score.style.visibility =
            "visible";

        score.style.opacity =
            "1";


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


    // ========================================================
    // PRODUCT INFORMATION
    // ========================================================

    buildProductInformation(
        product
    );


    // ========================================================
    // SUMMARY
    // ========================================================

    buildProductSummary(
        product
    );


    // ========================================================
    // NAVIGATION
    // ========================================================

    updateProductNavigation();


    // ========================================================
    // SHOW REPORT
    // ========================================================

    const top =
        report.getBoundingClientRect().top +
        window.pageYOffset -
        24;


    window.scrollTo({

        top: top,

        behavior: "smooth"

    });

}


// ============================================================
// PRODUCT INFORMATION
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


    const get =
        (...keys) => {

            for (
                const key of keys
            ) {

                const value =
                    product?.[key];


                if (
                    value !== undefined &&
                    value !== null &&
                    String(value).trim() !== "" &&
                    String(value) !== "Not Available"
                ) {

                    return value;

                }

            }


            return "Not Available";

        };


    const confidence =
        parseConfidence(
            product?.confidence ??
            product?.score ??
            product?.quality_score
        );


    const confidenceDisplay =
        isNaN(confidence)
            ? "Not Available"
            : `${confidence}%`;


    const fields = [

        [
            "Product Name",
            get(
                "name",
                "product_name",
                "title"
            )
        ],

        [
            "Brand",
            get("brand")
        ],

        [
            "Model",
            get(
                "model",
                "model_number"
            )
        ],

        [
            "Category",
            get("category")
        ],

        [
            "Power",
            get(
                "power",
                "power_rating"
            )
        ],

        [
            "Voltage",
            get("voltage")
        ],

        [
            "Weight",
            get("weight")
        ],

        [
            "Material",
            get("material")
        ],

        [
            "Applications",
            get(
                "applications",
                "application"
            )
        ],

        [
            "Flow Rate",
            get(
                "flow_rate",
                "flowrate"
            )
        ],

        [
            "RPM / Speed",
            get(
                "rpm",
                "speed"
            )
        ],

        [
            "Country of Origin",
            get(
                "country",
                "country_of_origin"
            )
        ],

        [
            "Warranty",
            get("warranty")
        ],

        [
            "Price",
            get("price")
        ],

        [
            "Rating",
            get("rating")
        ],

        [
            "Stock",
            get(
                "stock",
                "availability"
            )
        ],

        [
            "Status",
            get("status")
        ],

        [
            "Confidence",
            confidenceDisplay
        ]

    ];


    fields.forEach(
        ([label, value]) => {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "product-info-row";


            row.innerHTML = `

                <span
                    class="product-info-label"
                >
                    ${escapeHTML(label)}
                </span>


                <strong
                    class="product-info-value"
                >
                    ${escapeHTML(
                        displayValue(value)
                    )}
                </strong>

            `;


            table.appendChild(
                row
            );

        }
    );

}


// ============================================================
// PRODUCT SUMMARY
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


    const name =
        getProductName(
            product,
            currentProductIndex
        );


    const parsedConfidence =
        parseConfidence(
            product.confidence ??
            product.score ??
            product.quality_score
        );


    const confidence =
        isNaN(parsedConfidence)
            ? 0
            : parsedConfidence;


    let qualityMessage;


    if (
        confidence >= 85
    ) {

        qualityMessage =
            "This product record contains a strong set of catalog attributes and appears suitable for use in a product catalog.";

    }

    else if (
        confidence >= 60
    ) {

        qualityMessage =
            "This product record contains several important attributes, but additional enrichment may improve its catalog readiness.";

    }

    else {

        qualityMessage =
            "This product record has limited product information and should be enriched before being used as a complete catalog record.";

    }


    let statusMessage;


    if (
        product.status === "Verified"
    ) {

        statusMessage =
            "The available product information is sufficiently complete based on the catalog fields currently detected.";

    }

    else if (
        product.status === "Needs Review"
    ) {

        statusMessage =
            "Some important product attributes are incomplete or unavailable and should be reviewed before publishing.";

    }

    else {

        statusMessage =
            "The product record contains significant missing information and requires enrichment.";

    }


    summary.innerHTML = `

        <p>

            <strong>
                ${escapeHTML(name)}
            </strong>

            has a product information confidence
            score of

            <strong>
                ${confidence}%
            </strong>.

        </p>


        <p>

            ${escapeHTML(
                qualityMessage
            )}

        </p>


        <p>

            ${escapeHTML(
                statusMessage
            )}

        </p>

    `;

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
// UPDATE INDIVIDUAL NAVIGATION
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


    if (
        !previous ||
        !next
    ) {

        return;

    }


    previous.disabled =
        currentProductIndex <= 0;


    next.disabled =
        currentProductIndex >=
        products.length - 1;


    previous.innerText =

        currentProductIndex > 0

            ? `← Product ${currentProductIndex}`

            : "← Previous";


    next.innerText =

        currentProductIndex <
        products.length - 1

            ? `Product ${currentProductIndex + 2} →`

            : "Next →";

}


// ============================================================
// DISPLAY VALUE
// ============================================================

function displayValue(
    value
) {

    if (
        value === null ||
        value === undefined ||
        String(value).trim() === "" ||
        String(value).trim() === "Not Available"
    ) {

        return "Not Available";

    }


    return String(value);

}


// ============================================================
// NO DATASET
// ============================================================

function showNoDataset() {

    const datasetName =
        document.getElementById(
            "datasetName"
        );

    if (datasetName) {

        datasetName.innerText =
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


    // IMPORTANT:
    // Use the same function that forces visibility.

    setAverageConfidence(
        0
    );


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
                    Please upload a dataset first.
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
// START
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        loadReport();

    }
);