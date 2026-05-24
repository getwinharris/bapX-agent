// bapX Dashboard — minimal frontend
// Codex inside sandbox handles: chat, skills, sessions, providers, memories
// bapX backend handles: auth, profile, sandbox bridge, billing

const API = window.location.origin;
let TOKEN = localStorage.getItem('bapx_token');
let USER = null;
let OAUTH_POLLING = null;
let OAUTH_POPUP = null;

// ── Page routing ──
function showPage(page) {
  document.querySelectorAll('.auth-page, #page-dashboard').forEach(el => el.classList.add('hidden'));
  const el = document.getElementById(`page-${page}`);
  if (el) el.classList.remove('hidden');
  history.replaceState(null, '', page === 'login' ? '/' : `/${page}`);
}
function navigateTo(page) { showPage(page); return false; }

// ── Helpers ──
function apiHeaders() { return { 'Content-Type':'application/json', ...(TOKEN ? {'Authorization':`Bearer ${TOKEN}`} : {}) }; }

async function api(path, opts={}) {
  const r = await fetch(API + path, { ...opts, headers: { ...apiHeaders(), ...opts.headers } });
  if (r.status === 401) { localStorage.removeItem('bapx_token'); TOKEN=null; showPage('login'); throw new Error('Session expired'); }
  if (!r.ok) { const e = await r.json().catch(()=>({})); throw new Error(e.detail||e.message||`HTTP ${r.status}`); }
  return r;
}

function apiJSON(path, opts={}) { return api(path, opts).then(r => r.json()); }

// ── Auth ──
async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';
  try {
    const d = await apiJSON('/api/login', { method:'POST', body:JSON.stringify({email,password}) });
    TOKEN = d.token; localStorage.setItem('bapx_token', TOKEN); USER = d.user;
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
    const d = await apiJSON('/api/signup', { method:'POST', body:JSON.stringify(body) });
    TOKEN = d.token; localStorage.setItem('bapx_token', TOKEN); USER = d.user;
    initDashboard();
    alert('Verification code sent to your email. Check your inbox.');
  } catch(e) { errEl.textContent=e.message; errEl.style.display='block'; }
}

function googleSignup() {}

// ── Dashboard init ──
async function initDashboard() {
  showPage('dashboard');
  document.getElementById('sidebar-username').textContent = USER?.name || USER?.username || 'User';
  document.getElementById('sidebar-avatar').textContent = (USER?.name || USER?.username || 'U')[0].toUpperCase();
  await loadProfile();
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
}

function toggleLeftSidebar() {
  const s = document.getElementById('sidebar');
  if (window.innerWidth <= 768) {
    s.classList.toggle('expanded');
    document.querySelector('.backdrop').classList.toggle('show');
  } else { s.classList.toggle('expanded'); }
}
function closeLeftSidebar() {
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('expanded');
    document.querySelector('.backdrop').classList.remove('show');
  }
}

function toggleRightPanel() { document.getElementById('right-panel').classList.toggle('open'); }

function switchRpTab(tab) {
  document.querySelectorAll('.rp-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.rp-tab[data-tab="${tab}"]`).classList.add('active');
  document.querySelectorAll('.rp-placeholder').forEach(p => p.classList.add('hidden'));
  const el = document.querySelector(`.rp-placeholder[data-tab="${tab}"]`);
  if (el) el.classList.remove('hidden');
}

// ── Profile ──
async function loadProfile() {
  try {
    const d = await apiJSON('/api/user/profile');
    USER = { ...USER, ...d };
    document.getElementById('prof-name').value = d.name || '';
    document.getElementById('prof-username').value = d.username || '';
    document.getElementById('prof-email').value = d.email || '';
    document.getElementById('prof-bio').value = d.bio || '';
    updateConnectionStatus();
    loadBilling();
  } catch(e) { console.error(e); }
}

async function saveProfile() {
  try {
    await api('/api/user/profile', { method:'PUT', body:JSON.stringify({name:document.getElementById('prof-name').value,bio:document.getElementById('prof-bio').value}) });
    showSuccess('profile-success', 'Profile updated');
  } catch(e) { alert(e.message); }
}

function showSuccess(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent=msg; el.style.display='block'; setTimeout(()=>el.style.display='none', 3000); }
}

// ── Sandbox File Bridge (write config/auth to ~/.bapx/) ──
async function sbWriteFile(path, content) {
  return apiJSON('/api/sandbox/write-file', { method:'POST', body:JSON.stringify({path, content}) });
}

async function sbReadFile(path) {
  return apiJSON('/api/sandbox/read-file?path='+encodeURIComponent(path));
}

// ── API Key (saved to sandbox via file bridge) ──
async function saveApiKey() {
  const provider = document.getElementById('provider-select').value;
  const key = document.getElementById('api-key-input').value;
  document.getElementById('apikey-error').style.display = 'none';
  try {
    // Write to sandbox ~/.bapx/config.toml
    const configToml = `[model_providers.${provider}]\napi_key = "${key}"\n`;
    await sbWriteFile('config.toml', configToml);
    document.getElementById('api-key-success').textContent = 'Key saved to sandbox!';
    document.getElementById('api-key-success').style.display = 'block';
    document.getElementById('api-key-input').value = '';
    setTimeout(()=>document.getElementById('api-key-success').style.display='none', 3000);
  } catch(e) {
    document.getElementById('apikey-error').textContent = e.message;
    document.getElementById('apikey-error').style.display = 'block';
  }
}

function updateConnectionStatus() {
  if (!USER) return;
}

// ── OAuth (popup on user's browser, token saved to sandbox) ──
async function startOAuth(provider) {
  const modal = document.getElementById('oauth-modal');
  modal.classList.remove('hidden');
  document.getElementById('oauth-spinner').style.display = 'block';
  document.getElementById('oauth-status').textContent = 'Starting OAuth...';
  try {
    const d = await apiJSON('/api/auth/oauth/start', { method:'POST', body:JSON.stringify({provider}) });
    document.getElementById('oauth-modal-title').textContent = `Connect ${d.provider_name}`;
    document.getElementById('oauth-user-code').textContent = d.user_code;
    document.getElementById('oauth-verify-url').textContent = d.verification_uri;
    document.getElementById('oauth-status').textContent = 'Popup opened — authorize in the window';
    OAUTH_POPUP = window.open(d.verification_uri, 'bapx-oauth', 'width=600,height=700');
    const interval = setInterval(async () => {
      try {
        const s = await apiJSON('/api/auth/oauth/token-exchange', { method:'POST', body:JSON.stringify({flow_id:d.flow_id}) });
        if (s.status === 'completed') {
          clearInterval(interval);
          document.getElementById('oauth-status').textContent = '✓ Connected!';
          document.getElementById('oauth-spinner').style.display = 'none';
          if (OAUTH_POPUP && !OAUTH_POPUP.closed) OAUTH_POPUP.close();
          setTimeout(closeOAuthModal, 1500);
        } else if (s.status === 'failed') {
          clearInterval(interval);
          document.getElementById('oauth-status').textContent = `✗ ${s.error || 'Failed'}`;
          document.getElementById('oauth-spinner').style.display = 'none';
          setTimeout(closeOAuthModal, 3000);
        }
      } catch(e) {}
    }, 3000);
    OAUTH_POLLING = interval;
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

// ── Provider OAuth buttons ──
const OAUTH_PROVIDERS = [
  { id: 'openai-oauth', name: 'ChatGPT (OpenAI)', color: '#10a37f' },
  { id: 'anthropic-oauth', name: 'Claude (Anthropic)', color: '#d97757' },
  { id: 'google-oauth', name: 'Google', color: '#4285f4' },
  { id: 'nous-oauth', name: 'Nous Portal', color: '#8b5cf6' },
  { id: 'qwen-oauth', name: 'Qwen (Alibaba)', color: '#ff6a00' },
  { id: 'github-copilot', name: 'GitHub Copilot', color: '#6e40c9' },
];

async function loadOAuthProviders() {
  const grid = document.getElementById('oauth-providers');
  grid.innerHTML = '';
  OAUTH_PROVIDERS.forEach(p => {
    const card = document.createElement('div');
    card.className = 'oauth-card';
    card.innerHTML = `
      <div class="prov-icon" style="background:${p.color};color:#fff">${p.name[0]}</div>
      <h4>${p.name}</h4>
      <p>OAuth login</p>
      <button class="btn btn-sm btn-ghost" onclick="startOAuth('${p.id}')">Connect</button>`;
    grid.appendChild(card);
  });
}

// ── Settings Tabs ──
function switchSettingsTab(tab) {
  document.querySelectorAll('.st-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.st-tab[data-tab="${tab}"]`).classList.add('active');
  document.querySelectorAll('.stab-content').forEach(c => c.classList.remove('active'));
  const el = document.getElementById(`stab-${tab}`);
  if (el) el.classList.add('active');
}

// ── Chat (Proxied to sandbox Codex) ──
const CHAT_HISTORY = [];

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
  div.className = 'typing-indicator'; div.id = 'typing-indicator';
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
  CHAT_HISTORY.push({role:'user', content:text});
  addMessage(text, 'user');
  addTypingIndicator();
  const sendBtn = document.getElementById('send-btn');
  sendBtn.disabled = true;
  try {
    // Execute via sandbox — Codex inside handles the response
    const escaped = text.replace(/'/g, "'\\''");
    const result = await apiJSON('/api/sandbox/exec', {
      method:'POST', body:JSON.stringify({
        command: `cd ~ && echo '${escaped}' | codex exec --timeout 120 2>/dev/null || echo 'Agent busy'`,
        language: 'bash'
      })
    });
    removeTypingIndicator();
    const response = result.output || 'No response from agent';
    CHAT_HISTORY.push({role:'assistant', content:response});
    addMessage(response, 'assistant');
  } catch(e) {
    removeTypingIndicator();
    addMessage(`Error: ${e.message}`, 'assistant');
  }
  sendBtn.disabled = false;
}

// ── Billing ──
async function loadBilling() {
  try {
    const d = await apiJSON('/api/billing/subscription');
    document.getElementById('billing-info').innerHTML = `
      <p>Status: <strong>${d.status}</strong></p>
      <p>Plan: <strong>${d.plan}</strong></p>
      <p>Storage: ${d.storage_used_bytes > 0 ? (d.storage_used_bytes/1024/1024).toFixed(1)+' MB' : '0 MB'} / ${d.storage_limit_gb} GB</p>
      ${d.status === 'none' ? '<button class="btn btn-sm" onclick="startCheckout()" style="margin-top:.75rem">Upgrade to Starter</button>' : ''}`;
  } catch(e) { document.getElementById('billing-info').innerHTML = '<p style="color:var(--muted)">Billing unavailable</p>'; }
}

async function startCheckout() {
  try {
    const d = await apiJSON('/api/billing/create-checkout', { method:'POST' });
    window.open(d.url, '_blank');
  } catch(e) { alert(e.message); }
}

// ── Forgot Password UI ──
function showForgotPassword() {
  const email = prompt('Enter your email address:');
  if (!email) return;
  apiJSON('/api/auth/forgot-password', { method:'POST', body:JSON.stringify({email}) })
    .then(() => alert('If that email is registered, a reset code has been sent.'))
    .catch(e => alert(e.message));
}

// ── Init ──
async function init() {
  if (TOKEN) {
    try {
      USER = await apiJSON('/api/user/profile');
      initDashboard();
    } catch(e) {
      localStorage.removeItem('bapx_token');
      TOKEN = null; showPage('login');
    }
  } else { showPage('login'); }
}

document.addEventListener('DOMContentLoaded', init);
