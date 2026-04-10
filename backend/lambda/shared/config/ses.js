import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { loadBackendEnv } from "./env.js";
import { buildOtpEmail } from "./otp-email-template.js";

loadBackendEnv();

function getSesConfig() {
  const region = process.env.AWS_REGION || process.env.REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.ACCESS_KEY;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.SECRET_KEY;
  const sessionToken = process.env.AWS_SESSION_TOKEN;

  const config = { region };

  if (accessKeyId && secretAccessKey) {
    config.credentials = {
      accessKeyId,
      secretAccessKey,
      ...(sessionToken ? { sessionToken } : {}),
    };
  }

  return config;
}

const ses = new SESClient(getSesConfig());

function buildSendParams({ to, subject, html, text, replyTo }) {
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);

  return {
    Source: process.env.EMAIL_FROM,
    Destination: { ToAddresses: recipients },
    Message: {
      Subject: { Data: subject, Charset: "UTF-8" },
      Body: {
        Html: { Data: html, Charset: "UTF-8" },
        Text: { Data: text, Charset: "UTF-8" },
      },
    },
    ...(replyTo && { ReplyToAddresses: [replyTo] }),
    ...(process.env.SES_CONFIGURATION_SET && { ConfigurationSetName: process.env.SES_CONFIGURATION_SET }),
  };
}

export async function sendOTP(email, otp, kind = "login", verifyUrl = null) {
  const emailContent = buildOtpEmail({ otp, kind, verifyUrl });

  const params = buildSendParams({
    to: email,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
  });

  return ses.send(new SendEmailCommand(params));
}

export async function sendEmail({ to, subject, html, text, replyTo }) {
  const params = buildSendParams({ to, subject, html, text, replyTo });
  return ses.send(new SendEmailCommand(params));
}
