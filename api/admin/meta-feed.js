import { createAdminMetaFeedResponse } from "../../server/adminMetaFeed.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }

  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "localhost").split(",")[0].trim();
  const response = await createAdminMetaFeedResponse({
    requestUrl: `${proto}://${host}${req.url}`,
    authorization: req.headers.authorization,
  });

  for (const [name, value] of Object.entries(response.headers)) res.setHeader(name, value);
  return res.status(response.status).send(response.body);
}
