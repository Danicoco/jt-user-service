const express = require('express');
const auth = require('../../middlewares/ambassadorAuth/authMiddleware');
const { AddressController } = require('../../http/controllers/address');

const router = express.Router();

router.get('/address',      auth, AddressController.list);
router.get('/address/:id',  auth, AddressController.get);
router.post('/address',     auth, AddressController.create);
router.patch('/address/:id',auth, AddressController.update);
router.delete('/address/:id',auth,AddressController.remove);

module.exports = {
  baseUrl: '/user',
  router,
};
