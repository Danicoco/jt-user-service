const { jsonS, jsonFailed } = require("../../../utils");
const {
  createShipment,
  listShipments,
  getShipment,
  listDropOffs,
  createDropOffs,
  confirmShipmentPaid,
  getDropOff,
  updateDropOff
} = require("../../../services/adminShippingService");
const { getShippingRates } = require("../../../services/adminRateService");
const { chargeWallet } = require("../../../services/walletService");

const Controller = {
  create: async (req, res) => {
    try {
      const {
        receiverName,
        receiverPhone,
        receiverEmail,
        receiverPickupLocation,

        packageCategory,
        packageType,
        packageWeight,
        packageQuantity,
        packageDescription,
        rateId,
      } = req.body;

      if (!rateId) {
        return jsonFailed(res, {}, "rateId is required", 400);
      }

      const rates = await getShippingRates({
        type: "shipping",
        category: packageCategory,
        weight: Number(packageWeight),
      });

      const chosenRate = rates.find((r) => r._id === rateId);
      if (!chosenRate) {
        return jsonFailed(res, {}, "Invalid rate selected", 400);
      }

      // DO NOT CHARGE USER AT THIS POINT
      // const { balance: remainingBalance } = await chargeWallet({
      //   userId: req.user.id,
      //   amount: chosenRate.rate,
      //   pin
      // });

      const payload = {
        customerUserId: req.user.id,
        receiver: {
          name: receiverName,
          phoneNumber: receiverPhone,
          email: receiverEmail,
          pickupLocation: receiverPickupLocation,
        },
        pkg: {
          category: packageCategory,
          type: packageType,
          weight: Number(packageWeight),
          quantity: Number(packageQuantity),
          description: packageDescription,
        },
        payment: {
          deliveryFee: chosenRate.rate,
        },
      };

      const shipment = await createShipment(payload);
      return jsonS(res, 201, "Shipment created.", shipment);
    } catch (err) {
      console.error("create shipment error:", err);
      const status = err.status || 400;
      return jsonFailed(
        res,
        {},
        err.message || "Could not create shipment",
        status
      );
    }
  },

  list: async (req, res) => {
    try {
      const { page, limit, status, category, search } = req.query;
      const query = {
        page,
        limit,
        status,
        category,
        search,
        customerUserId: req.user.id,
      };

      const { shipments, total } = await listShipments(query);
      return jsonS(res, 200, "Shipments fetched", {
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        total,
        shipments,
      });
    } catch (err) {
      console.error("list shipments error:", err);
      return jsonFailed(res, {}, "Could not list shipments", 500);
    }
  },

  get: async (req, res) => {
    try {
      const shipment = await getShipment(req.params.id);
      return jsonS(res, 200, "Shipment fetched", shipment);
    } catch (err) {
      console.error("get shipment error:", err);
      const status = err.message === "Shipment not found" ? 404 : 500;
      return jsonFailed(res, {}, err.message, status);
    }
  },

  listAllDropOff: async (req, res) => {
    try {
      const query = { ...req.query, customerUserId: req.user.id };
      const dropoffs = await listDropOffs(query);
      return jsonS(res, 200, "Dropoffs fetched", dropoffs);
    } catch (err) {
      console.error("get dropoffs error:", err);
      const status = err.message === "Dropoffs not found" ? 404 : 500;
      return jsonFailed(res, {}, err.message, status);
    }
  },

  createDrop: async (req, res) => {
    try {
      const { courier, trackingNumber, pin, photoUrl, pickup } = req.body;
      console.log(req.files, "FILES")

      if (!pin) {
        return jsonFailed(res, {}, "Pin is required", 400);
      }

      if (!trackingNumber) {
        return jsonFailed(res, {}, "Tracking Number is required", 400);
      }

      if (!courier) {
        return jsonFailed(res, {}, "Courier is required", 400);
      }

      const payload = {
        ...req.body,
        ...(pickup && { pickup: JSON.parse(pickup)}),
        file: photoUrl,
        user: req.user,
        customerUserId: req.user.id,
      };

      const dropoff = await createDropOffs(payload);
      return jsonS(res, 201, "Drop Off created", dropoff);
    } catch (err) {
      console.error("create drop off error:", err);
      if (err.message == "Invalid PIN") {
        return jsonFailed(res, {}, "Invalid PIN", 401);
      }
      const status = err.status || 400;
      return jsonFailed(
        res,
        {},
        err.message || "Could not create shipment",
        status
      );
    }
  },

  payFromWallet: async (req, res) => {
    try {
      const { pin } = req.body || {};
      if (!pin) return jsonFailed(res, {}, "Pin is required", 400);

      const shipment = await getShipment(req.params.id);
      if (!shipment) return jsonFailed(res, {}, "Shipment not found", 404);

      if (String(shipment.customerUserId) !== String(req.user.id)) {
        return jsonFailed(res, {}, "Forbidden", 403);
      }

      if (shipment.shipmentStatus !== 'awaiting_payment') {
        return jsonFailed(res, {}, "Shipment is not ready for payment", 400);
      }

      const amount = Number(shipment.payment?.amountDue ?? shipment.payment?.deliveryFee ?? 0);
      if (!amount || amount <= 0) {
        return jsonFailed(res, {}, "Invalid amount due", 400);
      }

      await chargeWallet({
        userId: req.user.id,
        amount,
        pin, 
        meta: { type: 'SHIPMENT_PAYMENT', shipmentId: shipment._id }
      });

      const updated = await confirmShipmentPaid(shipment._id);

      return jsonS(res, 200, "Shipment paid", { shipment: updated });
    } catch (err) {
      if (err.message === "Invalid PIN") {
        return jsonFailed(res, {}, "Invalid PIN", 401);
      }
      if (err.message === "Insufficient wallet balance") {
        return jsonFailed(res, {}, "Insufficient wallet balance", 400);
      }
      const code = /not found/i.test(err.message) ? 404 : (/forbidden/i.test(err.message) ? 403 : 400);
      return jsonFailed(res, {}, err.message || "Could not pay for shipment", code);
    }
  },
  payForDropOff: async (req, res) => {
    try {
      const { pin } = req.body;
      if (!pin) return jsonFailed(res, {}, "Pin is required", 400);

      const dropOff = await getDropOff(req.params.id);
      if (!dropOff) return jsonFailed(res, {}, "Drop off not found", 404);

      if (String(dropOff.customerUserId) !== String(req.user.id)) {
        return jsonFailed(res, {}, "Forbidden", 403);
      }

      if (dropOff.shipmentStatus !== 'awaiting_payment') {
        return jsonFailed(res, {}, "Drop off is not ready for payment", 400);
      }

      const amount = Number(dropOff?.deliveryFee ?? 0);
      if (!amount || amount <= 0) {
        return jsonFailed(res, {}, "Invalid amount due", 400);
      }

      await chargeWallet({
        userId: req.user.id,
        amount,
        pin, 
        meta: { type: 'DROPOFF_PAYMENT', dropOffId: dropOff._id }
      });

      const updated = await updateDropOff(dropOff._id, { status: 'in_transit', isPaid: true });

      return jsonS(res, 200, "Drop off paid", { dropoff: updated });
    } catch (err) {
      if (err.message === "Invalid PIN") {
        return jsonFailed(res, {}, "Invalid PIN", 401);
      }
      if (err.message === "Insufficient wallet balance") {
        return jsonFailed(res, {}, "Insufficient wallet balance", 400);
      }
      const code = /not found/i.test(err.message) ? 404 : (/forbidden/i.test(err.message) ? 403 : 400);
      return jsonFailed(res, {}, err.message || "Could not pay for shipment", code);
    }
  },
};
module.exports = Controller;
