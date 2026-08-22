const API = "http://127.0.0.1:8000";


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

    const productGroups =
        document.getElementById("productGroups");

    try {

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

        document.getElementById(
            "datasetName"
        ).innerText =
            `Dataset: ${data.dataset.filename}`;


        document.getElementById(
            "totalProducts"
        ).innerText =
            products.length;


        document.getElementById(
            "totalColumns"
        ).innerText =
            data.dataset.columns || 0;


        const verified =
            products.filter(
                product =>
                    product.status === "Verified"
            ).length;


        const needsReview =
            products.length - verified;


        document.getElementById(
            "verifiedProducts"
        ).innerText =
            verified;


        document.getElementById(
            "needsReview"
        ).innerText =
            needsReview;


        document.getElementById(
            "averageConfidence"
        ).innerText =
            `${data.summary.average_confidence || 0}%`;


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
    catch(error) {

        console.error(
            "Report loading error:",
            error
        );


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


// ============================================================
// BUILD 50-PRODUCT PAGE
// ============================================================

function buildProductPage() {

    const container =
        document.getElementById(
            "productGroups"
        );


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
            "div"
        );


    group.className =
        "product-group";


    group.innerHTML = `

        <div
            style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                gap:15px;
                flex-wrap:wrap;
                margin-bottom:20px;
            "
        >

            <div>

                <h2 style="margin:0;">

                    Products
                    ${startIndex + 1}
                    -
                    ${endIndex}

                </h2>

                <p
                    style="
                        margin:5px 0 0;
                        color:#64748b;
                    "
                >

                    Showing
                    ${startIndex + 1}
                    -
                    ${endIndex}
                    of
                    ${products.length}
                    products

                </p>

            </div>


            <div
                style="
                    font-weight:600;
                    color:#475569;
                "
            >

                Page
                ${currentPage}
                of
                ${totalPages}

            </div>

        </div>


        <div
            class="product-list"
            id="productList"
        >
        </div>


        <div
            class="page-navigation"
            style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                margin-top:25px;
                gap:15px;
            "
        >

            <button
                id="previousPage"
                class="button"
                onclick="previousPage()"
            >
                ← Previous 50
            </button>


            <span
                id="pageNumber"
                style="
                    font-weight:600;
                    color:#475569;
                "
            >
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
                Next 50 →
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


    previousButton.disabled =
        currentPage === 1;


    nextButton.disabled =
        currentPage === totalPages;

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


    // Scroll to product list

    document.getElementById(
        "productGroups"
    ).scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

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


    document.getElementById(
        "productGroups"
    ).scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


// ============================================================
// GET PRODUCT NAME
// ============================================================

function getProductName(
    product,
    index
) {

    if (
        product.name &&
        product.name !== "Not Available"
    ) {

        return product.name;

    }


    if (
        product.product_name &&
        product.product_name !== "Not Available"
    ) {

        return product.product_name;

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


    report.style.display =
        "block";


    // ========================================================
    // NAME
    // ========================================================

    document.getElementById(
        "individualProductName"
    ).innerText =

        getProductName(
            product,
            index
        );


    // ========================================================
    // CONFIDENCE
    // ========================================================

    const confidence =
        Number(
            product.confidence || 0
        );


    const score =
        document.getElementById(
            "individualScore"
        );


    score.innerText =
        `${confidence}%`;


    score.className =
        "score-box";


    if (
        confidence >= 80
    ) {

        score.classList.add(
            "score-good"
        );

    }

    else if (
        confidence >= 50
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

    report.scrollIntoView({
        behavior: "smooth",
        block: "start"
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


    table.innerHTML =
        "";


    const fields = [

        ["Product Name", product.name],

        ["Brand", product.brand],

        ["Model", product.model],

        ["Category", product.category],

        ["Power", product.power],

        ["Voltage", product.voltage],

        ["Weight", product.weight],

        ["Material", product.material],

        ["Applications", product.applications],

        ["Flow Rate", product.flow_rate],

        ["RPM / Speed", product.rpm],

        ["Country of Origin", product.country],

        ["Warranty", product.warranty],

        ["Price", product.price],

        ["Rating", product.rating],

        ["Stock", product.stock],

        ["Status", product.status],

        ["Confidence", `${product.confidence || 0}%`]

    ];


    fields.forEach(
        ([label, value]) => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <th>
                    ${escapeHTML(label)}
                </th>

                <td>
                    ${escapeHTML(
                        displayValue(value)
                    )}
                </td>

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


    const name =
        getProductName(
            product,
            currentProductIndex
        );


    const confidence =
        Number(
            product.confidence || 0
        );


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


    if (!previous || !next) {

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

    document.getElementById(
        "datasetName"
    ).innerText =
        "No dataset uploaded";


    document.getElementById(
        "totalProducts"
    ).innerText = "0";


    document.getElementById(
        "totalColumns"
    ).innerText = "0";


    document.getElementById(
        "verifiedProducts"
    ).innerText = "0";


    document.getElementById(
        "needsReview"
    ).innerText = "0";


    document.getElementById(
        "averageConfidence"
    ).innerText = "0%";


    document.getElementById(
        "productGroups"
    ).innerHTML = `

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

loadReport();