import FormData from "form-data";
import fetch from "node-fetch";
import jwt from "jsonwebtoken";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  await new Promise((resolve) => req.on("end", resolve));

  const buffer = Buffer.concat(chunks);
  const form = new FormData();
  form.append(
    "payload_json",
    JSON.stringify({
      username: "BLAZE VOICE 🔊",
      content: `🎤 New voice shout received`,
    })
  );
  form.append("file", buffer, "voice.webm");

  try {
    const discordRes = await fetch(process.env.DISCORD_WEBHOOK, {
      method: "POST",
      body: form,
    });
    if (!discordRes.ok)
      throw new Error(`Discord returned ${discordRes.status}`);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send voice" });
  }
}
