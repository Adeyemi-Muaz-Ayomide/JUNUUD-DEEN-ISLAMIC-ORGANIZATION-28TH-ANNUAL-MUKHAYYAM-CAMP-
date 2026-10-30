import { CATEGORY_LABELS, EARLY_BIRD_ENDS, PRICES, currentTier, naira, quote } from '/lib/pricing.js';
import { MAX_PARTICIPANTS, validateParticipant } from '/lib/validation.js';

const FIELDS = [
  'full_name', 'email', 'phone', 'gender', 'category',
  'emergency_name', 'emergency_phone', 'emergency_relationship', 'medical_notes',
];

const form = document.getElementById('reg-form');
const list = document.getElementById('participants');
const template = document.getElementById('participant-template');
const addBtn = document.getElementById('add-participant');
const payBtn = document.getElementById('pay-btn');
const formError = document.getElementById('form-error');

// ---------- Fees & early-bird banner ----------
const tier = currentTier();
document.getElementById('price-adult').textContent = naira(PRICES[tier].adult);
document.getElementById('price-others').textContent = naira(PRICES[tier].others);
if (tier === 'regular') {
  document.getElementById('old-adult').hidden = true;
  document.getElementById('old-others').hidden = true;
  document.getElementById('fees-label').textContent = 'Camp Fee';
  document.getElementById('headline').textContent = 'Registration Is Open!';
  document.getElementById('fees-note').textContent = 'Register early to secure your spot.';
} else {
  startCountdown();
}

// Live countdown to the end of the early-bird period.
function startCountdown() {
  const box = document.getElementById('countdown');
  const els = ['cd-days', 'cd-hours', 'cd-mins', 'cd-secs'].map((id) => document.getElementById(id));
  const pad = (n) => String(n).padStart(2, '0');
  box.hidden = false;

  function tick() {
    const left = EARLY_BIRD_ENDS - Date.now();
    if (left <= 0) {
      // Early bird is over: reload so regular prices show.
      clearInterval(timer);
      location.reload();
      return;
    }
    const secs = Math.floor(left / 1000);
    const values = [Math.floor(secs / 86400), Math.floor(secs / 3600) % 24, Math.floor(secs / 60) % 60, secs % 60];
    values.forEach((v, i) => {
      const text = pad(v);
      if (els[i].textContent !== text) els[i].textContent = text;
    });
  }
  const timer = setInterval(tick, 1000);
  tick();
}

// ---------- Participants ----------
function renumber() {
  const cards = [...list.children];
  cards.forEach((card, i) => {
    card.querySelector('.p-num').textContent = i === 0 ? 'Participant 1 (Payer)' : `Participant ${i + 1}`;
    card.querySelector('.remove').hidden = i === 0;
    card.querySelectorAll('.opt').forEach((el) => {
      if (el.closest('label').querySelector('textarea')) return;
      el.textContent = i === 0 ? '' : '(optional)';
    });
  });
  addBtn.disabled = cards.length >= MAX_PARTICIPANTS;
  updateSummary();
}

function addParticipant(focus = false) {
  const card = template.content.firstElementChild.cloneNode(true);
  card.querySelector('.remove').addEventListener('click', () => {
    card.remove();
    renumber();
  });
  list.appendChild(card);
  renumber();
  if (focus) {
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    card.querySelector('input').focus({ preventScroll: true });
  }
}

function readCard(card) {
  const data = {};
  for (const name of FIELDS) data[name] = card.querySelector(`[name="${name}"]`).value;
  return data;
}

function showErrors(card, errors) {
  for (const name of FIELDS) {
    const field = card.querySelector(`[name="${name}"]`);
    const msg = field.parentElement.querySelector('.err');
    const text = errors[name] || '';
    field.toggleAttribute('aria-invalid', Boolean(text));
    if (msg) msg.textContent = text;
  }
}

function validateCard(card, onlyField) {
  const index = [...list.children].indexOf(card);
  const { errors } = validateParticipant(readCard(card), index === 0);
  if (onlyField) {
    const field = card.querySelector(`[name="${onlyField}"]`);
    const text = field.value.trim() || field.tagName === 'SELECT' ? errors[onlyField] || '' : '';
    field.toggleAttribute('aria-invalid', Boolean(text));
    const msg = field.parentElement.querySelector('.err');
    if (msg) msg.textContent = text;
    return;
  }
  showErrors(card, errors);
  return Object.keys(errors).length === 0;
}

function updateSummary() {
  const categories = [...list.children]
    .map((card) => card.querySelector('[name="category"]').value)
    .filter((c) => c === 'adult' || c === 'others');
  const q = quote(categories);
  document.getElementById('sum-adult-label').textContent = `Adult × ${q.counts.adult}`;
  document.getElementById('sum-others-label').textContent = `Others × ${q.counts.others}`;
  document.getElementById('sum-adult').textContent = naira(q.counts.adult * PRICES[q.tier].adult);
  document.getElementById('sum-others').textContent = naira(q.counts.others * PRICES[q.tier].others);
  // document.getElementById('sum-fee').textContent = naira(q.fee);
  document.getElementById('sum-total').textContent = naira(q.total);
  payBtn.textContent = q.total ? `Pay ${naira(q.total)}` : 'Proceed to Payment';
}

// Keep inputs to the right kind of characters as people type.
list.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.filter === 'letters') {
    const cleaned = el.value.replace(/[^\p{L} .'-]/gu, '');
    if (cleaned !== el.value) el.value = cleaned;
  } else if (el.dataset.filter === 'phone') {
    const cleaned = el.value.replace(/[^\d+ ]/g, '').replace(/(?!^)\+/g, '');
    if (cleaned !== el.value) el.value = cleaned;
  }
  if (el.hasAttribute('aria-invalid')) validateCard(el.closest('.participant'), el.name);
});

list.addEventListener('change', (e) => {
  if (e.target.name === 'category') updateSummary();
  if (e.target.tagName === 'SELECT') validateCard(e.target.closest('.participant'), e.target.name);
});

list.addEventListener('focusout', (e) => {
  if (e.target.name && e.target.name !== 'medical_notes') {
    validateCard(e.target.closest('.participant'), e.target.name);
  }
});

addBtn.addEventListener('click', () => addParticipant(true));

// ---------- Submit ----------
function setError(text) {
  formError.textContent = text;
  formError.hidden = !text;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setError('');

  const cards = [...list.children];
  const allValid = cards.map((card) => validateCard(card)).every(Boolean);
  if (!allValid) {
    const first = list.querySelector('[aria-invalid]');
    first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    first?.focus({ preventScroll: true });
    setError('Please correct the highlighted fields.');
    return;
  }

  payBtn.disabled = true;
  addBtn.disabled = true;
  const label = payBtn.textContent;
  payBtn.textContent = 'Processing...';

  try {
    const res = await fetch('/api/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participants: cards.map(readCard) }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.authorization_url) {
      window.location.href = data.authorization_url;
      return;
    }
    if (data.fieldErrors) data.fieldErrors.forEach((errs, i) => cards[i] && showErrors(cards[i], errs));
    setError(data.error || 'Something went wrong. Please try again.');
  } catch {
    setError('Network error. Check your connection and try again.');
  }
  payBtn.disabled = false;
  addBtn.disabled = list.children.length >= MAX_PARTICIPANTS;
  payBtn.textContent = label;
});

// When someone presses Back from Paystack, the browser may restore this page exactly as it
// was left, with the button stuck on "Processing...". Reset it so they can try again.
window.addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  payBtn.disabled = false;
  addBtn.disabled = list.children.length >= MAX_PARTICIPANTS;
  setError('');
  updateSummary();
});

// Show the full category name on the summary for clarity.
document.getElementById('sum-others-label').title = CATEGORY_LABELS.others;

addParticipant();
