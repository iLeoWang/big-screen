import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const {
  DB_HOST = "localhost",
  DB_PORT = "3306",
  DB_USER = "root",
  DB_PASSWORD = "123456",
  DB_DATABASE = "air_quality",
  DB_CONNECTION_LIMIT = "10",
} = process.env;

export const pool = mysql.createPool({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  waitForConnections: true,
  connectionLimit: Number(DB_CONNECTION_LIMIT),
  queueLimit: 0,
  charset: "utf8mb4",
});

export const query = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

export const pingDatabase = async () => {
  const rows = await query("SELECT 1 AS ok");
  return rows?.[0]?.ok === 1;
};
