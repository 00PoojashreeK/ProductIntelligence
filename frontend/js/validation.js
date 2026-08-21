 const API = "http://127.0.0.1:8000";


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
// ============================================================

const PRODUCTS_PER_PAGE = 30;

let currentPage = 1;

let totalPages = 1;

let productRows = [];


// ============================================================
// CREATE PAGINATION UI
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
            display:flex;
            justify-content:center;
            align-items:center;
            gap:12px;
            margin:25px 0;
            flex-wrap:wrap;
        `;

        productSelect
            .parentElement
            .appendChild(pagination);
    }

    pagination.innerHTML = `
        <button
            id="previousPage"
            class="button"
            onclick="previousPage()"
        >
            ← Previous
        </button>

        <span
            id="pageInfo"
            style="
                font-weight:600;
                padding:8px 14px;
            "
        >
            Page 1 of 1
        </span>

        <button
            id="nextPage"
            class="button"
            onclick="nextPage()"
        >
            Next →
        </button>
    `;
}


// ============================================================
// LOAD PRODUCTS
// ============================================================

async function loadProducts() {

    productSelect.innerHTML = `
        <option value="">
            Loading products...
        </option>
    `;

    validateBtn.disabled = true;

    try {

        const response =
            await fetch(
                `${API}/products`
            );

        if (!response.ok) {

            throw new Error(
                "Unable to fetch products."
            );
        }

        const data =
            await response.json();

        if (
            !Array.isArray(data) ||
            data.length === 0
        ) {

            productSelect.innerHTML = `
                <option value="">
                    No products available
                </option>
            `;

            emptyBox.style.display =
                "block";

            return;
        }

        emptyBox.style.display =
            "none";

        productRows =
            data;

        window.productRows =
            data;

        totalPages =
            Math.ceil(
                data.length /
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

        showError(
            "Unable to load products. Make sure FastAPI is running."
        );
    }
}


// ============================================================
// RENDER 30 PRODUCTS
// ============================================================

function renderProductPage() {

    const start =
        (currentPage - 1)
        * PRODUCTS_PER_PAGE;

    const end =
        start + PRODUCTS_PER_PAGE;

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

            option.value =
                product.id;

            const name =
                product.name &&
                product.name !==
                "Not Available"
                    ? product.name
                    : `Product ${product.row_number}`;

            const model =
                product.model &&
                product.model !==
                "Not Available"
                    ? ` - ${product.model}`
                    : "";

            option.textContent =
                name + model;

            productSelect.appendChild(
                option
            );
        }
    );

    updatePagination();
}


// ============================================================
// PAGINATION CONTROLS
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
            currentPage === 1;
    }

    if (next) {

        next.disabled =
            currentPage === totalPages;
    }
}


function previousPage() {

    if (currentPage > 1) {

        currentPage--;

        renderProductPage();

        productSelect.value = "";

        validationResult.style.display =
            "none";
    }
}


function nextPage() {

    if (currentPage < totalPages) {

        currentPage++;

        renderProductPage();

        productSelect.value = "";

        validationResult.style.display =
            "none";
    }
}


// ============================================================
// SELECT PRODUCT
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

    const product =
        productRows.find(
            item =>
                String(item.id) ===
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

        const response =
            await fetch(
                `${API}/validate/${product.id}`
            );

        const data =
            await response.json();

        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.detail ||
                data.message ||
                "Validation failed."
            );
        }

        displayValidationResult(
            data
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
// DISPLAY RESULT
// ============================================================

function displayValidationResult(
    data
) {

    validationResult.style.display =
        "block";

    resultProductName.innerText =
        data.product_name ||
        "Selected Product";

    const status =
        data.status ||
        "Needs Review";

    statusBadge.innerText =
        status;

    statusBadge.className =
        "status-badge";

    if (
        status === "Verified"
    ) {

        statusBadge.classList.add(
            "status-verified"
        );

    }
    else if (
        status === "Critical Issues"
    ) {

        statusBadge.classList.add(
            "status-critical"
        );

    }
    else {

        statusBadge.classList.add(
            "status-review"
        );
    }

    const score =
        Number(
            data.quality_score || 0
        );

    qualityScore.innerText =
        `${score}%`;

    progressBar.style.width =
        `${score}%`;

    // --------------------------------------------------------
    // CHECKS
    // --------------------------------------------------------

    checksContainer.innerHTML =
        "";

    const checks =
        data.checks || [];

    if (!checks.length) {

        checksContainer.innerHTML =
            "<p>No validation checks available.</p>";

    }

    checks.forEach(
        check => {

            const div =
                document.createElement(
                    "div"
                );

            let className =
                "check-warning";

            if (
                check.status === "PASS"
            ) {

                className =
                    "check-pass";

            }
            else if (
                check.status === "FAIL"
            ) {

                className =
                    "check-fail";
            }

            div.className =
                `check-item ${className}`;

            div.innerHTML = `

                <div class="check-title">

                    ${escapeHtml(
                        check.icon || "🔎"
                    )}

                    ${escapeHtml(
                        check.title
                    )}

                </div>

                <div class="check-message">

                    ${escapeHtml(
                        check.message
                    )}

                </div>

            `;

            checksContainer.appendChild(
                div
            );
        }
    );

    // --------------------------------------------------------
    // PRODUCT INFORMATION
    // --------------------------------------------------------

    productInfo.innerHTML =
        "";

    const product =
        data.product || {};

    const rawData =
        product.raw_data ||
        product;

    Object.entries(rawData)
        .forEach(
            ([key, value]) => {

                const row =
                    document.createElement(
                        "tr"
                    );

                const displayValue =
                    value === null ||
                    value === undefined ||
                    value === ""
                        ? "Not Available"
                        : value;

                row.innerHTML = `

                    <th>
                        ${escapeHtml(
                            formatFieldName(key)
                        )}
                    </th>

                    <td>
                        ${escapeHtml(
                            String(displayValue)
                        )}
                    </td>

                `;

                productInfo.appendChild(
                    row
                );
            }
        );

    validationResult.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


// ============================================================
// FORMAT FIELD
// ============================================================

function formatFieldName(
    field
) {

    return field
        .replace(/_/g, " ")
        .replace(/([A-Z])/g, " $1")
        .replace(
            /^./,
            str => str.toUpperCase()
        );
}


// ============================================================
// ESCAPE
// ============================================================

function escapeHtml(
    value
) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
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
        "❌ " + message;
}


// ============================================================
// START
// ============================================================

loadProducts();