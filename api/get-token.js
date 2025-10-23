import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { key } = req.body || {};
  if (key !== process.env.API_KEY)
    return res.status(401).json({ error: "Unauthorized" });

  try {
    const token = jwt.sign(
      { station: "blaze_streetz" },
      process.env.JWT_SECRET,
      { expiresIn: process.env.TOKEN_EXPIRY || "10m" }
    );
    res.status(200).json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Token generation failed" });
  }
}
