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

// requests logic
const requestForm = document.getElementById('requestForm');
const requestMsg = document.getElementById('requestMsg');

requestForm.addEventListener('submit', async (ev)=>{
  ev.preventDefault();
  const name = document.getElementById('r-name').value.trim();
  const song = document.getElementById('r-song').value.trim();
  const note = document.getElementById('r-note').value.trim();

  requestMsg.textContent = 'Sending...';
  try {
    const res = await fetch('/api/request-song', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({name, song, note})
    });
    const j = await res.json();
    if (res.ok) {
      requestMsg.textContent = '✅ Sent to the crew — we got you!';
      requestForm.reset();
    } else {
      requestMsg.textContent = j?.error || 'Failed to send request.';
    }
  } catch(err){ requestMsg.textContent = 'Network error, try again.'; }
});

// voice recorder
let mediaRecorder, audioChunks = [], recordedBlob = null;
const recordBtn = document.getElementById('recordBtn');
const recorderUI = document.getElementById('recorder');
const stopRec = document.getElementById('stopRec');
const sendRec = document.getElementById('sendRec');
const cancelRec = document.getElementById('cancelRec');
const recTime = document.getElementById('recTime');
let recTimer=0, recInterval=null;

function startTimer(){ recTimer=0; recInterval=setInterval(()=>{ recTimer++; const mm = Math.floor(recTimer/60); const ss = String(recTimer%60).padStart(2,'0'); recTime.textContent = `${mm}:${ss}`; },1000); }
function stopTimer(){ clearInterval(recInterval); recInterval=null; recTime.textContent='0:00'; }

recordBtn.addEventListener('click', async ()=>{
  try {
    const stream = await navigator.mediaDevices.getUserMedia({audio:true});
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
      recordedBlob = new Blob(audioChunks, {type:'audio/webm'});
      // show recorder UI
      recorderUI.classList.remove('hidden');
    };
    mediaRecorder.start();
    startTimer();
    recorderUI.classList.remove('hidden');
    recorderUI.querySelector('p').textContent = 'Recording...';
  } catch(e){
    alert('Microphone access needed to record voice shout.');
  }
});

stopRec.addEventListener('click', ()=> {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  stopTimer();
});

cancelRec.addEventListener('click', ()=>{
  recordedBlob = null;
  recorderUI.classList.add('hidden');
  stopTimer();
});

sendRec.addEventListener('click', async ()=>{
  if (!recordedBlob){ alert('No recording yet.'); return; }
  requestMsg.textContent = 'Sending voice shout...';
  const fd = new FormData();
  fd.append('voice', recordedBlob, 'shout.webm');
  // optional metadata
  fd.append('name', document.getElementById('r-name').value || 'Anonymous');
  fd.append('note', document.getElementById('r-note').value || '');

  try {
    const res = await fetch('/api/voice-shout', { method:'POST', body:fd });
    const j = await res.json();
    if (res.ok) {
      requestMsg.textContent = '🔥 Voice shout sent! Crew will peep it.';
      recordedBlob = null;
      recorderUI.classList.add('hidden');
    } else {
      requestMsg.textContent = j?.error || 'Failed to send voice.';
    }
  } catch(e){
    requestMsg.textContent = 'Network error sending voice.';
  }
});
