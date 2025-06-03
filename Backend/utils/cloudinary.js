import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import fs from 'fs/promises';

dotenv.config();

// Cloudinary configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET, 
});

// Check if the file exists
const fileExists = async (path) => {
    try {
        await fs.access(path);
        return true;
    } catch {
        return false;
    }
};

// Cloudinary upload function
const uploadOnCloudinary = async (localFilePath, deleteOnFailure = true) => {
    if (!localFilePath) {
        console.error("Local file path is missing.");
        return {
            success: false,
            error: "Local file path is missing.",
        };
    }

    if (!(await fileExists(localFilePath))) {
        console.error("File does not exist at path:", localFilePath);
        return {
            success: false,
            error: "File does not exist.",
        };
    }

    try {
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto',
        });
        console.log('File uploaded to Cloudinary:', response.url);

        await fs.unlink(localFilePath);
        console.log('Local file deleted:', localFilePath);

        return {
            success: true,
            url: response.url,
            publicId: response.public_id,
        };
    } catch (error) {
        console.error('Error uploading file to Cloudinary:', error.message);

        if (deleteOnFailure) {
            try {
                await fs.unlink(localFilePath);
                console.log('Local file deleted after upload failure:', localFilePath);
            } catch (unlinkError) {
                console.error('Error deleting local file:', unlinkError.message);
            }
        }

        return {
            success: false,
            error: error.message,
        };
    }
};

export default uploadOnCloudinary;
