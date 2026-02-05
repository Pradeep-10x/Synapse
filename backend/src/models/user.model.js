import mongoose from "mongoose";
const { Schema } = mongoose;

import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

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