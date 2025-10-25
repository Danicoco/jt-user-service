const Address = require('../models/address');

function normalizePhoneNumber(phone, country) {
  if (phone == null) return phone;                 
  const raw = String(phone).trim();
  if (!raw) return null;

  if (/^\+\d{7,15}$/.test(raw)) return raw;

  const digits = raw.replace(/\D+/g, '');
  const cc = String(country || '').toUpperCase();

  // Nigeria helpers if country says NG OR input looks like local/234 format
  const looksLocalNg = /^0\d{10}$/.test(digits);
  const looks234    = /^234\d{10}$/.test(digits);

  if (cc === 'NG' || looksLocalNg || looks234) {
    if (looksLocalNg) return `+234${digits.slice(1)}`; // 0xxxxxxxxxx -> +234xxxxxxxxxx
    if (looks234)    return `+${digits}`;             // 234xxxxxxxxxx -> +234xxxxxxxxxx
  }

  if (/^\d{7,15}$/.test(digits)) return `+${digits}`;

  return raw;
}

async function listAddresses(userId) {
  return Address.find({ userId });
}

async function getAddress(userId, id) {
  const addr = await Address.findOne({ _id: id, userId });
  if (!addr) throw new Error('Address not found');
  return addr;
}

async function createAddress(userId, data) {
  if (data.isDefault) {
    await Address.updateMany({ userId }, { isDefault: false });
  }

  const payload = { ...data };
  if (Object.prototype.hasOwnProperty.call(payload, 'phone_number')) {
    payload.phone_number = normalizePhoneNumber(payload.phone_number, payload.country);
  }

  return Address.create({ userId, ...payload });
}

async function updateAddress(userId, id, updates) {
  if (updates.isDefault) {
    await Address.updateMany({ userId }, { isDefault: false });
  }

  const payload = { ...updates };
  if (Object.prototype.hasOwnProperty.call(payload, 'phone_number')) {
    payload.phone_number = normalizePhoneNumber(payload.phone_number, payload.country);
  }

  const addr = await Address.findOneAndUpdate(
    { _id: id, userId },
    payload,
    { new: true }
  );
  if (!addr) throw new Error('Address not found');
  return addr;
}

async function deleteAddress(userId, id) {
  const res = await Address.deleteOne({ _id: id, userId });
  if (res.deletedCount === 0) throw new Error('Address not found');
}

module.exports = {
  listAddresses,
  getAddress,
  createAddress,
  updateAddress,
  deleteAddress,
};
