const API = "https://productintelligence-lzcn.onrender.com";


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

            <p>
                Loading products...
            </p>

        </div>

    `;


    try {

        const response =
            await fetch(
                `${API}/products`
            );


        if (!response.ok) {

            const errorText =
                await response.text();

            console.error(
                "Products API error:",
                response.status,
                errorText
            );

            throw new Error(
                `Backend returned ${response.status}`
            );

        }


        const products =
            await response.json();


        console.log(
            "Products received:",
            products
        );


        // ==================================================
        // NO PRODUCTS
        // ==================================================

        if (
            !Array.isArray(products) ||
            products.length === 0
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


        // ==================================================
        // TABLE
        // ==================================================

        let html = `

            <div
                class="product-table-wrapper"
                style="
                    width: 100%;
                    max-height: 600px;
                    overflow-y: auto;
                    overflow-x: auto;
                    border-radius: 10px;
                "
            >

                <table
                    style="
                        width: 100%;
                        min-width: 1000px;
                        border-collapse: collapse;
                    "
                >

                    <thead>

                        <tr>

                            <th>
                                #
                            </th>

                            <th>
                                Product
                            </th>

                            <th>
                                Brand
                            </th>

                            <th>
                                Model
                            </th>

                            <th>
                                Category
                            </th>

                            <th>
                                Power
                            </th>

                            <th>
                                Voltage
                            </th>

                            <th>
                                Confidence
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


        products.forEach(
            (product, index) => {


                // --------------------------------------------------
                // Use database ID first
                // If unavailable, use row number
                // --------------------------------------------------

                const productId =
                    product.id !== undefined &&
                    product.id !== null
                        ? product.id
                        : product.row_number;


                const productNumber =
                    product.row_number ||
                    index + 1;


                html += `

                    <tr>

                        <td>
                            ${productNumber}
                        </td>


                        <td>

                            ${escapeHTML(
                                product.name
                            )}

                        </td>


                        <td>

                            ${escapeHTML(
                                product.brand
                            )}

                        </td>


                        <td>

                            ${escapeHTML(
                                product.model
                            )}

                        </td>


                        <td>

                            ${escapeHTML(
                                product.category
                            )}

                        </td>


                        <td>

                            ${escapeHTML(
                                product.power
                            )}

                        </td>


                        <td>

                            ${escapeHTML(
                                product.voltage
                            )}

                        </td>


                        <td>

                            ${Number(
                                product.confidence || 0
                            )}%

                        </td>


                        <td>

                            <span class="status">

                                ${escapeHTML(
                                    product.status
                                )}

                            </span>

                        </td>


                        <td>

                            <button
                                type="button"
                                class="button"
                                onclick="viewProduct('${encodeURIComponent(productId)}')"
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


        container.innerHTML =
            html;


    }


    catch(error) {

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
                    Cannot connect to FastAPI.
                    Make sure the backend is running.
                </p>


                <button
                    type="button"
                    onclick="loadProducts()"
                    class="button"
                >
                    Try Again
                </button>

            </div>

        `;

    }

}


// ======================================================
// VIEW PRODUCT
// ======================================================

function viewProduct(id) {

    if (
        id === undefined ||
        id === null ||
        id === "" ||
        id === "undefined" ||
        id === "null"
    ) {

        alert(
            "Invalid product ID."
        );

        return;

    }


    const url =
        `product-details.html?id=${id}`;


    console.log(
        "Opening product:",
        url
    );


    window.location.href =
        url;

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
