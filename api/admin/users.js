/* global Buffer */
import { createAdminUsersResponse } from "../../server/adminUsers.js";

/** Lee el cuerpo crudo de la petición (Vercel Node runtime). */
async function readRawBody(req) {
  if (typeof req.body === "string") return req.body;
  if (req.body && typeof req.body === "object") return JSON.stringify(req.body);
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

export default async function handler(req, res) {
  if (!["GET", "POST", "PATCH"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST, PATCH");
    return res.status(405).json({ error: "Método no permitido" });
  }

  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "localhost").split(",")[0].trim();
  const body = req.method === "GET" ? "" : await readRawBody(req);

  const response = await createAdminUsersResponse({
    method: req.method,
    requestUrl: `${proto}://${host}${req.url}`,
    authorization: req.headers.authorization,
    body,
  });

  for (const [name, value] of Object.entries(response.headers)) res.setHeader(name, value);
  return res.status(response.status).send(response.body);
}
