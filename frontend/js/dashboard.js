const API = "https://productintelligence-lzcn.onrender.com/";


// ============================================================
// LOAD DASHBOARD
// ============================================================

async function loadDashboard() {

    try {

        const response =
            await fetch(`${API}/dashboard`);

        if (!response.ok) {

            throw new Error(
                "Dashboard API failed"
            );

        }

        const data =
            await response.json();

        console.log(
            "Dashboard:",
            data
        );


        // ====================================================
        // BASIC STATS
        // ====================================================

        const total =
            Number(data.total_products || 0);

        const verified =
            Number(data.verified || 0);

        const review =
            Number(data.needs_review || 0);

        const confidence =
            Number(
                data.average_confidence || 0
            );

        const missing =
            Number(
                data.missing_values || 0
            );


        setText(
            "totalProducts",
            total
        );

        setText(
            "verifiedProducts",
            verified
        );

        setText(
            "reviewProducts",
            review
        );

        setText(
            "confidence",
            `${confidence}%`
        );


        // ====================================================
        // DATA QUALITY
        // ====================================================

        const quality =
            calculateQuality(
                total,
                verified,
                confidence,
                missing,
                data.total_columns
            );


        setText(
            "heroScore",
            `${quality}%`
        );

        setText(
            "qualityCircle",
            `${quality}%`
        );


        // ====================================================
        // DATASET
        // ====================================================

        setText(
            "datasetName",
            data.dataset_name ||
            "No dataset uploaded"
        );

        setText(
            "datasetRows",
            data.total_rows || 0
        );

        setText(
            "datasetColumns",
            data.total_columns || 0
        );

        setText(
            "missingValues",
            missing
        );


        // ====================================================
        // DATASET PILL
        // ====================================================

        const pill =
            document.getElementById(
                "datasetPill"
            );

        if (pill) {

            pill.innerText =
                data.dataset_name &&
                data.dataset_name !==
                "No dataset uploaded"

                    ? `📁 ${data.dataset_name}`

                    : "No dataset uploaded";

        }


        // ====================================================
        // UPLOAD TIME
        // ====================================================

        await loadDatasetInfo();


        // ====================================================
        // STATUS BARS
        // ====================================================

        const verifiedPercent =
            total > 0
                ? Math.round(
                    (verified / total) * 100
                )
                : 0;

        const reviewPercent =
            total > 0
                ? Math.round(
                    (review / total) * 100
                )
                : 0;


        setWidth(
            "verifiedBar",
            verifiedPercent
        );

        setWidth(
            "reviewBar",
            reviewPercent
        );


        setText(
            "verifiedPercent",
            `${verifiedPercent}%`
        );

        setText(
            "reviewPercent",
            `${reviewPercent}%`
        );


        // ====================================================
        // QUALITY MESSAGE
        // ====================================================

        updateQualityMessage(
            quality,
            total
        );


        // ====================================================
        // HERO MESSAGE
        // ====================================================

        updateHeroMessage(
            quality,
            total,
            verified,
            review
        );


        // ====================================================
        // RECENT PRODUCTS
        // ====================================================

        loadRecentProducts();

    }
    catch(error) {

        console.error(
            "Dashboard error:",
            error
        );

        showDashboardError();

    }

}


// ============================================================
// QUALITY CALCULATION
// ============================================================

function calculateQuality(
    total,
    verified,
    confidence,
    missing,
    columns
) {

    if (total === 0) {

        return 0;

    }


    const verificationScore =
        (verified / total) * 100;


    let completenessScore = 100;


    if (
        columns &&
        Number(columns) > 0
    ) {

        const possibleValues =
            total * Number(columns);

        completenessScore =
            Math.max(
                0,
                100 -
                (
                    missing /
                    possibleValues
                ) * 100
            );

    }


    /*
     * Overall quality combines:
     *
     * 40% verification
     * 40% AI confidence
     * 20% completeness
     */

    const score =
        (
            verificationScore * 0.40
        ) +
        (
            confidence * 0.40
        ) +
        (
            completenessScore * 0.20
        );


    return Math.min(
        100,
        Math.round(score)
    );

}


// ============================================================
// QUALITY MESSAGE
// ============================================================

function updateQualityMessage(
    quality,
    total
) {

    const title =
        document.getElementById(
            "qualityTitle"
        );

    const description =
        document.getElementById(
            "qualityDescription"
        );


    if (!title || !description) {

        return;

    }


    if (total === 0) {

        title.innerText =
            "No dataset available";

        description.innerText =
            "Upload a product dataset to begin analysis.";

        return;

    }


    if (quality >= 90) {

        title.innerText =
            "Excellent Data Quality";

        description.innerText =
            "Your product dataset is highly complete and consistent with strong validation coverage.";

    }

    else if (quality >= 75) {

        title.innerText =
            "Good Data Quality";

        description.innerText =
            "Most product information is complete, but some records may require review.";

    }

    else if (quality >= 50) {

        title.innerText =
            "Moderate Data Quality";

        description.innerText =
            "Several product records contain incomplete or inconsistent information.";

    }

    else {

        title.innerText =
            "Needs Improvement";

        description.innerText =
            "A significant amount of product information requires enrichment or validation.";

    }

}


// ============================================================
// HERO MESSAGE
// ============================================================

function updateHeroMessage(
    quality,
    total,
    verified,
    review
) {

    const element =
        document.getElementById(
            "heroMessage"
        );

    if (!element) {

        return;

    }


    if (total === 0) {

        element.innerText =
            "Upload a product dataset to generate intelligent product insights, validation scores and quality reports.";

        return;

    }


    element.innerText =

        `${total} products analyzed. ` +

        `${verified} products are currently verified ` +

        `and ${review} require attention. ` +

        `The overall dataset quality score is ${quality}%.`;

}


// ============================================================
// DATASET INFORMATION
// ============================================================

async function loadDatasetInfo() {

    try {

        const response =
            await fetch(
                `${API}/dataset`
            );

        if (!response.ok) {

            return;

        }

        const data =
            await response.json();


        if (
            !data.success ||
            !data.dataset
        ) {

            setText(
                "uploadedAt",
                "—"
            );

            setText(
                "datasetStatus",
                "No dataset"
            );

            return;

        }


        setText(
            "uploadedAt",
            formatDate(
                data.dataset.uploaded_at
            )
        );


        setText(
            "datasetStatus",
            "Ready"
        );

    }
    catch(error) {

        console.error(
            "Dataset info error:",
            error
        );

    }

}


// ============================================================
// RECENT PRODUCTS
// ============================================================

async function loadRecentProducts() {

    const container =
        document.getElementById(
            "recentProducts"
        );


    if (!container) {

        return;

    }


    try {

        const response =
            await fetch(
                `${API}/products`
            );

        if (!response.ok) {

            throw new Error(
                "Products API failed"
            );

        }


        const products =
            await response.json();


        if (
            !Array.isArray(products) ||
            products.length === 0
        ) {

            container.innerHTML = `

                <div
                    style="
                        padding:25px;
                        text-align:center;
                        color:#64748b;
                    "
                >

                    No products available.

                    <br><br>

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


        /*
         * Show latest/first 6 products
         */

        const recent =
            products.slice(0, 6);


        let html = `

            <div
                style="
                    overflow-x:auto;
                "
            >

                <table
                    class="recent-table"
                >

                    <thead>

                        <tr>

                            <th>
                                Product
                            </th>

                            <th>
                                Brand
                            </th>

                            <th>
                                Category
                            </th>

                            <th>
                                Confidence
                            </th>

                            <th>
                                Status
                            </th>

                        </tr>

                    </thead>

                    <tbody>

        `;


        recent.forEach(
            product => {

                const status =
                    product.status ||
                    "Needs Review";


                const statusClass =
                    status === "Verified"
                        ? "verified"
                        : "review";


                html += `

                    <tr>

                        <td>
                            <strong>
                                ${escapeHTML(
                                    product.name
                                )}
                            </strong>
                        </td>

                        <td>
                            ${escapeHTML(
                                product.brand
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                product.category
                            )}
                        </td>

                        <td>
                            ${Number(
                                product.confidence || 0
                            )}%
                        </td>

                        <td>

                            <span
                                class="
                                    status-badge
                                    ${statusClass}
                                "
                            >
                                ${escapeHTML(
                                    status
                                )}
                            </span>

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
            "Recent products error:",
            error
        );

        container.innerHTML = `

            <p
                style="
                    color:#64748b;
                "
            >
                Unable to load recent products.
            </p>

        `;

    }

}


// ============================================================
// HELPERS
// ============================================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (element) {

        element.innerText =
            value;

    }

}


function setWidth(
    id,
    percentage
) {

    const element =
        document.getElementById(id);

    if (element) {

        element.style.width =
            `${percentage}%`;

    }

}


function formatDate(
    value
) {

    if (!value) {

        return "—";

    }


    try {

        return new Date(
            value
        ).toLocaleString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    }
    catch(error) {

        return value;

    }

}


function escapeHTML(
    value
) {

    if (
        value === null ||
        value === undefined
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


function showDashboardError() {

    setText(
        "heroMessage",
        "Unable to connect to the Product Intelligence backend. Please make sure FastAPI is running."
    );

}


// ============================================================
// START
// ============================================================

loadDashboard();