import {v2 as cloudinary} from "cloudinary"
import dotenv from "dotenv"
dotenv.config()
import fs from "fs"
import { logger } from "./logger.js"


cloudinary.config({
cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
api_key:process.env.CLOUDINARY_API_KEY,
api_secret:process.env.CLOUDINARY_API_SECRET,
}) ;


const uploadonCloudinary=async(localFilePath, resourceType = "auto") =>{
    try{
        if(!localFilePath){
            logger.warn("uploadonCloudinary called with no local file path");
            return null;
        }
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:resourceType,
        });
        fs.unlinkSync(localFilePath);
        return response;
    }
    catch(err){
        logger.error("Cloudinary upload error:", err);

        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }

        return null;
    }
}

/**
 * Deletes an asset from Cloudinary given its secure URL.
 * Extracts the public id from the URL (handles an optional version segment).
 */
const deleteFromCloudinary = async (url, resourceType = "image") => {
    try {
        if (!url) return;
        const parts = url.split("/");
        const fileWithExt = parts.pop();
        const publicId = fileWithExt.split(".")[0];
        if (!publicId) return;
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (err) {
        logger.error("Cloudinary delete error:", err);
    }
};

export {uploadonCloudinary, deleteFromCloudinary};