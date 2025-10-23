// app.js - front-end
const cfg = window.STATION_CONFIG;
const playBtn = document.getElementById('playBtn');
const artImg = document.getElementById('artImg');
const nowTitle = document.getElementById('nowTitle');
const nowArtist = document.getElementById('nowArtist');
const listenersEl = document.getElementById('listeners');
const listenLink = document.getElementById('listenLink');
const historyList = document.getElementById('historyList');
const explicitModal = document.getElementById('explicitModal');
const ageConfirm = document.getElementById('ageConfirm');
const confirmPlay = document.getElementById('confirmPlay');
const declinePlay = document.getElementById('declinePlay');

listenLink.href = cfg.publicListenUrl || cfg.streamUrl;

let audioEl = null;
let userConfirmed = false;

// show explicit modal when user hits PLAY for the first time
playBtn.addEventListener('click', async () => {
  if (!userConfirmed) {
    explicitModal.classList.remove('hidden');
    return;
  }
  togglePlayer();
});

confirmPlay.addEventListener('click', (e) => {
  e.preventDefault();
  if (!ageConfirm || !ageConfirm.checked) {
    alert('You gotta check “I am 18 or older” fam.');
    return;
  }

  userConfirmed = true;
  if (explicitModal) {
    explicitModal.classList.add('hidden');
    explicitModal.style.display = 'none';
  }

  // Give a short delay to avoid audio autoplay blocking
  setTimeout(() => togglePlayer(), 150);
});
declinePlay.addEventListener('click', () => {
  explicitModal.classList.add('hidden');
});

function togglePlayer(){
  if (!audioEl){
    audioEl = new Audio(cfg.streamUrl);
    audioEl.crossOrigin = "anonymous";
    audioEl.play().catch(err => {
      console.warn('Autoplay blocked or play failed', err);
      alert('Autoplay blocked by browser — click play again.');
    });
    playBtn.textContent = '⏸ PAUSE';
    playBtn.dataset.playing = '1';
  } else {
    if (audioEl.paused) {
      audioEl.play();
      playBtn.textContent = '⏸ PAUSE';
    } else {
      audioEl.pause();
      playBtn.textContent = '🔊 PLAY';
    }
  }
}

// fetch now-playing and update UI
async function fetchNowPlaying(){
  try {
    const res = await fetch(cfg.azuraNowPlaying, {cache: "no-store"});
    if (!res.ok) throw new Error('Failed to fetch');
    const json = await res.json();
    const song = json.now_playing && json.now_playing.song;
    if (song){
      artImg.src = song.art || '';
      nowTitle.textContent = song.title || song.text || 'Unknown';
      nowArtist.textContent = song.artist || '';
    }
    listenersEl.textContent = `Listeners: ${json.listeners && json.listeners.current != null ? json.listeners.current : '—'}`;
    // history
    const hist = json.song_history || [];
    historyList.innerHTML = hist.slice(0,8).map((h)=>`<li>🎧 <strong>${h.song.artist}</strong> — ${h.song.title}</li>`).join('');
  } catch(e){
    console.warn('Nowplaying error', e);
  }
}

fetchNowPlaying();
setInterval(fetchNowPlaying, 12_000);

// === TOKEN HANDLING ===
let blazeToken = null;
async function getToken() {
  if (blazeToken) return blazeToken;
  const key = "bLaZeX1234_f1re$treetz!"; // your real API_KEY
  const res = await fetch("/api/get-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key })
  });
  const j = await res.json();
  if (!res.ok || !j.token) throw new Error(j.error || "Token error");
  blazeToken = j.token;
  setTimeout(() => (blazeToken = null), 8 * 60 * 1000); // expire early client-side
  return blazeToken;
}

// === SONG REQUEST ===
requestForm.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const name = document.getElementById("r-name").value.trim();
  const song = document.getElementById("r-song").value.trim();
  const note = document.getElementById("r-note").value.trim();
  requestMsg.textContent = "Sending...";

  try {
    const token = await getToken();
    const res = await fetch("/api/request-song", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name, song, note })
    });
    const j = await res.json();
    if (res.ok) {
      requestMsg.textContent = "✅ Sent to the crew — we got you!";
      requestForm.reset();
    } else requestMsg.textContent = j.error || "Failed to send request.";
  } catch (err) {
    requestMsg.textContent = err.message;
  }
});

// === VOICE SHOUT ===
sendRec.addEventListener("click", async () => {
  if (!recordedBlob) return alert("No recording yet.");
  requestMsg.textContent = "Sending voice shout...";
  const fd = new FormData();
  fd.append("voice", recordedBlob, "shout.webm");
  try {
    const token = await getToken();
    const res = await fetch("/api/voice-shout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd
    });
    const j = await res.json();
    if (res.ok) {
      requestMsg.textContent = "🔥 Voice shout sent!";
      recorderUI.classList.add("hidden");
      recordedBlob = null;
    } else requestMsg.textContent = j.error || "Failed to send voice.";
  } catch (err) {
    requestMsg.textContent = err.message;
  }
});

