import { authedFetch, show_toast } from "./base.js";

// Helper for XSS escaping
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeAttribute(str) {
  return escapeHtml(str);
}

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // DOM & INPUT ELEMENTS (Declared at top)
  // ==========================================
  const userList = document.getElementById('user-list-body');
  const addUserForm = document.getElementById('add-user-form');
  const passwordInput = document.getElementById('password');

  // Modal Elements
  const editModal = document.getElementById('edit-user-modal');
  const editUserForm = document.getElementById('edit-user-form');
  const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');

  // Edit Input Elements
  const editIdInput = document.getElementById('edit-user-id');
  const editUsernameInput = document.getElementById('edit-username');
  const editCompanySelect = document.getElementById('edit-companyName');
  const editRoleSelect = document.getElementById('edit-role');
  const editPasswordInput = document.getElementById('edit-password');

  // Password Toggles - Add Form
  const eyeIcon = document.getElementById('add-eye-icon');
  const eyeOffIcon = document.getElementById('add-eye-off-icon');
  const toggleBtn = document.getElementById('add-toggle-password');

  // Password Toggles - Edit Form
  const e_eyeIcon = document.getElementById('edit-eye-icon');
  const e_eyeOffIcon = document.getElementById('edit-eye-off-icon');
  const e_toggleBtn = document.getElementById('edit-toggle-password');

  // ==========================================
  // DECOUPLED PASSWORD STRENGTH CHECKER
  // ==========================================
  function updateStrength(inputEl, barId, labelId) {
    const barEl = document.getElementById(barId);
    const labelEl = document.getElementById(labelId);
    if (!barEl || !labelEl) return;

    const passwd = inputEl?.value || '';

    const length = passwd.length >= 8;
    const upper = /[A-Z]/.test(passwd);
    const lower = /[a-z]/.test(passwd);
    const number = /[0-9]/.test(passwd);
    const special = /[!@#$%^&*]/.test(passwd);

    const passed = [length, upper, lower, number, special].filter(Boolean).length;

    if (!passwd) {
      barEl.style.width = '0%';
      barEl.className = 'h-full transition-all duration-300';
      labelEl.textContent = 'None';
      labelEl.className = 'font-semibold text-slate-400';
      return;
    }

    if (passed >= 5) {
      barEl.style.width = '100%';
      barEl.className = 'h-full bg-emerald-500 transition-all duration-300 shadow-sm shadow-emerald-500/50';
      labelEl.textContent = 'Strong';
      labelEl.className = 'font-semibold text-emerald-400';
    } else if (passed >= 3) {
      barEl.style.width = '60%';
      barEl.className = 'h-full bg-indigo-500 transition-all duration-300 shadow-sm shadow-indigo-500/50';
      labelEl.textContent = 'Moderate';
      labelEl.className = 'font-semibold text-indigo-400';
    } else if (passed >= 1) {
      barEl.style.width = '30%';
      barEl.className = 'h-full bg-amber-500 transition-all duration-300 shadow-sm shadow-amber-500/50';
      labelEl.textContent = 'Weak';
      labelEl.className = 'font-semibold text-amber-400';
    } else {
      barEl.style.width = '15%';
      barEl.className = 'h-full bg-rose-500 transition-all duration-300 shadow-sm shadow-rose-500/50';
      labelEl.textContent = 'Very Weak';
      labelEl.className = 'font-semibold text-rose-400';
    }
  }

  // ==========================================
  // EVENT LISTENERS (Real-time strength)
  // ==========================================
  if (passwordInput) {
    passwordInput.addEventListener('input', () => 
      updateStrength(passwordInput, 'add-strength-bar', 'add-strength-label')
    );
  }

  if (editPasswordInput) {
    editPasswordInput.addEventListener('input', () => 
      updateStrength(editPasswordInput, 'edit-strength-bar', 'edit-strength-label')
    );
  }

  // Eye Toggle - Add Form
  if (toggleBtn && passwordInput) {
    toggleBtn.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';

      if (eyeIcon) eyeIcon.classList.toggle('hidden', isPassword);
      if (eyeOffIcon) eyeOffIcon.classList.toggle('hidden', !isPassword);
    });
  }

  // Eye Toggle - Edit Form
  if (e_toggleBtn && editPasswordInput) {
    e_toggleBtn.addEventListener('click', () => {
      const isPassword = editPasswordInput.type === 'password';
      editPasswordInput.type = isPassword ? 'text' : 'password';

      if (e_eyeIcon) e_eyeIcon.classList.toggle('hidden', isPassword);
      if (e_eyeOffIcon) e_eyeOffIcon.classList.toggle('hidden', !isPassword);
    });
  }

  // Modal Control Functions
  const openModal = () => {
    if (editModal) editModal.classList.remove('hidden');
  };

  const closeModal = () => {
    if (editModal) editModal.classList.add('hidden');
    if (editUserForm) editUserForm.reset();
    if (editPasswordInput) {
      updateStrength(editPasswordInput, 'edit-strength-bar', 'edit-strength-label');
    }
  };

  if (closeEditModalBtn) closeEditModalBtn.addEventListener('click', closeModal);
  if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeModal);

  if (editModal) {
    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) closeModal();
    });
  }

  fetch('/api/session-info')
  .then(response => response.json())
  .then(data => {
    const warnTime = data.WarnTime;

    if (warnTime > 0) {
      setTimeout(() => {
        show_toast('You have 2 minutes remaining for session');
      }, warnTime);
    } else if (data.maxAge > 0) {
      show_toast('Warning: Your session expires in less than 2 minutes!');
    }
  })
  .catch(err => console.error('Failed to sync session timer:', err));

  // ==========================================
  // ROW TEMPLATE BUILDER (UPDATED BUTTON VISIBILITY)
  // ==========================================
  function buildRowContent(user) {
    const roleBadgeClass = user.role === 'Admin'
      ? 'bg-blue-900/50 text-blue-300 border border-blue-700/50'
      : 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50';

    const rawUsername = user.username || '';
    const rawCompany = user.companyName || user.company || '';
    const rawRole = user.role || 'User';
    const id = user._id || user.id || '';

    const safeUsername = escapeHtml(rawUsername);
    const safeCompany = escapeHtml(rawCompany);
    const safeRole = escapeHtml(rawRole);

    return `
      <td class="py-3 px-4 font-mono text-slate-200 pointer-events-none">${safeUsername}</td>
      <td class="py-3 px-4 text-emerald-400 pointer-events-none">${safeCompany}</td>
      <td class="py-3 px-4 pointer-events-none">
        <span class="${roleBadgeClass} px-2 py-0.5 rounded text-xs font-semibold">
          ${safeRole}
        </span>
      </td>
      <td class="py-3 px-4 text-right space-x-2">
        <button 
          type="button"
          class="edit-btn text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-md transition shadow-sm cursor-pointer select-none border border-blue-400/30"
          data-id="${safeAttribute(id)}"
          data-username="${safeAttribute(rawUsername)}"
          data-company="${safeAttribute(rawCompany)}"
          data-role="${safeAttribute(rawRole)}"
        >
          Edit
        </button>
        <button 
          type="button"
          class="delete-btn text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-md transition shadow-sm cursor-pointer select-none border border-rose-400/30"
          data-id="${safeAttribute(id)}"
          data-role="${safeAttribute(rawRole)}"
        >
          Delete
        </button>
      </td>
    `;
  }

  // ==========================================
  // 1. FETCH & DISPLAY ALL USERS
  // ==========================================
  async function loadUsers() {
    if (!userList) return;
    try {
      const res = await authedFetch('/api/users');
      if (!res) return;

      if (res.ok) {
        const users = await res.json();
        userList.innerHTML = '';
        users.forEach((user) => {
          const tr = document.createElement('tr');
          const id = user._id || user.id || '';
          tr.setAttribute('data-row-id', id);
          tr.className = 'hover:bg-slate-800/30 transition border-b border-slate-800/60';
          tr.innerHTML = buildRowContent(user);
          userList.appendChild(tr);
        });
      } else {
        show_toast('Failed to load users list.', true);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
      show_toast('Error connecting to user service.', true);
    }
  }

  // ==========================================
  // 2. CREATE USER FORM SUBMIT
  // ==========================================
  if (addUserForm) {
    addUserForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = document.getElementById('username')?.value.trim();
      const password = document.getElementById('password')?.value;
      const companyName = document.getElementById('companyName')?.value;
      const role = document.getElementById('role')?.value;

      if (!username || !password || !companyName) {
        show_toast('Please fill out all required fields.', true);
        return;
      }

      try {
        const res = await authedFetch('/api/users', {
          method: 'POST',
          body: JSON.stringify({ username, password, companyName, role }),
        });

        if (!res) return;

        if (res.ok) {
          show_toast(`User "${username}" created successfully!`);
          addUserForm.reset();
          updateStrength(passwordInput, 'add-strength-bar', 'add-strength-label');
          await loadUsers();
        } else {
          const errorData = await res.json();
          show_toast(errorData.error || 'Failed to create user.', true);
        }
      } catch (err) {
        console.error('Create user error:', err);
        show_toast('Network error while creating user.', true);
      }
    });
  }

  // ==========================================
  // 3. TABLE DELEGATION (EDIT & DELETE)
  // ==========================================
  if (userList) {
    userList.addEventListener('click', async (e) => {
      const editBtn = e.target.closest('.edit-btn');
      const deleteBtn = e.target.closest('.delete-btn');

      if (editBtn) {
        e.preventDefault();
        e.stopPropagation();

        const id = editBtn.dataset.id;
        const username = editBtn.dataset.username;
        const company = editBtn.dataset.company;
        const role = editBtn.dataset.role;

        if (editIdInput) editIdInput.value = id || '';
        if (editUsernameInput) editUsernameInput.value = username || '';
        if (editCompanySelect) editCompanySelect.value = company || '';
        if (editRoleSelect) editRoleSelect.value = role || 'User';
        if (editPasswordInput) {
          editPasswordInput.value = '';
          updateStrength(editPasswordInput, 'edit-strength-bar', 'edit-strength-label');
        }

        openModal();
        return;
      }

      if (deleteBtn) {
        e.preventDefault();
        e.stopPropagation();

        const userId = deleteBtn.dataset.id;
        const userRole = deleteBtn.dataset.role;

        if (userRole === 'Admin') {
          show_toast('Admin accounts cannot be deleted directly.', true);
          return;
        }

        if (!confirm('Are you sure you want to delete this user?')) return;

        try {
          const res = await authedFetch(`/api/users/${userId}`, { method: 'DELETE' });
          if (!res) return;

          if (res.ok) {
            const rowToRemove = userList.querySelector(`tr[data-row-id="${userId}"]`);
            if (rowToRemove) rowToRemove.remove();
            show_toast('User deleted successfully.');
          } else {
            const data = await res.json();
            show_toast(data.error || 'Failed to delete user.', true);
          }
        } catch (err) {
          console.error('Delete user error:', err);
          show_toast('Network error while deleting user.', true);
        }
      }
    });
  }

  // ==========================================
  // 4. SAVE CHANGES (PUT SUBMIT HANDLER)
  // ==========================================
  if (editUserForm) {
    editUserForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = editIdInput?.value;
      const updatedUsername = editUsernameInput?.value.trim();
      const updatedCompany = editCompanySelect?.value;
      const updatedRole = editRoleSelect?.value;
      const updatedPassword = editPasswordInput?.value;

      if (!id) {
        show_toast('User ID missing. Reload page and try again.', true);
        return;
      }

      const payload = {
        username: updatedUsername,
        companyName: updatedCompany,
        role: updatedRole,
      };

      if (updatedPassword && updatedPassword.trim().length > 0) {
        payload.password = updatedPassword;
      }

      try {
        const res = await authedFetch(`/api/users/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });

        if (!res) return;

        if (res.ok) {
          show_toast('User details updated successfully!');
          closeModal();
          await loadUsers();
        } else {
          const errorData = await res.json();
          show_toast(errorData.error || 'Failed to update user details.', true);
        }
      } catch (err) {
        console.error('Update user error:', err);
        show_toast('Network error while updating user.', true);
      }
    });
  }

  // Initial Load Call
  loadUsers();
});
