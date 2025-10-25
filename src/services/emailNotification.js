const nodeMailer = require("nodemailer");
require('dotenv').config();

let transport = nodeMailer.createTransport({
    host: 'smtp.zoho.com',
    port: 465,
    secure: true, 
    auth: {
      user: process.env.ZOHO_AUTH_USER,
      pass: process.env.ZOHO_AUTH_PASS,   
    },
});

function fmt(x) {
  const n = Number(x);
  return isNaN(n) ? "0" : n.toLocaleString();
}

const sendEmailNotification = async (email, subject, text) => {
    const mailOptions = {
        from: `"Jamestown Support" <${process.env.ZOHO_AUTH_USER}>`,
        to: email,
        subject: subject,
        html: text
    }

    try {
        await transport.sendMail(mailOptions);
        console.log("Email sent successfully!")
    } catch (error) {
        // console.log("There was a problem sending the email")
        console.log("There was a problem sending the email:", error.message);
    }
};

async function sendOrderConfirmation(to, customerName, {
  orderId,
  items = [],
  totalAmount = 0
}) {
  const rowsHtml = items.map((i, idx) => `
    <tr>
      <td style="padding:8px;text-align:center;">${idx+1}.</td>
      <td style="padding:8px;">${i.name}</td>
      <td style="padding:8px;text-align:center;">${i.quantity}</td>
      <td style="padding:8px;text-align:right;">₦${fmt(i.unitPrice)}</td>
    </tr>
  `).join("");

  const html = `
    <div style="font-family:Arial,sans-serif; max-width:600px; margin:auto; color:#333;">
      <p>Dear <strong>${customerName}</strong>,</p>
      <p>Thank you for your order! It is currently being processed and will be ready for delivery soon.</p>
      <p><strong>Your Order ID is ${orderId}.</strong></p>

      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-top:16px;">
        <thead>
          <tr style="background:#f4f4f4;">
            <th style="padding:8px;">#</th>
            <th style="padding:8px;">Item</th>
            <th style="padding:8px;">Qty</th>
            <th style="padding:8px;text-align:right;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <p style="margin-top:16px;">
        <strong>Total Amount:</strong>
        ₦${fmt(totalAmount)}
      </p>

      <p>Best regards,<br/>Jamestown Support</p>
    </div>
  `;

  try {
    await transport.sendMail({
      from:    `"Jamestown Support" <${process.env.ZOHO_AUTH_USER}>`,
      to,
      subject: `Order Confirmation #${orderId}`,
      html,
    });
    console.log("Order confirmation email sent to", to);
  } catch (err) {
    console.error("Failed to send order email:", err.message);
  }
}


module.exports = {
    sendEmailNotification,
    sendOrderConfirmation
}