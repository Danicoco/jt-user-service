const axios = require('axios');
const { WALLET_SERVICE_URL, INTERNAL_SECRET } = process.env;

const walletClient = axios.create({
  baseURL: `${WALLET_SERVICE_URL}/internal`,
  timeout: 5000,
  headers: {
    'x-internal-key': INTERNAL_SECRET,
  },
});

/**
 * Create a new wallet for a user
 * @param {Object} user
 * @param {string} userId
 * @param {string} email
 * @param {string} firstName
 * @param {string} lastName
 * @param {string} phoneNumber
 * @returns {Promise<Object>} the created wallet data
 */
async function createWallet({ userId, email, firstName, lastName, phoneNumber }) {
  try {
    const { data } = await walletClient.post('/wallet/create', {
      userId,
      email,
      firstName,
      lastName,
      phoneNumber,
    });
    return data;
  } catch (err) {
    console.error('walletService.createWallet error:', err.response?.data || err.message);
    throw new Error('Failed to create wallet');
  }
}

/**
 * Charge the user's wallet (deduct balance) using their PIN
 * @param {Object} params
 * @param {string} params.userId
 * @param {number} params.amount
 * @param {string} params.pin
 * @returns {Promise<Object>} updated wallet data or receipt
 */
async function chargeWallet({ userId, amount, pin }) {
  try {
    const { data } = await walletClient.post('/wallet/charge', { userId, amount, pin }, {
      headers: {
        // optional: pass Idempotency-Key from controller if available
        'Idempotency-Key': /* req header or generated UUID */ undefined
      }
    });
    return data?.data ?? data;
  } catch (err) {
    console.error('walletService.chargeWallet error:', err.response?.data || err.message);
    const msg = err.response?.data?.message || 'Failed to charge wallet';
    throw new Error(msg);
  }
}

async function creditWallet({ userId, amount, originalRef }, opts = {}) {
  try {
    const idemKey = opts.idempotencyKey || (originalRef ? `REFUND-${originalRef}` : undefined);

    const resp = await walletClient.post(
      '/wallet/credit',
      { userId, amount, originalRef },
      { headers: idemKey ? { 'Idempotency-Key': idemKey } : undefined }
    );

    const body = resp?.data;
    const payload = body?.data ?? body;

    if (body?.status && body.status !== 'success') {
      throw new Error(body?.message || 'Failed to credit wallet');
    }

    if (!payload || typeof payload.balance === 'undefined') {
      throw new Error('Malformed wallet response');
    }

    return payload; 
  } catch (err) {
    console.error('walletService.creditWallet error:', err.response?.data || err.message);
    const msg = err.response?.data?.message || err.message || 'Failed to credit wallet';
    throw new Error(msg);
  }
}

module.exports = {
  createWallet,
  chargeWallet,
  creditWallet
};