// server.js
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const fetch = require('node-fetch'); // npm i node-fetch@2
const path = require('path');
const fs = require('fs');

const app = express();
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({extended:true}));

// Serve static frontend (place index.html, app.js, styles.css in ./public)
app.use(express.static(path.join(__dirname, 'public')));

// Basic rate limiter for all API endpoints
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 requests per windowMs
  message: { error: 'Too many requests, slow ya roll.' }
});
app.use('/api/', apiLimiter);

// Required env vars
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK; // keep secret!
const API_KEY = process.env.API_KEY || 'change_this_to_a_strong_secret';

// simple header validator middleware
function requireApiKey(req, res, next){
  const header = req.get('X-API-KEY') || '';
  if (header !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// Song request endpoint
app.post('/api/request-song', requireApiKey, async (req, res) => {
  const { name = 'Anonymous', song = '', note = '' } = req.body;
  if (!song || song.trim().length < 2) return res.status(400).json({ error: 'Missing song info' });

  // Build embed
  const embed = {
    title: "🎶 Song Request (Blaze Streetz)",
    description: `**${song}**\n${note || ''}`,
    color: 16711935, // neon-ish color
    fields: [
      { name: 'Requested by', value: name, inline: true },
      { name: 'Type', value: 'Custom Request', inline: true },
    ],
    footer: { text: 'BLAZE STREETZ — #1 FOR REAL HIP HOP AND R&B' },
    timestamp: new Date().toISOString()
  };

  try {
    const payload = {
      username: "BLAZE REQUESTS 🔥",
      avatar_url: "https://i.imgur.com/4M34hi2.png",
      content: `:neon: **New request** — ${song}`,
      embeds: [embed]
    };

    // Post to Discord webhook
    const resp = await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error('discord error', resp.status, txt);
      return res.status(500).json({ error: 'Failed to deliver to webhook' });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('request-song error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Voice shout endpoint (file upload)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 }, // 6MB max
  fileFilter: (req, file, cb) => {
    const ok = /audio|webm|wav|ogg|mp3/i.test(file.mimetype);
    cb(ok ? null : new Error('Invalid file type'), ok);
  }
}).single('voice');

app.post('/api/voice-shout', requireApiKey, (req, res) => {
  upload(req, res, async function(err) {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    if (!req.file) return res.status(400).json({ error: 'No voice file' });

    const name = (req.body.name || 'Anonymous').slice(0, 64);
    const note = (req.body.note || '').slice(0, 300);

    try {
      // Build a multipart/form-data payload for discord (file + payload_json)
      const form = new (require('form-data'))();
      const embed = {
        title: "🎤 Voice Shout — Blaze Streetz",
        description: `Shout from **${name}**\n${note}`,
        color: 65280,
        timestamp: new Date().toISOString()
      };
      const payloadJson = {
        username: "BLAZE VOICE 🔊",
        content: `🔥 New voice shout from **${name}**`,
        embeds: [embed]
      };
      form.append('payload_json', JSON.stringify(payloadJson));
      // attach file buffer
      form.append('file', req.file.buffer, { filename: `shout-${Date.now()}.webm` });

      const discordRes = await fetch(DISCORD_WEBHOOK, { method:'POST', body: form });

      if (!discordRes.ok) {
        const t = await discordRes.text();
        console.error('discord voice error', discordRes.status, t);
        return res.status(500).json({ error: 'Failed to send voice shout' });
      }
      return res.json({ ok: true });
    } catch (e) {
      console.error('voice-shout err', e);
      return res.status(500).json({ error: 'Server error' });
    }
  });
});

// health
app.get('/api/ping', (req, res) => res.json({ ok: true, station: 'BLAZE STREETZ' }));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`Server started on ${PORT}`));
