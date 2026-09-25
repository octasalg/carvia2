import { createMetaConversionsResponse } from "../../server/metaConversions.js";

export default async function handler(req, res) {
  const response = await createMetaConversionsResponse({
    method: req.method,
    body: req.body,
    headers: req.headers,
  });

  for (const [name, value] of Object.entries(response.headers)) res.setHeader(name, value);
  if (response.status === 405) res.setHeader("Allow", "POST");
  return res.status(response.status).send(response.body);
}
