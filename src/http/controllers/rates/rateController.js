const { jsonS, jsonFailed } = require('../../../utils');
const { getShippingRates, getShippingCategories, getShippingProducts, getShippingCatalog,  }   = require('../../../services/adminRateService');

const truthy = (v) => {
  if (typeof v === 'boolean') return v;
  return ['1','true','yes','y','on'].includes(String(v || '').toLowerCase());
};

const Controller = {
  getShippingRates: async (req, res) => {
    try {
      const { category, product } = req.query;

      if (!category || !product) {
        return jsonFailed(res, {}, 'category, country and weight are required', 400);
      }
      
      const rates = await getShippingRates({
        category,
        product,
      });
      if (!rates.length) return jsonFailed(res, {}, 'No available rate at the moment', 404)
      return jsonS(res, 200, 'Shipping rates fetched', rates);
    } catch (err) {
      console.error('getRates error:', err);
      return jsonFailed(res, {}, err.message || 'Could not fetch shipping rates', 500);
    }
  },

  getShippingCategories: async (req, res) => {
    try {
      const { country, state, region, includeProducts } = req.query;

      if (truthy(includeProducts)) {
        const catalog = await getShippingCatalog({ country, state, region });
        return jsonS(res, 200, 'Shipping categories with products fetched', catalog);
      }

      const categories = await fetchShippingCategories({ country, state, region });
      return jsonS(res, 200, 'Shipping categories fetched', categories);
    } catch (err) {
      console.error('getShippingCategories error:', err);
      return jsonFailed(res, {}, 'Could not fetch categories', 500);
    }
  },

  getShippingProducts: async (req, res) => {
    try {
      const { category, country, state, region } = req.query;
      const data = await getShippingProducts({ category, country, state, region });
      return jsonS(res, 200, 'Shipping products fetched', data);
    } catch (err) {
      console.error('getShippingProducts error:', err);
      return jsonFailed(res, {}, 'Could not fetch products', 500);
    }
  },
};

module.exports = Controller;
