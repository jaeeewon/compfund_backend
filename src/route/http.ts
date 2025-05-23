import axios from "axios";
import express from "express";
import { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } from "../config/index.js";
import sharp from "sharp";
import { ticketModel, userModel } from "../database/index.js";
import { doNoti } from "../tools/index.js";

export const oauthRoute = express.Router();

oauthRoute.get("/callback", async (req, res) => {
  try {
    const ticket = req.query.state;
    const code = req.query.code;
    const tokenRes = await axios.post(`https://oauth2.googleapis.com/token`, {
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    });
    const userInfo = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokenRes.data.access_token}`,
        },
      }
    );

    console.log(tokenRes.data);
    console.log(userInfo.data);

    let message =
      "티켓이 제공되지 않아 채팅 프로그램 로그인에 실패했습니다.<br/>채팅 프로그램을 통해 접속했는지 확인해주세요!";

    if (ticket) {
      const response = await axios.get(userInfo.data.picture, {
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

      const base64Raw = rawBuffer.toString("base64");

      const status = await userModel.updateOne(
        { id: userInfo.data.sub },
        {
          $set: {
            email: userInfo.data.email,
            id: userInfo.data.sub,
            name: userInfo.data.given_name,
            nickname: "*" + userInfo.data.given_name + "*",
            picture: base64Raw,
            picture_url: userInfo.data.picture,
          },
        },
        { upsert: true }
      );

      if (status.upsertedCount) message = "회원가입";
      else message = "로그인";

      const upd = await ticketModel.updateOne(
        { id: ticket, status: 0, validUntil: { $gte: Date.now() } },
        { $set: { status: 1, sub: userInfo.data.sub } }
      );
      if (upd.modifiedCount)
        message +=
          "에 성공했습니다!<br/>채팅 프로그램으로 돌아가 계속 진행하세요!";
      else
        message = `티켓이 존재하지 않거나 만료돼 ${message}에 실패했습니다!<br/>채팅 프로그램으로 돌아가 다시 ${message}을 진행해주세요!`;
    }

    const html = `<h1>구글 로그인 성공</h1>
  <img src="${userInfo.data.picture}"/>
  <br/>
  <h3>${userInfo.data.name} (<strong>${userInfo.data.given_name}</strong>)</h3>
  <span>email <strong>${userInfo.data.email}</strong></span>
  <hr/>
  <span>${message}</span>`;

    await doNoti({
      title: `${userInfo.data.name}이(가) 로그인했습니다.`,
      body: `반환 메시지: ${message}`,
    });

    return res.send(html);
  } catch (e) {
    console.error(e.message);
    let message = "에러가 발생하여 진행할 수 없습니다.";
    if (e?.response?.data) {
      message += ` ${e.response.data?.error} (${e.response.data?.error_description})`;
    }
    const html = `<h1>에러 발생</h1>
    <hr/>
    <h3>${message}</h3>`;
    return res.send(html);
  }
});

oauthRoute.get("/login", (req: express.Request, res: express.Response) =>
  res.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=profile email${
      req.query.ticket ? `&state=${req.query.ticket}` : ""
    }` // &access_type=offline&prompt=consent`
  )
);

oauthRoute.get(
  "/login-with-ticket",
  async (req: express.Request, res: express.Response) => {
    const ticket = Math.random().toString(36).slice(2);
    await ticketModel.create({ id: ticket });
    return res.json({
      success: true,
      data: {
        ticket,
        url: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=profile email&state=${ticket}`, // &access_type=offline&prompt=consent`,
      },
    });
  }
);

/*
oauthRoute.get(
  "/check-ticket",
  async (req: express.Request, res: express.Response) => {
    const ticket = await ticketModel.findOne({ id: req.query.ticket });
    if (!ticket) {
      return res.status(400).json({ success: false, message: "no-ticket" });
    }

    if (Date.now() > ticket.validUntil) {
      return res
        .status(400)
        .json({ success: false, message: "ticket-expired" });
    }

    if (ticket.status === 0) {
      return res.status(400).json({ success: false, message: "unauth-ticket" });
    } else if (ticket.status === 1) {
      await ticket.deleteOne();
      const user = await userModel.findOne({ id: ticket.sub });
      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          nickname: user.nickname,
          picture: user.picture,
        },
      });
      user.latest_access = Date.now();
      return await user.save();
    } else {
      return res.json({ success: false, message: "recalled-ticket" });
    }
  }
);
*/
