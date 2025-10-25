const { listCategories, getCategory } = require("../../../services/adminProductService");
const { jsonS, jsonFailed } = require("../../../utils");

const Controller = {
  listCategories: async (req, res) => {
    try {
      const result = await listCategories(req.query);
      return jsonS(res, 200, 'Categories fetched', result);
    } catch (err) {
      console.error('UserService listProducts error:', err);
      return jsonFailed(res, {}, 'Failed to fetch categories', err.response?.status || 500);
    }
  },

  getCategory: async (req, res) => {
    try {
      const product = await getCategory(req.params.id);
      return jsonS(res, 200, 'Category fetched', product);
    } catch (err) {
      console.error('UserService getProduct error:', err);
      return jsonFailed(res, {}, 'Failed to fetch category', err.response?.status || 500);
    }
  }
};

module.exports = Controller;
