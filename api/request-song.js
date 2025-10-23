import fetch from "node-fetch";
import jwt from "jsonwebtoken";

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

  const { name = "Anonymous", song = "", note = "" } = req.body || {};
  if (!song.trim()) return res.status(400).json({ error: "Missing song info" });

  const embed = {
    title: "🎶 Song Request (Blaze Streetz)",
    description: `**${song}**\n${note || ""}`,
    color: 16711935,
    fields: [
      { name: "Requested by", value: name, inline: true },
      { name: "Type", value: "Custom Request", inline: true },
    ],
    footer: { text: "BLAZE STREETZ — #1 FOR REAL HIP HOP AND R&B" },
    timestamp: new Date().toISOString(),
  };

  const payload = {
    username: "BLAZE REQUESTS 🔥",
    content: `🔥 **New Request:** ${song}`,
    embeds: [embed],
  };

  try {
    const resp = await fetch(process.env.DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error(`Discord returned ${resp.status}`);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send request" });
  }
}
