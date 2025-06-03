import dotenv from "dotenv";
import connectDB from "./db/index.js";
import app from "./app.js";


dotenv.config({
    path:"./.env"
});

connectDB()
.then(() => {
    app.on("ERROR", (error) => {
        console.error("Application error:", error);
        throw error;
    });

    // Start the server
    app.listen(process.env.PORT || 5000, () => {
        console.log(`Server is running on port ${process.env.PORT || 5000}`);
    });
})
.catch((error) => {
    console.error("MongoDB connection is failed:", error);
    process.exit(1); // Exit with failure
});