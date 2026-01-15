import {User} from '../models/user.model.js';
import {uploadonCloudinary} from '../utils/cloudinary.js';
import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { containsEmoji } from "../utils/noEmoji.js";
import {v2 as cloudinary} from 'cloudinary';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
dotenv.config();
import { registerUserSchema, loginUserSchema } from '../middlewares/ZodValidator.js';


const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}



const registerUser=asyncHandler(async(req, res) => {
    //const {fullName,email,password,username,bio}=req.body;
    const {data,errors}=registerUserSchema.safeParse(req.body);
    if(errors){
        throw new ApiError(400, errors.message);
    }
    const {fullName,email,password,username,bio}=data;

    const existingUser = await User.findOne({
        $or: [{email}, {username}]
    });
    if(existingUser){
        return res.status(400).json(new ApiResponse(400, null, "User with this email or username already exists"));
    }

let avatar = "";

if (req.files?.avatar && req.files.avatar[0]) {
    const avatarlocalpath = req.files.avatar[0].path;
    const uploaded = await uploadonCloudinary(avatarlocalpath, "image");
    avatar = uploaded?.url || "";
}

const user= await User.create({
    fullName,
    email,
    password,
    username:username.toLowerCase(),
    bio,
    avatar: avatar,
});
const createdUser=await User.findById(user._id).select("-password -refreshToken");
if(!createdUser){
    throw new ApiError(500, "User registration failed, please try again");
}
res.status(201).json(new ApiResponse(201, createdUser, "User registered successfully"));
})
     
const loginUser=asyncHandler(async(req,res) => {
//const {email,username,password}=req.body;
const {data,errors}=loginUserSchema.safeParse(req.body);
if(errors){
    throw new ApiError(400, errors.message);
}
const {email,username,password}=data;
if(!(email||username) || !password){
    throw new ApiError(400, "Email/username and password are required");
}
const user= await User.findOne({
    $or: [{email}, {username: username?.toLowerCase()}]
   
})
if(!user){
    throw new ApiError(401, "Invalid credentials");
}
const isPasswordMatch=await user.isPasswordCorrect(password);
if(!isPasswordMatch){
    throw new ApiError(401, "Invalid credentials");
}
const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id);
const loggedInUser=await User.findById(user._id).select("-password -refreshToken");

 const options = {
    httpOnly: true,
    
};

return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(new ApiResponse(200, loggedInUser, "User logged in successfully"));

});
    
const logoutUser=asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(req.user._id,{
        refreshToken:null
    },{
        new:true,
    });
    const options={
        httpOnly:true,
        secure:true
    }

    return res.status(200).clearCookie("accessToken",options).clearCookie("refreshToken",options).json(new ApiResponse(200,null,"User logged out successfully"))
}
)
const deleteUser=asyncHandler(async(req,res)=>{
    await User.findByIdAndDelete(req.user._id);
    return res.status(200).json(new ApiResponse(200,null,"User deleted successfully"))
}
)

const refreshaccessToken=asyncHandler(async(req,res)=>{
   const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken;
   if(!incomingRefreshToken){
    throw new ApiError(401,"Unauthorized request")
   }
    try{
        const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id)
        if(!user)
            throw new ApiError(401,"Invalid refresh token")
        if(incomingRefreshToken !== user.refreshToken){
            throw new ApiError(401,"Refresh token mismatch")
        }
        const options = {
            httpOnly: true,
            
        }
        const {accessToken, refreshToken:newrefreshToken} = await generateAccessAndRefereshTokens(user._id);
        return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", newrefreshToken, options).json(new ApiResponse(200, {
accessToken, refreshToken: newrefreshToken
        }, "Access token refreshed successfully"));
    } catch(err){
        throw new ApiError(401,"Invalid refresh token")
    }


})

const changePassword=asyncHandler(async(req,res)=>{
    const{oldPassword,newPassword}=req.body;
    const user=await User.findById(req.user._id);
    const isPasswordMatch=await user.isPasswordCorrect(oldPassword);
    if(!isPasswordMatch){
        throw new ApiError(401,"Old password is incorrect")
    }
    user.password=newPassword;
    await user.save();
    return res.status(200).json(new ApiResponse(200,null,"Password changed successfully"))
}
)
const GetCurrentUser=asyncHandler(async(req,res)=>{
return res.status(200).json(new ApiResponse(200,req.user,"Current user fetched successfully"))
})
const updateUserDetails = asyncHandler(async (req, res) => {
  const { fullName, bio, email, username } = req.body;
  if (!fullName && !bio && !email && !username) {
    throw new ApiError(400, "At least one field is required to update");
  }
  if (email || username) {
    const existedname = await User.findOne({
      $or: [{email}, {username: username?.toLowerCase()}]
    });
    if(existedname && existedname._id.toString() !== req.user._id.toString()){
      throw new ApiError(409, "This username or email is already taken");
    }
  }
  const updateFields = {};

  if (fullName) updateFields.fullName = fullName;
  if (bio) updateFields.bio = bio;
  if (email) updateFields.email = email;
  if (username) updateFields.username = username.toLowerCase();
    delete updateFields.password;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updateFields },
    { new: true }
  ).select("-password -refreshToken");

if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      user,
      "User details updated successfully"
    )
  );
});
const UpdateAvatar=asyncHandler(async(req,res)=>{
    if(!req.file){
        throw new ApiError(400,"Avatar file is required")
    }
    const filepath=req.file.path;
    const uploaded=await uploadonCloudinary(filepath, "image");
    if(!uploaded?.url){
        throw new ApiError(500,"Avatar upload failed, please try again")
    }
    const existingUser = await User.findById(req.user._id);
  if (existingUser?.avatar) {
      const publicId = existingUser.avatar
        .split("/")
        .pop()
        .split(".")[0];
    
      await cloudinary.uploader.destroy(publicId, {
        resource_type: "image"
      });
    }
    
    const user=await User.findByIdAndUpdate(req.user._id,{
        avatar:uploaded.url
    },{
        new:true,
    }).select("-password -refreshToken");
    return res.status(200).json (new ApiResponse(200,user,"Avatar updated successfully"))
}
)


export {registerUser,loginUser, logoutUser,deleteUser, refreshaccessToken,changePassword,GetCurrentUser, updateUserDetails, UpdateAvatar};