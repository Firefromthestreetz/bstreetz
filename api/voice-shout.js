import FormData from "form-data";
import fetch from "node-fetch";

export const config = {
  api: { bodyParser: false }, // we handle file upload manually
};

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { DISCORD_WEBHOOK, API_KEY } = process.env;
  const key = req.headers["x-api-key"];
  if (key !== API_KEY) return res.status(401).json({ error: "Unauthorized" });

  try {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    await new Promise((resolve) => req.on("end", resolve));

    // Parse FormData manually
    const buffer = Buffer.concat(chunks);
    const contentType = req.headers["content-type"];
    if (!contentType.startsWith("multipart/form-data"))
      return res.status(400).json({ error: "Invalid content type" });

    const name = "Anonymous";

    const form = new FormData();
    form.append(
      "payload_json",
      JSON.stringify({
        username: "BLAZE VOICE 🔊",
        content: `🎤 New voice shout from **${name}**`,
      })
    );
    form.append("file", buffer, "voice.webm");

    const discordRes = await fetch(DISCORD_WEBHOOK, {
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
