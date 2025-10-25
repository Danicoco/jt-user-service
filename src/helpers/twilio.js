const { ACCOUNT_SID, AUTH_TOKEN, VERIFY_SERVICE_SID } = require("../config");
const accountSid = ACCOUNT_SID;
const authToken = AUTH_TOKEN;
const serviceSid = VERIFY_SERVICE_SID;
const twilio = require("twilio")(accountSid, authToken);

const getOtp = (phone_number)=>{
  twilio.verify.v2.services(serviceSid)
    .verifications
    .create({ to: phone_number, channel: "sms" });
};

const verifyOtp = async (phone_number, otp)=>{
  const verification = await twilio.verify.v2.services(serviceSid)
    .verificationChecks
    .create({ to: phone_number, code: otp });
  return verification;
};

const verifyOtpTemp = async (phoneNumber, otp)=>{
  let verification = {};
  if(otp === 123456 || otp === "123456") {
    verification.status = "approved"
    return verification;
  }
  verification.status = "unapproved"
  return verification;
};

module.exports = {
  getOtp,
  verifyOtp,
  verifyOtpTemp
};