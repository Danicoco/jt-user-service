function extractReferralCode(req) {
  const bodyCode  = req.body?.referralCode; 
  const queryCode = req.query?.ref;                                     

  const code = (bodyCode ?? queryCode ?? '').toString().trim().toUpperCase();
 return /^[A-Z0-9]{8}$/.test(code) ? code : null;
}

module.exports = { extractReferralCode };
