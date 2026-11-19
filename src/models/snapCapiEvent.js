const mongoose = require("mongoose");
const { db } = require("../utils/mongoDb");
const { Schema } = mongoose;

// Outbox of conversion events for Snap's Conversions API.
// This service only inserts rows; jt-wallet-service's "snap-capi" job sends
// them. The schema is duplicated in jt-wallet-service/src/models/snapCapiEvent.js
// and the two must stay in sync.
const SnapCapiEventSchema = new Schema(
  {
    // deterministic per conversion (e.g. "signup:<userId>", "purchase:<txId>"),
    // so enqueueing twice is a no-op; also sent to Snap as event_id
    _id: { type: String, required: true },
    eventName: { type: String, required: true },
    userId: { type: String, required: true },
    eventTime: { type: Date, required: true },
    customData: { type: Schema.Types.Mixed },
    // device/request snapshot taken when the event happened; when absent the
    // sender uses the user's stored adDevice
    device: { type: Schema.Types.Mixed },

    status: {
      type: String,
      enum: ["pending", "sent", "validated", "failed", "skipped", "expired"],
      default: "pending",
    },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: Date.now },
    lastError: { type: String },
    sentAt: { type: Date },
  },
  { timestamps: true, versionKey: false, collection: "snap_capi_events" },
);

SnapCapiEventSchema.index({ status: 1, nextAttemptAt: 1 });

module.exports = db.model("SnapCapiEvent", SnapCapiEventSchema);
