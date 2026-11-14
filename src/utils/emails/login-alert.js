const escapeHtml = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);

const formatLoginTime = (date = new Date()) =>
  `${date.toLocaleString("en-GB", {
    timeZone: "Africa/Lagos",
    dateStyle: "medium",
    timeStyle: "short",
  })} (WAT)`;

// Pulls the details shown in the alert from the login request.
const loginContext = (req) => ({
  time: formatLoginTime(),
  ip: req.ip || req.socket?.remoteAddress || "Unknown",
  device: req.get?.("user-agent") || "Unknown",
});

const loginAlertTemplate = (firstName, { time, ip, device }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New sign-in to your Jamestown account</title>
</head>
<body style="margin:0;padding:24px 12px;background:#f5f7fa;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
  <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:10px;overflow:hidden;">
    <div style="background:#0a2540;color:#ffffff;text-align:center;padding:20px;font-size:20px;font-weight:bold;">
      New sign-in detected
    </div>
    <div style="padding:24px;font-size:15px;line-height:1.6;">
      <p>Hi ${escapeHtml(firstName || "there")},</p>
      <p>Your Jamestown account was just signed in to.</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px 0;color:#555;width:90px;">Time</td><td style="padding:8px 0;">${escapeHtml(time)}</td></tr>
        <tr><td style="padding:8px 0;color:#555;">IP address</td><td style="padding:8px 0;">${escapeHtml(ip)}</td></tr>
        <tr><td style="padding:8px 0;color:#555;vertical-align:top;">Device</td><td style="padding:8px 0;word-break:break-word;">${escapeHtml(device)}</td></tr>
      </table>
      <p>If this was you, no action is needed.</p>
      <p><strong>If this wasn't you, change your password immediately and contact Jamestown support.</strong></p>
      <p>Jamestown Security</p>
    </div>
  </div>
</body>
</html>
`;

module.exports = { loginAlertTemplate, loginContext };
