interface IUser {
  _id: string;
  username: string;
  companyName: string;
  role: string;
}

document.addEventListener('DOMContentLoaded', () => {
  const userForm = document.getElementById('add-user-form') as HTMLFormElement | null;
  const userList = document.getElementById('user-list-body');

  if (userForm) {
    userForm.addEventListener("submit", async (e: Event) => {
      e.preventDefault();

      const userName = (document.getElementById('username') as HTMLInputElement).value;
      const passwd = (document.getElementById('password') as HTMLInputElement).value;
      const compName = (document.getElementById('companyName') as HTMLInputElement).value;
      
      // FIXED: Cast to HTMLSelectElement
      const role = (document.getElementById('role') as HTMLSelectElement).value;

      const user_log = {
        username: userName,
        password: passwd,
        companyName: compName,
        role: role
      };

      try {
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user_log)
        });

        if (response.ok) {
          userForm.reset();
          await loadusersList();
        }
      } catch (err) {
        console.error("Error creating user:", err);
      }
    });
  }

  async function loadusersList() {
    if (!userList) return;

    try {
      const res = await fetch('/api/users');
      const users: IUser[] = await res.json();

      userList.innerHTML = "";

      users.forEach((user: IUser) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-slate-800/40 transition border-b border-slate-800/60';

        row.innerHTML = `
          <td class="py-3 px-4 font-mono text-slate-200">${escapeHtml(user.username)}</td>
          <td class="py-3 px-4 text-emerald-400">${escapeHtml(user.companyName)}</td>
          <td class="py-3 px-4">
            <span class="bg-blue-900/50 text-blue-300 border border-blue-700/50 px-2 py-0.5 rounded text-xs font-semibold">
              ${escapeHtml(user.role)}
            </span>
          </td>
          <td class="py-3 px-4 text-right">
            <button data-id="${user._id}" class="revoke-btn text-xs bg-rose-900/40 text-rose-300 hover:bg-rose-800/60 border border-rose-800/60 px-3 py-1 rounded transition">
              Revoke
            </button>
          </td>
        `;

        userList.appendChild(row);
      });
    } catch (err) {
      console.error("Error loading user list:", err);
    }
  }

  function escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Populate user list on page load
  loadusersList();

  if (userList) {
    userList.addEventListener('click', async (e: Event) => {
      const target = e.target as HTMLElement;
      
      if (!target.classList.contains('revoke-btn')) return;

      const userId = target.dataset.id;
      if (!userId) return;

      try {
        const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });

        if (res.ok) {
          await loadusersList();
        }
      } catch (error) {
        console.error("Error revoking user:", error);
      }
    });
  }
});