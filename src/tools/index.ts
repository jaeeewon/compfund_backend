import axios from "axios";
import { participationModel, userModel } from "../database/index.js";
import sharp from "sharp";
import {
  NOTI_BASE_URL,
  NOTI_TOKEN,
  NOTI_TOUUID,
  NOTI_UUID,
} from "../config/index.js";

export async function doNoti({
  title,
  body,
  type = `compfund`,
  openScreen = true,
}) {
  try {
    const data = {
      uuid: NOTI_UUID,
      toUuid: NOTI_TOUUID,
      userToken: NOTI_TOKEN,
      type,
      noti: {
        notification: {
          title,
          body,
          android_channel_id: type,
        },
        data: {
          openScreen: openScreen + "",
        },
      },
    };
    const response = await axios({
      baseURL: NOTI_BASE_URL,
      timeout: 15001,
      validateStatus() {
        return true;
      },
      method: "POST",
      url: "/sendPushByUuid",
      data,
    });
    if (response.status !== 200) {
      return console.error(
        `failed to push noti: ${response?.data?.message || response.statusText}`
      );
    }
  } catch (e) {
    console.error(`failed to doNoti(${title} | ${body}): ${e.message}`);
  }
}

async function updateProfileUrlToGrayscaleBase64() {
  const target = await userModel.find();
  for (const tgt of target) {
    const response = await axios.get(tgt.picture_url, {
      responseType: "arraybuffer",
    });
    const imageBuffer = Buffer.from(response.data, "binary");

    const width = 80;
    const height = 80;

    const rawBuffer = await sharp(imageBuffer)
      .resize(width, height)
      .greyscale()
      .raw()
      .toBuffer(); // returns grayscale bytes

    const b64 = rawBuffer.toString("base64");
    console.log(
      "updated",
      tgt.name,
      "b64 len:",
      b64.length,
      "org len:",
      tgt.picture.length
    );
    tgt.picture = b64;
    await tgt.save();
  }
}

export async function getUserIdsInSameRooms(userIdString: string) {
  const targetUser = await userModel.findOne({ id: userIdString }, { _id: 1 });
  if (!targetUser) return [];

  const results = await participationModel.aggregate([
    {
      $match: { userId: targetUser._id },
    },
    {
      $lookup: {
        from: "participation",
        localField: "roomId",
        foreignField: "roomId",
        as: "others",
      },
    },
    { $unwind: "$others" },
    {
      $lookup: {
        from: "user",
        localField: "others.userId",
        foreignField: "_id",
        as: "userDetail",
      },
    },
    { $unwind: "$userDetail" },
    {
      $project: {
        userId: "$userDetail.id",
      },
    },
    {
      $group: {
        _id: "$userId",
      },
    },
    {
      $project: {
        userId: "$_id",
        _id: 0,
      },
    },
  ]);

  return results.map((doc) => doc.userId); // .filter((id) => id !== userIdString); propagate user's client too.
}
