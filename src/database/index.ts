import mongoose from "mongoose";
mongoose.pluralize(null);
mongoose.set("strictQuery", false);

const chatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    roomId: {
      type: mongoose.Types.ObjectId,
      ref: "room",
      required: true,
      index: true,
    },
    type: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: {
      type: Number,
      default: () => Date.now(),
    },
    // data: { type: mongoose.Types.Map },
  },
  { versionKey: false }
);
export const chatModel = mongoose.model("chat", chatSchema);

const roomSchema = new mongoose.Schema(
  {
    roomName: { type: String, required: true },
    // participants: { type: [mongoose.Types.ObjectId], ref: "user", default: [] },
    description: { type: String },
    latestChat: { type: Date, default: () => Date.now() },
  },
  {
    versionKey: false,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

roomSchema.virtual("chats", {
  ref: "chat",
  localField: "_id",
  foreignField: "roomId",
  justOne: false,
});

roomSchema.virtual("participants", {
  ref: "participation",
  localField: "_id",
  foreignField: "roomId",
});

export const roomModel = mongoose.model("room", roomSchema);

const ticketSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, required: true },
    status: { type: Number, default: 0 },
    sub: { type: String, default: null },
    validUntil: { type: Number, default: () => Date.now() + 1_000 * 60 * 5 }, // valid for 5m
  },
  {
    versionKey: false,
    timestamps: {
      createdAt: null,
      updatedAt: null,
    },
  }
);
export const ticketModel = mongoose.model("ticket", ticketSchema);

const userSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, required: true, index: true },
    picture: { type: String, required: true },
    picture_url: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    name: { type: String, required: true }, // given_name
    // rooms: [{ type: mongoose.Schema.Types.ObjectId, ref: "room" }],
    nickname: { type: String, default: "" },
    latest_access: { type: Number, default: () => Date.now() },
    status: { type: String, default: "" },
    exp: { type: Number, default: 0 },
  },
  { versionKey: false }
);
export const userModel = mongoose.model("user", userSchema);

const participationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    roomId: {
      type: mongoose.Types.ObjectId,
      ref: "room",
      required: true,
      index: true,
    },
    joinedAt: { type: Date, default: () => Date.now() },
    lastReadAt: { type: Number, default: 0 },
  },
  { versionKey: false }
);

participationSchema.index({ userId: 1, roomId: 1 }, { unique: true }); // 중복 참여 방지

export const participationModel = mongoose.model(
  "participation",
  participationSchema
);
