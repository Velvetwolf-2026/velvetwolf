import AWS from "aws-sdk";
import dotenv from "dotenv";

dotenv.config();
AWS.config.update({
  accessKeyId: process.env.ACCESS_KEY,
  secretAccessKey: process.env.SECRET_KEY,
  region: process.env.REGION
});

const ses = new AWS.SES();

export const sendOTP = async (email, otp) => {
  const params = {
    Source: process.env.EMAIL_FROM,
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: { Data: "VelvetWolf Verification Code" },
      Body: {
        Text: { Data: `Your OTP is: ${otp}` }
      }
    }
  };

  return ses.sendEmail(params).promise();
};