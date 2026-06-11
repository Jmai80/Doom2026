// Delad topplista via Supabase REST API + vinstskärmens HTML-panel.
// Panelen ersätter Phaser-texterna på vinstskärmen: den hanterar
// textinmatning (mobilens tangentbord!) och listor bättre än canvas-text.

import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

const TABLE = 'doomhighscores';   // tabellnamn i Supabase

const HEADERS = {
  apikey: SUPABASE_KEY,
  'Content-Type': 'application/json',
};

// ---------------------------------------------------------------------------
//  API
// ---------------------------------------------------------------------------

/** Hämtar topplistan, snabbast först. */
export async function fetchTop(limit = 10) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${TABLE}` +
    `?select=id,name,total_time&order=total_time.asc&limit=${limit}`,
    { headers: HEADERS }
  );
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return res.json();
}

/** Skickar in ett resultat. Returnerar den skapade raden (med id). */
export async function submitScore(name, totalTime) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
    method: 'POST',
    headers: { ...HEADERS, Prefer: 'return=representation' },
    body: JSON.stringify({ name, total_time: Number(totalTime.toFixed(1)) }),
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return (await res.json())[0];
}

// ---------------------------------------------------------------------------
//  Vinstpanel
// ---------------------------------------------------------------------------

let nameEntryOpen = false;   // blockerar omstart medan man skriver
let sceneRef = null;

/** True medan namninmatningen är öppen — main.js pausar omstart då. */
export function isNameEntryOpen() {
  return nameEntryOpen;
}

/** Visas när alla banor klarats. */
export function showWinPanel(scene, totalTime) {
  sceneRef = scene;
  const panel = document.getElementById('hs-panel');
  if (!panel) return;

  document.getElementById('hs-time').textContent =
    `TOTALTID: ${totalTime.toFixed(1)} S`;
  document.getElementById('hs-list').innerHTML = '';
  document.getElementById('hs-status').textContent = '';
  document.getElementById('hs-entry').hidden = false;
  document.getElementById('hs-restart-hint').hidden = true;

  const input = document.getElementById('hs-name');
  input.value = '';

  panel.hidden = false;
  nameEntryOpen = true;

  // Släpp Phasers grepp om tangentbordet — annars "äter" Phaser
  // mellanslag/pilar så att de inte går att skriva i fältet.
  scene.input.keyboard.disableGlobalCapture();
  input.focus();

  bindOnce('hs-submit', () => submitAndShowList(totalTime));
  bindOnce('hs-skip',   () => closeEntryAndShowList(null, totalTime));
  // Enter i fältet = skicka
  input.onkeydown = e => { if (e.key === 'Enter') submitAndShowList(totalTime); };
}

/** Stänger panelen helt. Anropas av main.js vid omstart. */
export function hideWinPanel() {
  const panel = document.getElementById('hs-panel');
  if (panel) panel.hidden = true;
  endNameEntry();
}

function endNameEntry() {
  if (nameEntryOpen && sceneRef) {
    sceneRef.input.keyboard.enableGlobalCapture();
    document.getElementById('hs-name')?.blur();
  }
  nameEntryOpen = false;
}

async function submitAndShowList(totalTime) {
  const input = document.getElementById('hs-name');
  const name = input.value.trim().slice(0, 12);
  if (!name) { input.focus(); return; }

  setStatus('SKICKAR...');
  try {
    const myRow = await submitScore(name, totalTime);
    closeEntryAndShowList(myRow, totalTime);
  } catch (err) {
    console.error(err);
    setStatus('KUNDE INTE SKICKA — KONTROLLERA ANSLUTNINGEN');
  }
}

async function closeEntryAndShowList(myRow, totalTime) {
  document.getElementById('hs-entry').hidden = true;
  endNameEntry();
  setStatus('HÄMTAR TOPPLISTAN...');

  try {
    const rows = await fetchTop(10);
    renderList(rows, myRow);
    setStatus('');
  } catch (err) {
    console.error(err);
    setStatus('KUNDE INTE HÄMTA TOPPLISTAN');
  }
  document.getElementById('hs-restart-hint').hidden = false;
}

function renderList(rows, myRow) {
  const list = document.getElementById('hs-list');
  list.innerHTML = '';
  let foundMe = false;

  rows.forEach((r, i) => {
    const li = document.createElement('li');
    const isMe = myRow && r.id === myRow.id;
    if (isMe) { li.className = 'hs-me'; foundMe = true; }
    li.innerHTML =
      `<span class="hs-rank">${i + 1}.</span>` +
      `<span class="hs-name">${escapeHtml(r.name)}</span>` +
      `<span class="hs-time">${Number(r.total_time).toFixed(1)} S</span>`;
    list.appendChild(li);
  });

  // Skickade men hamnade utanför topp 10
  if (myRow && !foundMe) {
    const li = document.createElement('li');
    li.className = 'hs-me hs-outside';
    li.innerHTML =
      `<span class="hs-rank">—</span>` +
      `<span class="hs-name">${escapeHtml(myRow.name)}</span>` +
      `<span class="hs-time">${Number(myRow.total_time).toFixed(1)} S</span>`;
    list.appendChild(li);
  }
}

function setStatus(msg) {
  const el = document.getElementById('hs-status');
  if (el) el.textContent = msg;
}

// Eventlyssnare utan dubbelregistrering vid upprepade vinster
function bindOnce(id, fn) {
  const el = document.getElementById(id);
  if (el) el.onclick = fn;
}

// Namn kommer från andra spelare — rendera aldrig rå HTML
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}