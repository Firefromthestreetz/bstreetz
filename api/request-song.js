import fetch from "node-fetch";

export default async function handler(req, res) {
  const { name = "Anonymous", song = "", note = "" } = req.body || {};

  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });
  if (!song || song.trim().length < 2)
    return res.status(400).json({ error: "Missing song info" });

  const { DISCORD_WEBHOOK, API_KEY } = process.env;
  const key = req.headers["165d5a44-3ae6-4fa9-86c4-e76867db3ff4"];
  if (key !== API_KEY) return res.status(401).json({ error: "Unauthorized" });

  try {
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

    const resp = await fetch(DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) throw new Error(`Discord error: ${resp.status}`);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send request" });
  }
}
