const API_URL =
    "https://productintelligence-lzcn.onrender.com/";


// ============================================================
// ELEMENTS
// ============================================================

const fileInput =
    document.getElementById("fileInput");

const dropZone =
    document.getElementById("dropZone");

const fileInfo =
    document.getElementById("fileInfo");

const fileName =
    document.getElementById("fileName");

const fileSize =
    document.getElementById("fileSize");

const uploadBtn =
    document.getElementById("uploadBtn");

const message =
    document.getElementById("message");

const successModal =
    document.getElementById("successModal");

const successText =
    document.getElementById("successText");

const currentDatasetContent =
    document.getElementById(
        "currentDatasetContent"
    );

const datasetStatus =
    document.getElementById(
        "datasetStatus"
    );

const deleteMessage =
    document.getElementById(
        "deleteMessage"
    );

const deleteModal =
    document.getElementById(
        "deleteModal"
    );

const deleteConfirmText =
    document.getElementById(
        "deleteConfirmText"
    );

const confirmDeleteBtn =
    document.getElementById(
        "confirmDeleteBtn"
    );


// ============================================================
// STORE CURRENT DATASET
// ============================================================

let currentDataset = null;


// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        loadCurrentDataset();

    }
);


// ============================================================
// FILE SELECTED
// ============================================================

if (fileInput) {

    fileInput.addEventListener(
        "change",
        function() {

            if (
                fileInput.files.length > 0
            ) {

                showFile(
                    fileInput.files[0]
                );

            }

        }
    );

}


// ============================================================
// SHOW SELECTED FILE
// ============================================================

function showFile(file) {

    fileInfo.style.display =
        "block";

    fileName.innerText =
        "📄 " + file.name;

    fileSize.innerText =
        formatFileSize(
            file.size
        );

    message.innerText = "";

}


// ============================================================
// FORMAT FILE SIZE
// ============================================================

function formatFileSize(bytes) {

    if (bytes < 1024) {

        return bytes + " B";

    }

    if (bytes < 1024 * 1024) {

        return (
            (bytes / 1024).toFixed(1)
            + " KB"
        );

    }

    return (
        (bytes / (1024 * 1024)).toFixed(1)
        + " MB"
    );

}


// ============================================================
// DRAG OVER
// ============================================================

if (dropZone) {

    dropZone.addEventListener(
        "dragover",
        function(event) {

            event.preventDefault();

            dropZone.classList.add(
                "dragover"
            );

        }
    );

}


// ============================================================
// DRAG LEAVE
// ============================================================

if (dropZone) {

    dropZone.addEventListener(
        "dragleave",
        function() {

            dropZone.classList.remove(
                "dragover"
            );

        }
    );

}


// ============================================================
// DROP FILE
// ============================================================

if (dropZone) {

    dropZone.addEventListener(
        "drop",
        function(event) {

            event.preventDefault();

            dropZone.classList.remove(
                "dragover"
            );

            const files =
                event.dataTransfer.files;

            if (
                files.length > 0
            ) {

                try {

                    fileInput.files =
                        files;

                } catch (error) {

                    console.log(
                        "Could not assign dropped file."
                    );

                }

                showFile(
                    files[0]
                );

            }

        }
    );

}


// ============================================================
// UPLOAD DATASET
// ============================================================

if (uploadBtn) {

    uploadBtn.addEventListener(
        "click",
        async function() {

            if (
                fileInput.files.length === 0
            ) {

                showError(
                    "Please select a dataset first."
                );

                return;

            }


            const file =
                fileInput.files[0];


            uploadBtn.disabled =
                true;

            uploadBtn.innerText =
                "Processing Dataset...";


            message.style.color =
                "#2563eb";

            message.innerText =
                "Uploading and analysing your dataset...";


            const formData =
                new FormData();


            formData.append(
                "file",
                file
            );


            try {

                const response =
                    await fetch(
                        API_URL +
                        "/upload-dataset",
                        {
                            method: "POST",
                            body: formData
                        }
                    );


                const data =
                    await response.json();


                console.log(
                    "Backend:",
                    data
                );


                if (
                    response.ok &&
                    data.success
                ) {

                    message.innerText = "";

                    successText.innerHTML =

                        `
                        <strong>
                            ${escapeHTML(data.filename)}
                        </strong>
                        was uploaded successfully.

                        <br><br>

                        <strong>
                            ${data.rows}
                        </strong>
                        rows and

                        <strong>
                            ${data.columns}
                        </strong>
                        columns were detected.
                        `;


                    successModal.classList.add(
                        "show"
                    );


                    fileInput.value = "";

                    fileInfo.style.display =
                        "none";


                    // Refresh current dataset

                    await loadCurrentDataset();

                }

                else {

                    showError(
                        data.detail ||
                        "Dataset processing failed."
                    );

                }

            }

            catch(error) {

                console.error(
                    "Upload error:",
                    error
                );


                showError(
                    "Cannot connect to the backend. Make sure FastAPI is running."
                );

            }


            uploadBtn.disabled =
                false;

            uploadBtn.innerText =
                "Upload Dataset";

        }
    );

}


// ============================================================
// LOAD CURRENT DATASET
// ============================================================

async function loadCurrentDataset() {

    try {

        datasetStatus.innerText =
            "Checking...";


        const response =
            await fetch(
                API_URL +
                "/dataset"
            );


        const data =
            await response.json();


        console.log(
            "Current dataset:",
            data
        );


        if (
            data.success &&
            data.dataset
        ) {

            currentDataset =
                data.dataset;


            datasetStatus.innerText =
                "Uploaded";


            datasetStatus.style.background =
                "#dcfce7";

            datasetStatus.style.color =
                "#15803d";


            displayCurrentDataset(
                data.dataset
            );

        }

        else {

            currentDataset =
                null;


            datasetStatus.innerText =
                "No Dataset";


            datasetStatus.style.background =
                "#f1f5f9";

            datasetStatus.style.color =
                "#64748b";


            displayNoDataset();

        }

    }

    catch(error) {

        console.error(
            "Dataset loading error:",
            error
        );


        currentDataset =
            null;


        datasetStatus.innerText =
            "Unavailable";


        datasetStatus.style.background =
            "#fee2e2";

        datasetStatus.style.color =
            "#dc2626";


        currentDatasetContent.innerHTML =

            `
            <div class="no-dataset">

                <div class="no-dataset-icon">
                    ⚠️
                </div>

                <h3>
                    Unable to load dataset
                </h3>

                <p>
                    Make sure FastAPI is running.
                </p>

            </div>
            `;

    }

}


// ============================================================
// DISPLAY CURRENT DATASET
// ============================================================

function displayCurrentDataset(
    dataset
) {

    const filename =
        dataset.filename ||
        "Unnamed Dataset";


    const rows =
        dataset.rows_count ??
        0;


    const columns =
        dataset.columns_count ??
        0;


    const fileType =
        dataset.file_type
        ? dataset.file_type
            .replace(".", "")
            .toUpperCase()
        : "FILE";


    currentDatasetContent.innerHTML =

        `
        <div class="dataset-file">


            <div class="dataset-left">


                <div class="dataset-icon">
                    📄
                </div>


                <div class="dataset-info">


                    <div
                        class="dataset-name"
                        title="${escapeHTML(filename)}"
                    >
                        ${escapeHTML(filename)}
                    </div>


                    <div class="dataset-meta">

                        ${fileType}

                        &nbsp;•&nbsp;

                        ${rows} rows

                        &nbsp;•&nbsp;

                        ${columns} columns

                    </div>


                </div>


            </div>


            <button
                class="delete-dataset-btn"
                onclick="openDeleteModal()"
            >

                🗑 Delete Dataset

            </button>


        </div>
        `;

}


// ============================================================
// DISPLAY NO DATASET
// ============================================================

function displayNoDataset() {

    currentDatasetContent.innerHTML =

        `
        <div class="no-dataset">

            <div class="no-dataset-icon">
                📂
            </div>

            <h3>
                No Dataset Uploaded
            </h3>

            <p>
                Upload a dataset above to
                start analysing product information.
            </p>

        </div>
        `;

}


// ============================================================
// OPEN DELETE MODAL
// ============================================================

function openDeleteModal() {

    if (!currentDataset) {

        return;

    }


    const filename =
        currentDataset.filename ||
        "this dataset";


    deleteConfirmText.innerHTML =

        `
        Are you sure you want to delete

        <strong>
            ${escapeHTML(filename)}
        </strong>?

        <br><br>

        This will remove the dataset
        from Product Intelligence AI.

        <br>

        <strong>
            This action cannot be undone.
        </strong>
        `;


    confirmDeleteBtn.disabled =
        false;


    confirmDeleteBtn.innerText =
        "Yes, Delete";


    deleteModal.classList.add(
        "show"
    );

}


// ============================================================
// CLOSE DELETE MODAL
// ============================================================

function closeDeleteModal() {

    deleteModal.classList.remove(
        "show"
    );

}


// ============================================================
// DELETE DATASET
// ============================================================

async function deleteDataset() {

    if (!currentDataset) {

        closeDeleteModal();

        return;

    }


    confirmDeleteBtn.disabled =
        true;


    confirmDeleteBtn.innerText =
        "Deleting...";


    try {

        const response =
            await fetch(
                API_URL +
                "/dataset",
                {
                    method: "DELETE"
                }
            );


        const data =
            await response.json();


        console.log(
            "Delete response:",
            data
        );


        if (
            response.ok &&
            data.success
        ) {

            currentDataset =
                null;


            closeDeleteModal();


            datasetStatus.innerText =
                "No Dataset";


            datasetStatus.style.background =
                "#f1f5f9";

            datasetStatus.style.color =
                "#64748b";


            displayNoDataset();


            showDeleteSuccess(
                data.message ||
                "Dataset deleted successfully."
            );


            // Clear selected upload file

            fileInput.value = "";

            fileInfo.style.display =
                "none";


        }

        else {

            showDeleteError(
                data.message ||
                data.detail ||
                "Unable to delete dataset."
            );

        }

    }

    catch(error) {

        console.error(
            "Delete error:",
            error
        );


        showDeleteError(
            "Cannot connect to the backend. Make sure FastAPI is running."
        );

    }


    confirmDeleteBtn.disabled =
        false;

    confirmDeleteBtn.innerText =
        "Yes, Delete";

}


// ============================================================
// DELETE SUCCESS MESSAGE
// ============================================================

function showDeleteSuccess(
    text
) {

    deleteMessage.className =
        "delete-message success";


    deleteMessage.innerHTML =
        "✓ " + escapeHTML(text);


    deleteMessage.style.display =
        "block";


    setTimeout(
        function() {

            deleteMessage.style.display =
                "none";

        },
        5000
    );

}


// ============================================================
// DELETE ERROR MESSAGE
// ============================================================

function showDeleteError(
    text
) {

    deleteMessage.className =
        "delete-message error";


    deleteMessage.innerHTML =
        "❌ " + escapeHTML(text);


    deleteMessage.style.display =
        "block";

}


// ============================================================
// NORMAL UPLOAD ERROR
// ============================================================

function showError(text) {

    message.style.color =
        "#dc2626";

    message.innerText =
        "❌ " + text;

}


// ============================================================
// CLOSE SUCCESS MODAL
// ============================================================

function closeModal() {

    successModal.classList.remove(
        "show"
    );

}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(value) {

    const div =
        document.createElement(
            "div"
        );

    div.innerText =
        value;

    return div.innerHTML;

}


// ============================================================
// CLOSE DELETE MODAL WHEN CLICKING OUTSIDE
// ============================================================

if (deleteModal) {

    deleteModal.addEventListener(
        "click",
        function(event) {

            if (
                event.target ===
                deleteModal
            ) {

                closeDeleteModal();

            }

        }
    );

}