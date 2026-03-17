import mongoose from 'mongoose';
const { Schema } = mongoose;

/**
 * @swagger
 * components:
 *   schemas:
 *     Follow:
 *       type: object
 *       required:
 *         - follower
 *         - following
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the follow relationship
 *         follower:
 *           type: string
 *           description: ID of the user who is following
 *         following:
 *           type: string
 *           description: ID of the user being followed
 */
const followSchema = new Schema({
follower :{
    type : mongoose.Schema.Types.ObjectId,
    ref : "User",
    required : true,
    index : true,
},
following :{
    type : mongoose.Schema.Types.ObjectId,
    ref : "User",
    required : true,
    index : true,
    }
},{
    timestamps : true,
})
followSchema.index(
  { follower: 1, following: 1 },
  { unique: true }
);

export const Follow = mongoose.model("Follow", followSchema);