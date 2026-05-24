// bapX Dashboard — minimal frontend
// bapX inside sandbox handles: chat, skills, sessions, providers, memories
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
  await loadProviders();
  await loadOAuthProviders();
  await loadSlashCommands();
  setSandboxStatus('idle');
  switchView('chat');
}

// ── Navigation ──
function switchView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  const el = document.getElementById('view-' + view);
  if (el) el.classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const nav = document.querySelector('.nav-item[data-view="' + view + '"]');
  if (nav) nav.classList.add('active');
  if (window.innerWidth <= 768) closeLeftSidebar();

  // Lazy-load data per view
  if (view === 'deploy') {
    loadDeployments();
    loadDomains();
  } else if (view === 'integrations') {
    loadGitRepos();
    loadMailInbox();
  }
}

function toggleLeftSidebar() {
  const s = document.getElementById('sidebar');
  const backdrop = document.querySelector('.backdrop');
  if (window.innerWidth <= 768) {
    // Mobile: expand/collapse the 48px icon rail
    const isExpanded = s.classList.toggle('expanded');
    backdrop.classList.toggle('show', isExpanded);
    // When expanding, focus the sidebar so it catches scroll
    if (isExpanded) s.style.overflowY = 'auto';
    else { s.style.overflowY = ''; s.scrollTop = 0; }
  } else {
    s.classList.toggle('expanded');
  }
}
function closeLeftSidebar() {
  if (window.innerWidth <= 768) {
    const s = document.getElementById('sidebar');
    s.classList.remove('expanded');
    s.style.overflowY = '';
    document.querySelector('.backdrop').classList.remove('show');
  }
}
// On mobile tap, clicking the collapsed sidebar rail also toggles expand
function initMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && !sidebar.classList.contains('expanded')) {
      // Only toggle if the click wasn't on a clickable element inside
      if (!e.target.closest('button,a,input,select,textarea,.sidebar-user')) {
        toggleLeftSidebar();
      }
    }
  });
}
document.addEventListener('DOMContentLoaded', initMobileSidebar);

function toggleRightPanel() { document.getElementById('right-panel').classList.toggle('open'); }

function switchRpTab(tab) {
  document.querySelectorAll('.rp-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.rp-tab[data-tab="${tab}"]`).classList.add('active');
  document.querySelectorAll('.rp-flow, .rp-browser, .rp-terminal').forEach(p => p.classList.add('hidden'));
  const map = { canvas:'rp-flow', browser:'rp-browser', terminal:'rp-terminal' };
  const el = document.getElementById(map[tab]);
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

// ── Deploy & Domains
async function publishWebsite() {
  const project = document.getElementById('pub-project').value.trim();
  const cmd = document.getElementById('pub-command').value.trim() || 'npm run build';
  const out = document.getElementById('pub-output').value.trim() || 'dist';
  const statusEl = document.getElementById('publish-status');
  if (!project) { statusEl.textContent='Enter a project name'; statusEl.style.display='block'; return; }
  statusEl.textContent = 'Deploying...'; statusEl.style.display = 'block';
  try {
    const d = await apiJSON('/api/user/publish', {method:'POST', body:JSON.stringify({project, build_command:cmd, output_dir:out})});
    if (d.status === 'live') {
      statusEl.textContent = '✓ Live at ' + d.url;
      statusEl.className = 'msg success';
    } else {
      statusEl.textContent = '✗ ' + d.status + ': ' + (d.log||d.error||'').slice(0,200);
      statusEl.className = 'msg error';
    }
    statusEl.style.display = 'block';
    setTimeout(() => { statusEl.style.display = 'none'; statusEl.className = 'msg info'; }, 8000);
    loadDeployments();
  } catch(e) { statusEl.textContent = 'Error: ' + e.message; statusEl.style.display = 'block'; }
}

async function loadDeployments() {
  try {
    const d = await apiJSON('/api/user/deployments');
    const list = document.getElementById('deployments-list');
    const deploys = d.deployments || [];
    document.getElementById('deploy-count').textContent = deploys.length;
    if (!deploys.length) {
      list.innerHTML = '<p style="color:var(--muted);font-size:.875rem">No deployments yet</p>';
      return;
    }
    list.innerHTML = deploys.map(function(dp) { return '' +
      '<div class="skill-card" style="margin-bottom:.5rem">' +
        '<div style="display:flex;align-items:center;justify-content:space-between">' +
          '<h4 style="margin:0">' + dp.project + '</h4>' +
          '<span class="conn-badge ' + (dp.status === 'live' ? 'connected' : 'disconnected') + '">' +
            '<span class="dot"></span> ' + dp.status +
          '</span>' +
        '</div>' +
        '<p style="font-size:.75rem;color:var(--muted);margin:.25rem 0 0 0">' +
          (dp.url ? '<a href="' + dp.url + '" target="_blank" style="color:var(--accent)">' + dp.url + '</a> ' : '') +
          (dp.deploy_time ? new Date(dp.deploy_time).toLocaleString() : new Date(dp.created_at).toLocaleString()) +
        '</p>' +
      '</div>';
    }).join('');
  } catch(e) { console.error(e); }
}

async function addDomain() {
  const input = document.getElementById('domain-input');
  const domain = input.value.trim().toLowerCase();
  const statusEl = document.getElementById('domain-status');
  if (!domain) return;
  input.value = '';
  statusEl.textContent = 'Adding domain...'; statusEl.style.display = 'block';
  try {
    const d = await apiJSON('/api/user/domains', {method:'POST', body:JSON.stringify({domain:domain})});
    statusEl.innerHTML = 'Added ' + d.domain + '. Set DNS TXT record: <code>' + d.dns_record + '</code>';
    statusEl.style.display = 'block';
    loadDomains();
  } catch(e) { statusEl.textContent = 'Error: ' + e.message; statusEl.style.display = 'block'; }
}

async function loadDomains() {
  try {
    const d = await apiJSON('/api/user/domains');
    const list = document.getElementById('domains-list');
    const domains = d.domains || [];
    if (!domains.length) { list.innerHTML = ''; return; }
    list.innerHTML = domains.map(function(dm) { return '' +
      '<div class="skill-card" style="margin-bottom:.5rem">' +
        '<div style="display:flex;align-items:center;justify-content:space-between">' +
          '<h4 style="margin:0">' + dm.domain + '</h4>' +
          '<span class="conn-badge ' + (dm.status === 'active' ? 'connected' : 'disconnected') + '">' +
            '<span class="dot"></span> ' + dm.status +
          '</span>' +
        '</div>' +
        '<p style="font-size:.75rem;color:var(--muted);margin:.25rem 0 0 0">' +
          (dm.project ? 'Project: ' + dm.project : 'No project linked') + ' SSL: ' + dm.ssl_status +
          '<button class="btn btn-sm btn-ghost" style="margin-left:.5rem;font-size:.625rem;padding:.2rem .5rem"' +
            ' onclick="removeDomain(\'' + dm.id + '\')">Remove</button>' +
        '</p>' +
      '</div>';
    }).join('');
  } catch(e) { console.error(e); }
}

async function removeDomain(id) {
  try {
    await apiJSON('/api/user/domains/' + id, {method:'DELETE'});
    loadDomains();
  } catch(e) { alert(e.message); }
}

// ── Git Repos ──
async function connectGitRepo() {
  const url = document.getElementById('git-url-input').value.trim();
  const token = document.getElementById('git-token-input').value.trim();
  const statusEl = document.getElementById('git-status');
  if (!url) return;
  const parts = url.replace('https://github.com/', '').split('/');
  const repoName = parts.slice(0,2).join('/').replace('.git','');
  statusEl.textContent = 'Connecting...'; statusEl.style.display = 'block';
  try {
    const d = await apiJSON('/api/user/git/connect', {method:'POST', body:JSON.stringify({
      provider: url.includes('github.com') ? 'github' : 'gitlab',
      repo_url: url, repo_name: repoName, auth_token: token
    })});
    statusEl.textContent = 'Connected ' + d.repo;
    statusEl.style.display = 'block';
    document.getElementById('git-url-input').value = '';
    document.getElementById('git-token-input').value = '';
    loadGitRepos();
  } catch(e) { statusEl.textContent = 'Error: ' + e.message; statusEl.style.display = 'block'; }
}

async function loadGitRepos() {
  try {
    const d = await apiJSON('/api/user/git/repos');
    const list = document.getElementById('git-repos-list');
    const repos = d.repos || [];
    document.getElementById('integrations-count').textContent = repos.length;
    if (!repos.length) {
      list.innerHTML = '<p style="color:var(--muted);font-size:.875rem">No repositories connected</p>';
      return;
    }
    list.innerHTML = repos.map(function(r) { return '' +
      '<div class="skill-card" style="margin-bottom:.5rem">' +
        '<div style="display:flex;align-items:center;justify-content:space-between">' +
          '<h4 style="margin:0">' + r.provider + ': ' + r.repo_name + '</h4>' +
          '<span class="conn-badge connected"><span class="dot"></span> ' + r.status + '</span>' +
        '</div>' +
        '<p style="font-size:.75rem;color:var(--muted);margin:.25rem 0 0 0">' +
          '<a href="' + r.repo_url + '" target="_blank" style="color:var(--accent)">' + r.repo_url + '</a> branch: ' + r.branch +
          '<button class="btn btn-sm btn-ghost" style="margin-left:.5rem;font-size:.625rem;padding:.2rem .5rem"' +
            ' onclick="disconnectGit(\'' + r.id + '\')">Disconnect</button>' +
        '</p>' +
      '</div>';
    }).join('');
  } catch(e) { console.error(e); }
}

async function disconnectGit(id) {
  try {
    await apiJSON('/api/user/git/' + id, {method:'DELETE'});
    loadGitRepos();
  } catch(e) { alert(e.message); }
}

// ── Mail Inbox ──
async function loadMailInbox() {
  try {
    const d = await apiJSON('/api/user/mail/inbox');
    const list = document.getElementById('mail-inbox-list');
    const msgs = d.messages || [];
    if (!msgs.length) {
      list.innerHTML = '<p style="color:var(--muted);font-size:.875rem">No messages yet</p>';
      return;
    }
    if (USER && USER.email) document.getElementById('mail-address').textContent = USER.email;
    list.innerHTML = msgs.map(function(m) { return '' +
      '<div class="skill-card" style="margin-bottom:.5rem">' +
        '<h4 style="margin:0">' + (m.subject || '(No subject)') + '</h4>' +
        '<p style="font-size:.75rem;color:var(--muted);margin:.25rem 0 0 0">' +
          'From: ' + m.from_addr + ' ' + new Date(m.received_at).toLocaleString() +
          (m.task_created ? ' <span class="conn-badge connected"><span class="dot"></span> Task created</span>' : '') +
        '</p>' +
      '</div>';
    }).join('');
  } catch(e) { console.error(e); }
}

// ── Provider API ──
async function loadProviders() {
  try {
    const d = await apiJSON('/api/providers');
    const select = document.getElementById('provider-select');
    select.innerHTML = '<option value="">Select provider...</option>';
    // Add API key providers
    d.providers.filter(p => p.requires_key).forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      // Show which also support OAuth
      const label = p.has_oauth ? p.name + ' (or OAuth)' : p.name;
      opt.textContent = label;
      select.appendChild(opt);
    });
  } catch(e) { console.error('Failed to load providers:', e); }
}

function updateModels() {
  const provider = document.getElementById('provider-select').value;
  const modelSelect = document.getElementById('model-select');
  modelSelect.innerHTML = '<option value="">Select model...</option>';
  if (!provider) return;
  // Show placeholder — models are fetched per-provider
  modelSelect.innerHTML = '<option value="">Auto-detect (uses provider default)</option>';
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
  { id: 'openai-oauth', name: 'ChatGPT (OpenAI)', subtitle: 'Existing Plan', color: '#10a37f', icon: 'C' },
  { id: 'anthropic-oauth', name: 'Claude (Anthropic)', subtitle: 'Existing Plan', color: '#d97757', icon: 'C' },
  { id: 'google-oauth', name: 'Google', subtitle: 'Gemini models', color: '#4285f4', icon: 'G' },
  { id: 'nous-oauth', name: 'Nous Portal', subtitle: 'Research models', color: '#8b5cf6', icon: 'N' },
  { id: 'qwen-oauth', name: 'Qwen (Alibaba)', subtitle: 'Cloud account', color: '#ff6a00', icon: 'Q' },
  { id: 'github-copilot', name: 'GitHub Copilot', subtitle: 'Subscription', color: '#6e40c9', icon: 'G' },
  { id: 'openai-codex-oauth', name: 'OpenAI Codex', subtitle: 'Codex plan', color: '#10a37f', icon: 'X' },
];

async function loadOAuthProviders() {
  const grid = document.getElementById('oauth-providers');
  grid.innerHTML = '';
  OAUTH_PROVIDERS.forEach(p => {
    const card = document.createElement('div');
    card.className = 'oauth-card';
    card.innerHTML = `
      <div class="prov-icon" style="background:${p.color};color:#fff">${p.icon || p.name[0]}</div>
      <h4>${p.name}</h4>
      <p>${p.subtitle || 'OAuth login'}</p>
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

// ── Chat (Proxied to sandbox bapX) ──
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
    // Execute via sandbox — bapX inside handles the response
    const escaped = text.replace(/'/g, "'\\''");
    const result = await apiJSON('/api/sandbox/exec', {
      method:'POST', body:JSON.stringify({
        command: `cd ~ && echo '${escaped}' | bapX exec --timeout 120 2>/dev/null || echo 'Agent busy'`,
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
    const isActive = d.status === 'active';
    let graceHtml = '';
    if (d.grace_freeze_at && d.grace_prune_at) {
      const freeze = new Date(d.grace_freeze_at);
      const prune = new Date(d.grace_prune_at);
      const freezeDays = Math.max(0, Math.ceil((freeze - new Date()) / 86400000));
      const pruneDays = Math.max(0, Math.ceil((prune - new Date()) / 86400000));
      graceHtml = `
        <div style="background:${d.status === 'frozen' ? 'var(--danger)' : 'var(--warning-bg, #332)'};padding:.5rem .75rem;border-radius:6px;margin-top:.5rem;font-size:.8125rem">
          ${d.status === 'frozen'
            ? '⛔ <strong>Automations frozen</strong> — sandbox stopped due to payment failure'
            : '⚠️ <strong>Payment overdue</strong> — automations stop in ' + freezeDays + 'd'}
          <br>Sandbox will be removed in <strong>${pruneDays}d</strong>
          <br><a href="/pricing" style="color:var(--accent)">Resubscribe to restore</a>
        </div>`;
    }

    if (!isActive) {
      // Show plan selection
      let plansHtml = '';
      for (const [pid, p] of Object.entries(d.available_plans || {})) {
        plansHtml += `
          <div class="plan-card" onclick="selectPlan('${pid}')" style="cursor:pointer;border:1px solid var(--border);border-radius:8px;padding:.75rem;margin-bottom:.5rem;background:var(--surface);transition:border-color .2s" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
            <h4 style="margin:0 0 .25rem 0">${p.name}</h4>
            <p style="margin:0;font-size:1.25rem;font-weight:700">$${(p.price_cents / 100).toFixed(0)}<span style="font-size:.75rem;font-weight:400;color:var(--muted)">/mo</span></p>
            <p style="margin:.25rem 0 0 0;font-size:.8125rem;color:var(--muted)">${p.base_storage_gb}GB storage · free compute</p>
          </div>`;
      }
      document.getElementById('billing-info').innerHTML = `
        <h3 style="margin-top:0">Choose a Plan</h3>
        ${plansHtml}
        <p style="font-size:.75rem;color:var(--muted);margin-top:.5rem">
          Extra storage: $1/GB/mo (up to 100GB total) · compute always free<br>
          Cancel anytime. See <a href="/terms" style="color:var(--accent)">Terms</a> for abuse policy.
        </p>
        <div id="billing-loading" style="display:none;text-align:center;padding:.5rem;color:var(--muted)">Redirecting to Stripe...</div>
        ${graceHtml}`;
      return;
    }

    // Active subscription — show plan details + storage addon controls
    const used = d.storage_used_bytes > 0 ? (d.storage_used_bytes / 1024 / 1024).toFixed(1) + ' MB' : '0 MB';
    const totalCost = (d.base_storage_gb + d.extra_storage_gb) * (d.addon_price_cents / 100);
    document.getElementById('billing-info').innerHTML = `
      <h3 style="margin-top:0">${d.plan}</h3>
      <table style="width:100%;font-size:.875rem;border-collapse:collapse">
        <tr><td style="padding:.25rem 0;color:var(--muted)">Base storage</td><td style="text-align:right">${d.base_storage_gb} GB</td></tr>
        <tr><td style="padding:.25rem 0;color:var(--muted)">Extra storage</td><td style="text-align:right">${d.extra_storage_gb} GB</td></tr>
        <tr><td style="padding:.25rem 0;color:var(--muted)">Total limit</td><td style="text-align:right"><strong>${d.storage_limit_gb} GB</strong></td></tr>
        <tr><td style="padding:.25rem 0;color:var(--muted)">Used</td><td style="text-align:right">${used}</td></tr>
        <tr><td style="padding:.5rem 0;color:var(--muted);border-top:1px solid var(--border)">Monthly cost</td><td style="text-align:right;border-top:1px solid var(--border);font-weight:700">$${totalCost.toFixed(2)}</td></tr>
      </table>

      <div style="margin-top:.75rem">
        <label style="font-size:.8125rem;color:var(--muted);display:block;margin-bottom:.25rem">Extra Storage ($1/GB/mo)</label>
        <div style="display:flex;align-items:center;gap:.5rem">
          <button class="btn btn-sm" onclick="updateAddon(-5)" ${d.extra_storage_gb <= 0 ? 'disabled' : ''}>−5</button>
          <button class="btn btn-sm" onclick="updateAddon(-1)" ${d.extra_storage_gb <= 0 ? 'disabled' : ''}>−1</button>
          <span style="font-size:1rem;font-weight:600;min-width:3rem;text-align:center">${d.extra_storage_gb}</span>
          <button class="btn btn-sm" onclick="updateAddon(1)">+1</button>
          <button class="btn btn-sm" onclick="updateAddon(5)">+5</button>
        </div>
        <p style="font-size:.75rem;color:var(--muted);margin:.25rem 0 0 0">Max total: ${d.max_storage_gb}GB</p>
      </div>

      <div style="margin-top:.75rem;font-size:.8125rem;color:var(--muted)">
        Compute is free · <a href="/pricing" style="color:var(--accent)">Manage billing</a>
      </div>
      <div id="addon-error" style="display:none;color:var(--danger);font-size:.8125rem;margin-top:.25rem"></div>
      ${graceHtml}`;
  } catch(e) {
    document.getElementById('billing-info').innerHTML = '<p style="color:var(--muted)">Billing unavailable</p>';
  }
}

async function selectPlan(planId) {
  const loading = document.getElementById('billing-loading');
  if (loading) loading.style.display = 'block';
  try {
    const d = await apiJSON('/api/billing/create-checkout', { method:'POST', body:JSON.stringify({plan: planId}) });
    window.open(d.url, '_blank');
  } catch(e) {
    if (loading) loading.style.display = 'none';
    alert(e.message);
  }
}

async function updateAddon(delta) {
  try {
    const current = await apiJSON('/api/billing/subscription');
    const newExtra = Math.max(0, Math.min(current.extra_storage_gb + delta, current.max_storage_gb - current.base_storage_gb));
    const d = await apiJSON('/api/billing/update-storage', { method:'POST', body:JSON.stringify({extra_gb: newExtra}) });
    loadBilling();
  } catch(e) {
    const err = document.getElementById('addon-error');
    if (err) { err.textContent = e.message; err.style.display = 'block'; setTimeout(() => err.style.display = 'none', 3000); }
  }
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

// ═══════════════════════════════════════════
// RIGHT PANEL — Flow View, Browser, Terminal
// ═══════════════════════════════════════════

// ── Flow View (Agent Activity Stream) ──
function addFlowStep(type, title, desc, status) {
  const list = document.getElementById('flow-list');
  const empty = document.getElementById('flow-empty');
  if (empty) empty.remove();

  const icons = { think:'💭', term:'▸', file:'📄', diff:'↔', error:'✕', check:'✓' };
  const icon = icons[type] || '○';
  const step = document.createElement('div');
  step.className = 'flow-step' + (status === 'error' ? ' step-error' : status === 'running' ? ' step-running' : '');
  const spinner = status === 'running' ? '<span class="flow-step-spinner"></span>' : '';
  step.innerHTML =
    `<div class="flow-step-icon icon-${type}">${icon}</div>` +
    `<div class="flow-step-body">` +
      `<div class="flow-step-title">${title}${spinner}</div>` +
      (desc ? `<div class="flow-step-desc">${desc}</div>` : '') +
      `<div class="flow-step-time">${new Date().toLocaleTimeString()}</div>` +
    `</div>`;
  list.appendChild(step);
  list.scrollTop = list.scrollHeight;

  // Update stats
  document.getElementById('flow-steps-total').textContent =
    parseInt(document.getElementById('flow-steps-total').textContent) + 1;
}

function addFlowTerm(cmd, output) {
  const clean = output ? output.replace(/</g,'&lt;').replace(/>/g,'&gt;') : '';
  addFlowStep('term', `$ ${cmd}`, `<code>${clean.slice(0,200)}</code>`, 'done');
  // Also echo to terminal
  addTermLine(cmd, 'cmd');
  if (output) addTermLine(output, 'out');
}

function addFlowDiff(file, diffText) {
  const clean = diffText ? diffText.replace(/</g,'&lt;').replace(/>/g,'&gt;').slice(0,300) : '';
  addFlowStep('diff', `Changed: ${file}`, `<code>${clean}</code>`, 'done');
  // Update file count
  document.getElementById('flow-files-changed').textContent =
    parseInt(document.getElementById('flow-files-changed').textContent) + 1;
}

function addFlowFile(file, action) {
  addFlowStep('file', `${action || 'Modified'}: ${file}`, '', 'done');
  document.getElementById('flow-files-changed').textContent =
    parseInt(document.getElementById('flow-files-changed').textContent) + 1;
}

function addFlowError(msg) {
  addFlowStep('error', 'Error', msg, 'error');
}

function addFlowAgentStep(desc) {
  addFlowStep('think', 'Agent thinking', desc, 'running');
}

function clearFlow() {
  document.getElementById('flow-list').innerHTML =
    `<div class="flow-empty" id="flow-empty">` +
    `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>` +
    `<span>Agent activity will appear here</span></div>`;
  document.getElementById('flow-steps-total').textContent = '0';
  document.getElementById('flow-files-changed').textContent = '0';
}

function setSandboxStatus(status) {
  const dot = document.getElementById('rp-status-dot');
  const label = document.getElementById('rp-status-label');
  dot.className = 'sb-dot ' + status;
  const labels = { idle:'Idle', running:'Running', error:'Error', stopped:'Stopped' };
  label.textContent = labels[status] || status;
}

// ── Browser View ──
let browserHistory = [];
let browserHistoryIdx = -1;

function browserNav(dir) {
  if (dir === 'back' && browserHistoryIdx > 0) {
    browserHistoryIdx--;
    document.getElementById('br-frame').src = browserHistory[browserHistoryIdx];
    document.getElementById('br-url').value = browserHistory[browserHistoryIdx];
  } else if (dir === 'forward' && browserHistoryIdx < browserHistory.length - 1) {
    browserHistoryIdx++;
    document.getElementById('br-frame').src = browserHistory[browserHistoryIdx];
    document.getElementById('br-url').value = browserHistory[browserHistoryIdx];
  } else if (dir === 'refresh') {
    document.getElementById('br-frame').src = document.getElementById('br-frame').src;
  }
  updateBrButtons();
}

function browserNavUrl() {
  const url = document.getElementById('br-url').value.trim();
  if (!url) return;
  const full = url.startsWith('http') ? url : 'https://' + url;
  document.getElementById('br-frame').src = full;
  // Add to history
  if (browserHistoryIdx < browserHistory.length - 1)
    browserHistory = browserHistory.slice(0, browserHistoryIdx + 1);
  browserHistory.push(full);
  browserHistoryIdx = browserHistory.length - 1;
  updateBrButtons();
}

function updateBrButtons() {
  document.getElementById('br-back').disabled = browserHistoryIdx <= 0;
  document.getElementById('br-fwd').disabled = browserHistoryIdx >= browserHistory.length - 1;
}

// ── Terminal View ──
function addTermLine(text, cls) {
  const out = document.getElementById('term-output');
  const div = document.createElement('div');
  div.className = 'term-line term-' + (cls || 'out');
  div.innerHTML = text.replace(/</g,'&lt;').replace(/>/g,'&gt;');
  out.appendChild(div);
  out.scrollTop = out.scrollHeight;
}

function toggleTermInput() {
  const line = document.getElementById('term-input-line');
  line.classList.toggle('hidden');
  if (!line.classList.contains('hidden'))
    document.getElementById('term-input').focus();
}

async function sendTermCommand() {
  const input = document.getElementById('term-input');
  const cmd = input.value.trim();
  if (!cmd) return;
  input.value = '';
  addTermLine('$ ' + cmd, 'cmd');
  addFlowTerm(cmd, '');
  try {
    const r = await apiJSON('/api/sandbox/exec', {
      method:'POST', body:JSON.stringify({command: cmd, language:'bash'})
    });
    if (r.output) addTermLine(r.output, 'out');
    if (r.error) addTermLine(r.error, 'err');
  } catch(e) {
    addTermLine('Error: ' + e.message, 'err');
  }
}

function clearTerm() {
  document.getElementById('term-output').innerHTML =
    `<div class="term-line term-welcome"><span class="term-prompt">$</span> bapX sandbox terminal</div>`;
}

// ── Slash Commands Popup ──
// Query sandbox bapX for available commands dynamically
let slashCommandsCache = [];

async function loadSlashCommands() {
  try {
    // Get built-in commands from sandbox bapX
    const r = await apiJSON('/api/sandbox/exec', {
      method:'POST', body:JSON.stringify({
        command: 'bapX --list-commands 2>/dev/null || echo "model,memories,skills,review,plan,clear,diff,status,stop,copy,side,new,resume,goal,personality,mcp,apps,plugins,theme,pets,init,fork,compact,rename,raw,files,help"',
        language:'bash'
      })
    });
    const cmds = (r.output || '').split(/[\n,]/).map(s => s.trim().replace(/^\//,'')).filter(Boolean);
    slashCommandsCache = cmds.length ? cmds : [
      'model','memories','skills','review','plan','clear','diff','status',
      'stop','copy','side','new','resume','goal','personality','mcp','apps',
      'plugins','theme','pets','init','fork','compact','rename','raw','files','help'
    ];
  } catch(e) {
    slashCommandsCache = ['model','memories','skills','review','plan','clear','diff','status'];
  }
}

// Listen for / in chat input
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('chat-input');
  let slashPopup = null;

  input.addEventListener('input', () => {
    const val = input.value;
    const cursorPos = input.selectionStart;
    const textBefore = val.slice(0, cursorPos);

    // Check if we're typing a slash command
    const slashMatch = textBefore.match(/^\/(\w*)$/);
    if (!slashMatch) {
      if (slashPopup) { slashPopup.remove(); slashPopup = null; }
      return;
    }

    const partial = slashMatch[1].toLowerCase();
    // Filter commands
    const matches = slashCommandsCache.filter(c => c.startsWith(partial));

    if (!slashPopup) {
      slashPopup = document.createElement('div');
      slashPopup.className = 'slash-popup';
      input.parentElement.style.position = 'relative';
      input.parentElement.appendChild(slashPopup);
    }

    if (matches.length === 0) {
      slashPopup.innerHTML = '<div class="slash-no-match">No matching commands</div>';
      return;
    }

    slashPopup.innerHTML = matches.slice(0, 8).map(c =>
      `<div class="slash-item" data-cmd="${c}" onclick="insertSlashCommand('${c}')">/${c}</div>`
    ).join('');
    slashPopup.style.display = 'block';
  });

  // Hide popup on blur
  input.addEventListener('blur', () => {
    setTimeout(() => { if (slashPopup) { slashPopup.remove(); slashPopup = null; } }, 200);
  });
});

function insertSlashCommand(cmd) {
  const input = document.getElementById('chat-input');
  input.value = '/' + cmd + ' ';
  input.focus();
  // Remove popup
  const popup = document.querySelector('.slash-popup');
  if (popup) popup.remove();
}

// ── Streaming Chat (SSE) ──
let CHAT_SESSION_ID = null;

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  // Check for slash command
  if (text.startsWith('/')) {
    handleSlashCommand(text);
    input.value = '';
    return;
  }

  input.value = '';
  CHAT_HISTORY.push({role:'user', content:text});
  addMessage(text, 'user');
  addTypingIndicator();
  const sendBtn = document.getElementById('send-btn');
  sendBtn.disabled = true;

  try {
    // Use SSE streaming
    const headers = apiHeaders();
    const resp = await fetch(API + '/api/sandbox/stream', {
      method:'POST',
      headers: { ...headers, 'Accept':'text/event-stream' },
      body: JSON.stringify({
        message: text,
        session_id: CHAT_SESSION_ID,
        history: CHAT_HISTORY.slice(-10)
      })
    });

    if (!resp.ok) throw new Error('Stream failed: ' + resp.status);
    removeTypingIndicator();

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let buffer = '';

    // Show assistant message bubble (will update)
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg assistant';
    document.getElementById('chat-messages').appendChild(msgDiv);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, {stream: true});
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') break;

          try {
            const evt = JSON.parse(data);
            if (evt.type === 'text') {
              fullResponse += evt.content;
              msgDiv.textContent = fullResponse;
            } else if (evt.type === 'step') {
              addFlowStep(evt.step_type || 'think', evt.title || 'Step', evt.description, 'running');
            } else if (evt.type === 'step_done') {
              addFlowStep(evt.step_type || 'check', evt.title || 'Complete', evt.description, 'done');
            } else if (evt.type === 'command') {
              addFlowTerm(evt.command, evt.output);
            } else if (evt.type === 'diff') {
              addFlowDiff(evt.file, evt.diff);
            } else if (evt.type === 'file') {
              addFlowFile(evt.file, evt.action);
            } else if (evt.type === 'error') {
              addFlowError(evt.message);
            } else if (evt.type === 'session') {
              CHAT_SESSION_ID = evt.session_id;
            }
          } catch(e) {
            // Not JSON - just append as text
            fullResponse += data;
            msgDiv.textContent = fullResponse;
          }
        }
      }
      // Auto-scroll chat
      const messagesEl = document.getElementById('chat-messages');
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    // Final message
    if (fullResponse) {
      CHAT_HISTORY.push({role:'assistant', content:fullResponse});
    }
    setSandboxStatus('idle');

  } catch(e) {
    removeTypingIndicator();
    addMessage(`Error: ${e.message}`, 'assistant');
    addFlowError(e.message);
  }
  sendBtn.disabled = false;
}

// ── Slash Command Execution ──
async function handleSlashCommand(text) {
  const cmd = text.slice(1).trim();
  const parts = cmd.split(/\s+/);
  const command = parts[0];
  const args = parts.slice(1).join(' ');

  addMessage(text, 'user');

  // Execute via sandbox bapX
  addTypingIndicator();
  try {
    const escaped = cmd.replace(/'/g, "'\\''");
    const r = await apiJSON('/api/sandbox/exec', {
      method:'POST', body:JSON.stringify({
        command: `bapX --${escaped} 2>/dev/null || echo 'Command not available in sandbox'`,
        language:'bash'
      })
    });
    removeTypingIndicator();
    const response = r.output || 'No response';
    CHAT_HISTORY.push({role:'assistant', content:response});
    addMessage(response, 'assistant');
  } catch(e) {
    removeTypingIndicator();
    addMessage(`Error: ${e.message}`, 'assistant');
  }
}

// Override switchRpTab — already handled in initDashboard
