import { CATEGORY_LABELS, naira } from '/lib/pricing.js';

const params = new URLSearchParams(location.search);
const reference = params.get('reference') || params.get('trxref') || '';

const states = ['loading', 'pending', 'failed', 'error', 'receipt'];
function show(id) {
  for (const s of states) document.getElementById(s).hidden = s !== id;
}

function td(text, className, label) {
  const cell = document.createElement('td');
  cell.textContent = text;
  if (className) cell.className = className;
  if (label) cell.dataset.label = label;
  return cell;
}

function renderReceipt(data) {
  document.getElementById('r-payer').textContent = data.payer_name;
  document.getElementById('r-ref').textContent = data.reference;
  document.getElementById('r-email').textContent = data.payer_email;
  document.getElementById('r-date').textContent = new Date(data.paid_at).toLocaleString('en-NG', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos',
  });
  const rows = document.getElementById('r-rows');
  rows.replaceChildren(
    ...data.participants.map((p) => {
      const tr = document.createElement('tr');
      tr.append(
        td(p.reg_code, 'code', 'Reg. ID'),
        td(p.full_name, '', 'Name'),
        td(CATEGORY_LABELS[p.category], '', 'Category'),
        td(naira(p.price), 'num', 'Fee')
      );
      return tr;
    })
  );
  document.getElementById('r-fee').textContent = naira(data.fee);
  document.getElementById('r-fee-row').hidden = !data.fee;
  document.getElementById('r-total').textContent = naira(data.total);
  show('receipt');
}

// While a payment is pending (e.g. bank transfer), check again every 5 seconds for
// about 3 minutes, then leave it to the "Check again" button.
const AUTO_CHECKS = 36;
let attempts = 0;
let timer;

async function check({ silent = false } = {}) {
  clearTimeout(timer);
  if (!silent) show('loading');
  attempts += 1;
  const note = document.getElementById('pending-text');
  try {
    const res = await fetch(`/api/verify?reference=${encodeURIComponent(reference)}`);
    const data = await res.json().catch(() => ({}));
    if (res.status < 500 && !res.ok) {
      document.getElementById('error-text').textContent = data.error || 'Please try again.';
      return show('error');
    }
    if (data.status === 'paid') return renderReceipt(data);
    if (data.status === 'failed') return show('failed');
    note.textContent = res.ok ? '' : data.error || 'We could not reach the server.';
  } catch {
    note.textContent = 'Network error. Check your connection.';
  }

  // Still pending (or a temporary error).
  show('pending');
  const time = new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  if (attempts < AUTO_CHECKS) {
    note.textContent = `${note.textContent} Last checked ${time}. Checking again automatically…`.trim();
    timer = setTimeout(() => check({ silent: true }), 5000);
  } else {
    note.textContent = `${note.textContent} Last checked ${time}. Press "Check again" to refresh.`.trim();
  }
}

document.getElementById('retry').addEventListener('click', () => {
  attempts = 0;
  check();
});

document.getElementById('pending-ref').textContent = reference;

if (reference) {
  check();
} else {
  document.getElementById('error-text').textContent = 'No payment reference was found in the link.';
  show('error');
}
