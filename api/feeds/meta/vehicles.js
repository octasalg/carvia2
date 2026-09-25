import { createMetaVehicleFeedResponse } from "../../../server/metaVehicleFeed.js";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).end();
  }

  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "localhost").split(",")[0].trim();
  const format = req.query?.format === "xml" ? "xml" : "csv";
  const response = await createMetaVehicleFeedResponse({
    requestUrl: `${proto}://${host}${req.url}`,
    format,
  });

  for (const [name, value] of Object.entries(response.headers)) res.setHeader(name, value);
  res.status(response.status);
  return req.method === "HEAD" ? res.end() : res.send(response.body);
}
