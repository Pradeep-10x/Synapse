import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';
dotenv.config();

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        logger.info(`MongoDB connected successfully: ${conn.connection.host}`);
    } catch (err) {
        logger.error("MongoDB connection failed:", err);
        setTimeout(connectDB, 5000);
    }
};

export default connectDB;
