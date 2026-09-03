const plantImage = document.getElementById("plantImage");
const chooseButton = document.getElementById("chooseButton");
const uploadArea = document.getElementById("uploadArea");

const previewContainer = document.getElementById("previewContainer");
const previewImage = document.getElementById("previewImage");

const identifyButton = document.getElementById("identifyButton");
const loading = document.getElementById("loading");

const resultSection = document.getElementById("resultSection");
const plantName = document.getElementById("plantName");
const scientificName = document.getElementById("scientificName");
const confidence = document.getElementById("confidence");
const topResults = document.getElementById("topResults");


// ------------------------------------
// Choose Image
// ------------------------------------

chooseButton.addEventListener("click", () => {
    plantImage.click();
});


// ------------------------------------
// Image Selected
// ------------------------------------

plantImage.addEventListener("change", () => {

    const file = plantImage.files[0];

    if (!file) {
        return;
    }

    // Check image type
    if (!["image/jpeg", "image/png"].includes(file.type)) {

        alert("Please select a JPG, JPEG or PNG image.");

        plantImage.value = "";

        return;
    }

    // Create preview
    const imageURL = URL.createObjectURL(file);

    previewImage.src = imageURL;

    previewContainer.hidden = false;

    resultSection.hidden = true;
});


// ------------------------------------
// Identify Plant
// ------------------------------------

identifyButton.addEventListener("click", identifyPlant);


async function identifyPlant() {

    const file = plantImage.files[0];

    if (!file) {

        alert("Please select an image first.");

        return;
    }

    // Show loading
    loading.hidden = false;
    previewContainer.hidden = true;
    resultSection.hidden = true;

    identifyButton.disabled = true;

    try {

        console.log("Uploading image...");

        const formData = new FormData();

        /*
         * This "image" must match:
         *
         * upload.single("image")
         *
         * in server.js.
         */
        formData.append("image", file);

        const response = await fetch("/identify", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        console.log("Server response:", data);

        if (!response.ok) {

            throw new Error(
                data.error ||
                "Plant identification failed."
            );
        }

        displayResults(data);

    } catch (error) {

        console.error("Identification error:", error);

        alert(
            "Unable to identify the plant.\n\n" +
            error.message
        );

    } finally {

        loading.hidden = true;

        identifyButton.disabled = false;

        previewContainer.hidden = false;
    }
}


// ------------------------------------
// Display Results
// ------------------------------------

function displayResults(data) {

    console.log("Pl@ntNet data:", data);

    resultSection.hidden = false;


    // --------------------------------
    // Get best result
    // --------------------------------

    const results = data.results || [];

    if (results.length === 0) {

        plantName.textContent = "Plant Not Identified";

        scientificName.textContent =
            "No confident identification was found.";

        confidence.textContent = "0%";

        topResults.innerHTML =
            "<p>No identification results were returned.</p>";

        return;
    }


    const bestResult = results[0];


    // --------------------------------
    // Plant name
    // --------------------------------

    const commonNames =
        bestResult.species?.commonNames || [];

    const scientific =
        bestResult.species?.scientificName ||
        "Unknown species";


    if (commonNames.length > 0) {

        plantName.textContent = commonNames[0];

    } else {

        plantName.textContent = scientific;
    }


    // --------------------------------
    // Scientific name
    // --------------------------------

    scientificName.textContent = scientific;


    // --------------------------------
    // Confidence
    // --------------------------------

    const score =
        typeof bestResult.score === "number"
            ? bestResult.score
            : 0;

    confidence.textContent =
        `${(score * 100).toFixed(1)}%`;


    // --------------------------------
    // Top results
    // --------------------------------

    topResults.innerHTML = "";


    results.slice(0, 5).forEach((result, index) => {

        const species =
            result.species || {};

        const name =
            species.scientificName ||
            "Unknown";

        const names =
            species.commonNames || [];

        const score =
            typeof result.score === "number"
                ? result.score * 100
                : 0;


        const resultElement =
            document.createElement("div");

        resultElement.className =
            "top-result";


        resultElement.innerHTML = `
            <div>
                <strong>
                    ${index + 1}. ${escapeHTML(name)}
                </strong>

                ${
                    names.length
                        ? `<small>${escapeHTML(names[0])}</small>`
                        : ""
                }
            </div>

            <strong>
                ${score.toFixed(1)}%
            </strong>
        `;


        topResults.appendChild(resultElement);

    });
}


// ------------------------------------
// Prevent HTML injection
// ------------------------------------

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}