import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import {User} from "../models/user.model.js"
import { asyncHandler } from "../utils/asyncHandler.js";
import dotenv from "dotenv";
dotenv.config();

const verifyJWT=asyncHandler(async(req,_ ,next)=>{
try{
const token = req.cookies.accessToken || req.header("Authorization")?.replace("Bearer ","")
if (!token){
    throw new ApiError(401,"unauthorized request")
}
const decodedToken=jwt.verify(token,process.env.JWT_SECRET)
const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
if(!user)
{
    throw new ApiError(401,"not found haha")
}

req.user = user;
next();
}catch(err){  
    console.log("JWT verification error", err);
    throw new ApiError(401,"unauthorized request")
}}
);

export { verifyJWT };