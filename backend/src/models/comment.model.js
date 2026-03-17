import mongoose from "mongoose";
const { Schema} = mongoose;
import { Post } from "./post.model.js";
import { User } from "./user.model.js";
import { Reel } from "./reel.model.js";

/**
 * @swagger
 * components:
 *   schemas:
 *     Comment:
 *       type: object
 *       required:
 *         - user
 *         - content
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the comment
 *         post:
 *           type: string
 *           description: ID of the post this comment belongs to
 *         reel:
 *           type: string
 *           description: ID of the reel this comment belongs to
 *         user:
 *           type: string
 *           description: ID of the user who created the comment
 *         content:
 *           type: string
 *           description: Comment text content
 *         isDeleted:
 *           type: boolean
 *           description: Soft delete flag
 */
const commentSchema= new Schema({
     post : {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
        default: null,
        index: true,
     },
         reel : {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Reel",
         default: null,
         index: true,
     },
     
     user :{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
     },

     content : {
        type: String,
        required: true,
        trim: true,
        maxlength: 500,
     },

     isDeleted : {
        type: Boolean,
        default: false,
     },
}, { timestamps: true });

export const Comment = mongoose.model("Comment", commentSchema);
 