/**
 * One-off job: rewrite every user's phoneNumber into the local 11-digit
 * format sign up uses (0XXXXXXXXXX), so lookups by phone number and SMS
 * sending work for accounts created before numbers were normalized.
 *
 *   node src/jobs/normalizePhoneNumbers.js           # dry run, changes nothing
 *   node src/jobs/normalizePhoneNumbers.js --apply   # write the changes
 *
 * Numbers that are still invalid after normalizing (wrong length, unknown
 * prefix) are left as they are and listed so they can be fixed by hand.
 * phoneNumber is unique, so a number that would collide with another
 * account's is skipped and listed too.
 */
require("dotenv").config();

const { db } = require("../utils/mongoDb");
const { User } = require("../models/user");
const { normalizeNigerianPhone, isValidNigerianPhone } = require("../utils/phone");

const APPLY = process.argv.includes("--apply");

async function run() {
  await db.asPromise();
  console.log(APPLY ? "Applying changes" : "Dry run: nothing will be written (pass --apply to write)");

  const updated = [];
  const invalid = [];
  const conflicts = [];
  let alreadyOk = 0;
  // numbers this run has handed out, so two old records can't both claim one
  const claimed = new Set();

  const cursor = User.find({ phoneNumber: { $exists: true, $nin: [null, ""] } })
    .select("_id email phoneNumber")
    .lean()
    .cursor();

  for await (const user of cursor) {
    const before = user.phoneNumber;
    const after = normalizeNigerianPhone(before);
    const row = { id: String(user._id), email: user.email, before, after };

    if (!isValidNigerianPhone(after)) {
      invalid.push(row);
      continue;
    }
    if (after === before) {
      alreadyOk++;
      claimed.add(after);
      continue;
    }

    const takenBy = claimed.has(after)
      ? "another record in this run"
      : (await User.exists({ phoneNumber: after, _id: { $ne: user._id } }))?._id;
    if (takenBy) {
      conflicts.push({ ...row, takenBy: String(takenBy) });
      continue;
    }

    if (APPLY) {
      try {
        // match on the old value too, in case the user changed it meanwhile
        await User.updateOne({ _id: user._id, phoneNumber: before }, { $set: { phoneNumber: after } });
      } catch (err) {
        if (err.code === 11000) {
          conflicts.push({ ...row, takenBy: "duplicate key on write" });
          continue;
        }
        throw err;
      }
    }
    claimed.add(after);
    updated.push(row);
  }

  console.log(`\n${APPLY ? "Updated" : "Would update"} (${updated.length}):`);
  console.table(updated);
  console.log(`\nStill invalid after normalizing, left unchanged (${invalid.length}):`);
  console.table(invalid);
  console.log(`\nSkipped, number already used by another account (${conflicts.length}):`);
  console.table(conflicts);
  console.log(`\nAlready normalized: ${alreadyOk}`);
}

run()
  .catch((err) => {
    console.error("normalizePhoneNumbers failed:", err);
    process.exitCode = 1;
  })
  .finally(() => db.close());
