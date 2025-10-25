const { listProducts, getProduct } = require("../../../services/adminProductService");
const { jsonS, jsonFailed } = require("../../../utils");
const { getProductMetrics } = require("../../../services/productMetricsService");
const { ensureReferralForUser } = require("../../../services/referralService");

const trimSlash = (s = "") => String(s).replace(/\/+$/, "");
const APP_ORIGIN = trimSlash(
  process.env.CLIENT_URL
);
const PRODUCT_PATH_PREFIX = "/shop/item";         

const buildShareLinks = (url, { title, text }) => {
  const safeMsg = text || (title ? `Check this out: ${title}` : `Check this out on Jamestown!`);
  const encUrl = encodeURIComponent(url);
  const encMsg = encodeURIComponent(safeMsg);
  return {
    raw: url,
    whatsapp: `https://api.whatsapp.com/send?text=${encMsg}%20${encUrl}`,
    twitter:  `https://twitter.com/intent/tweet?text=${encMsg}&url=${encUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encUrl}`,
  };
};

const Controller = {
  listProducts: async (req, res) => {
    try {
      const result = await listProducts(req.query);
      // result = { products, page, pages, total }
      return jsonS(res, 200, 'Products fetched', result);
    } catch (err) {
      console.error('UserService listProducts error:', err);
      return jsonFailed(res, {}, 'Failed to fetch products', err.response?.status || 500);
    }
  },

  getProduct: async (req, res) => {
    try {
      const product = await getProduct(req.params.id);
      return jsonS(res, 200, 'Product fetched', product);
    } catch (err) {
      console.error('UserService getProduct error:', err);
      return jsonFailed(res, {}, 'Failed to fetch product', err.response?.status || 500);
    }
  },

  getMerics: async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) return jsonFailed(res, {}, 'Product ID is required', 400);
      const metrics = await getProductMetrics(id, req.query);
      return jsonS(res, 200, 'Product metrics fetched', metrics);
    } catch (err) {
      console.error('Error getting metrics:', err);
      return jsonFailed(res, {}, 'Failed to fetch product metrics', err.response?.status || 500);
    }
  },

  shareProduct: async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) return jsonFailed(res, {}, 'Product ID is required', 400);

      const product = await getProduct(id);
      if (!product) return jsonFailed(res, {}, 'Product not found', 404);

      const userId = req.user?.id;
      if (!userId) return jsonFailed(res, {}, 'Unauthorized', 401);

      const { referralCode } = await ensureReferralForUser(userId); 

      const base = APP_ORIGIN; 
      const productUrl = `${base}${PRODUCT_PATH_PREFIX}/${id}?ref=${encodeURIComponent(referralCode)}`;

      const socials = buildShareLinks(productUrl, {
        title: product?.title || product?.name,
      });

      return jsonS(res, 200, 'Share link generated', {
        url: productUrl,
        refCode: referralCode,
        socials,
      });
    } catch (err) {
      console.error('shareProduct error:', err);
      return jsonFailed(res, {}, 'Could not generate share link', 500);
    }
  },

};

module.exports = Controller;
