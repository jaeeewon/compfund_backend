import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.join(path.resolve(), ".env") });

export const CLIENT_ID = process.env.CLIENT_ID;
export const CLIENT_SECRET = process.env.CLIENT_SECRET;
export const REDIRECT_URI = process.env.REDIRECT_URI;
export const DB_URI = process.env.DB_URI;
export const DEV_SUB = process.env.DEV_SUB;
export const NOTI_UUID = process.env.NOTI_UUID;
export const NOTI_TOUUID = process.env.NOTI_TOUUID;
export const NOTI_TOKEN = process.env.NOTI_TOKEN;
export const NOTI_BASE_URL = process.env.NOTI_BASE_URL;
export const HOST = process.env.HOST;
