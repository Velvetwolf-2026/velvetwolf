import AWS from "aws-sdk";
import { loadBackendEnv } from "./env.js";
import { buildOtpEmail } from "./otp-email-template.js";

loadBackendEnv();

AWS.config.update({
  accessKeyId: process.env.ACCESS_KEY,
  secretAccessKey: process.env.SECRET_KEY,
  region: process.env.REGION,
});

const ses = new AWS.SES();

export async function sendOTP(email, otp, kind = "login") {
  const emailContent = buildOtpEmail({ otp, kind });

  const params = {
    Source: process.env.EMAIL_FROM,
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: { Data: emailContent.subject, Charset: "UTF-8" },
      Body: {
        Html: { Data: emailContent.html, Charset: "UTF-8" },
        Text: { Data: emailContent.text, Charset: "UTF-8" },
      },
    },
  };

  return ses.sendEmail(params).promise();
}
