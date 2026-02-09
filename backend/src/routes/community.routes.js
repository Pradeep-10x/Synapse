import express from "express";
import {
  createCommunity,
  joinCommunity,
  leaveCommunity,
  getCommunity,
  approveJoinRequest,
  makeAdmin,
  removeAdmin,
  getAllCommunities,
  getJoinedCommunities,
  getCreatedCommunities,
  searchCommunities,
  updateCommunity,
  removeUser,
  deleteCommunity,
  getUserJoinedCommunities
} from "../controllers/community.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = express.Router();

router.get("/", verifyJWT, getAllCommunities);
router.get("/joined", verifyJWT, getJoinedCommunities);
router.get("/user/:userId/joined", verifyJWT, getUserJoinedCommunities);
router.get("/created", verifyJWT, getCreatedCommunities);
router.get("/search", verifyJWT, searchCommunities);
router.post("/", verifyJWT, upload.fields([{ name: "avatar", maxCount: 1 }, { name: "coverImage", maxCount: 1 }]), createCommunity);
router.post("/:id/join", verifyJWT, joinCommunity);
router.post("/:id/leave", verifyJWT, leaveCommunity);
router.post("/:id/approve", verifyJWT, approveJoinRequest);
router.post("/:id/make-admin", verifyJWT, makeAdmin);
router.post("/:id/remove-admin", verifyJWT, removeAdmin);
router.post("/:id/remove-user", verifyJWT, removeUser);
router.delete("/:id", verifyJWT, deleteCommunity);
router.get("/:id", verifyJWT, getCommunity);
router.patch("/:id", verifyJWT, upload.fields([{ name: "avatar", maxCount: 1 }, { name: "coverImage", maxCount: 1 }]), updateCommunity);

export default router;
