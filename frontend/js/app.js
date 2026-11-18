let allAccounts = [];
let allTransactions = [];
let accountChart = null;

function formatRs(val) {
  return 'Rs. ' + Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function animateCurrency(elementId, targetValue) {
  const el = document.getElementById(elementId);
  const duration = 550;
  const startTime = performance.now();
  const startValue = 0;

  function update(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = startValue + (targetValue - startValue) * eased;
    el.textContent = formatRs(current);
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = formatRs(targetValue);
  }
  requestAnimationFrame(update);
}

function showToast(msg, isError = false) {
  const banner = document.getElementById('toastBanner');
  banner.textContent = msg;
  banner.className = 'toast ' + (isError ? 'err' : 'ok');
  setTimeout(() => banner.classList.add('hidden'), 5000);
}

function switchView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  document.getElementById('view-' + viewName).classList.add('active');
  const activeBtn = document.querySelector(`.nav-btn[data-view="${viewName}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  const titles = {
    dashboard: 'Executive Banking Dashboard',
    accounts: 'Polymorphic Accounts Directory',
    create: 'Open New Bank Account',
    operations: 'Banking Transactions & Rule Execution',
    ledger: 'Complete Transaction Audit Ledger',
    architecture: 'C++17 OOPS Inheritance & Polymorphism Blueprint',
    operators: 'Superior Officer Access & Credential Provisioning'
  };
  document.getElementById('pageTitle').textContent = titles[viewName] || 'BANKORA';
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

async function refreshAllData() {
  try {
    const [statsRes, accRes, txRes] = await Promise.all([
      fetch('/api/stats'),
      fetch('/api/accounts'),
      fetch('/api/transactions')
    ]);

        const stats = await statsRes.json();
    const rawAccounts = await accRes.json();
    const rawTransactions = await txRes.json();

    const session = JSON.parse(sessionStorage.getItem('bankora_session') || '{}');
    const isCustomer = session.role === 'CUSTOMER';

    allAccounts = isCustomer
      ? rawAccounts.filter(a => a.holderName.toLowerCase() === (session.displayName || '').toLowerCase())
      : rawAccounts;

    const myAccNums = new Set(allAccounts.map(a => a.accountNumber));
    allTransactions = isCustomer
      ? rawTransactions.filter(t => myAccNums.has(t.accountNumber))
      : rawTransactions;

    const dispBalance = isCustomer ? allAccounts.reduce((s, a) => s + a.balance, 0) : stats.totalBalance;
    const dispDeposits = isCustomer
      ? allTransactions.filter(t => t.status === 'SUCCESS' && (t.type === 'DEPOSIT' || t.type === 'OPENING_DEPOSIT')).reduce((s, t) => s + t.amount, 0)
      : stats.totalDeposits;
    const dispWithdrawals = isCustomer
      ? allTransactions.filter(t => t.status === 'SUCCESS' && t.type === 'WITHDRAWAL').reduce((s, t) => s + t.amount, 0)
      : stats.totalWithdrawals;

    document.querySelector('#statTotalBalance').closest('.kpi').querySelector('.kpi-label').textContent = isCustomer ? 'MY PORTFOLIO BALANCE' : 'TOTAL BANK LIQUIDITY'; animateCurrency('statTotalBalance', dispBalance);
    animateCurrency('statTotalDeposits', dispDeposits);
    animateCurrency('statTotalWithdrawals', dispWithdrawals);

    document.getElementById('statTotalAccounts').textContent = isCustomer
      ? `${allAccounts.length} Personal Linked Account(s)`
      : `${stats.totalAccounts} Active Polymorphic Accounts`;
    document.getElementById('statSavings').textContent = isCustomer
      ? allAccounts.filter(a => a.accountType === 'Savings Account').length : stats.savingsCount;
    document.getElementById('statCurrent').textContent = isCustomer
      ? allAccounts.filter(a => a.accountType === 'Current Account').length : stats.currentCount;
    document.getElementById('statFD').textContent = isCustomer
      ? allAccounts.filter(a => a.accountType === 'Fixed Deposit').length : stats.fdCount;

    renderChart(stats);
    renderRecentTransactions();
    renderAccountsTable();
    renderFullLedger();
    populateAccountDropdown();
  } catch (err) {
    document.getElementById('serverStatus').innerHTML = '● Engine Offline';
    document.getElementById('serverStatus').style.color = '#ef4444';
  }
}

function renderChart(stats) {
  const ctx = document.getElementById('accountChart').getContext('2d');
  if (accountChart) accountChart.destroy();
  accountChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['SavingsAccount', 'CurrentAccount', 'FixedDepositAccount'],
      datasets: [{
        data: [stats.savingsCount, stats.currentCount, stats.fdCount],
        backgroundColor: ['#38bdf8', '#6366f1', '#10b981'],
        borderColor: '#060b16',
        borderWidth: 3,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '66%',
      plugins: {
        legend: { position: 'bottom', labels: { color: '#cbd5e1', font: { size: 12, family: 'Plus Jakarta Sans' } } }
      }
    }
  });
}

function renderRecentTransactions() {
  const tbody = document.getElementById('recentTxBody');
  const slice = allTransactions.slice(0, 6);
  if (!slice.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="muted">No transactions recorded yet.</td></tr>';
    return;
  }
  tbody.innerHTML = slice.map(tx => `
    <tr>
      <td><code>${tx.transactionId}</code></td>
      <td>${tx.accountNumber}</td>
      <td>${tx.type.replace(/_/g, " ")}</td>
      <td>${formatRs(tx.amount)}</td>
      <td><span class="status-pill ${tx.status === 'SUCCESS' ? 'status-success' : 'status-rejected'}">${tx.status}</span></td>
    </tr>
  `).join('');
}

function renderAccountsTable() {
  const query = document.getElementById('searchAccountInput').value.toLowerCase();
  const typeFilter = document.getElementById('filterTypeSelect').value;
  const tbody = document.getElementById('accountsTableBody');

  const filtered = allAccounts.filter(acc => {
    const matchesText = acc.accountNumber.toLowerCase().includes(query) || acc.holderName.toLowerCase().includes(query);
    const matchesType = typeFilter === 'ALL' || acc.accountType === typeFilter;
    return matchesText && matchesType;
  });

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="muted">No matching accounts found.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(acc => `
    <tr>
      <td><code>${acc.accountNumber}</code></td>
      <td><strong>${acc.holderName}</strong></td>
      <td>${acc.accountType}</td>
      <td><strong>${formatRs(acc.balance)}</strong></td>
      <td><span class="status-pill ${acc.status === 'ACTIVE' ? 'status-active' : 'status-closed'}">${acc.status}</span></td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="inspectAccount('${acc.accountNumber}')">Inspect</button> ${(JSON.parse(sessionStorage.getItem("bankora_session") || "{}").role !== "CUSTOMER") ? `<button class="btn btn-danger btn-sm" style="margin-left:6px;" onclick="deleteAccount('${acc.accountNumber}')">Delete</button>` : ""}
      </td>
    </tr>
  `).join('');
}

function renderFullLedger() {
  const tbody = document.getElementById('fullLedgerBody');
  tbody.innerHTML = allTransactions.map(tx => `
    <tr>
      <td><code>${tx.transactionId}</code></td>
      <td><code>${tx.accountNumber}</code></td>
      <td>${tx.type.replace(/_/g, " ")}</td>
      <td>${formatRs(tx.amount)}</td>
      <td>${tx.timestamp}</td>
      <td><span class="status-pill ${tx.status === 'SUCCESS' ? 'status-success' : 'status-rejected'}">${tx.status}</span></td>
      <td>${tx.description}</td>
    </tr>
  `).join('');
}

function populateAccountDropdown() {
  const select = document.getElementById('opAccountSelect');
  const currentVal = select.value;
  select.innerHTML = allAccounts.map(acc =>
    `<option value="${acc.accountNumber}">${acc.accountNumber} — ${acc.holderName} (${acc.accountType} | ${formatRs(acc.balance)})</option>`
  ).join('');
  if (currentVal && allAccounts.some(a => a.accountNumber === currentVal)) {
    select.value = currentVal;
  }
  loadSelectedAccountDetails();
}

function inspectAccount(accNum) {
  switchView('operations');
  document.getElementById('opAccountSelect').value = accNum;
  loadSelectedAccountDetails();
}

async function loadSelectedAccountDetails() {
  const accNum = document.getElementById('opAccountSelect').value;
  const container = document.getElementById('inspectorContent');
  if (!accNum) {
    container.innerHTML = '<p class="muted">No accounts available.</p>';
    return;
  }

  const res = await fetch(`/api/accounts/${accNum}`);
  const acc = await res.json();

  const recent = (acc.transactions || []).slice().reverse().slice(0, 5);
  container.innerHTML = `
    <div class="detail-kv">
      <div class="detail-box"><span>Account Number</span><strong>${acc.accountNumber}</strong></div>
      <div class="detail-box"><span>Derived Class</span><strong>${acc.accountType}</strong></div>
      <div class="detail-box"><span>Account Holder</span><strong>${acc.holderName}</strong></div>
      <div class="detail-box"><span>Current Balance</span><strong class="accent-cyan">${formatRs(acc.balance)}</strong></div>
      <div class="detail-box"><span>Projected Interest</span><strong class="accent-green">${formatRs(acc.projectedInterest)}</strong></div>
      <div class="detail-box"><span>Account Status</span><strong>${acc.status}</strong></div>
    </div>
    <div class="rule-block">
      <h4>Active C++ Polymorphic Rules</h4>
      <p class="muted">${acc.rulesSummary}</p>
    </div>
    <h4 style="margin:14px 0 8px;font-size:13px;">Account Transaction History</h4>
    <div class="table-wrap">
      <table>
        <thead><tr><th>ID</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>
          ${recent.map(t => `
            <tr>
              <td><code>${t.transactionId}</code></td>
              <td>${t.type.replace(/_/g, " ")}</td>
              <td>${formatRs(t.amount)}</td>
              <td><span class="status-pill ${t.status === 'SUCCESS' ? 'status-success' : 'status-rejected'}">${t.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function updateDynamicFields() {
  const type = document.getElementById('accountType').value;
  const label = document.getElementById('dynamicParamLabel');
  const input = document.getElementById('dynamicParamInput');
  const depLabel = document.getElementById('depositLabel');

  if (type === 'SAVINGS') {
    depLabel.textContent = 'Initial Deposit Amount (Min Rs. 1,000)';
    label.textContent = 'Minimum Balance Rule (Rs.)';
    input.value = 1000;
  } else if (type === 'CURRENT') {
    depLabel.textContent = 'Initial Opening Balance (Rs.)';
    label.textContent = 'Overdraft Limit (Rs.)';
    input.value = 25000;
  } else if (type === 'FD') {
    depLabel.textContent = 'Fixed Deposit Principal (Min Rs. 5,000)';
    label.textContent = 'Lock-In Duration (Months, Min 3)';
    input.value = 12;
  }
}

document.getElementById('createAccountForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const type = document.getElementById('accountType').value;
  const holderName = document.getElementById('holderName').value.trim();
  const initialDeposit = parseFloat(document.getElementById('initialDeposit').value);
  const dynamicVal = parseFloat(document.getElementById('dynamicParamInput').value);

  const payload = {
    accountType: type,
    holderName,
    initialDeposit,
    param1: type === 'FD' ? 0 : dynamicVal,
    param2: type === 'FD' ? dynamicVal : 12
  };

  const res = await fetch('/api/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) {
    showToast('C++ Validation Rejected: ' + data.error, true);
    return;
  }

  showToast(`Created ${data.accountType} (${data.accountNumber}) in C++ Backend!`);
  document.getElementById('holderName').value = '';
  await function deleteAccount(accNum) {
  document.getElementById('targetDeleteAccNum').value = accNum;
  document.getElementById('displayDeleteAccNum').value = accNum;
  document.getElementById('officerPinInput').value = '';
  document.getElementById('officerModal').classList.remove('hidden');
}

function closeOfficerModal() {
  document.getElementById('officerModal').classList.add('hidden');
}

document.getElementById('officerAuthForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const accNum = document.getElementById('targetDeleteAccNum').value;
  const officerId = document.getElementById('officerIdInput').value.trim();
  const authPin = document.getElementById('officerPinInput').value.trim();

  const res = await fetch(`/api/accounts/${accNum}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ officerId, authPin })
  });

  const data = await res.json();
  closeOfficerModal();

  if (!res.ok) {
    showToast('C++ Security Rejected: ' + data.error, true);
    await refreshAllData();
    return;
  }

  showToast(`Superior Officer ${officerId} authorized deletion of ${accNum}.`);
  openReceipt(data);
  await refreshAllData();
});

function checkSessionAuth() {
  const session = sessionStorage.getItem('bankora_session');
  const gate = document.getElementById('loginGate');
  if (session) {
    const parsed = JSON.parse(session);
    gate.classList.add('hidden');
        document.getElementById('sessionRoleBadge').textContent = parsed.displayName + (parsed.role === 'CUSTOMER' ? ' • Customer' : '');
    const opNav = document.getElementById('navOperatorsBtn');
    const createNav = document.querySelector('.nav-btn[data-view="create"]');
    const archNav = document.querySelector('.nav-btn[data-view="architecture"]');
    const newAccTopBtn = document.querySelector('.topbar-actions .btn-primary');

    if (parsed.role === 'CUSTOMER') {
      if (opNav) opNav.classList.add('hidden');
      if (createNav) createNav.classList.add('hidden');
      if (archNav) archNav.classList.add('hidden');
      if (newAccTopBtn) newAccTopBtn.classList.add('hidden');
      document.getElementById('pageTitle').textContent = 'Personal Customer Banking Portal';
    } else {
      if (createNav) createNav.classList.remove('hidden');
      if (archNav) archNav.classList.remove('hidden');
      if (newAccTopBtn) newAccTopBtn.classList.remove('hidden');
      if (parsed.role === 'SUPERIOR_OFFICER') {
        document.getElementById('officerIdInput').value = parsed.username || 'SUP-01';
        if (opNav) opNav.classList.remove('hidden');
        loadOperatorsTable();
      } else {
        if (opNav) opNav.classList.add('hidden');
      }
    }
    refreshAllData();
  } else {
    gate.classList.remove('hidden');
  }
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const errBox = document.getElementById('loginError');

  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();
  if (!res.ok || !data.authenticated) {
    errBox.textContent = data.error || 'Authentication failed.';
    errBox.classList.remove('hidden');
    return;
  }

  errBox.classList.add('hidden');
  sessionStorage.setItem('bankora_session', JSON.stringify(data));
  async function loadOperatorsTable() {
  const tbody = document.getElementById('operatorsTableBody');
  if (!tbody) return;
  const res = await fetch('/api/operators');
  const ops = await res.json();
  tbody.innerHTML = ops.map(o => `
    <tr>
      <td><code>${o.username}</code></td>
      <td><strong>${o.fullName}</strong></td>
      <td><span class="status-pill ${o.role === 'SUPERIOR_OFFICER' ? 'status-active' : 'status-success'}">${o.role}</span></td>
    </tr>
  `).join('');
}

const regForm = document.getElementById('registerOperatorForm');
if (regForm) {
  regForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('regFullName').value.trim();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const role = document.getElementById('regRole').value;
    const officerPin = document.getElementById('regOfficerPin').value.trim();

    const res = await fetch('/api/operators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, username, password, role, officerPin })
    });

    const data = await res.json();
    if (!res.ok) {
      showToast('C++ Security Rejected: ' + data.error, true);
      return;
    }

    showToast(`Issued credentials for ${fullName} (User: ${username} | Pass: ${password})`);
    regForm.reset();
    openReceipt(data);
    await loadOperatorsTable();
    await refreshAllData();
  });
}

function switchAuthTab(mode) {
  const signInForm = document.getElementById('loginForm');
  const signUpForm = document.getElementById('signupForm');
  const btnIn = document.getElementById('tabSignInBtn');
  const btnUp = document.getElementById('tabSignUpBtn');
  document.getElementById('loginError').classList.add('hidden');

  if (mode === 'signup') {
    signInForm.classList.add('hidden');
    signUpForm.classList.remove('hidden');
    btnUp.className = 'btn btn-primary btn-sm';
    btnIn.className = 'btn btn-outline btn-sm';
    btnIn.style.border = 'none';
  } else {
    signUpForm.classList.add('hidden');
    signInForm.classList.remove('hidden');
    btnIn.className = 'btn btn-primary btn-sm';
    btnUp.className = 'btn btn-outline btn-sm';
    btnUp.style.border = 'none';
  }
}

function updateSignupDepositHint() {
  const t = document.getElementById('signupAccType').value;
  const lbl = document.getElementById('signupDepositLabel');
  const inp = document.getElementById('signupDeposit');
  if (t === 'SAVINGS') { lbl.textContent = 'Initial Deposit (Min Rs. 1,000)'; inp.value = 2000; }
  else if (t === 'CURRENT') { lbl.textContent = 'Initial Opening Balance (Rs.)'; inp.value = 5000; }
  else if (t === 'FD') { lbl.textContent = 'Fixed Deposit Principal (Min Rs. 5,000)'; inp.value = 10000; }
}

document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fullName = document.getElementById('signupFullName').value.trim();
  const username = document.getElementById('signupUsername').value.trim();
  const password = document.getElementById('signupPassword').value.trim();
  const accountType = document.getElementById('signupAccType').value;
  const initialDeposit = parseFloat(document.getElementById('signupDeposit').value);
  const errBox = document.getElementById('loginError');

  const res = await fetch('/api/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, username, password, accountType, initialDeposit })
  });

  const data = await res.json();
  if (!res.ok || !data.authenticated) {
    errBox.textContent = 'C++ Validation: ' + (data.error || 'Registration failed.');
    errBox.classList.remove('hidden');
    return;
  }

  errBox.classList.add('hidden');
  sessionStorage.setItem('bankora_session', JSON.stringify(data));
  checkSessionAuth();
  showToast(`Welcome ${fullName}! Your ${data.accountNumber} account is active.`);
});

checkSessionAuth();
});

function logoutSession() {
  sessionStorage.removeItem('bankora_session');
  document.getElementById('loginPassword').value = '';
  async function loadOperatorsTable() {
  const tbody = document.getElementById('operatorsTableBody');
  if (!tbody) return;
  const res = await fetch('/api/operators');
  const ops = await res.json();
  tbody.innerHTML = ops.map(o => `
    <tr>
      <td><code>${o.username}</code></td>
      <td><strong>${o.fullName}</strong></td>
      <td><span class="status-pill ${o.role === 'SUPERIOR_OFFICER' ? 'status-active' : 'status-success'}">${o.role}</span></td>
    </tr>
  `).join('');
}

const regForm = document.getElementById('registerOperatorForm');
if (regForm) {
  regForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('regFullName').value.trim();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const role = document.getElementById('regRole').value;
    const officerPin = document.getElementById('regOfficerPin').value.trim();

    const res = await fetch('/api/operators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, username, password, role, officerPin })
    });

    const data = await res.json();
    if (!res.ok) {
      showToast('C++ Security Rejected: ' + data.error, true);
      return;
    }

    showToast(`Issued credentials for ${fullName} (User: ${username} | Pass: ${password})`);
    regForm.reset();
    openReceipt(data);
    await loadOperatorsTable();
    await refreshAllData();
  });
}

function switchAuthTab(mode) {
  const signInForm = document.getElementById('loginForm');
  const signUpForm = document.getElementById('signupForm');
  const btnIn = document.getElementById('tabSignInBtn');
  const btnUp = document.getElementById('tabSignUpBtn');
  document.getElementById('loginError').classList.add('hidden');

  if (mode === 'signup') {
    signInForm.classList.add('hidden');
    signUpForm.classList.remove('hidden');
    btnUp.className = 'btn btn-primary btn-sm';
    btnIn.className = 'btn btn-outline btn-sm';
    btnIn.style.border = 'none';
  } else {
    signUpForm.classList.add('hidden');
    signInForm.classList.remove('hidden');
    btnIn.className = 'btn btn-primary btn-sm';
    btnUp.className = 'btn btn-outline btn-sm';
    btnUp.style.border = 'none';
  }
}

function updateSignupDepositHint() {
  const t = document.getElementById('signupAccType').value;
  const lbl = document.getElementById('signupDepositLabel');
  const inp = document.getElementById('signupDeposit');
  if (t === 'SAVINGS') { lbl.textContent = 'Initial Deposit (Min Rs. 1,000)'; inp.value = 2000; }
  else if (t === 'CURRENT') { lbl.textContent = 'Initial Opening Balance (Rs.)'; inp.value = 5000; }
  else if (t === 'FD') { lbl.textContent = 'Fixed Deposit Principal (Min Rs. 5,000)'; inp.value = 10000; }
}

document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fullName = document.getElementById('signupFullName').value.trim();
  const username = document.getElementById('signupUsername').value.trim();
  const password = document.getElementById('signupPassword').value.trim();
  const accountType = document.getElementById('signupAccType').value;
  const initialDeposit = parseFloat(document.getElementById('signupDeposit').value);
  const errBox = document.getElementById('loginError');

  const res = await fetch('/api/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, username, password, accountType, initialDeposit })
  });

  const data = await res.json();
  if (!res.ok || !data.authenticated) {
    errBox.textContent = 'C++ Validation: ' + (data.error || 'Registration failed.');
    errBox.classList.remove('hidden');
    return;
  }

  errBox.classList.add('hidden');
  sessionStorage.setItem('bankora_session', JSON.stringify(data));
  checkSessionAuth();
  showToast(`Welcome ${fullName}! Your ${data.accountNumber} account is active.`);
});

checkSessionAuth();
}

async function loadOperatorsTable() {
  const tbody = document.getElementById('operatorsTableBody');
  if (!tbody) return;
  const res = await fetch('/api/operators');
  const ops = await res.json();
  tbody.innerHTML = ops.map(o => `
    <tr>
      <td><code>${o.username}</code></td>
      <td><strong>${o.fullName}</strong></td>
      <td><span class="status-pill ${o.role === 'SUPERIOR_OFFICER' ? 'status-active' : 'status-success'}">${o.role}</span></td>
    </tr>
  `).join('');
}

const regForm = document.getElementById('registerOperatorForm');
if (regForm) {
  regForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('regFullName').value.trim();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const role = document.getElementById('regRole').value;
    const officerPin = document.getElementById('regOfficerPin').value.trim();

    const res = await fetch('/api/operators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, username, password, role, officerPin })
    });

    const data = await res.json();
    if (!res.ok) {
      showToast('C++ Security Rejected: ' + data.error, true);
      return;
    }

    showToast(`Issued credentials for ${fullName} (User: ${username} | Pass: ${password})`);
    regForm.reset();
    openReceipt(data);
    await loadOperatorsTable();
    await refreshAllData();
  });
}

function switchAuthTab(mode) {
  const signInForm = document.getElementById('loginForm');
  const signUpForm = document.getElementById('signupForm');
  const btnIn = document.getElementById('tabSignInBtn');
  const btnUp = document.getElementById('tabSignUpBtn');
  document.getElementById('loginError').classList.add('hidden');

  if (mode === 'signup') {
    signInForm.classList.add('hidden');
    signUpForm.classList.remove('hidden');
    btnUp.className = 'btn btn-primary btn-sm';
    btnIn.className = 'btn btn-outline btn-sm';
    btnIn.style.border = 'none';
  } else {
    signUpForm.classList.add('hidden');
    signInForm.classList.remove('hidden');
    btnIn.className = 'btn btn-primary btn-sm';
    btnUp.className = 'btn btn-outline btn-sm';
    btnUp.style.border = 'none';
  }
}

function updateSignupDepositHint() {
  const t = document.getElementById('signupAccType').value;
  const lbl = document.getElementById('signupDepositLabel');
  const inp = document.getElementById('signupDeposit');
  if (t === 'SAVINGS') { lbl.textContent = 'Initial Deposit (Min Rs. 1,000)'; inp.value = 2000; }
  else if (t === 'CURRENT') { lbl.textContent = 'Initial Opening Balance (Rs.)'; inp.value = 5000; }
  else if (t === 'FD') { lbl.textContent = 'Fixed Deposit Principal (Min Rs. 5,000)'; inp.value = 10000; }
}

document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fullName = document.getElementById('signupFullName').value.trim();
  const username = document.getElementById('signupUsername').value.trim();
  const password = document.getElementById('signupPassword').value.trim();
  const accountType = document.getElementById('signupAccType').value;
  const initialDeposit = parseFloat(document.getElementById('signupDeposit').value);
  const errBox = document.getElementById('loginError');

  const res = await fetch('/api/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, username, password, accountType, initialDeposit })
  });

  const data = await res.json();
  if (!res.ok || !data.authenticated) {
    errBox.textContent = 'C++ Validation: ' + (data.error || 'Registration failed.');
    errBox.classList.remove('hidden');
    return;
  }

  errBox.classList.add('hidden');
  sessionStorage.setItem('bankora_session', JSON.stringify(data));
  checkSessionAuth();
  showToast(`Welcome ${fullName}! Your ${data.accountNumber} account is active.`);
});

checkSessionAuth();
  inspectAccount(data.accountNumber);
});

async function submitTransaction(action) {
  const accountNumber = document.getElementById('opAccountSelect').value;
  const amount = parseFloat(document.getElementById('opAmount').value || '0');

  if ((action === 'deposit' || action === 'withdraw') && amount <= 0) {
    showToast('Please enter a valid positive amount.', true);
    return;
  }

  const res = await fetch(`/api/transactions/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountNumber, amount })
  });

  const tx = await res.json();
  if (!res.ok) {
    showToast(tx.error || 'Transaction failed', true);
    return;
  }

  const isRejected = tx.status === 'REJECTED';
  showToast(`${tx.status}: ${tx.description}`, isRejected);
  openReceipt(tx);
  document.getElementById('opAmount').value = '';
  await function deleteAccount(accNum) {
  document.getElementById('targetDeleteAccNum').value = accNum;
  document.getElementById('displayDeleteAccNum').value = accNum;
  document.getElementById('officerPinInput').value = '';
  document.getElementById('officerModal').classList.remove('hidden');
}

function closeOfficerModal() {
  document.getElementById('officerModal').classList.add('hidden');
}

document.getElementById('officerAuthForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const accNum = document.getElementById('targetDeleteAccNum').value;
  const officerId = document.getElementById('officerIdInput').value.trim();
  const authPin = document.getElementById('officerPinInput').value.trim();

  const res = await fetch(`/api/accounts/${accNum}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ officerId, authPin })
  });

  const data = await res.json();
  closeOfficerModal();

  if (!res.ok) {
    showToast('C++ Security Rejected: ' + data.error, true);
    await refreshAllData();
    return;
  }

  showToast(`Superior Officer ${officerId} authorized deletion of ${accNum}.`);
  openReceipt(data);
  await refreshAllData();
});

function checkSessionAuth() {
  const session = sessionStorage.getItem('bankora_session');
  const gate = document.getElementById('loginGate');
  if (session) {
    const parsed = JSON.parse(session);
    gate.classList.add('hidden');
        document.getElementById('sessionRoleBadge').textContent = parsed.displayName + (parsed.role === 'CUSTOMER' ? ' • Customer' : '');
    const opNav = document.getElementById('navOperatorsBtn');
    const createNav = document.querySelector('.nav-btn[data-view="create"]');
    const archNav = document.querySelector('.nav-btn[data-view="architecture"]');
    const newAccTopBtn = document.querySelector('.topbar-actions .btn-primary');

    if (parsed.role === 'CUSTOMER') {
      if (opNav) opNav.classList.add('hidden');
      if (createNav) createNav.classList.add('hidden');
      if (archNav) archNav.classList.add('hidden');
      if (newAccTopBtn) newAccTopBtn.classList.add('hidden');
      document.getElementById('pageTitle').textContent = 'Personal Customer Banking Portal';
    } else {
      if (createNav) createNav.classList.remove('hidden');
      if (archNav) archNav.classList.remove('hidden');
      if (newAccTopBtn) newAccTopBtn.classList.remove('hidden');
      if (parsed.role === 'SUPERIOR_OFFICER') {
        document.getElementById('officerIdInput').value = parsed.username || 'SUP-01';
        if (opNav) opNav.classList.remove('hidden');
        loadOperatorsTable();
      } else {
        if (opNav) opNav.classList.add('hidden');
      }
    }
    refreshAllData();
  } else {
    gate.classList.remove('hidden');
  }
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const errBox = document.getElementById('loginError');

  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();
  if (!res.ok || !data.authenticated) {
    errBox.textContent = data.error || 'Authentication failed.';
    errBox.classList.remove('hidden');
    return;
  }

  errBox.classList.add('hidden');
  sessionStorage.setItem('bankora_session', JSON.stringify(data));
  async function loadOperatorsTable() {
  const tbody = document.getElementById('operatorsTableBody');
  if (!tbody) return;
  const res = await fetch('/api/operators');
  const ops = await res.json();
  tbody.innerHTML = ops.map(o => `
    <tr>
      <td><code>${o.username}</code></td>
      <td><strong>${o.fullName}</strong></td>
      <td><span class="status-pill ${o.role === 'SUPERIOR_OFFICER' ? 'status-active' : 'status-success'}">${o.role}</span></td>
    </tr>
  `).join('');
}

const regForm = document.getElementById('registerOperatorForm');
if (regForm) {
  regForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('regFullName').value.trim();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const role = document.getElementById('regRole').value;
    const officerPin = document.getElementById('regOfficerPin').value.trim();

    const res = await fetch('/api/operators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, username, password, role, officerPin })
    });

    const data = await res.json();
    if (!res.ok) {
      showToast('C++ Security Rejected: ' + data.error, true);
      return;
    }

    showToast(`Issued credentials for ${fullName} (User: ${username} | Pass: ${password})`);
    regForm.reset();
    openReceipt(data);
    await loadOperatorsTable();
    await refreshAllData();
  });
}

function switchAuthTab(mode) {
  const signInForm = document.getElementById('loginForm');
  const signUpForm = document.getElementById('signupForm');
  const btnIn = document.getElementById('tabSignInBtn');
  const btnUp = document.getElementById('tabSignUpBtn');
  document.getElementById('loginError').classList.add('hidden');

  if (mode === 'signup') {
    signInForm.classList.add('hidden');
    signUpForm.classList.remove('hidden');
    btnUp.className = 'btn btn-primary btn-sm';
    btnIn.className = 'btn btn-outline btn-sm';
    btnIn.style.border = 'none';
  } else {
    signUpForm.classList.add('hidden');
    signInForm.classList.remove('hidden');
    btnIn.className = 'btn btn-primary btn-sm';
    btnUp.className = 'btn btn-outline btn-sm';
    btnUp.style.border = 'none';
  }
}

function updateSignupDepositHint() {
  const t = document.getElementById('signupAccType').value;
  const lbl = document.getElementById('signupDepositLabel');
  const inp = document.getElementById('signupDeposit');
  if (t === 'SAVINGS') { lbl.textContent = 'Initial Deposit (Min Rs. 1,000)'; inp.value = 2000; }
  else if (t === 'CURRENT') { lbl.textContent = 'Initial Opening Balance (Rs.)'; inp.value = 5000; }
  else if (t === 'FD') { lbl.textContent = 'Fixed Deposit Principal (Min Rs. 5,000)'; inp.value = 10000; }
}

document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fullName = document.getElementById('signupFullName').value.trim();
  const username = document.getElementById('signupUsername').value.trim();
  const password = document.getElementById('signupPassword').value.trim();
  const accountType = document.getElementById('signupAccType').value;
  const initialDeposit = parseFloat(document.getElementById('signupDeposit').value);
  const errBox = document.getElementById('loginError');

  const res = await fetch('/api/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, username, password, accountType, initialDeposit })
  });

  const data = await res.json();
  if (!res.ok || !data.authenticated) {
    errBox.textContent = 'C++ Validation: ' + (data.error || 'Registration failed.');
    errBox.classList.remove('hidden');
    return;
  }

  errBox.classList.add('hidden');
  sessionStorage.setItem('bankora_session', JSON.stringify(data));
  checkSessionAuth();
  showToast(`Welcome ${fullName}! Your ${data.accountNumber} account is active.`);
});

checkSessionAuth();
});

function logoutSession() {
  sessionStorage.removeItem('bankora_session');
  document.getElementById('loginPassword').value = '';
  async function loadOperatorsTable() {
  const tbody = document.getElementById('operatorsTableBody');
  if (!tbody) return;
  const res = await fetch('/api/operators');
  const ops = await res.json();
  tbody.innerHTML = ops.map(o => `
    <tr>
      <td><code>${o.username}</code></td>
      <td><strong>${o.fullName}</strong></td>
      <td><span class="status-pill ${o.role === 'SUPERIOR_OFFICER' ? 'status-active' : 'status-success'}">${o.role}</span></td>
    </tr>
  `).join('');
}

const regForm = document.getElementById('registerOperatorForm');
if (regForm) {
  regForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('regFullName').value.trim();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const role = document.getElementById('regRole').value;
    const officerPin = document.getElementById('regOfficerPin').value.trim();

    const res = await fetch('/api/operators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, username, password, role, officerPin })
    });

    const data = await res.json();
    if (!res.ok) {
      showToast('C++ Security Rejected: ' + data.error, true);
      return;
    }

    showToast(`Issued credentials for ${fullName} (User: ${username} | Pass: ${password})`);
    regForm.reset();
    openReceipt(data);
    await loadOperatorsTable();
    await refreshAllData();
  });
}

function switchAuthTab(mode) {
  const signInForm = document.getElementById('loginForm');
  const signUpForm = document.getElementById('signupForm');
  const btnIn = document.getElementById('tabSignInBtn');
  const btnUp = document.getElementById('tabSignUpBtn');
  document.getElementById('loginError').classList.add('hidden');

  if (mode === 'signup') {
    signInForm.classList.add('hidden');
    signUpForm.classList.remove('hidden');
    btnUp.className = 'btn btn-primary btn-sm';
    btnIn.className = 'btn btn-outline btn-sm';
    btnIn.style.border = 'none';
  } else {
    signUpForm.classList.add('hidden');
    signInForm.classList.remove('hidden');
    btnIn.className = 'btn btn-primary btn-sm';
    btnUp.className = 'btn btn-outline btn-sm';
    btnUp.style.border = 'none';
  }
}

function updateSignupDepositHint() {
  const t = document.getElementById('signupAccType').value;
  const lbl = document.getElementById('signupDepositLabel');
  const inp = document.getElementById('signupDeposit');
  if (t === 'SAVINGS') { lbl.textContent = 'Initial Deposit (Min Rs. 1,000)'; inp.value = 2000; }
  else if (t === 'CURRENT') { lbl.textContent = 'Initial Opening Balance (Rs.)'; inp.value = 5000; }
  else if (t === 'FD') { lbl.textContent = 'Fixed Deposit Principal (Min Rs. 5,000)'; inp.value = 10000; }
}

document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fullName = document.getElementById('signupFullName').value.trim();
  const username = document.getElementById('signupUsername').value.trim();
  const password = document.getElementById('signupPassword').value.trim();
  const accountType = document.getElementById('signupAccType').value;
  const initialDeposit = parseFloat(document.getElementById('signupDeposit').value);
  const errBox = document.getElementById('loginError');

  const res = await fetch('/api/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, username, password, accountType, initialDeposit })
  });

  const data = await res.json();
  if (!res.ok || !data.authenticated) {
    errBox.textContent = 'C++ Validation: ' + (data.error || 'Registration failed.');
    errBox.classList.remove('hidden');
    return;
  }

  errBox.classList.add('hidden');
  sessionStorage.setItem('bankora_session', JSON.stringify(data));
  checkSessionAuth();
  showToast(`Welcome ${fullName}! Your ${data.accountNumber} account is active.`);
});

checkSessionAuth();
}

async function loadOperatorsTable() {
  const tbody = document.getElementById('operatorsTableBody');
  if (!tbody) return;
  const res = await fetch('/api/operators');
  const ops = await res.json();
  tbody.innerHTML = ops.map(o => `
    <tr>
      <td><code>${o.username}</code></td>
      <td><strong>${o.fullName}</strong></td>
      <td><span class="status-pill ${o.role === 'SUPERIOR_OFFICER' ? 'status-active' : 'status-success'}">${o.role}</span></td>
    </tr>
  `).join('');
}

const regForm = document.getElementById('registerOperatorForm');
if (regForm) {
  regForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('regFullName').value.trim();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const role = document.getElementById('regRole').value;
    const officerPin = document.getElementById('regOfficerPin').value.trim();

    const res = await fetch('/api/operators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, username, password, role, officerPin })
    });

    const data = await res.json();
    if (!res.ok) {
      showToast('C++ Security Rejected: ' + data.error, true);
      return;
    }

    showToast(`Issued credentials for ${fullName} (User: ${username} | Pass: ${password})`);
    regForm.reset();
    openReceipt(data);
    await loadOperatorsTable();
    await refreshAllData();
  });
}

function switchAuthTab(mode) {
  const signInForm = document.getElementById('loginForm');
  const signUpForm = document.getElementById('signupForm');
  const btnIn = document.getElementById('tabSignInBtn');
  const btnUp = document.getElementById('tabSignUpBtn');
  document.getElementById('loginError').classList.add('hidden');

  if (mode === 'signup') {
    signInForm.classList.add('hidden');
    signUpForm.classList.remove('hidden');
    btnUp.className = 'btn btn-primary btn-sm';
    btnIn.className = 'btn btn-outline btn-sm';
    btnIn.style.border = 'none';
  } else {
    signUpForm.classList.add('hidden');
    signInForm.classList.remove('hidden');
    btnIn.className = 'btn btn-primary btn-sm';
    btnUp.className = 'btn btn-outline btn-sm';
    btnUp.style.border = 'none';
  }
}

function updateSignupDepositHint() {
  const t = document.getElementById('signupAccType').value;
  const lbl = document.getElementById('signupDepositLabel');
  const inp = document.getElementById('signupDeposit');
  if (t === 'SAVINGS') { lbl.textContent = 'Initial Deposit (Min Rs. 1,000)'; inp.value = 2000; }
  else if (t === 'CURRENT') { lbl.textContent = 'Initial Opening Balance (Rs.)'; inp.value = 5000; }
  else if (t === 'FD') { lbl.textContent = 'Fixed Deposit Principal (Min Rs. 5,000)'; inp.value = 10000; }
}

document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fullName = document.getElementById('signupFullName').value.trim();
  const username = document.getElementById('signupUsername').value.trim();
  const password = document.getElementById('signupPassword').value.trim();
  const accountType = document.getElementById('signupAccType').value;
  const initialDeposit = parseFloat(document.getElementById('signupDeposit').value);
  const errBox = document.getElementById('loginError');

  const res = await fetch('/api/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, username, password, accountType, initialDeposit })
  });

  const data = await res.json();
  if (!res.ok || !data.authenticated) {
    errBox.textContent = 'C++ Validation: ' + (data.error || 'Registration failed.');
    errBox.classList.remove('hidden');
    return;
  }

  errBox.classList.add('hidden');
  sessionStorage.setItem('bankora_session', JSON.stringify(data));
  checkSessionAuth();
  showToast(`Welcome ${fullName}! Your ${data.accountNumber} account is active.`);
});

checkSessionAuth();
}

function openReceipt(tx) {
  const body = document.getElementById('receiptBody');
  body.innerHTML = `
    <div class="receipt-row"><span>Transaction ID</span><code>${tx.transactionId}</code></div>
    <div class="receipt-row"><span>Account Number</span><code>${tx.accountNumber}</code></div>
    <div class="receipt-row"><span>Operation Type</span><strong>${tx.type.replace(/_/g, " ")}</strong></div>
    <div class="receipt-row"><span>Amount</span><strong>${formatRs(tx.amount)}</strong></div>
    <div class="receipt-row"><span>C++ Engine Status</span><span class="status-pill ${tx.status === 'SUCCESS' ? 'status-success' : 'status-rejected'}">${tx.status}</span></div>
    <div class="receipt-row"><span>Timestamp</span><span>${tx.timestamp}</span></div>
    <div class="receipt-row"><span>Validation Note</span><span>${tx.description}</span></div>
  `;
  document.getElementById('receiptModal').classList.remove('hidden');
}

function closeReceipt() {
  document.getElementById('receiptModal').classList.add('hidden');
}

function deleteAccount(accNum) {
  document.getElementById('targetDeleteAccNum').value = accNum;
  document.getElementById('displayDeleteAccNum').value = accNum;
  document.getElementById('officerPinInput').value = '';
  document.getElementById('officerModal').classList.remove('hidden');
}

function closeOfficerModal() {
  document.getElementById('officerModal').classList.add('hidden');
}

document.getElementById('officerAuthForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const accNum = document.getElementById('targetDeleteAccNum').value;
  const officerId = document.getElementById('officerIdInput').value.trim();
  const authPin = document.getElementById('officerPinInput').value.trim();

  const res = await fetch(`/api/accounts/${accNum}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ officerId, authPin })
  });

  const data = await res.json();
  closeOfficerModal();

  if (!res.ok) {
    showToast('C++ Security Rejected: ' + data.error, true);
    await refreshAllData();
    return;
  }

  showToast(`Superior Officer ${officerId} authorized deletion of ${accNum}.`);
  openReceipt(data);
  await refreshAllData();
});

function checkSessionAuth() {
  const session = sessionStorage.getItem('bankora_session');
  const gate = document.getElementById('loginGate');
  if (session) {
    const parsed = JSON.parse(session);
    gate.classList.add('hidden');
        document.getElementById('sessionRoleBadge').textContent = parsed.displayName + (parsed.role === 'CUSTOMER' ? ' • Customer' : '');
    const opNav = document.getElementById('navOperatorsBtn');
    const createNav = document.querySelector('.nav-btn[data-view="create"]');
    const archNav = document.querySelector('.nav-btn[data-view="architecture"]');
    const newAccTopBtn = document.querySelector('.topbar-actions .btn-primary');

    if (parsed.role === 'CUSTOMER') {
      if (opNav) opNav.classList.add('hidden');
      if (createNav) createNav.classList.add('hidden');
      if (archNav) archNav.classList.add('hidden');
      if (newAccTopBtn) newAccTopBtn.classList.add('hidden');
      document.getElementById('pageTitle').textContent = 'Personal Customer Banking Portal';
    } else {
      if (createNav) createNav.classList.remove('hidden');
      if (archNav) archNav.classList.remove('hidden');
      if (newAccTopBtn) newAccTopBtn.classList.remove('hidden');
      if (parsed.role === 'SUPERIOR_OFFICER') {
        document.getElementById('officerIdInput').value = parsed.username || 'SUP-01';
        if (opNav) opNav.classList.remove('hidden');
        loadOperatorsTable();
      } else {
        if (opNav) opNav.classList.add('hidden');
      }
    }
    refreshAllData();
  } else {
    gate.classList.remove('hidden');
  }
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const errBox = document.getElementById('loginError');

  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();
  if (!res.ok || !data.authenticated) {
    errBox.textContent = data.error || 'Authentication failed.';
    errBox.classList.remove('hidden');
    return;
  }

  errBox.classList.add('hidden');
  sessionStorage.setItem('bankora_session', JSON.stringify(data));
  async function loadOperatorsTable() {
  const tbody = document.getElementById('operatorsTableBody');
  if (!tbody) return;
  const res = await fetch('/api/operators');
  const ops = await res.json();
  tbody.innerHTML = ops.map(o => `
    <tr>
      <td><code>${o.username}</code></td>
      <td><strong>${o.fullName}</strong></td>
      <td><span class="status-pill ${o.role === 'SUPERIOR_OFFICER' ? 'status-active' : 'status-success'}">${o.role}</span></td>
    </tr>
  `).join('');
}

const regForm = document.getElementById('registerOperatorForm');
if (regForm) {
  regForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('regFullName').value.trim();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const role = document.getElementById('regRole').value;
    const officerPin = document.getElementById('regOfficerPin').value.trim();

    const res = await fetch('/api/operators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, username, password, role, officerPin })
    });

    const data = await res.json();
    if (!res.ok) {
      showToast('C++ Security Rejected: ' + data.error, true);
      return;
    }

    showToast(`Issued credentials for ${fullName} (User: ${username} | Pass: ${password})`);
    regForm.reset();
    openReceipt(data);
    await loadOperatorsTable();
    await refreshAllData();
  });
}

function switchAuthTab(mode) {
  const signInForm = document.getElementById('loginForm');
  const signUpForm = document.getElementById('signupForm');
  const btnIn = document.getElementById('tabSignInBtn');
  const btnUp = document.getElementById('tabSignUpBtn');
  document.getElementById('loginError').classList.add('hidden');

  if (mode === 'signup') {
    signInForm.classList.add('hidden');
    signUpForm.classList.remove('hidden');
    btnUp.className = 'btn btn-primary btn-sm';
    btnIn.className = 'btn btn-outline btn-sm';
    btnIn.style.border = 'none';
  } else {
    signUpForm.classList.add('hidden');
    signInForm.classList.remove('hidden');
    btnIn.className = 'btn btn-primary btn-sm';
    btnUp.className = 'btn btn-outline btn-sm';
    btnUp.style.border = 'none';
  }
}

function updateSignupDepositHint() {
  const t = document.getElementById('signupAccType').value;
  const lbl = document.getElementById('signupDepositLabel');
  const inp = document.getElementById('signupDeposit');
  if (t === 'SAVINGS') { lbl.textContent = 'Initial Deposit (Min Rs. 1,000)'; inp.value = 2000; }
  else if (t === 'CURRENT') { lbl.textContent = 'Initial Opening Balance (Rs.)'; inp.value = 5000; }
  else if (t === 'FD') { lbl.textContent = 'Fixed Deposit Principal (Min Rs. 5,000)'; inp.value = 10000; }
}

document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fullName = document.getElementById('signupFullName').value.trim();
  const username = document.getElementById('signupUsername').value.trim();
  const password = document.getElementById('signupPassword').value.trim();
  const accountType = document.getElementById('signupAccType').value;
  const initialDeposit = parseFloat(document.getElementById('signupDeposit').value);
  const errBox = document.getElementById('loginError');

  const res = await fetch('/api/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, username, password, accountType, initialDeposit })
  });

  const data = await res.json();
  if (!res.ok || !data.authenticated) {
    errBox.textContent = 'C++ Validation: ' + (data.error || 'Registration failed.');
    errBox.classList.remove('hidden');
    return;
  }

  errBox.classList.add('hidden');
  sessionStorage.setItem('bankora_session', JSON.stringify(data));
  checkSessionAuth();
  showToast(`Welcome ${fullName}! Your ${data.accountNumber} account is active.`);
});

checkSessionAuth();
});

function logoutSession() {
  sessionStorage.removeItem('bankora_session');
  document.getElementById('loginPassword').value = '';
  async function loadOperatorsTable() {
  const tbody = document.getElementById('operatorsTableBody');
  if (!tbody) return;
  const res = await fetch('/api/operators');
  const ops = await res.json();
  tbody.innerHTML = ops.map(o => `
    <tr>
      <td><code>${o.username}</code></td>
      <td><strong>${o.fullName}</strong></td>
      <td><span class="status-pill ${o.role === 'SUPERIOR_OFFICER' ? 'status-active' : 'status-success'}">${o.role}</span></td>
    </tr>
  `).join('');
}

const regForm = document.getElementById('registerOperatorForm');
if (regForm) {
  regForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('regFullName').value.trim();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const role = document.getElementById('regRole').value;
    const officerPin = document.getElementById('regOfficerPin').value.trim();

    const res = await fetch('/api/operators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, username, password, role, officerPin })
    });

    const data = await res.json();
    if (!res.ok) {
      showToast('C++ Security Rejected: ' + data.error, true);
      return;
    }

    showToast(`Issued credentials for ${fullName} (User: ${username} | Pass: ${password})`);
    regForm.reset();
    openReceipt(data);
    await loadOperatorsTable();
    await refreshAllData();
  });
}

function switchAuthTab(mode) {
  const signInForm = document.getElementById('loginForm');
  const signUpForm = document.getElementById('signupForm');
  const btnIn = document.getElementById('tabSignInBtn');
  const btnUp = document.getElementById('tabSignUpBtn');
  document.getElementById('loginError').classList.add('hidden');

  if (mode === 'signup') {
    signInForm.classList.add('hidden');
    signUpForm.classList.remove('hidden');
    btnUp.className = 'btn btn-primary btn-sm';
    btnIn.className = 'btn btn-outline btn-sm';
    btnIn.style.border = 'none';
  } else {
    signUpForm.classList.add('hidden');
    signInForm.classList.remove('hidden');
    btnIn.className = 'btn btn-primary btn-sm';
    btnUp.className = 'btn btn-outline btn-sm';
    btnUp.style.border = 'none';
  }
}

function updateSignupDepositHint() {
  const t = document.getElementById('signupAccType').value;
  const lbl = document.getElementById('signupDepositLabel');
  const inp = document.getElementById('signupDeposit');
  if (t === 'SAVINGS') { lbl.textContent = 'Initial Deposit (Min Rs. 1,000)'; inp.value = 2000; }
  else if (t === 'CURRENT') { lbl.textContent = 'Initial Opening Balance (Rs.)'; inp.value = 5000; }
  else if (t === 'FD') { lbl.textContent = 'Fixed Deposit Principal (Min Rs. 5,000)'; inp.value = 10000; }
}

document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fullName = document.getElementById('signupFullName').value.trim();
  const username = document.getElementById('signupUsername').value.trim();
  const password = document.getElementById('signupPassword').value.trim();
  const accountType = document.getElementById('signupAccType').value;
  const initialDeposit = parseFloat(document.getElementById('signupDeposit').value);
  const errBox = document.getElementById('loginError');

  const res = await fetch('/api/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, username, password, accountType, initialDeposit })
  });

  const data = await res.json();
  if (!res.ok || !data.authenticated) {
    errBox.textContent = 'C++ Validation: ' + (data.error || 'Registration failed.');
    errBox.classList.remove('hidden');
    return;
  }

  errBox.classList.add('hidden');
  sessionStorage.setItem('bankora_session', JSON.stringify(data));
  checkSessionAuth();
  showToast(`Welcome ${fullName}! Your ${data.accountNumber} account is active.`);
});

checkSessionAuth();
}

async function loadOperatorsTable() {
  const tbody = document.getElementById('operatorsTableBody');
  if (!tbody) return;
  const res = await fetch('/api/operators');
  const ops = await res.json();
  tbody.innerHTML = ops.map(o => `
    <tr>
      <td><code>${o.username}</code></td>
      <td><strong>${o.fullName}</strong></td>
      <td><span class="status-pill ${o.role === 'SUPERIOR_OFFICER' ? 'status-active' : 'status-success'}">${o.role}</span></td>
    </tr>
  `).join('');
}

const regForm = document.getElementById('registerOperatorForm');
if (regForm) {
  regForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('regFullName').value.trim();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const role = document.getElementById('regRole').value;
    const officerPin = document.getElementById('regOfficerPin').value.trim();

    const res = await fetch('/api/operators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, username, password, role, officerPin })
    });

    const data = await res.json();
    if (!res.ok) {
      showToast('C++ Security Rejected: ' + data.error, true);
      return;
    }

    showToast(`Issued credentials for ${fullName} (User: ${username} | Pass: ${password})`);
    regForm.reset();
    openReceipt(data);
    await loadOperatorsTable();
    await refreshAllData();
  });
}

function switchAuthTab(mode) {
  const signInForm = document.getElementById('loginForm');
  const signUpForm = document.getElementById('signupForm');
  const btnIn = document.getElementById('tabSignInBtn');
  const btnUp = document.getElementById('tabSignUpBtn');
  document.getElementById('loginError').classList.add('hidden');

  if (mode === 'signup') {
    signInForm.classList.add('hidden');
    signUpForm.classList.remove('hidden');
    btnUp.className = 'btn btn-primary btn-sm';
    btnIn.className = 'btn btn-outline btn-sm';
    btnIn.style.border = 'none';
  } else {
    signUpForm.classList.add('hidden');
    signInForm.classList.remove('hidden');
    btnIn.className = 'btn btn-primary btn-sm';
    btnUp.className = 'btn btn-outline btn-sm';
    btnUp.style.border = 'none';
  }
}

function updateSignupDepositHint() {
  const t = document.getElementById('signupAccType').value;
  const lbl = document.getElementById('signupDepositLabel');
  const inp = document.getElementById('signupDeposit');
  if (t === 'SAVINGS') { lbl.textContent = 'Initial Deposit (Min Rs. 1,000)'; inp.value = 2000; }
  else if (t === 'CURRENT') { lbl.textContent = 'Initial Opening Balance (Rs.)'; inp.value = 5000; }
  else if (t === 'FD') { lbl.textContent = 'Fixed Deposit Principal (Min Rs. 5,000)'; inp.value = 10000; }
}

document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fullName = document.getElementById('signupFullName').value.trim();
  const username = document.getElementById('signupUsername').value.trim();
  const password = document.getElementById('signupPassword').value.trim();
  const accountType = document.getElementById('signupAccType').value;
  const initialDeposit = parseFloat(document.getElementById('signupDeposit').value);
  const errBox = document.getElementById('loginError');

  const res = await fetch('/api/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, username, password, accountType, initialDeposit })
  });

  const data = await res.json();
  if (!res.ok || !data.authenticated) {
    errBox.textContent = 'C++ Validation: ' + (data.error || 'Registration failed.');
    errBox.classList.remove('hidden');
    return;
  }

  errBox.classList.add('hidden');
  sessionStorage.setItem('bankora_session', JSON.stringify(data));
  checkSessionAuth();
  showToast(`Welcome ${fullName}! Your ${data.accountNumber} account is active.`);
});

checkSessionAuth();




