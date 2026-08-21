const API = "http://127.0.0.1:8000";


// ============================================================
// GET PRODUCT ID
// ============================================================

const urlParams =
    new URLSearchParams(
        window.location.search
    );


const productId =
    urlParams.get("id");


console.log(
    "Product ID from URL:",
    productId
);


// ============================================================
// ELEMENT
// ============================================================

const container =
    document.getElementById(
        "productDetails"
    );


// ============================================================
// LOAD PRODUCT
// ============================================================

async function loadProduct() {

    if (!container) {

        console.error(
            "productDetails container not found."
        );

        return;

    }


    // --------------------------------------------------------
    // Check product ID
    // --------------------------------------------------------

    if (
        !productId ||
        productId === "undefined" ||
        productId === "null"
    ) {

        showError(
            "No product ID was provided."
        );

        return;

    }


    // --------------------------------------------------------
    // Loading
    // --------------------------------------------------------

    container.innerHTML = `

        <div class="product-card">

            <h2>
                Loading Product...
            </h2>

            <p>
                Fetching product information.
            </p>

        </div>

    `;


    try {

        // ----------------------------------------------------
        // Request product
        // ----------------------------------------------------

        const response =
            await fetch(
                `${API}/products/${encodeURIComponent(productId)}`
            );


        console.log(
            "Product API response:",
            response.status
        );


        // ----------------------------------------------------
        // Handle error
        // ----------------------------------------------------

        if (!response.ok) {

            let errorMessage =
                "Unable to load product.";


            try {

                const errorData =
                    await response.json();


                if (
                    errorData.detail
                ) {

                    errorMessage =
                        errorData.detail;

                }

            }

            catch {

                // Ignore JSON parsing error

            }


            throw new Error(
                errorMessage
            );

        }


        // ----------------------------------------------------
        // Read product
        // ----------------------------------------------------

        const product =
            await response.json();


        console.log(
            "Product received:",
            product
        );


        displayProduct(
            product
        );

    }

    catch(error) {

        console.error(
            "Product loading error:",
            error
        );


        showError(
            error.message ||
            "Unable to load product."
        );

    }

}


// ============================================================
// DISPLAY PRODUCT
// ============================================================

function displayProduct(
    product
) {

    const name =
        getValue(
            product.name,
            "Unnamed Product"
        );


    const status =
        getValue(
            product.status,
            "Needs Review"
        );


    const confidence =
        Number(
            product.confidence || 0
        );


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
                        Product #${escapeHTML(
                            product.row_number ||
                            product.id ||
                            "-"
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
             PRODUCT OVERVIEW
        =================================================== -->

        <div class="product-card">

            <h2>
                Product Overview
            </h2>


            <div
                style="
                    display:grid;
                    grid-template-columns:
                        repeat(auto-fit,minmax(220px,1fr));
                    gap:18px;
                    margin-top:20px;
                "
            >

                ${infoCard(
                    "Brand",
                    product.brand
                )}

                ${infoCard(
                    "Model",
                    product.model
                )}

                ${infoCard(
                    "Category",
                    product.category
                )}

                ${infoCard(
                    "Power",
                    product.power
                )}

                ${infoCard(
                    "Voltage",
                    product.voltage
                )}

                ${infoCard(
                    "Weight",
                    product.weight
                )}

                ${infoCard(
                    "Material",
                    product.material
                )}

                ${infoCard(
                    "Country of Origin",
                    product.country
                )}

            </div>

        </div>


        <!-- ==================================================
             TECHNICAL INFORMATION
        =================================================== -->

        <div class="product-card">

            <h2>
                Technical Information
            </h2>


            <div
                style="
                    display:grid;
                    grid-template-columns:
                        repeat(auto-fit,minmax(220px,1fr));
                    gap:18px;
                    margin-top:20px;
                "
            >

                ${infoCard(
                    "Flow Rate",
                    product.flow_rate
                )}

                ${infoCard(
                    "RPM / Speed",
                    product.rpm
                )}

                ${infoCard(
                    "Warranty",
                    product.warranty
                )}

                ${infoCard(
                    "Price",
                    product.price
                )}

                ${infoCard(
                    "Rating",
                    product.rating
                )}

                ${infoCard(
                    "Stock",
                    product.stock
                )}

            </div>

        </div>


        <!-- ==================================================
             DESCRIPTION
        =================================================== -->

        <div class="product-card">

            <h2>
                Product Description
            </h2>


            <p
                style="
                    line-height:1.7;
                    color:#475569;
                    margin-top:15px;
                "
            >
                ${escapeHTML(
                    getValue(
                        product.description,
                        "No product description is available."
                    )
                )}
            </p>

        </div>


        <!-- ==================================================
             APPLICATIONS
        =================================================== -->

        <div class="product-card">

            <h2>
                Applications & Usage
            </h2>


            <p
                style="
                    line-height:1.7;
                    color:#475569;
                    margin-top:15px;
                "
            >
                ${escapeHTML(
                    getValue(
                        product.applications,
                        "Applications are not specified in the uploaded dataset."
                    )
                )}
            </p>

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
                "
            >
                This score represents how many important
                product information fields are available
                in the uploaded dataset.
            </p>

        </div>


        <!-- ==================================================
             ORIGINAL DATA
        =================================================== -->

        <div class="product-card">

            <h2>
                Original Dataset Information
            </h2>


            <div
                class="product-table-wrapper"
                style="margin-top:20px;"
            >

                <table>

                    <thead>

                        <tr>

                            <th>
                                Field
                            </th>

                            <th>
                                Value
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        ${buildRawData(
                            product.raw_data ||
                            {}
                        )}

                    </tbody>

                </table>

            </div>

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
                ← Back to Products
            </a>


            <a
                href="validation.html"
                class="button"
            >
                🔍 Validate Product
            </a>

        </div>

    `;

}


// ============================================================
// INFO CARD
// ============================================================

function infoCard(
    title,
    value
) {

    return `

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
                ${escapeHTML(title)}
            </div>


            <div
                style="
                    font-weight:600;
                    color:#0f172a;
                "
            >
                ${escapeHTML(
                    getValue(value)
                )}
            </div>

        </div>

    `;

}


// ============================================================
// RAW DATA TABLE
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
// STATUS CLASS
// ============================================================

function getStatusClass(
    status
) {

    const normalized =
        String(status)
            .toLowerCase();


    if (
        normalized.includes(
            "verified"
        )
    ) {

        return "status-verified";

    }


    if (
        normalized.includes(
            "incomplete"
        ) ||
        normalized.includes(
            "critical"
        )
    ) {

        return "status-critical";

    }


    return "status-review";

}


// ============================================================
// GET VALUE
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


    const text =
        String(value).trim();


    if (
        text === ""
    ) {

        return fallback;

    }


    return text;

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
            /^./,
            function(str) {

                return str.toUpperCase();

            }
        );

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
// ERROR
// ============================================================

function showError(
    message
) {

    container.innerHTML = `

        <div class="product-card">

            <h2>
                Unable to load product
            </h2>


            <p
                style="
                    color:#dc2626;
                    margin-top:12px;
                "
            >
                ${escapeHTML(message)}
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
                    ← Back to Products
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