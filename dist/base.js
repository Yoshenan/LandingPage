const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const auditView = document.getElementById('click-box');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const sideBar = document.getElementById('side-nav');
const auditContainer = document.getElementById('company-logs');
const requestForm = document.getElementById('form');

const eye = document.getElementById('eye-icon');
const eyeOff = document.getElementById('eye-off-icon');
const toggle = document.getElementById('toggle-password');
const list = document.getElementById('telegram-list');

const passwordInputMain = document.getElementById('password') || '';

if (toggle && passwordInputMain) {
  toggle.addEventListener('click', () => {
    const isPassword = passwordInputMain.type === 'password';
    passwordInputMain.type = isPassword ? 'text' : 'password';

    if (eye) eye.classList.toggle('hidden', isPassword);
    if (eyeOff) eyeOff.classList.toggle('hidden', !isPassword);
  });
}

const savedTheme = localStorage.getItem('theme');

  if (savedTheme === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
  }

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', () => {
  renderRequests();
  checkAdminAccess();
  updateCompanyUI(sessionStorage.getItem('company_name') || '');
  switchState(sessionStorage.getItem('logged_username') ? 'Dashboard' : 'Login');
  getLogs();

  // Check and display pending toast notification after page redirect
  checkPendingToast();

  // Check if redirected from Dashboard to Edit
  checkPendingEditMode();

  const outBtn = document.getElementById('quick-logout-btn');
  outBtn?.addEventListener('click', () => {
    performLogout();
  });

  const backToRequestsBtn = document.getElementById('back-to-requests-btn');
  backToRequestsBtn?.addEventListener('click', () => {
    window.location.href = 'request.html';
  });
});

// --- Helper: Show toast if stored before redirect ---
function checkPendingToast() {
  const pendingToast = sessionStorage.getItem('pending_toast');
  if (pendingToast) {
    show_toast(pendingToast);
    sessionStorage.removeItem('pending_toast');
  }
}

// --- Auto-fill form if editing across pages ---
function checkPendingEditMode() {
  const editingId = sessionStorage.getItem('editing_request_id');
  const formEl = document.getElementById('form');

  if (!editingId || !formEl) return;

  const rawData = sessionStorage.getItem('requests');
  if (!rawData) return;

  try {
    const requests = JSON.parse(rawData);
    const itemToEdit = requests.find((r) => r.id === editingId);

    if (itemToEdit && itemToEdit.formData) {
      const { fullName, email, num, selectedOrg, environmentDetails, platForm, Req } = itemToEdit.formData;

      if (document.getElementById('name')) document.getElementById('name').value = fullName || '';
      if (document.getElementById('email')) document.getElementById('email').value = email || '';
      if (document.getElementById('phone-num')) document.getElementById('phone-num').value = num || '';

      const setRadio = (name, val) => {
        if (!val) return;
        document.querySelectorAll(`input[name="${name}"]`).forEach((r) => (r.checked = false));
        const targetRadio = document.querySelector(`input[name="${name}"][value="${CSS.escape(val)}"]`);
        if (targetRadio) targetRadio.checked = true;
      };

      setRadio('organization', selectedOrg);
      setRadio('environment', environmentDetails);
      setRadio('platform_category', platForm);
      setRadio('request_type', Req);

      formEl.dataset.editingId = editingId;
      const hiddenIdInput = document.getElementById('edit-request-id');
      if (hiddenIdInput) hiddenIdInput.value = editingId;

      const form_title = document.getElementById('form-title');
      const subtitle = document.getElementById('form-subtitle');
      const back = document.getElementById('form-back');

      if (form_title) {
        form_title.textContent = `Edit Request (${editingId})`;
        form_title.classList.replace('text-emerald-400', 'text-amber-400');
      }

      if (subtitle) {
        subtitle.textContent = 'Modify the details below and save your changes.';
      }
      if (back) back.classList.add('hidden');

      show_toast(`Loaded ${editingId} for editing`);
    }
  } catch (err) {
    console.error('Error populating edit form:', err);
  } finally {
    sessionStorage.removeItem('editing_request_id');
  }
}

function populateFormForEdit(requestId) {
  const formEl = document.getElementById('form');
  sessionStorage.setItem('editing_request_id', requestId);

  if (formEl) {
    checkPendingEditMode();
    formEl.scrollIntoView({ behavior: 'smooth' });
  } else {
    window.location.href = 'forms.html';
  }
}

function renderRequests() {
  const requestList = document.getElementById('request-list');
  if (!requestList) return;

  requestList.innerHTML = '';

  const existingRequests = JSON.parse(
    sessionStorage.getItem('requests') || '[]'
  );

  if (existingRequests.length === 0) {
    requestList.innerHTML =
      '<p class="text-slate-500 dark:text-slate-400 text-sm">No requests found.</p>';
    return;
  }

  existingRequests.forEach((item) => {
    const container = document.createElement('div');
    container.className = 'space-y-1 request-item mb-3';
    container.dataset.org = (item.organization || '').toLowerCase();

    // Request button (With dark mode background)
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'w-full text-left bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 p-3.5 rounded-lg text-emerald-600 dark:text-emerald-400 font-mono text-sm font-semibold transition';

    btn.textContent = item.id || 'REQ-UNKNOWN';

    // Details container (With dark mode background)
    const details = document.createElement('div');
    details.className =
      'hidden bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-3.5 rounded-lg text-xs space-y-2 mt-1';

    details.innerHTML = `
      <div class="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
        <p class="text-blue-600 dark:text-blue-400 font-semibold">
          ${escapeHtml(item.organization || 'General')}
        </p>

        <div class="flex gap-2">
          <button
            type="button"
            class="edit-req-btn text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded transition"
            data-id="${escapeHtml(item.id || '')}"
          >
            Edit
          </button>

          <button
            type="button"
            class="delete-req-btn text-[11px] bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 border border-red-500/30 px-2.5 py-1 rounded transition"
            data-id="${escapeHtml(item.id || '')}"
          >
            Delete
          </button>
        </div>
      </div>

      <p class="text-slate-700 dark:text-slate-300 leading-relaxed pt-1">
        ${escapeHtml(item.request || 'No details')}
      </p>
    `;

    // Toggle details
    btn.addEventListener('click', () => {
      details.classList.toggle('hidden');
    });

    // Edit handler
    const editBtn = details.querySelector('.edit-req-btn');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        populateFormForEdit(item.id);
      });
    }

    // Delete handler
    const deleteBtn = details.querySelector('.delete-req-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();

        const confirmed = confirm(
          `Are you sure you want to delete ${item.id}?`
        );

        if (!confirmed) return;

        const updatedRequests = existingRequests.filter(
          (request) => request.id !== item.id
        );

        sessionStorage.setItem(
          'requests',
          JSON.stringify(updatedRequests)
        );

        container.remove();
        show_toast(`${item.id} deleted successfully.`);
      });
    }

    container.appendChild(btn);
    container.appendChild(details);

    requestList.appendChild(container);
  });

  autoFilterByActiveCompany();
}



function checkAdminAccess() {
  const userRole = sessionStorage.getItem('user_role');
  const manageUsersCard = document.getElementById('manage-user-card');

  if (manageUsersCard) {
    if (userRole === 'Admin') {
      manageUsersCard.style.display = '';
      manageUsersCard.classList.remove('hidden');
    } else {
      manageUsersCard.style.display = 'none';
    }
  }
}

function getActiveCompanyKey() {
  const companyStored = sessionStorage.getItem('company_name') || 'default';
  return companyStored.toLowerCase();
}

const logBoxes = document.querySelectorAll('.log-box');
logBoxes.forEach((box) => {
  box.addEventListener('click', async () => {
    const detailsInput = box.dataset.action || 'No action selected';
    const username = sessionStorage.getItem('logged_username') || 'User';
    const companyName = getActiveCompanyKey();

    const newLogObj = {
      username: username,
      companyName: companyName,
      entry: detailsInput,
      createdAt: new Date().toISOString(),
    };

    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLogObj),
      }).catch((err) => console.warn('API log save unavailable:', err));

      const companyKey = `logs_${companyName}`;
      const savedLogs = JSON.parse(sessionStorage.getItem(companyKey) || '[]');
      savedLogs.unshift(newLogObj);
      sessionStorage.setItem(companyKey, JSON.stringify(savedLogs));

      await getLogs();
      show_toast(`Action logged: ${detailsInput}`);
    } catch (error) {
      console.error('Failed to create log:', error);
      show_toast('Failed to record action log.', true);
    }
  });
});

sideBar?.addEventListener('click', (e) => {
  const homeBtn = e.target.closest('#home-btn');
  const auditBtn = e.target.closest('#audit-btn');
  const logoutClick = e.target.closest('#logout-btn');

  if (homeBtn) {
    e.preventDefault();
    switchState('Dashboard');
  } else if (auditBtn) {
    e.preventDefault();
    switchState('Audit');
  } else if (logoutClick) {
    e.preventDefault();
    performLogout();
  }
});

function switchState(state) {
  if (state === 'Login') {
    loginView?.classList.remove('hidden');
    auditView?.classList.add('hidden');
    dashboardView?.classList.add('hidden');
    sideBar?.classList.add('hidden');
    history.replaceState({ view: 'login' }, '', window.location.pathname);
  } else if (state === 'Dashboard') {
    loginView?.classList.add('hidden');
    auditView?.classList.remove('hidden');
    dashboardView?.classList.add('hidden');
    sideBar?.classList.remove('hidden');
    history.pushState({ view: 'dashboard' }, '', '#dashboard');
  } else if (state === 'Audit') {
    loginView?.classList.add('hidden');
    auditView?.classList.add('hidden');
    dashboardView?.classList.remove('hidden');
    sideBar?.classList.remove('hidden');
    history.pushState({ view: 'audit' }, '', '#audit');
  }
}

function updateCompanyUI(companyName) {
  if (!companyName) return;

  document.documentElement.setAttribute('data-company', companyName.toLowerCase().trim());

  const orgRadio = document.getElementById('org-company-radio');
  const orgLabel = document.getElementById('org-company-label');
  const clientDetailsDisplay = document.getElementById('client-display');

  if (orgRadio) orgRadio.value = companyName;
  if (orgLabel) orgLabel.textContent = companyName;
  if (clientDetailsDisplay) clientDetailsDisplay.textContent = companyName;

  const companyInputs = document.querySelectorAll('.company-field, #company-name');
  companyInputs.forEach((el) => {
    if ('value' in el && el.tagName === 'INPUT') {
      el.value = companyName;
    } else {
      el.textContent = companyName;
    }
  });
}

function performLogout() {
  sessionStorage.removeItem('company_name');
  sessionStorage.removeItem('logged_username');
  sessionStorage.removeItem('user_role');

  updateCompanyUI('');
  checkAdminAccess();
  switchState('Login');
  show_toast('Logged out successfully');
}

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const usernameInput = document.getElementById('username')?.value || '';
  const passwordInput = document.getElementById('password')?.value || '';

  try {
    let company = sessionStorage.getItem('company_name') || 'General';
    let role = 'User';

    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameInput, password: passwordInput }),
    });

    if (response.ok) {
      const data = await response.json();
      company = data.companyName || data.user?.companyName || company;
      role = data.role || data.user?.role || 'User';

      if (company) {
        company = company.charAt(0).toUpperCase() + company.slice(1);
      }

      sessionStorage.setItem('user_role', role);
      sessionStorage.setItem('company_name', company);
      sessionStorage.setItem('logged_username', usernameInput);

      updateCompanyUI(company);
      checkAdminAccess();
      await getLogs();

      switchState('Dashboard');
      show_toast(`Welcome back, ${usernameInput}!`);
      return;
    } else {
      const errData = await response.json();
      show_toast(errData.error || 'Invalid credentials', true);
      return;
    }
  } catch (error) {
    console.error('Login error:', error);
    show_toast('Network error connecting to login service.', true);
  }
});

logoutBtn?.addEventListener('click', () => {
  performLogout();
});

async function getLogs() {
  if (!auditContainer) return;

  let logs = [];

  try {
    const activeCompany = getActiveCompanyKey();
    const res = await fetch(`/api/logs?companyName=${encodeURIComponent(activeCompany)}`);
    if (res.ok) {
      logs = await res.json();
    } else {
      console.log('API responded with error status:', res.status);
    }
  } catch (err) {
    console.warn('Backend fetch failed, falling back to sessionStorage:', err);
  }

  if (!Array.isArray(logs) || logs.length === 0) {
    const companyKey = `logs_${getActiveCompanyKey()}`;
    logs = JSON.parse(sessionStorage.getItem(companyKey) || '[]');
  }

  auditContainer.innerHTML = '';

  if (!Array.isArray(logs) || logs.length === 0) {
    auditContainer.innerHTML = '<p class="text-slate-500 dark:text-slate-400 text-sm">No logs yet</p>';
    return;
  }

  logs.forEach((log) => {
    const logItem = document.createElement('div');
    logItem.className = 'py-1 border-b border-slate-200 dark:border-slate-700/50 text-xs font-mono text-slate-700 dark:text-slate-300';

    if (typeof log === 'string') {
      logItem.textContent = log;
    } else if (typeof log === 'object' && log !== null) {
      const dateStr = log.createdAt ? new Date(log.createdAt).toLocaleString() : new Date().toLocaleString();
      const userStr = log.username || log.email || 'Anonymous';
      const entryText = log.entry || log.details || '';

      logItem.textContent = `[${dateStr}] ${userStr}: ${entryText}`;
    }

    auditContainer.appendChild(logItem);
  });
}

// --- Request Form Submit Handler ---
requestForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  // 1. Extract and sanitize inputs
  const fullName = document.getElementById('name')?.value.trim() || '';
  const email = document.getElementById('email')?.value.trim() || '';
  const num = document.getElementById('phone-num')?.value.trim() || '';

  const selectedOrg = document.querySelector('input[name="organization"]:checked')?.value;
  const environmentDetails = document.querySelector('input[name="environment"]:checked')?.value;
  const platForm = document.querySelector('input[name="platform_category"]:checked')?.value;
  const Req = document.querySelector('input[name="request_type"]:checked')?.value;

  // 2. Validate mandatory fields
  if (!fullName || !email || !num || !selectedOrg || !environmentDetails || !platForm || !Req) {
    show_toast('Please fill out all required fields and select options.', true);
    return;
  }

  // Basic email structure check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    show_toast('Please enter a valid email address.', true);
    return;
  }

  // 3. Prepare payload and state metadata
  let company = (sessionStorage.getItem('company_name') || 'General').toUpperCase();
  const editingId = requestForm.dataset.editingId || document.getElementById('edit-request-id')?.value || null;
  const isEditing = Boolean(editingId);

  const payload = {
    fullName,
    email,
    company,
    environmentDetails,
    platForm,
    Req,
    num,
    organization: selectedOrg
  };

  try {
    // 4. API Request
    const response = await fetch(isEditing ? `/api/submit/${editingId}` : '/api/submit', {
      method: isEditing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Server returned status: ${response.status}`);
    }

    // 5. Build local storage record
    const id = isEditing ? editingId : 'REQ-' + Date.now();
    const cleanLogText = `Submitted ${Req} request for ${platForm} (${environmentDetails}) by ${fullName} works in ${company} company`;

    const newRequest = {
      id,
      organization: selectedOrg,
      request: cleanLogText,
      formData: { fullName, email, num, selectedOrg, environmentDetails, platForm, Req }
    };

    // 6. Update sessionStorage requests list
    let existingRequests = [];
    try {
      existingRequests = JSON.parse(sessionStorage.getItem('requests') || '[]');
    } catch (err) {
      existingRequests = [];
    }

    let toastMsg = '';
    if (isEditing) {
      existingRequests = existingRequests.map((item) => (item.id === editingId ? newRequest : item));
      toastMsg = `Request ${editingId} updated successfully!`;
    } else {
      existingRequests.unshift(newRequest);
      toastMsg = `Request ${id} created successfully!`;
    }

    sessionStorage.setItem('requests', JSON.stringify(existingRequests));
    sessionStorage.setItem('pending_toast', toastMsg);

    // 7. Reset Form & Redirect
    delete requestForm.dataset.editingId;
    const editInput = document.getElementById('edit-request-id');
    if (editInput) editInput.value = '';

    requestForm.reset();
    window.location.href = 'request.html';

  } catch (error) {
    console.error('Submit error:', error);
    show_toast('Request submission failed. Please try again.', true);
  }
});

function autoFilterByActiveCompany() {
  const activeCompany = (sessionStorage.getItem('company_name') || '').toLowerCase();
  if (!activeCompany || activeCompany === 'general') return;

  const items = document.querySelectorAll('#company-logs > div, #request-list > div');

  items.forEach((item) => {
    const text = item.textContent.toLowerCase();
    const orgData = item.dataset.org || '';
    if (text.includes(activeCompany) || orgData.includes(activeCompany)) {
      item.style.display = '';
    } else {
      item.style.display = 'none';
    }
  });
}

export async function authedFetch(url, options = {}) {
  options.credentials = 'include';
  options.headers = options.headers || {};

  if (options.body && typeof options.body === 'string' && !options.headers['Content-Type']) {
    options.headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, options);

  if (res.status === 401 || res.status === 403) {
    show_toast('Session expired or unauthorized access.', true);
    window.location.href = '/';
    return null;
  }

  return res;
}

export function show_toast (message, isError = false) {
  let container = document.getElementById('toast-container');

  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');

  toast.className = `px-4 py-3 rounded-lg border text-xs font-medium shadow-xl pointer-events-auto transition-all duration-300 ${
    isError
      ? 'bg-rose-100 dark:bg-rose-950/90 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300'
      : 'bg-emerald-100 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
  }`;
  toast.textContent = message;

  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

async function getTelegramData() {
  try {
    const response = await fetch('/api/submission');
    if (!response.ok) throw new Error('Failed to fetch Telegram submissions');
    const data = await response.json();

    if (!list) return;
    list.innerHTML = '';

    if (data.length === 0) {
      list.innerHTML = '<p class="text-slate-500 dark:text-slate-400 text-sm">No Telegram requests found.</p>';
      return;
    }

    data.forEach((submission) => {
      const item = document.createElement('div');

      // Added explicit dark mode background and border colors here
      item.className =
        'bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg mb-3 shadow-sm text-sm overflow-hidden';

      item.innerHTML = `
        <!-- Header -->
        <div class="flex items-center justify-between p-3.5 bg-slate-200/50 dark:bg-slate-800/80 border-b border-slate-300 dark:border-slate-700">

          <div class="flex items-center gap-2">
            <span class="bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold px-2 py-0.5 rounded text-xs">
              TELEGRAM
            </span>

            <span class="text-slate-500 dark:text-slate-400 text-xs">
              ${submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : 'N/A'}
            </span>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="toggle-btn text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2 py-1 rounded hover:bg-slate-300 dark:hover:bg-slate-700 transition"
              title="Minimize"
            >
              −
            </button>

            <button
              type="button"
              class="delete-btn text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition"
              title="Delete"
            >
              🗑
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="submission-content px-3.5 py-3 text-slate-700 dark:text-slate-300 text-xs space-y-1.5">
          <p><span class="text-slate-500 dark:text-slate-400 font-medium">Client:</span> ${escapeHtml(submission.client || 'N/A')}</p>
          <p><span class="text-slate-500 dark:text-slate-400 font-medium">Organization:</span> ${escapeHtml(submission.organization || 'N/A')}</p>
          <p><span class="text-slate-500 dark:text-slate-400 font-medium">Full Name:</span> ${escapeHtml(submission.fullName || 'N/A')}</p>
          <p><span class="text-slate-500 dark:text-slate-400 font-medium">Email:</span> ${escapeHtml(submission.email || 'N/A')}</p>
          <p><span class="text-slate-500 dark:text-slate-400 font-medium">Phone:</span> ${escapeHtml(submission.phone || 'N/A')}</p>
          <p><span class="text-slate-500 dark:text-slate-400 font-medium">Environment:</span> ${escapeHtml(submission.environment || 'N/A')}</p>
          <p><span class="text-slate-500 dark:text-slate-400 font-medium">Platform:</span> ${escapeHtml(submission.platformCategory || 'N/A')}</p>
          <p><span class="text-slate-500 dark:text-slate-400 font-medium">Request:</span> ${escapeHtml(submission.requestType || 'N/A')}</p>
        </div>
      `;

      // Minimize / maximize handlers
      const toggleBtn = item.querySelector('.toggle-btn');
      const content = item.querySelector('.submission-content');

      toggleBtn?.addEventListener('click', () => {
        if (content?.classList.contains('hidden')) {
          content?.classList.remove('hidden');
          if (toggleBtn) {
            toggleBtn.textContent = '−';
            toggleBtn.setAttribute('title', 'Minimize');
          }
        } else {
          content?.classList.add('hidden');
          if (toggleBtn) {
            toggleBtn.textContent = '+';
            toggleBtn.setAttribute('title', 'Maximize');
          }
        }
      });

      // Delete handler
      const deleteBtn = item.querySelector('.delete-btn');
      deleteBtn?.addEventListener('click', async () => {
        try {
          const response = await fetch(`/api/submission/${submission._id}`, {
            method: 'DELETE'
          });

          if (!response.ok) {
            throw new Error('Failed to delete submission');
          }

          item.remove();
          show_toast('Submission deleted successfully');
        } catch (error) {
          console.error('Delete error:', error);
          show_toast('Failed to delete submission.', true);
        }
      });

      list?.append(item);
    });
  } catch (err) {
    console.error('Error loading Telegram data:', err);
  }
}
getTelegramData();
