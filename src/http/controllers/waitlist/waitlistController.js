const { Waitlist } = require("../../../models/waitlist");
const { v4: uuidv4 } = require("uuid");
const { jsonS, jsonFailed } = require("../../../utils");
const { sendEmailNotification } = require("../../../services/emailNotification");

const generateReferralCode = () => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

const Controller = {
  addToWaitlist: async (req, res) => {
    const { firstName, email } = req.body;
    const referralCode = req.query.referralCode; 

    if (!firstName || !email) {
      return jsonFailed(res, {}, "First name and email required.", 400);
    }

    try {
      const waitlistCount = await Waitlist.countDocuments();
      const userExists = await Waitlist.findOne({
        email: { $regex: new RegExp("^" + email.toLowerCase(), "i") },
      });

      if (userExists) {
        return jsonFailed(res, {}, "This email already exists on the waitlist", 400);
      }

      let points = 0;

      // Give 5 points to early users
      if (waitlistCount < 20) {
        points += 5;
      }

      let referrer = null;
      console.log("Referral code received: ", referralCode);
      if (referralCode) {
        // Find referrer by referral code
        referrer = await Waitlist.findOne({ referralCode });
        if (!referrer) {
          return jsonFailed(res, {}, "Invalid referral code.", 400);
        }

        // Add points to referrer
        referrer.points += 3;
        await referrer.save();
      }

      const newReferralCode = generateReferralCode();

      const newUser = await Waitlist.create({
        _id: uuidv4(),
        firstName,
        email: email.toLowerCase(),
        referralCode: newReferralCode,
        referrerId: referrer ? referrer._id : null,  
        points,
      });

      const referralLink = `https://jamestown.ng/waitlist?referralCode=${newReferralCode}`;

      const subject = "Welcome to Jamestown";
      const text = `
      <p>Hey ${firstName},</p>
      <p> </p>
      <p>Welcome to Jamestown!</p>
      <p></p>
      <p>We appreciate your interest and are super excited to have you on board. We will notify you as we roll out our services.</p>
      <p></p>
      <p>Here is your referral link: ${referralLink}</p>
      <p>Share and invite others too. A lot of benefits await!</p>
      <p></p>
      <p>Cheers!</p>
      `;

      await sendEmailNotification(email, subject, text);

      return jsonS(res, 200, "User added to waitlist successfully", {
        newUser,
        referralLink,
      });
    } catch (error) {
      console.error(error);
      return jsonFailed(res, {}, "Server error", 500);
    }
  },

  checkWaitlistSpot: async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return jsonFailed(res, {}, "Email is required to check your waitlist spot.", 400);
    }

    try {
      const user = await Waitlist.findOne({
        email: { $regex: new RegExp("^" + email.toLowerCase(), "i") },
      });

      if (!user) {
        return jsonFailed(res, {}, "Email not found on the waitlist.", 404);
      }

      const allUsers = await Waitlist.find().sort({ points: -1 });
      const rank = allUsers.findIndex((u) => u.email === user.email) + 1;

      let message;
      if (rank === 1) {
        message = "There are 0 person(s) ahead of you on the waitlist.";
      } else {
        const peopleAhead = rank - 1;
        message = `There are ${peopleAhead} person(s) ahead of you on the waitlist.`;
      }

      return jsonS(res, 200, "Waitlist spot checked successfully", {
        email: user.email,
        rank,
        points: user.points,
        message,
        referralCode: user.referralCode,
      });
    } catch (error) {
      console.error(error);
      return jsonFailed(res, {}, "Server error while checking your spot on the waitlist.", 500);
    }
  },
};

module.exports = Controller;
