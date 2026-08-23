const API =
    ((window.location.protocol === "file:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://127.0.0.1:8000" : "https://productintelligence-lzcn.onrender.com");


// ======================================================
// GLOBAL DATA
// ======================================================

let allProducts = [];

let currentPage = 1;

const PRODUCTS_PER_PAGE = 30;


// ======================================================
// LOAD PRODUCTS
// ======================================================

async function loadProducts() {

    const container =
        document.getElementById(
            "productsContainer"
        );

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="product-card">
            <p>Loading products...</p>
        </div>
    `;

    try {

        const response =
            await fetch(
                `${API}/products`
            );

        if (!response.ok) {

            const text =
                await response.text();

            console.error(
                "Products API:",
                response.status,
                text
            );

            throw new Error(
                `Backend error ${response.status}`
            );
        }

        const data =
            await response.json();

        console.log(
            "Products:",
            data
        );


        // ==================================================
        // ACCEPT ARRAY
        // ==================================================

        if (Array.isArray(data)) {

            allProducts = data;

        }

        // Safety for old backend response
        else if (
            data &&
            Array.isArray(data.products)
        ) {

            allProducts =
                data.products;

        }

        else if (
            data &&
            Array.isArray(data.rows)
        ) {

            allProducts =
                data.rows.map(
                    row => {

                        const values =
                            row.data || {};

                        return {

                            id:
                                row.id,

                            row_number:
                                row.row_number,

                            name:
                                getDisplayName(
                                    values,
                                    row.row_number
                                ),

                            confidence:
                                row.quality || 0,

                            status:
                                row.status ||
                                "Needs Review",

                            data:
                                values

                        };

                    }
                );

        }

        else {

            allProducts = [];

        }


        currentPage = 1;

        renderProducts();

    }

    catch (error) {

        console.error(
            "Unable to load products:",
            error
        );

        container.innerHTML = `

            <div class="product-card">

                <h3>
                    Unable to load products
                </h3>

                <p>
                    Backend could not be reached.
                </p>

                <button
                    class="button"
                    onclick="loadProducts()"
                >
                    Try Again
                </button>

            </div>

        `;

    }

}


// ======================================================
// RENDER PRODUCTS
// ======================================================

function renderProducts() {

    const container =
        document.getElementById(
            "productsContainer"
        );

    if (!container) {
        return;
    }


    if (
        !Array.isArray(allProducts) ||
        allProducts.length === 0
    ) {

        container.innerHTML = `

            <div class="product-card">

                <h3>
                    No dataset available
                </h3>

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

        return;

    }


    const start =
        (
            currentPage - 1
        ) *
        PRODUCTS_PER_PAGE;


    const end =
        start +
        PRODUCTS_PER_PAGE;


    const pageProducts =
        allProducts.slice(
            start,
            end
        );


    // ==================================================
    // DETECT COLUMNS DYNAMICALLY
    // ==================================================

    const columns =
        getDynamicColumns(
            pageProducts
        );


    let html = `

        <div
            class="product-table-wrapper"
            style="
                width:100%;
                overflow:auto;
                max-height:650px;
            "
        >

            <table
                style="
                    width:100%;
                    min-width:900px;
                    border-collapse:collapse;
                "
            >

                <thead>

                    <tr>

                        <th>#</th>

    `;


    columns.forEach(
        column => {

            html += `
                <th>
                    ${escapeHTML(column)}
                </th>
            `;

        }
    );


    html += `

                        <th>
                            Quality
                        </th>

                        <th>
                            Status
                        </th>

                        <th>
                            Action
                        </th>

                    </tr>

                </thead>

                <tbody>

    `;


    pageProducts.forEach(
        (product, index) => {

            const data =
                product.data || {};


            const number =
                product.row_number ||
                (
                    start +
                    index +
                    1
                );


            html += `

                <tr>

                    <td>
                        ${number}
                    </td>

            `;


            columns.forEach(
                column => {

                    html += `

                        <td>
                            ${escapeHTML(
                                data[column]
                            )}
                        </td>

                    `;

                }
            );


            html += `

                    <td>

                        <strong>
                            ${Number(
                                product.confidence || 0
                            )}%
                        </strong>

                    </td>


                    <td>

                        <span class="status">
                            ${escapeHTML(
                                product.status ||
                                "Needs Review"
                            )}
                        </span>

                    </td>


                    <td>

                        <button
                            type="button"
                            class="button"
                            onclick="viewProduct('${product.id}')"
                        >
                            View
                        </button>

                    </td>

                </tr>

            `;

        }
    );


    html += `

                </tbody>

            </table>

        </div>

    `;


    // ==================================================
    // PAGINATION
    // ==================================================

    const totalPages =
        Math.ceil(
            allProducts.length /
            PRODUCTS_PER_PAGE
        );


    html += `

        <div
            style="
                display:flex;
                justify-content:center;
                align-items:center;
                gap:15px;
                margin-top:25px;
            "
        >

            <button
                class="button"
                onclick="previousPage()"
                ${currentPage === 1 ? "disabled" : ""}
            >
                ← Previous
            </button>


            <span>
                Page
                <strong>
                    ${currentPage}
                </strong>
                of
                <strong>
                    ${totalPages}
                </strong>

                &nbsp; | &nbsp;

                ${allProducts.length}
                products
            </span>


            <button
                class="button"
                onclick="nextPage()"
                ${currentPage === totalPages ? "disabled" : ""}
            >
                Next →
            </button>

        </div>

    `;


    container.innerHTML =
        html;

}


// ======================================================
// DYNAMIC COLUMNS
// ======================================================

function getDynamicColumns(products) {

    const set =
        new Set();


    products.forEach(
        product => {

            const data =
                product.data || {};

            Object.keys(data).forEach(
                key => {

                    set.add(key);

                }
            );

        }
    );


    return Array.from(set);

}


// ======================================================
// DISPLAY NAME
// ======================================================

function getDisplayName(
    data,
    rowNumber
) {

    const keys =
        Object.keys(data || {});


    const preferred =
        [
            "product name",
            "product_name",
            "product",
            "name",
            "item name",
            "item",
            "title",
            "model",
            "sku"
        ];


    for (
        const wanted
        of preferred
    ) {

        const match =
            keys.find(
                key =>
                    key
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, "")
                    ===
                    wanted
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, "")
            );


        if (
            match &&
            data[match] !== null &&
            data[match] !== undefined &&
            String(data[match]).trim() !== ""
        ) {

            return data[match];

        }

    }


    for (
        const key
        of keys
    ) {

        if (
            data[key] !== null &&
            data[key] !== undefined &&
            String(data[key]).trim() !== ""
        ) {

            return data[key];

        }

    }


    return `Product ${rowNumber || ""}`;

}


// ======================================================
// VIEW PRODUCT
// ======================================================

function viewProduct(id) {

    if (
        id === undefined ||
        id === null ||
        id === ""
    ) {

        alert(
            "Invalid product ID."
        );

        return;

    }


    window.location.href =
        `product-details.html?id=${encodeURIComponent(id)}`;

}


// ======================================================
// PAGINATION
// ======================================================

function previousPage() {

    if (
        currentPage > 1
    ) {

        currentPage--;

        renderProducts();

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }

}


function nextPage() {

    const totalPages =
        Math.ceil(
            allProducts.length /
            PRODUCTS_PER_PAGE
        );


    if (
        currentPage < totalPages
    ) {

        currentPage++;

        renderProducts();

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }

}


// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
    ) {

        return "Not Available";

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


// ======================================================
// START
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        loadProducts();

    }
);