// Shared by the browser and the server so both apply exactly the same rules.

export const MAX_PARTICIPANTS = 5;

const NAME_RE = /^\p{L}[\p{L} .'-]{1,79}$/u;
const NAME_PART_RE = /^\p{L}[\p{L} .'-]{1,39}$/u;
const RELATIONSHIP_RE = /^\p{L}[\p{L} -]{1,39}$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Nigerian mobile numbers: 080..., 070..., 090..., 081..., or +234 / 234 prefixed
const PHONE_RE = /^(?:\+?234|0)[789][01]\d{8}$/;

export function cleanPhone(value) {
  return String(value ?? '').replace(/[\s()-]/g, '');
}

function clean(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

// Validates one participant. The first participant is the payer, so their email and
// phone are required; for others (e.g. children) they are optional.
// Returns { data, errors } where errors maps field name -> message.
export function validateParticipant(input, isPayer) {
  const first = clean(input.first_name);
  const last = clean(input.last_name);
  const data = {
    first_name: first,
    last_name: last,
    full_name: `${first} ${last}`.trim(),
    email: clean(input.email).toLowerCase(),
    phone: cleanPhone(input.phone),
    gender: clean(input.gender),
    category: clean(input.category),
    emergency_name: clean(input.emergency_name),
    emergency_phone: cleanPhone(input.emergency_phone),
    emergency_relationship: clean(input.emergency_relationship),
    medical_notes: String(input.medical_notes ?? '').trim().slice(0, 500),
  };
  const errors = {};

  if (!NAME_PART_RE.test(first)) errors.first_name = 'Enter a first name using letters only.';
  if (!NAME_PART_RE.test(last)) errors.last_name = 'Enter a last name using letters only.';

  if (data.email || isPayer) {
    if (!EMAIL_RE.test(data.email)) errors.email = 'Enter a valid email address.';
  }
  if (data.phone || isPayer) {
    if (!PHONE_RE.test(data.phone)) errors.phone = 'Enter a valid Nigerian phone number, e.g. 08031234567.';
  }

  if (!['male', 'female'].includes(data.gender)) errors.gender = 'Select a gender.';
  if (!['adult', 'others'].includes(data.category)) errors.category = 'Select a category.';

  if (!NAME_RE.test(data.emergency_name)) errors.emergency_name = 'Enter a name using letters only.';
  if (!PHONE_RE.test(data.emergency_phone)) errors.emergency_phone = 'Enter a valid Nigerian phone number.';
  if (!RELATIONSHIP_RE.test(data.emergency_relationship)) {
    errors.emergency_relationship = 'Enter the relationship using letters only, e.g. Father.';
  }

  return { data, errors };
}
