import mongoose from "mongoose";
const { Schema} = mongoose;

/**
 * @swagger
 * components:
 *   schemas:
 *     Like:
 *       type: object
 *       required:
 *         - user
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the like
 *         post:
 *           type: string
 *           description: ID of the liked post
 *         reel:
 *           type: string
 *           description: ID of the liked reel
 *         story:
 *           type: string
 *           description: ID of the liked story
 *         user:
 *           type: string
 *           description: ID of the user who liked
 */
const likeSchema= new Schema({
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

     story : {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Story",
        default: null,
        index: true,
     },
     
     user :{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
     },
    }, { timestamps: true });

// Prevent duplicate likes (and the resulting count drift) at the DB level.
// Partial indexes so the "unused" target fields (which are null) don't collide.
likeSchema.index(
  { post: 1, user: 1 },
  { unique: true, partialFilterExpression: { post: { $type: "objectId" } } }
);
likeSchema.index(
  { reel: 1, user: 1 },
  { unique: true, partialFilterExpression: { reel: { $type: "objectId" } } }
);
likeSchema.index(
  { story: 1, user: 1 },
  { unique: true, partialFilterExpression: { story: { $type: "objectId" } } }
);

export const Like = mongoose.model("Like", likeSchema);