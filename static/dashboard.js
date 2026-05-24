// bapX Dashboard
const API = window.location.origin;
let TOKEN = localStorage.getItem('bapx_token');
let USER = null;
let CURRENT_SESSION = null;
let OAUTH_POLLING = null;

// ── Page routing ──
function showPage(page) {
  document.querySelectorAll('.auth-page, #page-dashboard').forEach(el => el.classList.add('hidden'));
  const el = document.getElementById(`page-${page}`);
  if (el) el.classList.remove('hidden');
  history.replaceState(null, '', page === 'login' ? '/' : `/${page}`);
}

function navigateTo(page) { showPage(page); return false; }

// ── Auth ──
async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';
  try {
    const r = await fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,password}) });
    if(!r.ok){ const e=await r.json(); throw new Error(e.detail||'Login failed'); }
    const d = await r.json();
    TOKEN = d.token;
    localStorage.setItem('bapx_token', TOKEN);
    USER = d.user;
    initDashboard();
  } catch(e) { errEl.textContent=e.message; errEl.style.display='block'; }
}

async function doSignup() {
  const body = {
    username: document.getElementById('su-username').value.trim(),
    name: document.getElementById('su-name').value.trim(),
    email: document.getElementById('su-email').value.trim(),
    password: document.getElementById('su-pass').value,
    age: document.getElementById('su-age').value.trim(),
    bio: document.getElementById('su-bio').value.trim(),
  };
  const errEl = document.getElementById('signup-error');
  errEl.style.display = 'none';
  try {
    const r = await fetch('/api/signup', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    if(!r.ok){ const e=await r.json(); throw new Error(e.detail||'Signup failed'); }
    const d = await r.json();
    TOKEN = d.token;
    localStorage.setItem('bapx_token', TOKEN);
    USER = d.user;
    initDashboard();
  } catch(e) { errEl.textContent=e.message; errEl.style.display='block'; }
}

function googleSignup() { /* TODO */ }

// ── Dashboard init ──
async function initDashboard() {
  showPage('dashboard');
  document.getElementById('sidebar-username').textContent = USER?.name || USER?.username || 'User';
  document.getElementById('sidebar-avatar').textContent = (USER?.name || USER?.username || 'U')[0].toUpperCase();
  await Promise.all([loadProfile(), loadProviders(), loadOAuthProviders(), loadSessions()]);
  switchView('chat');
}

// ── Navigation ──
function switchView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  const el = document.getElementById(`view-${view}`);
  if (el) el.classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const nav = document.querySelector(`.nav-item[data-view="${view}"]`);
  if (nav) nav.classList.add('active');
  if (window.innerWidth <= 768) closeLeftSidebar();
  if (view === 'skills') renderSkills();
  if (view === 'projects') loadProjects();
}

// ── Sidebar ──
function toggleLeftSidebar() {
  const s = document.getElementById('sidebar');
  if (window.innerWidth <= 768) {
    s.classList.toggle('expanded');
    document.querySelector('.backdrop').classList.toggle('show');
  } else {
    s.classList.toggle('expanded');
  }
}
function closeLeftSidebar() {
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('expanded');
    document.querySelector('.backdrop').classList.remove('show');
  }
}

// ── Right Panel ──
function toggleRightPanel() {
  document.getElementById('right-panel').classList.toggle('open');
}
function switchRpTab(tab) {
  document.querySelectorAll('.rp-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.rp-tab[data-tab="${tab}"]`).classList.add('active');
  document.querySelectorAll('.rp-placeholder').forEach(p => p.classList.add('hidden'));
  const el = document.querySelector(`.rp-placeholder[data-tab="${tab}"]`);
  if (el) el.classList.remove('hidden');
}

// ── Resizer ──
function startResize(e) {
  e.preventDefault();
  const rp = document.getElementById('right-panel');
  const onMove = (ev) => {
    const w = Math.max(200, Math.min(600, window.innerWidth - ev.clientX));
    rp.style.width = w + 'px';
    if (w > 10) rp.classList.add('open');
  };
  const onUp = () => { document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',onUp); };
  document.addEventListener('mousemove',onMove);
  document.addEventListener('mouseup',onUp);
}

// ── Headers ──
function apiHeaders() { return { 'Content-Type':'application/json', ...(TOKEN ? {'Authorization':`Bearer ${TOKEN}`} : {}) }; }

async function api(path, opts={}) {
  const r = await fetch(API + path, { ...opts, headers: { ...apiHeaders(), ...opts.headers } });
  if (r.status === 401) { localStorage.removeItem('bapx_token'); TOKEN=null; showPage('login'); throw new Error('Session expired'); }
  if (!r.ok) { const e = await r.json().catch(()=>({})); throw new Error(e.detail||e.message||`HTTP ${r.status}`); }
  return r;
}

// ── Profile ──
async function loadProfile() {
  try {
    const r = await api('/api/user/profile');
    USER = await r.json();
    document.getElementById('prof-name').value = USER.name || '';
    document.getElementById('prof-username').value = USER.username || '';
    document.getElementById('prof-email').value = USER.email || '';
    document.getElementById('prof-bio').value = USER.bio || '';
    updateConnectionStatus();
  } catch(e) { console.error('Profile load failed',e); }
}

async function saveProfile() {
  try {
    const r = await api('/api/user/profile', { method:'PUT', body:JSON.stringify({name:document.getElementById('prof-name').value,bio:document.getElementById('prof-bio').value}) });
    const d = await r.json();
    document.getElementById('profile-success').textContent = 'Profile updated';
    document.getElementById('profile-success').style.display = 'block';
    setTimeout(()=>document.getElementById('profile-success').style.display='none', 3000);
  } catch(e) { alert(e.message); }
}

async function deleteAccount() {
  try {
    await api('/api/user/account', { method:'DELETE' });
    localStorage.removeItem('bapx_token');
    TOKEN=null; showPage('login');
  } catch(e) { alert(e.message); }
}

// ── Providers ──
let ALL_PROVIDERS = { api_key:[], oauth:[], copilot:[] };

async function loadProviders() {
  try {
    const r = await api('/api/providers');
    ALL_PROVIDERS = await r.json();
    const sel = document.getElementById('provider-select');
    sel.innerHTML = '<option value="">Select...</option>';
    ALL_PROVIDERS.api_key.forEach(p => {
      const o = document.createElement('option');
      o.value = p.id; o.textContent = p.name;
      sel.appendChild(o);
    });
  } catch(e) { console.error(e); }
}

async function loadOAuthProviders() {
  try {
    const r = await api('/api/auth/oauth/status');
    const status = await r.json();
    const connected = status.connected_providers || [];
    const grid = document.getElementById('oauth-providers');
    grid.innerHTML = '';
    ALL_PROVIDERS.oauth.concat(ALL_PROVIDERS.copilot).forEach(p => {
      const card = document.createElement('div');
      card.className = 'oauth-card';
      const isConn = connected.includes(p.id);
      card.innerHTML = `
        <div class="prov-icon" style="background:${getProviderColor(p.id)};color:#fff">${p.name[0]}</div>
        <h4>${p.name}</h4>
        <p>${p.auth === 'copilot' ? 'GitHub device flow' : 'OAuth login'}</p>
        ${isConn ? '<span class="badge-conn">Connected</span>' : `<button class="btn btn-sm btn-ghost" onclick="startOAuth('${p.id}')">Connect</button>`}
      `;
      grid.appendChild(card);
    });
  } catch(e) { console.error(e); }
}

function getProviderColor(id) {
  const colors = { 'openai-oauth':'#10a37f','anthropic-oauth':'#d97757','google-oauth':'#4285f4','nous-oauth':'#8b5cf6','qwen-oauth':'#ff6a00','github-copilot':'#6e40c9' };
  return colors[id] || '#6366f1';
}

async function updateModels() {
  const sel = document.getElementById('provider-select');
  const prov = sel.value;
  const msel = document.getElementById('model-select');
  msel.innerHTML = '<option value="">Select...</option><option value="" disabled>Enter API key first to fetch models</option>';
  // Models come LIVE after user enters API key and clicks Connect
}

async function saveApiKey() {
  const provider = document.getElementById('provider-select').value;
  const key = document.getElementById('api-key-input').value;
  document.getElementById('apikey-error').style.display = 'none';
  document.getElementById('apikey-success').style.display = 'none';
  const msel = document.getElementById('model-select');
  msel.innerHTML = '<option value="">Fetching models...</option>';
  try {
    // First save the key, then fetch live models
    const r1 = await api('/api/user/api-key', { method:'POST', body:JSON.stringify({provider,key}) });
    // Fetch live models from provider API
    const r2 = await api('/api/providers/fetch-models', { method:'POST', body:JSON.stringify({provider,key}) });
    const d2 = await r2.json();
    const models = d2.models || [];
    msel.innerHTML = '<option value="">Select model...</option>';
    models.forEach(m => {
      const o = document.createElement('option');
      o.value = m; o.textContent = m;
      msel.appendChild(o);
    });
    document.getElementById('apikey-success').textContent = models.length > 0 ? `Connected! ${models.length} models found` : 'Connected!';
    document.getElementById('apikey-success').style.display = 'block';
    document.getElementById('api-key-input').value = '';
    await loadProfile();
    setTimeout(()=>document.getElementById('apikey-success').style.display='none', 3000);
  } catch(e) {
    msel.innerHTML = '<option value="">Select...</option>';
    document.getElementById('apikey-error').textContent = e.message;
    document.getElementById('apikey-error').style.display = 'block';
  }
}

async function saveApiKey() {
  const provider = document.getElementById('provider-select').value;
  const model = document.getElementById('model-select').value;
  const key = document.getElementById('api-key-input').value;
  document.getElementById('apikey-error').style.display = 'none';
  document.getElementById('apikey-success').style.display = 'none';
  try {
    const r = await api('/api/user/api-key', { method:'PUT', body:JSON.stringify({provider,key,model}) });
    document.getElementById('apikey-success').textContent = 'Connected!';
    document.getElementById('apikey-success').style.display = 'block';
    document.getElementById('api-key-input').value = '';
    await loadProfile();
    setTimeout(()=>document.getElementById('apikey-success').style.display='none', 3000);
  } catch(e) {
    document.getElementById('apikey-error').textContent = e.message;
    document.getElementById('apikey-error').style.display = 'block';
  }
}

function updateConnectionStatus() {
  if (!USER) return;
  const provName = USER.provider || 'None';
  const modelName = USER.model || '';
  const hasKey = USER.api_key && USER.api_key.length > 4;
  const card = document.getElementById('conn-card');
  const icon = document.getElementById('conn-icon');
  const name = document.getElementById('conn-name');
  const detail = document.getElementById('conn-detail');
  const badge = document.getElementById('conn-badge');
  if (hasKey || USER.oauth_tokens) {
    icon.className = 'conn-icon connected';
    badge.className = 'conn-badge connected';
    name.textContent = provName;
    detail.textContent = modelName ? `Model: ${modelName}` : 'Connected';
    badge.innerHTML = '<span class="dot"></span> Connected';
  } else {
    icon.className = 'conn-icon disconnected';
    badge.className = 'conn-badge disconnected';
    name.textContent = 'Not connected';
    detail.textContent = 'Add an API key or connect via OAuth';
    badge.innerHTML = '<span class="dot"></span> Not connected';
  }
}

// ── OAuth ──
let OAUTH_POPUP = null;

async function startOAuth(provider) {
  // Show code in modal with auto-open popup
  const modal = document.getElementById('oauth-modal');
  modal.classList.remove('hidden');
  document.getElementById('oauth-modal-title').textContent = `Connect ${provider}`;
  document.getElementById('oauth-modal-desc').textContent = 'Authorizing...';
  document.getElementById('oauth-user-code').textContent = '...';
  document.getElementById('oauth-verify-url').textContent = 'Starting...';
  document.getElementById('oauth-spinner').style.display = 'block';
  document.getElementById('oauth-status').textContent = 'Starting OAuth...';
  try {
    const r = await api('/api/auth/oauth/start', { method:'POST', body:JSON.stringify({provider}) });
    const d = await r.json();
    // Show code and URL
    document.getElementById('oauth-modal-title').textContent = `Connect ${d.provider_name}`;
    document.getElementById('oauth-modal-desc').textContent = 'Enter this code in the popup window';
    document.getElementById('oauth-user-code').textContent = d.user_code;
    document.getElementById('oauth-verify-url').textContent = d.verification_uri;
    document.getElementById('oauth-status').textContent = 'Waiting for authorization in popup...';
    // Open popup on USER'S browser
    OAUTH_POPUP = window.open(d.verification_uri, 'bapx-oauth', 'width=600,height=700,menubar=no,toolbar=no');
    // Poll the backend for token exchange
    const pollInterval = setInterval(async () => {
      try {
        const r2 = await api('/api/auth/oauth/token-exchange', { method:'POST', body:JSON.stringify({flow_id:d.flow_id}) });
        const s = await r2.json();
        if (s.status === 'completed') {
          clearInterval(pollInterval);
          document.getElementById('oauth-status').textContent = '✓ Connected!';
          document.getElementById('oauth-spinner').style.display = 'none';
          if (OAUTH_POPUP && !OAUTH_POPUP.closed) OAUTH_POPUP.close();
          setTimeout(closeOAuthModal, 1500);
          await loadProfile();
          await loadOAuthProviders();
        } else if (s.status === 'failed') {
          clearInterval(pollInterval);
          document.getElementById('oauth-status').textContent = `✗ ${s.error || 'Failed'}`;
          document.getElementById('oauth-spinner').style.display = 'none';
          setTimeout(closeOAuthModal, 3000);
        }
      } catch(e) { console.error(e); }
    }, 3000);
    // Store interval for cleanup
    OAUTH_POLLING = pollInterval;
  } catch(e) {
    document.getElementById('oauth-status').textContent = `Error: ${e.message}`;
    document.getElementById('oauth-spinner').style.display = 'none';
  }
}

function closeOAuthModal() {
  document.getElementById('oauth-modal').classList.add('hidden');
  if (OAUTH_POLLING) { clearInterval(OAUTH_POLLING); OAUTH_POLLING=null; }
  if (OAUTH_POPUP && !OAUTH_POPUP.closed) OAUTH_POPUP.close();
}

// ── Skills ──
let ALL_SKILLS = [];
let SKILLS_ENABLED = [];

async function renderSkills() {
  try {
    const r = await api('/api/user/skills');
    const d = await r.json();
    ALL_SKILLS = d.available || [];
    SKILLS_ENABLED = d.enabled || [];
  } catch(e) { return; }
  const grid = document.getElementById('skills-grid');
  const search = (document.getElementById('skills-search')?.value || '').toLowerCase();
  document.getElementById('skills-count').textContent = `${SKILLS_ENABLED.length}/${ALL_SKILLS.length}`;
  grid.innerHTML = '';
  ALL_SKILLS.filter(s => !search || s.name.toLowerCase().includes(search) || s.description.toLowerCase().includes(search)).forEach(s => {
    const card = document.createElement('div');
    card.className = 'skill-card';
    const enabled = SKILLS_ENABLED.includes(s.name);
    card.innerHTML = `
      <h4>${s.name}</h4>
      <p>${s.description}</p>
      <span class="cat-badge">${s.category || 'general'}</span>
      <label class="toggle-wrap">
        <label class="toggle"><input type="checkbox" ${enabled?'checked':''} data-name="${s.name}" onchange="toggleSkill(this)"><span class="toggle-slider"></span></label>
        <span style="font-size:.75rem;color:var(--muted)">${enabled?'Enabled':'Disabled'}</span>
      </label>`;
    grid.appendChild(card);
  });
}

function renderSettingsSkills() {
  renderSkills();
}

function toggleSkill(el) {
  const name = el.dataset.name;
  if (el.checked) { if (!SKILLS_ENABLED.includes(name)) SKILLS_ENABLED.push(name); }
  else { SKILLS_ENABLED = SKILLS_ENABLED.filter(s => s !== name); }
}

async function saveSkills() {
  try {
    const r = await api('/api/user/skills', { method:'POST', body:JSON.stringify({skills:SKILLS_ENABLED}) });
    const d = await r.json();
    const el = document.getElementById('skills-success') || document.getElementById('skills-settings-success');
    if (el) { el.textContent = `Saved ${d.enabled.length} skills`; el.style.display = 'block'; setTimeout(()=>el.style.display='none', 3000); }
  } catch(e) { alert(e.message); }
}

// ── Settings Tabs ──
function switchSettingsTab(tab) {
  document.querySelectorAll('.st-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.st-tab[data-tab="${tab}"]`).classList.add('active');
  document.querySelectorAll('.stab-content').forEach(c => c.classList.remove('active'));
  const el = document.getElementById(`stab-${tab}`);
  if (el) el.classList.add('active');
  if (tab === 'skills') renderSkills();
}

// ── Sessions ──
async function loadSessions() {
  try {
    const r = await api('/api/sessions');
    const d = await r.json();
    const sel = document.getElementById('session-select');
    sel.innerHTML = '<option value="">New Chat</option>';
    (d.sessions || []).forEach(s => {
      const o = document.createElement('option');
      o.value = s.id; o.textContent = s.title || 'Untitled';
      sel.appendChild(o);
    });
  } catch(e) {}
}

function switchSession(id) {
  CURRENT_SESSION = id || null;
  document.getElementById('chat-messages').innerHTML = '';
  if (!id) { document.getElementById('chat-title').textContent = 'New Chat'; return; }
  document.getElementById('chat-title').textContent = 'Loading...';
  api(`/api/sessions/${id}`).then(r=>r.json()).then(s => {
    document.getElementById('chat-title').textContent = s.title || 'Chat';
    const msgs = JSON.parse(s.messages || '[]');
    msgs.forEach(m => addMessage(m.content, m.role));
  }).catch(()=>{});
}

function newSession() {
  CURRENT_SESSION = null;
  document.getElementById('chat-messages').innerHTML = '';
  document.getElementById('chat-title').textContent = 'New Chat';
  document.getElementById('session-select').value = '';
  showEmptyState();
}

function showEmptyState() {
  const el = document.getElementById('chat-messages');
  el.innerHTML = `<div class="empty-state">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    <h3>Start a conversation</h3>
    <p>Send a message to begin chatting with your agent.</p>
  </div>`;
}

// ── Chat ──
function addMessage(text, role) {
  const el = document.getElementById('chat-messages');
  const empty = el.querySelector('.empty-state');
  if (empty) empty.remove();
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  div.textContent = text;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

function addTypingIndicator() {
  const el = document.getElementById('chat-messages');
  const empty = el.querySelector('.empty-state');
  if (empty) empty.remove();
  const div = document.createElement('div');
  div.className = 'typing-indicator';
  div.id = 'typing-indicator';
  div.innerHTML = '<span></span><span></span><span></span>';
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

function removeTypingIndicator() {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  addMessage(text, 'user');
  addTypingIndicator();
  const sendBtn = document.getElementById('send-btn');
  sendBtn.disabled = true;
  try {
    const r = await api('/api/chat/send', { method:'POST', body:JSON.stringify({message:text, session_id:CURRENT_SESSION}) });
    removeTypingIndicator();
    const sid = r.headers.get('X-Session-Id') || CURRENT_SESSION;
    CURRENT_SESSION = sid;
    document.getElementById('chat-title').textContent = 'Chat';
    // Read SSE stream
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let full = '';
    while(true) {
      const {done, value} = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, {stream: true});
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.text) { full += data.text; }
            else if (data.final) { full = data.final; }
          } catch(e) {}
        }
      }
    }
    if (full) addMessage(full, 'assistant');
    await loadSessions();
  } catch(e) {
    removeTypingIndicator();
    addMessage(`Error: ${e.message}`, 'assistant');
  }
  sendBtn.disabled = false;
}

// ── Projects ──
async function loadProjects() {
  const el = document.getElementById('projects-list');
  el.innerHTML = '<div class="empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg><h3>Coming soon</h3><p>Projects are not yet implemented.</p></div>';
}

function createProject() { alert('Projects coming soon'); }

// ── Billing ──
async function loadBilling() {
  try {
    const r = await api('/api/billing/subscription');
    const d = await r.json();
    document.getElementById('billing-info').innerHTML = `
      <p>Status: <strong>${d.status}</strong></p>
      <p>Plan: <strong>${d.plan}</strong></p>
      <p>Storage: ${d.storage_used_bytes > 0 ? (d.storage_used_bytes/1024/1024).toFixed(1) + ' MB' : '0 MB'} / ${d.storage_limit_gb} GB</p>
      ${d.status === 'none' ? '<button class="btn btn-sm" onclick="startCheckout()" style="margin-top:.75rem">Upgrade to Starter</button>' : ''}
    `;
  } catch(e) { document.getElementById('billing-info').innerHTML = '<p style="color:var(--muted)">Billing unavailable</p>'; }
}

async function startCheckout() {
  try {
    const r = await api('/api/billing/create-checkout', { method:'POST' });
    const d = await r.json();
    window.open(d.url, '_blank');
  } catch(e) { alert(e.message); }
}

// ── Init ──
async function init() {
  if (TOKEN) {
    try {
      const r = await api('/api/user/profile');
      USER = await r.json();
      initDashboard();
    } catch(e) {
      localStorage.removeItem('bapx_token');
      TOKEN = null;
      showPage('login');
    }
  } else {
    showPage('login');
  }
}

document.addEventListener('DOMContentLoaded', init);
