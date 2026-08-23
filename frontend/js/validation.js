 const API =
    "https://productintelligence-lzcn.onrender.com";


// ============================================================
// ELEMENTS
// ============================================================

const productSelect =
    document.getElementById("productSelect");

const validateBtn =
    document.getElementById("validateBtn");

const validationResult =
    document.getElementById("validationResult");

const resultProductName =
    document.getElementById("resultProductName");

const statusBadge =
    document.getElementById("statusBadge");

const qualityScore =
    document.getElementById("qualityScore");

const progressBar =
    document.getElementById("progressBar");

const checksContainer =
    document.getElementById("checksContainer");

const productInfo =
    document.getElementById("productInfo");

const emptyBox =
    document.getElementById("empty");

const errorBox =
    document.getElementById("error");


// ============================================================
// PAGINATION
// KEEPING 30 PRODUCTS PER PAGE
// ============================================================

const PRODUCTS_PER_PAGE = 30;

let currentPage = 1;

let totalPages = 1;

let productRows = [];


// ============================================================
// CREATE PAGINATION
// ============================================================

function createPagination() {

    let pagination =
        document.getElementById(
            "validationPagination"
        );

    if (!pagination) {

        pagination =
            document.createElement("div");

        pagination.id =
            "validationPagination";

        pagination.style.cssText = `
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 12px;
            margin: 25px 0;
            flex-wrap: wrap;
        `;

        productSelect
            .parentElement
            .appendChild(pagination);
    }

    pagination.innerHTML = `
        <button
            id="previousPage"
            class="button"
            type="button"
            onclick="previousPage()"
        >
            ← Previous
        </button>

        <span
            id="pageInfo"
            style="
                font-weight: 600;
                padding: 8px 14px;
            "
        >
            Page 1 of 1
        </span>

        <button
            id="nextPage"
            class="button"
            type="button"
            onclick="nextPage()"
        >
            Next →
        </button>
    `;
}


// ============================================================
// LOAD PRODUCTS FROM BACKEND
// ============================================================

async function loadProducts() {

    productSelect.innerHTML = `
        <option value="">
            Loading products...
        </option>
    `;

    validateBtn.disabled = true;

    emptyBox.style.display = "none";

    errorBox.style.display = "none";

    validationResult.style.display = "none";


    try {

        const response =
            await fetch(
                `${API}/products`,
                {
                    method: "GET",
                    cache: "no-store",
                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );


        if (!response.ok) {

            const errorText =
                await response.text();

            throw new Error(
                `Backend returned ${response.status}: ${errorText}`
            );
        }


        const data =
            await response.json();


        console.log(
            "Products received:",
            data
        );


        // --------------------------------------------------------
        // CHECK BACKEND RESPONSE
        // --------------------------------------------------------

        if (!Array.isArray(data)) {

            throw new Error(
                "Backend did not return a valid product list."
            );
        }


        // --------------------------------------------------------
        // NO PRODUCTS
        // --------------------------------------------------------

        if (data.length === 0) {

            productRows = [];

            productSelect.innerHTML = `
                <option value="">
                    No products available
                </option>
            `;

            emptyBox.style.display =
                "block";

            validateBtn.disabled =
                true;

            removePagination();

            return;
        }


        // --------------------------------------------------------
        // STORE PRODUCTS
        // --------------------------------------------------------

        productRows =
            data;


        window.productRows =
            data;


        // --------------------------------------------------------
        // PAGINATION
        // --------------------------------------------------------

        totalPages =
            Math.ceil(
                productRows.length /
                PRODUCTS_PER_PAGE
            );


        currentPage = 1;


        createPagination();


        renderProductPage();


        validateBtn.disabled =
            false;


    }
    catch(error) {

        console.error(
            "Load products error:",
            error
        );


        productSelect.innerHTML = `
            <option value="">
                Unable to load products
            </option>
        `;


        validateBtn.disabled =
            true;


        showError(
            error.message ||
            "Unable to load products from the backend."
        );
    }
}


// ============================================================
// REMOVE PAGINATION
// ============================================================

function removePagination() {

    const pagination =
        document.getElementById(
            "validationPagination"
        );

    if (pagination) {

        pagination.remove();
    }
}


// ============================================================
// RENDER PRODUCTS FOR CURRENT PAGE
// ============================================================

function renderProductPage() {

    const start =
        (currentPage - 1) *
        PRODUCTS_PER_PAGE;


    const end =
        start +
        PRODUCTS_PER_PAGE;


    const pageProducts =
        productRows.slice(
            start,
            end
        );


    productSelect.innerHTML = `
        <option value="">
            Select a product
        </option>
    `;


    pageProducts.forEach(
        product => {

            const option =
                document.createElement(
                    "option"
                );


            // ----------------------------------------------------
            // DYNAMIC PRODUCT ID
            // ----------------------------------------------------

            const productId =
                product.id !== undefined &&
                product.id !== null
                    ? product.id
                    : product.row_number;


            option.value =
                productId;


            // ----------------------------------------------------
            // DYNAMIC PRODUCT NAME
            // ----------------------------------------------------

            const name =
                getProductDisplayValue(
                    product,
                    [
                        "name",
                        "product_name",
                        "product",
                        "title"
                    ]
                );


            // ----------------------------------------------------
            // DYNAMIC MODEL
            // ----------------------------------------------------

            const model =
                getProductDisplayValue(
                    product,
                    [
                        "model",
                        "model_name"
                    ]
                );


            // ----------------------------------------------------
            // BUILD DISPLAY NAME
            // ----------------------------------------------------

            let displayName =
                name;


            if (
                model !==
                "Not Available"
            ) {

                displayName +=
                    ` - ${model}`;
            }


            option.textContent =
                displayName;


            productSelect.appendChild(
                option
            );
        }
    );


    updatePagination();
}


// ============================================================
// GET DYNAMIC PRODUCT VALUE
// ============================================================

function getProductDisplayValue(
    product,
    possibleFields
) {

    for (
        const field of possibleFields
    ) {

        if (
            product[field] !==
                undefined &&
            product[field] !==
                null &&
            String(
                product[field]
            ).trim() !== ""
        ) {

            return String(
                product[field]
            );
        }
    }


    return "Not Available";
}


// ============================================================
// UPDATE PAGINATION
// ============================================================

function updatePagination() {

    const pageInfo =
        document.getElementById(
            "pageInfo"
        );


    const previous =
        document.getElementById(
            "previousPage"
        );


    const next =
        document.getElementById(
            "nextPage"
        );


    if (pageInfo) {

        pageInfo.innerText =
            `Page ${currentPage} of ${totalPages}`;
    }


    if (previous) {

        previous.disabled =
            currentPage <= 1;
    }


    if (next) {

        next.disabled =
            currentPage >= totalPages;
    }
}


// ============================================================
// PREVIOUS PAGE
// ============================================================

function previousPage() {

    if (
        currentPage > 1
    ) {

        currentPage--;


        renderProductPage();


        productSelect.value =
            "";


        validationResult.style.display =
            "none";
    }
}


// ============================================================
// NEXT PAGE
// ============================================================

function nextPage() {

    if (
        currentPage <
        totalPages
    ) {

        currentPage++;


        renderProductPage();


        productSelect.value =
            "";


        validationResult.style.display =
            "none";
    }
}


// ============================================================
// PRODUCT SELECTION
// ============================================================

productSelect.addEventListener(
    "change",
    function() {

        validationResult.style.display =
            "none";

        errorBox.style.display =
            "none";
    }
);


// ============================================================
// VALIDATE PRODUCT
// ============================================================

async function validateProduct() {

    const productId =
        productSelect.value;


    if (!productId) {

        alert(
            "Please select a product first."
        );

        return;
    }


    // --------------------------------------------------------
    // FIND SELECTED PRODUCT
    // --------------------------------------------------------

    const product =
        productRows.find(
            item =>
                String(
                    item.id ??
                    item.row_number
                ) ===
                String(productId)
        );


    if (!product) {

        showError(
            "Selected product could not be found."
        );

        return;
    }


    validateBtn.disabled =
        true;


    validateBtn.innerText =
        "⏳ Validating...";


    errorBox.style.display =
        "none";


    validationResult.style.display =
        "none";


    try {

        // ----------------------------------------------------
        // CALL BACKEND VALIDATION API
        // ----------------------------------------------------

        const response =
            await fetch(
                `${API}/validate/${encodeURIComponent(productId)}`,
                {
                    method: "GET",
                    cache: "no-store",
                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );


        const data =
            await response.json();


        console.log(
            "Validation response:",
            data
        );


        if (
            !response.ok ||
            data.success !== true
        ) {

            throw new Error(
                data.detail ||
                data.message ||
                "Validation failed."
            );
        }


        // ----------------------------------------------------
        // DISPLAY BACKEND RESULT
        // ----------------------------------------------------

        displayValidationResult(
            data,
            product
        );


    }
    catch(error) {

        console.error(
            "Validation error:",
            error
        );


        showError(
            error.message ||
            "Unable to validate product."
        );
    }


    finally {

        validateBtn.disabled =
            false;


        validateBtn.innerText =
            "🔍 Validate Product";
    }
}


// ============================================================
// DISPLAY VALIDATION RESULT
// ============================================================

function displayValidationResult(
    data,
    selectedProduct
) {

    validationResult.style.display =
        "block";


    // --------------------------------------------------------
    // PRODUCT NAME
    // --------------------------------------------------------

    const backendProduct =
        data.product ||
        {};


    const productName =
        data.product_name ||
        backendProduct.name ||
        backendProduct.product_name ||
        selectedProduct.name ||
        selectedProduct.product_name ||
        selectedProduct.product ||
        selectedProduct.title ||
        "Selected Product";


    resultProductName.innerText =
        productName;


    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------

    const status =
        data.status ||
        backendProduct.status ||
        "Needs Review";


    statusBadge.innerText =
        status;


    statusBadge.className =
        "status-badge";


    applyStatusClass(
        status
    );


    // --------------------------------------------------------
    // QUALITY SCORE
    // --------------------------------------------------------

    const score =
        getScore(data);


    qualityScore.innerText =
        `${score}%`;


    progressBar.style.width =
        `${score}%`;


    // --------------------------------------------------------
    // VALIDATION CHECKS
    // --------------------------------------------------------

    renderValidationChecks(
        data
    );


    // --------------------------------------------------------
    // PRODUCT INFORMATION
    // --------------------------------------------------------

    renderProductInformation(
        data,
        selectedProduct
    );


    // --------------------------------------------------------
    // SCROLL TO RESULT
    // --------------------------------------------------------

    validationResult.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


// ============================================================
// APPLY STATUS CLASS DYNAMICALLY
// ============================================================

function applyStatusClass(
    status
) {

    const normalized =
        String(status)
            .trim()
            .toLowerCase();


    if (
        normalized.includes(
            "verified"
        ) ||
        normalized.includes(
            "pass"
        ) ||
        normalized.includes(
            "approved"
        ) ||
        normalized.includes(
            "valid"
        )
    ) {

        statusBadge.classList.add(
            "status-verified"
        );

        return;
    }


    if (
        normalized.includes(
            "critical"
        ) ||
        normalized.includes(
            "fail"
        ) ||
        normalized.includes(
            "invalid"
        ) ||
        normalized.includes(
            "error"
        )
    ) {

        statusBadge.classList.add(
            "status-critical"
        );

        return;
    }


    statusBadge.classList.add(
        "status-review"
    );
}


// ============================================================
// GET QUALITY SCORE
// ============================================================

function getScore(data) {

    const possibleScores = [

        data.quality_score,

        data.qualityScore,

        data.score,

        data.data_quality_score,

        data.validation_score,

        data.confidence,

        data.average_confidence,

        data.product &&
            data.product.quality_score,

        data.product &&
            data.product.score
    ];


    for (
        const value of possibleScores
    ) {

        if (
            value !== undefined &&
            value !== null &&
            value !== "" &&
            !Number.isNaN(
                Number(value)
            )
        ) {

            let number =
                Number(value);


            number =
                Math.max(
                    0,
                    Math.min(
                        100,
                        number
                    )
                );


            return number;
        }
    }


    return 0;
}


// ============================================================
// RENDER VALIDATION CHECKS
// ============================================================

function renderValidationChecks(
    data
) {

    checksContainer.innerHTML =
        "";


    const checks =
        Array.isArray(
            data.checks
        )
            ? data.checks
            : [];


    if (
        checks.length === 0
    ) {

        checksContainer.innerHTML = `
            <p>
                No validation checks were returned by the backend.
            </p>
        `;

        return;
    }


    checks.forEach(
        check => {

            const div =
                document.createElement(
                    "div"
                );


            // ------------------------------------------------
            // DYNAMIC STATUS
            // ------------------------------------------------

            const checkStatus =
                String(
                    check.status ||
                    check.result ||
                    check.state ||
                    "WARNING"
                ).toUpperCase();


            let className =
                "check-warning";


            if (
                checkStatus ===
                "PASS"
            ) {

                className =
                    "check-pass";
            }

            else if (
                checkStatus ===
                "FAIL"
            ) {

                className =
                    "check-fail";
            }


            div.className =
                `check-item ${className}`;


            // ------------------------------------------------
            // DYNAMIC ICON
            // ------------------------------------------------

            const icon =
                check.icon ||
                getCheckIcon(
                    checkStatus
                );


            // ------------------------------------------------
            // DYNAMIC TITLE
            // ------------------------------------------------

            const title =
                check.title ||
                check.name ||
                check.check ||
                check.field ||
                "Validation Check";


            // ------------------------------------------------
            // DYNAMIC MESSAGE
            // ------------------------------------------------

            const message =
                check.message ||
                check.description ||
                check.details ||
                check.reason ||
                check.value ||
                "No additional information provided.";


            div.innerHTML = `

                <div class="check-title">

                    ${escapeHtml(icon)}

                    ${escapeHtml(title)}

                    ${
                        check.status
                            ? `<span style="margin-left:8px;">
                                ${escapeHtml(checkStatus)}
                               </span>`
                            : ""
                    }

                </div>

                <div class="check-message">

                    ${escapeHtml(
                        String(message)
                    )}

                </div>

            `;


            checksContainer.appendChild(
                div
            );
        }
    );
}


// ============================================================
// DYNAMIC CHECK ICON
// ============================================================

function getCheckIcon(
    status
) {

    if (
        status === "PASS"
    ) {

        return "✓";
    }


    if (
        status === "FAIL"
    ) {

        return "✕";
    }


    return "!";
}


// ============================================================
// RENDER PRODUCT INFORMATION
// ============================================================

function renderProductInformation(
    data,
    selectedProduct
) {

    productInfo.innerHTML =
        "";


    const backendProduct =
        data.product &&
        typeof data.product === "object"
            ? data.product
            : {};


    const rawData =
        backendProduct.raw_data &&
        typeof backendProduct.raw_data === "object"
            ? backendProduct.raw_data
            : null;


    let productData = {};


    // --------------------------------------------------------
    // PRIORITY:
    // BACKEND RAW DATA
    // BACKEND PRODUCT
    // SELECTED PRODUCT
    // --------------------------------------------------------

    if (
        rawData &&
        Object.keys(rawData).length
    ) {

        productData =
            rawData;
    }

    else if (
        Object.keys(
            backendProduct
        ).length
    ) {

        productData =
            backendProduct;
    }

    else {

        productData =
            selectedProduct || {};
    }


    // --------------------------------------------------------
    // REMOVE INTERNAL RAW DATA
    // --------------------------------------------------------

    const excludedFields = [
        "raw_data"
    ];


    Object.entries(
        productData
    ).forEach(
        ([key, value]) => {

            if (
                excludedFields.includes(
                    key
                )
            ) {

                return;
            }


            const row =
                document.createElement(
                    "tr"
                );


            // ------------------------------------------------
            // DISPLAY OBJECTS / ARRAYS
            // ------------------------------------------------

            let displayValue =
                value;


            if (
                value === null ||
                value === undefined ||
                value === ""
            ) {

                displayValue =
                    "Not Available";
            }


            else if (
                typeof value ===
                "object"
            ) {

                try {

                    displayValue =
                        JSON.stringify(
                            value
                        );

                }
                catch {

                    displayValue =
                        String(value);
                }
            }


            row.innerHTML = `

                <th>

                    ${escapeHtml(
                        formatFieldName(
                            key
                        )
                    )}

                </th>

                <td>

                    ${escapeHtml(
                        String(
                            displayValue
                        )
                    )}

                </td>

            `;


            productInfo.appendChild(
                row
            );
        }
    );


    // --------------------------------------------------------
    // IF NO PRODUCT DATA
    // --------------------------------------------------------

    if (
        !productInfo.children.length
    ) {

        productInfo.innerHTML = `
            <tr>
                <td colspan="2">
                    No product information was returned by the backend.
                </td>
            </tr>
        `;
    }
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
            /([A-Z])/g,
            " $1"
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
// ESCAPE HTML
// ============================================================

function escapeHtml(
    value
) {

    return String(
        value
    )

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
// ERROR
// ============================================================

function showError(
    message
) {

    errorBox.style.display =
        "block";


    errorBox.innerText =
        "❌ " +
        String(message);
}


// ============================================================
// INITIAL LOAD
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        loadProducts();

    }
);