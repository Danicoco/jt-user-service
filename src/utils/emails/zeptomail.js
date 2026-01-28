const { SendMailClient } = require("zeptomail");

const client = new SendMailClient({
  url: process.env.ZEP_URL,
  token: process.env.ZEP_TOKEN,
});

const SendEmail = async (user, subject, message) => {
  try {
    const sndEm = await client.sendMail({
      from: {
        address: "noreply@jamestown.ng",
        name: "Jamestown",
      },
      to: [
        {
          email_address: {
            address: user.email,
            name: `${user.firstName} ${user.lastName}`,
          },
        },
      ],
      subject: subject,
      htmlbody: message,
    });

    console.log({
      status: "success",
      sndEm,
      message: "Mail successfully sent",
    })
    return {
      status: "success",
      message: "Mail successfully sent",
    };
  } catch (error) {
    console.log({ MAILERROR: error });
    return {
      status: "failure",
      message: error,
    };
  }
};

module.exports = { SendEmail };
