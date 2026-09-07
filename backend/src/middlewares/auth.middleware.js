import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const verifyJWT = asyncHandler(async (req, _res, next) => {
    const token =
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
        throw new ApiError(401, "Unauthorized request - no token provided");
    }

    let decodedToken;
    try {
        decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        throw new ApiError(401, "Unauthorized request - invalid or expired token");
    }

    const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
    if (!user) {
        throw new ApiError(401, "Unauthorized request - user no longer exists");
    }

    req.user = user;
    next();
});

export { verifyJWT };
