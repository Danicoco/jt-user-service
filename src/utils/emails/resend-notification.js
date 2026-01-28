const resendTemplate = (firstName, otp) => {
    return `
    <!DOCTYPE html>
<html>

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Jamestown Transaction Notification</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #f5f7fa;
      font-family: Arial, Helvetica, sans-serif;
    }

    .container {
      max-width: 600px;
      margin: auto;
      background: #ffffff;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
    }

    .header {
      background: #0a2540;
      color: #ffffff;
      text-align: center;
      padding: 30px 20px;
    }

    .header h1 {
      margin: 0;
      font-size: 26px;
      font-weight: 600;
    }

    .content {
      padding: 30px 25px;
      color: #333333;
    }

    .content h2 {
      margin-top: 0;
      font-size: 20px;
      font-weight: 600;
      color: #0a2540;
    }

    .details-box {
      background: #f0f4f8;
      padding: 20px;
      border-radius: 8px;
      margin-top: 15px;
    }

    .details-box p {
      margin: 6px 0;
      font-size: 15px;
    }

    .footer {
      text-align: center;
      padding: 20px;
      font-size: 13px;
      color: #777777;
    }

    .btn {
      display: inline-block;
      margin-top: 25px;
      padding: 12px 20px;
      background: #0a2540;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-size: 14px;
    }
  </style>
</head>

<body>
  <div class="container">

    <div class="header">
      <h1>Transaction Notification</h1>
    </div>

    <div class="content">
      <p>Hello ${firstName},</p>

      <p>Use the verification code below to reset your Jamestown password</p>
      
      <p>If you did not initiate this action, kindly ignore.</p>
    </div>

    <div class="footer">
      © ${new Date().getFullYear()} Jamestown. All rights reserved.<br>
      This is an automated message, please do not reply.
    </div>

  </div>
</body>

</html>
    `
}

module.exports = resendTemplate;