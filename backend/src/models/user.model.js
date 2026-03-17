import mongoose from "mongoose";
const { Schema } = mongoose;

import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *         - fullName
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the user
 *         username:
 *           type: string
 *           description: Unique username
 *         email:
 *           type: string
 *           description: Unique email address
 *         fullName:
 *           type: string
 *           description: User's full name
 *         bio:
 *           type: string
 *           description: Short biography
 *         avatar:
 *           type: string
 *           description: URL to avatar image
 *         followersCount:
 *           type: number
 *           description: Number of followers
 *         followingCount:
 *           type: number
 *           description: Number of accounts followed
 *         isVerified:
 *           type: boolean
 *           description: Verification status
 *         VerificationBadge:
 *           type: string
 *           enum: [Gold, Silver]
 *           description: Badge type if verified
 *         privacy:
 *           type: object
 *           properties:
 *             privateAccount:
 *               type: boolean
 *             messagePolicy:
 *               type: string
 *               enum: [everyone, followers]
 *             allowMentions:
 *               type: boolean
 *             allowTagging:
 *               type: boolean
 *         lastActive:
 *           type: string
 *           format: date-time
 *       example:
 *         username: johndoe
 *         email: john@example.com
 *         fullName: John Doe
 *         bio: Software Developer
 */
const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
    },
    bio: {
        type: String,
        maxlength: 160,
    },
    avatar: {
        type: String,
    },
    refreshToken: {
        type: String,
    },
    followersCount: {
        type: Number,
        default: 0,
    },
    followingCount: {
        type: Number,
        default: 0,
    },

    isVerified: {
        type: Boolean,
        default: false,
    },
    VerificationBadge: {
        type: String,
        enum: ["Gold", "Silver"],
        default: null,
    },
    // Privacy settings
    privacy: {
        privateAccount: {
            type: Boolean,
            default: false
        },
        messagePolicy: {
            type: String,
            enum: ["everyone", "followers"],
            default: "everyone"
        },
        allowMentions: {
            type: Boolean,
            default: true
        },
        allowTagging: {
            type: Boolean,
            default: true
        }
    },
    lastActive: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});
userSchema.pre("save", async function () {

    if (!this.isModified("password")) return;

    this.password = await bcrypt.hash(this.password, 10);
});


userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
}

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1d"
        }
    )
}

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,

        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: "10d"
        }
    )
}
export const User = mongoose.model("User", userSchema)