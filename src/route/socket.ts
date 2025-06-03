import http from "http";
import { WebSocket, WebSocketServer } from "ws";
import {
  chatModel,
  participationModel,
  roomModel,
  ticketModel,
  userModel,
} from "../database/index.js";
import { DEV_SUB, HOST } from "../config/index.js";
import mongoose from "mongoose";
import { doNoti } from "../tools/index.js";

let sockets: { ws: WebSocket; id: string; userId: string | null }[] = [];

interface kv {
  [key: string]: any;
}

interface res {
  type: string;
  data: { [key: string]: any };
}

async function propagateEvent(type: "message" | "read" | "status", data: kv) {
  const { roomId, chat, timestamp, userId, status } = data;

  if (type === "message") {
    const participants = (
      await participationModel.find({ roomId }).populate("userId", "id").lean()
    ).map((v) => (v.userId as any).id);

    const logonusr = sockets.filter((v) => participants.includes(v.userId));
    for (const { ws } of logonusr)
      ws.send(
        JSON.stringify({
          type: "send-message-res",
          data: { chat },
        })
      );
  } else if (type === "read") {
    const participants = (
      await participationModel.find({ roomId }).populate("userId", "id").lean()
    ).map((v) => (v.userId as any).id);

    const logonusr = sockets.filter((v) => participants.includes(v.userId));
    for (const { ws } of logonusr)
      ws.send(
        JSON.stringify({
          type: "read-chat-event",
          data: { userId, roomId, timestamp },
        })
      );
  } else if (type === "status") {
    for (const { ws } of sockets)
      ws.send(
        JSON.stringify({
          type: "status-update-event",
          data: { userId, status },
        })
      );
  }
}

async function loginHandler(type: string, data: kv): Promise<res | null> {
  const usr = (
    await userModel.aggregate([
      {
        $match: {
          id: { $nin: sockets.map((v) => v.userId) },
        },
      },
      { $sample: { size: 1 } },
      { $project: { id: 1, name: 1, _id: 0 } },
    ])
  )[0];
  const ticket = Math.random().toString(36).slice(2);
  await ticketModel.create({ id: ticket, status: 1, sub: usr.id });
  const url = `<${usr.name}(으)로 랜덤 로그인됨>`; // `${HOST}/oauth/login?ticket=${ticket}`;
  return { type: "login-res", data: { ticket, url } };
}

async function loginDevHandler(type: string, data: kv): Promise<res | null> {
  const ticket = Math.random().toString(36).slice(2);
  await ticketModel.create({
    id: ticket,
    status: 1,
    sub: DEV_SUB,
  });
  const url = `${HOST}/oauth/login?ticket=${ticket}`;
  return { type: "login-res", data: { ticket, url } };
}

async function getChatListHandler(type: string, data: kv): Promise<res | null> {
  const chats = (
    await chatModel
      .find({
        roomId: data.roomId,
      })
      .populate("userId", "id")
      .lean()
  ).map((v: any) => ({ ...v, userId: v.userId.id }));
  const participants = (
    await participationModel
      .find({ roomId: data.roomId })
      .populate("userId", "latest_access name nickname email picture id")
      .lean()
  ).map((v) => ({ ...v.userId, lastReadAt: v.lastReadAt }));
  return { type: "get-chat-list-res", data: { chats, participants } };
}

async function ticketCheckHandler(type: string, data: kv): Promise<res | null> {
  const ticket = await ticketModel.findOne({ id: data.ticket });
  if (!ticket) {
    return {
      type: "ticket-check-res",
      data: { message: "no-ticket" },
    };
  }

  if (Date.now() > ticket.validUntil) {
    return {
      type: "ticket-check-res",
      data: { message: "ticket-expired" },
    };
  }

  if (ticket.status === 0) {
    return {
      type: "ticket-check-res",
      data: { message: "unauth-ticket" },
    };
  } else if (ticket.status === 1) {
    await ticket.deleteOne();
    // const user = await userModel
    //   .findOne({ id: ticket.sub })
    //   .populate({ path: "rooms" });
    const user = await userModel.findOne({ id: ticket.sub });
    user.latest_access = Date.now();
    await user.save();
    const rooms = (
      await participationModel
        .find({ userId: user._id })
        // .populate("roomId", "roomName description latestChat")
        .populate({
          path: "roomId",
          select: "roomName description latestChat",
          populate: {
            path: "participants",
            model: "participation",
            populate: {
              path: "userId",
              model: "user",
              select: "latest_access name nickname email picture status id",
            },
          },
        })
        .lean()
    ).map((v) => v.roomId);
    return {
      type: "ticket-check-res",
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        nickname: user.nickname,
        picture: user.picture,
        status: user.status,
        rooms,
      },
    };
    // const rooms = await roomModel.aggregate([
    //   {
    //     $match: { _id: { $in: user.rooms } }, // 사용자가 참여한 방만
    //   },
    //   {
    //     $lookup: {
    //       from: "user", // users 컬렉션 (주의: 소문자 복수형)
    //       localField: "participants",
    //       foreignField: "_id", // ★ ObjectId 매칭
    //       as: "participants", // 참가자 정보
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "chat", // chats 컬렉션
    //       let: { roomId: "$_id" },
    //       pipeline: [
    //         { $match: { $expr: { $eq: ["$roomId", "$$roomId"] } } },
    //         { $sort: { createdAt: 1 } }, // 최근 채팅 순
    //         // { $limit: 10 }, // 10개 제한
    //       ],
    //       as: "chats",
    //     },
    //   },
    //   {
    //     $project: {
    //       roomName: 1,
    //       description: 1,
    //       participants: {
    //         _id: 1,
    //         name: 1,
    //         nickname: 1,
    //         // picture: 0,
    //         // picture_url: 0,
    //       },
    //       chats: {
    //         _id: 1,
    //         userId: 1,
    //         text: 1,
    //         createdAt: 1,
    //         type: 1,
    //       },
    //     },
    //   },
    // ]);
    // user.latest_access = Date.now();
    // user.save(); // 응답부터 보내쟈
    // return {
    //   type: "ticket-check-res",
    //   data: {
    //     id: user.id,
    //     email: user.email,
    //     name: user.name,
    //     nickname: user.nickname,
    //     picture: user.picture,
    //     rooms,
    //   },
    // };
  } else {
    return {
      type: "ticket-check-res",
      data: { message: "recalled-ticket" },
    };
  }
}

async function createRoomHandler(type: string, data: kv): Promise<res | null> {
  const {
    userId,
    detail: { roomName, description },
  } = data;

  const user = await userModel.findOne({ id: userId });
  if (!user) {
    return {
      type: "create-room-res",
      data: { message: "no-user" },
    };
  }

  const room = await roomModel.create({
    roomName,
    description,
    // participants: [user._id],
  });
  // .then((r) =>
  //   r.populate({
  //     path: "participants",
  //     select: "_id name nickname",
  //   })
  // );

  await participationModel.create({ userId: user._id, roomId: room._id });

  return { type: "create-room-res", data: { room } };
}

async function getRoomListHandler(type: string, data: kv): Promise<res | null> {
  const user = await userModel.findOne({ id: data.userId });
  if (!user) {
    return {
      type: "get-room-list-res",
      data: { message: "no-user" },
    };
  }

  const users_room = (
    await participationModel.find({ userId: user._id }).select("roomId").lean()
  ).map((v) => v.roomId);

  const rooms = await roomModel.find({ _id: { $nin: users_room } }).select({
    _id: 1,
    roomName: 1,
    // participants: 0,
    description: 1,
    latestChat: 1,
  });
  return { type: "get-room-list-res", data: { rooms } };
}

async function joinRoomHandler(type: string, data: kv): Promise<res | null> {
  const {
    userId,
    detail: { roomId },
  } = data;

  const user = await userModel.findOne({ id: userId });
  if (!user) {
    return {
      type: "join-room-res",
      data: { message: "no-user" },
    };
  }

  const join = await participationModel.create({
    userId: user._id,
    roomId: roomId,
  });

  const room = await roomModel.findOne({ _id: roomId });

  return { type: "join-room-res", data: { room } };
}

async function sendMessageHandler(type: string, data: kv): Promise<res | null> {
  const {
    userId,
    detail: { roomId, message },
  } = data;

  const user = await userModel.findOne({ id: userId });
  if (!user) {
    return {
      type: "send-message-res",
      data: { message: "no-user" },
    };
  }

  const room = await roomModel.findOne({
    _id: roomId,
  });

  if (!room) {
    return {
      type: "send-message-res",
      data: { message: "no-room-id" },
    };
  }

  const chat = await chatModel.create({
    roomId,
    text: message,
    type: 1,
    userId: user._id,
  });

  // 연결된 클라이언트에도 전송해줘야

  await propagateEvent("message", { roomId, chat });
  room.latestChat = new Date();
  await room.save();

  return null;
}

async function readChatHandler(type: string, data: kv): Promise<res | null> {
  const {
    userId,
    detail: { roomId },
  } = data;

  const user = await userModel.findOne({ id: userId });
  if (!user) return;

  const participation = await participationModel.findOne({
    userId: user._id,
    roomId: roomId,
  });
  if (!participation) return;
  participation.lastReadAt = Date.now();
  await participation.save();
  await propagateEvent("read", {
    roomId,
    userId,
    timestamp: participation.lastReadAt,
  });
  // console.log(
  //   `${roomId}의 ${userId}가 메시지를 읽음 | ${new Date(
  //     participation.lastReadAt
  //   ).toISOString()}`
  // );
}

async function updateStatusHandler(
  type: string,
  data: kv
): Promise<res | null> {
  const {
    userId,
    detail: { status },
  } = data;
  const usr = await userModel.findOne({ id: userId });
  if (!usr) return;

  usr.status = status;
  await usr.save();
  await propagateEvent("status", { userId, status });
}

const handler = {
  login: loginHandler,
  "login-dev": loginDevHandler,
  "ticket-check": ticketCheckHandler,
  "create-room": createRoomHandler,
  "send-message": sendMessageHandler,
  "get-room-list": getRoomListHandler,
  "join-room": joinRoomHandler,
  "get-chat-list": getChatListHandler,
  "read-chat": readChatHandler,
  "update-status": updateStatusHandler,
};

export default async function initWs(server: http.Server) {
  const wss = new WebSocketServer({ server });
  wss.on("connection", (ws, req) => {
    sockets.push({ ws, id: req.headers["sec-websocket-key"], userId: null });

    ws.on("close", async (code, reason) => {
      const userId = sockets.find((v) => v.ws === ws).userId;
      sockets = sockets.filter((v) => ws !== v.ws);
      console.log(userId || "anonymous", "disconnected!");
      if (userId) {
        const user = await userModel.findOne({ id: userId });
        const cnt = await chatModel.countDocuments({
          userId: user._id,
          createdAt: { $gte: Date.now() - 1000 * 60 * 5 },
        });
        await doNoti({
          title: `${user.name}이(가) 접속을 종료했습니다.`,
          body: `해당 유저의 최근 5분간의 메시지 개수: ${cnt}`,
        });
      }
    });

    ws.on("message", async (response) => {
      try {
        const res = response.toString();
        console.log(res);

        const { type, data } = JSON.parse(res);

        if (handler[type]) {
          const res = await handler[type](type, data);
          if (res) {
            if (res.type === "ticket-check-res" && res.data?.id) {
              sockets.find((v) => v.ws === ws).userId = res.data.id;
            }
            ws.send(JSON.stringify(res));
          }
        }
      } catch (e) {
        console.error(e);
      }
    });
  });
}
