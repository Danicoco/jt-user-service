const axios = require('axios');
const { ADMIN_SERVICE_URL, INTERNAL_SECRET } = process.env;

const adminClient = axios.create({
  baseURL: `${ADMIN_SERVICE_URL}/internal`,
  headers: {
    'x-internal-key': INTERNAL_SECRET,
  },
  timeout: 5000,
});

async function getShippingRates({ category, product, country, state, region, weight }) {
  const resp = await adminClient.get('/rates', {
    params: {
      type: 'shipping',    
      category,
      product,
      country,
      state,
      region,
      weight,
    }
  }).catch(e => console.log(e.response?.data));
  return resp.data.data; 
}

async function getShippingCategories({ country, state, region } = {}) {
  const resp = await adminClient.get('/rates/shipping/categories', {
    params: { country, state, region }
  });
  return resp.data.data;
}

async function getShippingProducts({ category, country, state, region } = {}) {
  const resp = await adminClient.get('/rates/shipping/products', {
    params: { category, country, state, region }
  });
  return resp.data.data;
}

async function getShippingCatalog({ country, state, region } = {}) {
  const resp = await adminClient.get('/rates/shipping/catalog', { params: { country, state, region } });
  return resp.data.data;
}


module.exports = { getShippingRates, getShippingCategories, getShippingProducts, getShippingCatalog };
