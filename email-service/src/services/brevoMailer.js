const https = require("https");
const env = require("../config/env");

const sendEmail = ({ to, subject, html }) =>
  new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      sender: {
        email: env.emailFrom,
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    });

    const req = https.request(
      {
        hostname: "api.brevo.com",
        path: "/v3/smtp/email",
        method: "POST",
        headers: {
          "api-key": env.brevoApiKey,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            return resolve({ status: res.statusCode, data });
          }
          const err = new Error(`Brevo API error: ${res.statusCode}`);
          err.status = res.statusCode;
          err.data = data;
          return reject(err);
        });
      }
    );

    req.on("error", reject);
    req.write(payload);
    req.end();
  });

module.exports = { sendEmail };
