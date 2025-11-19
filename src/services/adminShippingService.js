const axios = require('axios');
const { ADMIN_SERVICE_URL, INTERNAL_SECRET } = process.env;

const adminClient = axios.create({
  baseURL: `${ADMIN_SERVICE_URL || 'https://admin-dev-api-363194b3852f.herokuapp.com/'}/internal/shipping`,
  headers: { 'x-internal-key': INTERNAL_SECRET },
  timeout: 5000
});

async function listDropOffs(query) {
  const resp = await adminClient.get('/drop-off', { params: query });
  return resp.data.data;  
}

async function createDropOffs(payload) {
  const resp = await adminClient.post('/drop-off', payload);
  return resp.data.data;  
}

async function getDropOff(id) {
  const resp = await adminClient.get(`/drop-off/${id}`);
  return resp.data.data;
}

async function updateDropOff(id, values) {
  const resp = await adminClient.patch(`/drop-off/${id}`, values);
  return resp.data.data;
}

async function listShipments(query) {
  const resp = await adminClient.get('/', { params: query });
  return resp.data.data;  
}

async function createShipment(payload) {
  const { data } = await adminClient.post('/', payload);
  return data.data;
}

async function getShipment(id) {
  const resp = await adminClient.get(`/${id}`);
  return resp.data.data;
}

async function confirmShipmentPaid(id) {
  const resp = await adminClient.patch(`/${id}/pay-confirm`);
  return resp.data.data;
}

module.exports = {
  listShipments,
  createShipment,
  getShipment,
  listDropOffs,
  createDropOffs,
  confirmShipmentPaid,
  getDropOff,
  updateDropOff
};
