const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = 3000;

// Make sure uploads folder exists
const uploadsFolder = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsFolder)) {
    fs.mkdirSync(uploadsFolder, { recursive: true });
}

// Multer configuration
const upload = multer({
    dest: uploadsFolder,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            "image/jpeg",
            "image/png"
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only JPG, JPEG and PNG images are allowed."));
        }
    }
});

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

// Plant identification endpoint
app.post("/identify", upload.single("image"), async (req, res) => {

    let imagePath = null;

    try {

        console.log("=================================");
        console.log("Plant identification request");
        console.log("=================================");

        // Check API key
        if (!process.env.PLANTNET_API_KEY) {
            return res.status(500).json({
                error: "PLANTNET_API_KEY is missing from .env"
            });
        }

        // Check uploaded image
        if (!req.file) {
            return res.status(400).json({
                error: "No image uploaded."
            });
        }

        imagePath = req.file.path;

        console.log("Image received:");
        console.log("Original name:", req.file.originalname);
        console.log("MIME type:", req.file.mimetype);
        console.log("Size:", req.file.size, "bytes");

        // Read image
        const imageBuffer = fs.readFileSync(imagePath);

        // Create multipart FormData
        const formData = new FormData();

        const imageBlob = new Blob(
            [imageBuffer],
            {
                type: req.file.mimetype
            }
        );

        /*
         * Pl@ntNet expects the image under "images".
         */
        formData.append(
            "images",
            imageBlob,
            req.file.originalname
        );

        /*
         * Optional organ field.
         * "auto" lets Pl@ntNet determine the plant organ.
         */
        formData.append("organs", "auto");

        const plantNetUrl =
            "https://my-api.plantnet.org/v2/identify/all" +
            "?api-key=" +
            encodeURIComponent(process.env.PLANTNET_API_KEY);

        console.log("Sending image to Pl@ntNet...");

        // IMPORTANT:
        // Do NOT manually set Content-Type.
        // fetch() creates the multipart boundary automatically.
        const response = await fetch(plantNetUrl, {
            method: "POST",
            body: formData
        });

        const responseText = await response.text();

        console.log("Pl@ntNet status:", response.status);
        console.log("Pl@ntNet response:", responseText);

        // Delete temporary upload
        if (imagePath && fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
            imagePath = null;
        }

        // Try to parse JSON
        let data;

        try {
            data = JSON.parse(responseText);
        } catch {
            data = {
                error: responseText || "Invalid response from Pl@ntNet."
            };
        }

        // Pl@ntNet returned an error
        if (!response.ok) {
            return res.status(response.status).json({
                error: data.message || data.error || "Pl@ntNet API request failed.",
                details: data
            });
        }

        // Successful response
        return res.json(data);

    } catch (error) {

        console.error("Server error:", error);

        // Clean up uploaded file if something failed
        if (imagePath && fs.existsSync(imagePath)) {
            try {
                fs.unlinkSync(imagePath);
            } catch (cleanupError) {
                console.error("Could not delete temporary file:", cleanupError);
            }
        }

        return res.status(500).json({
            error: error.message || "Internal server error."
        });
    }
});

// Multer errors
app.use((error, req, res, next) => {

    if (error instanceof multer.MulterError) {

        return res.status(400).json({
            error: `Upload error: ${error.message}`
        });
    }

    if (error) {

        return res.status(400).json({
            error: error.message
        });
    }

    next();
});

// Start server
app.listen(PORT, () => {

    console.log("");
    console.log("=================================");
    console.log("🌿 PlantAI Server");
    console.log("=================================");
    console.log(`Server running at: http://localhost:${PORT}`);
    console.log("=================================");
    console.log("");
});