import { compare } from "bcryptjs";
import { exec } from "node:child_process";


interface UserData {
  userId: string;
  companyName: string;
  role: string;
}

interface AuthResponse {
  token: string;
  companyName: string;
  user: UserData;
}

const loginView = document.getElementById('login-view') as HTMLElement;
const dashboardView = document.getElementById('dashboard-view') as HTMLElement;
const loginForm = document.getElementById('login-form') as HTMLFormElement;
const comp = document.getElementById('company-name') as HTMLElement;
const compLogs = document.getElementById('company-logs') as HTMLElement;
const logoutBtn = document.getElementById('logout-btn') as HTMLButtonElement;
const auditView = document.getElementById('click-box')as HTMLElement;
const sideBar = document.getElementById('side-nav')as HTMLElement;
const logBoxes = document.querySelectorAll<HTMLElement>('click-boxes');

HTMLInputElement

sideBar.addEventListener('click', (e:Event) => {
  e.preventDefault();
  const target = e.target as HTMLElement;

  if (target.closest('#home-btn')) {
    switchstate('Dashboard');
  } else if (target.closest('#audit-btn')) {
    switchstate('Audit');
  } else if (target.closest('#logout-btn')) {
    switchstate('Login');
  }
});


// Helper Function: Switch View States
function switchstate(state: 'Login' | 'Dashboard'|'Audit'): void {
  if (state === 'Login') {
    if(auditView) auditView.classList.add("hidden")
    if (loginView) loginView.classList.remove('hidden');
    if(dashboardView) dashboardView.classList.add('hidden')
    if(sideBar) sideBar.classList.add('hidden');
  } else if(state === 'Dashboard'){
    if (loginView) loginView.classList.add('hidden');
    if (dashboardView) dashboardView.classList.remove('hidden');
    if (auditView) auditView.classList.add('hidden');
    if (sideBar) sideBar.classList.remove('hidden');
  } else if(state === "Audit"){
    if (loginView) loginView.classList.add('hidden');
    if (dashboardView) dashboardView.classList.add('hidden');
    if (auditView) auditView.classList.remove('hidden');
    if (sideBar) sideBar.classList.remove('hidden');
  }
  
}

// Event Listener: Login Submission
loginForm?.addEventListener('submit', async (e: Event) => {
  e.preventDefault();
  const usernameInput = (document.getElementById('username') as HTMLInputElement).value;
  const passwordInput = (document.getElementById('password') as HTMLInputElement).value;
  const validUsername = usernameInput.match(/^[a-zA-Z._%+-]+@[a-zA-Z-]+$/);
  const strongPass = passwordInput.match(/^(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,12}$/ );
  if(!strongPass) {
    alert("Must be 9-12 characters with lowercase and uppercase digits, special character ");
    return;
  }
   if(!validUsername) {
    alert("Must be firstname@company");
    return;
  }

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameInput, password: passwordInput })
    });

    if (!response.ok) {
      throw new Error('Invalid credentials');
    }

    const data: AuthResponse = await response.json();
    let company = usernameInput.includes('@') ? usernameInput.split('@')[1].split('.')[0] : data.companyName;
    company = company.charAt(0).toUpperCase() + company.slice(1);

    // Save ALL necessary auth state
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('company_name', company);
    localStorage.setItem('logged_username', usernameInput); 

    if (comp) comp.textContent = company;
    switchstate('Dashboard');
    getLogs();
  } catch (error) {
    alert('Login failed');
  }
});


// Event Listener: Logout Button
logoutBtn?.addEventListener('click', () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('company_name');
  localStorage.removeItem('logged_username');

  if (comp) comp.textContent = '';
  if (compLogs) compLogs.innerHTML = '<p>No logs yet</p>';

  switchstate('Login');
});

// Initial Page Load: Check Auth State
window.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('auth_token');
  const company = localStorage.getItem('company_name');

  if (token) {
    if (comp && company) comp.textContent = company; // Restore company title on refresh
    switchstate('Dashboard');
    getLogs();
  } else {
    switchstate('Login');
  }
});

function getLogs(): void {
  if (!compLogs) return;

  const username = localStorage.getItem('logged_username') || '';
  const companyName = username.includes('@')? username.split('@')[1].split('.')[0].toLowerCase(): 'default';
  const companyKey = `logs_${companyName}`;
  const savedLogs: string[] = JSON.parse(localStorage.getItem(companyKey) || '[]');

  if (savedLogs.length === 0) {
    compLogs.innerHTML = '<p>No logs yet</p>';
  } else {
    compLogs.innerHTML = savedLogs.map((entry) => `<p>${entry}</p>`).join('');
  }
}

//forms

const clientDetails = document.getElementById('client-display') as HTMLElement;
const company = localStorage.getItem("company_name") || '--';
const orgRadio = document.getElementById('org-company-radio') as HTMLInputElement;
const orgLabel = document.getElementById('org-company-label')as HTMLElement;


if (orgRadio && orgLabel) {
  orgRadio.value = company; // Set value sent on submit
  orgLabel.textContent = company; // Update radio text label
}

// 1. Display company name immediately on page load
if (clientDetails) {
  clientDetails.textContent = company;
}

const requestForm = document.getElementById('form') as HTMLFormElement
requestForm?.addEventListener('submit', async (e: Event) => {
  e.preventDefault();
  const fullName = (document.getElementById('name') as HTMLInputElement).value;
  const email = (document.getElementById('email') as HTMLInputElement).value;
  const num = (document.getElementById('phone-num') as HTMLInputElement).value;
  const environmentDetails  =  (document.querySelector('input[name = "environment"]:checked') as HTMLInputElement)?.value
  const platForm  =  (document.querySelector('input[name = "platform_category"]:checked') as HTMLInputElement)?.value
  const Req  =  (document.querySelector('input[name = "request_type"]:checked') as HTMLInputElement)?.value
  const selectedOrg = (document.querySelector('input[name="organization"]:checked')as HTMLInputElement)?.value || company;
  
  try {
    const response = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName , email,company,environmentDetails,platForm , Req , num , organization: selectedOrg })
    });

    if (!response.ok) {
      throw new Error('Invalid credentials');
    }
    getLogs();
  } catch (error) {
    alert('Request Failed');
  }
});

