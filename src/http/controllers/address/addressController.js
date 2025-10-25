const { jsonS, jsonFailed } = require('../../../utils');
const addressService = require('../../../services/addressService');

const Controller = {
  list: async (req, res) => {
    try {
      const addresses = await addressService.listAddresses(req.user.id);
      return jsonS(res, 200, 'Addresses fetched', addresses);
    } catch (err) {
      console.error('listAddresses error:', err);
      return jsonFailed(res, {}, 'Could not fetch addresses', 500);
    }
  },

  get: async (req, res) => {
    try {
      const addr = await addressService.getAddress(req.user.id, req.params.id);
      return jsonS(res, 200, 'Address fetched', addr);
    } catch (err) {
      console.error('getAddress error:', err);
      const status = err.message === 'Address not found' ? 404 : 500;
      return jsonFailed(res, {}, err.message, status);
    }
  },

  create: async (req, res) => {
    try {
      const addr = await addressService.createAddress(req.user.id, req.body);
      return jsonS(res, 201, 'Address created', addr);
    } catch (err) {
      console.error('createAddress error:', err);
      return jsonFailed(res, {}, err.message || 'Could not create address', 400);
    }
  },

  update: async (req, res) => {
    try {
      const addr = await addressService.updateAddress(req.user.id, req.params.id, req.body);
      return jsonS(res, 200, 'Address updated', addr);
    } catch (err) {
      console.error('updateAddress error:', err);
      const status = err.message === 'Address not found' ? 404 : 400;
      return jsonFailed(res, {}, err.message, status);
    }
  },

  remove: async (req, res) => {
    try {
      await addressService.deleteAddress(req.user.id, req.params.id);
      return jsonS(res, 200, 'Address deleted', {});
    } catch (err) {
      console.error('deleteAddress error:', err);
      const status = err.message === 'Address not found' ? 404 : 500;
      return jsonFailed(res, {}, err.message, status);
    }
  },
};

module.exports = Controller;
