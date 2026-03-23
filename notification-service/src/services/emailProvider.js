const https = require("https");

const env = require("../config/env");

const sendEmail = ({ to, subject, html, text }) =>
  new Promise((resolve) => {
    if (!env.brevoApiKey || !env.emailFrom) {
      resolve({
        ok: false,
        provider: "brevo",
        error: "Email provider is not configured",
      });
      return;
    }

    const payload = JSON.stringify({
      sender: {
        email: env.emailFrom,
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
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
            let response = {};
            try {
              response = JSON.parse(data || "{}");
            } catch (error) {
              response = {};
            }

            resolve({
              ok: true,
              provider: "brevo",
              externalId: response.messageId || null,
            });
            return;
          }

          resolve({
            ok: false,
            provider: "brevo",
            error: `Brevo API error: ${res.statusCode}`,
          });
        });
      }
    );

    req.on("error", (error) => {
      resolve({
        ok: false,
        provider: "brevo",
        error: error.message,
      });
    });

    req.write(payload);
    req.end();
  });

module.exports = {
  sendEmail,
};
