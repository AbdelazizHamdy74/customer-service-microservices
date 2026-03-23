const https = require("https");

const env = require("../config/env");
const logger = require("../utils/logger");

const sendBrevoSms = ({ to, message }) =>
  new Promise((resolve) => {
    if (!env.brevoApiKey || !env.smsFrom) {
      resolve({
        ok: false,
        provider: "brevo",
        error: "Brevo SMS provider is not configured",
      });
      return;
    }

    const body = JSON.stringify({
      sender: env.smsFrom,
      recipient: String(to).trim(),
      content: String(message).trim(),
    });

    const req = https.request(
      {
        hostname: "api.brevo.com",
        path: "/v3/transactionalSMS/send",
        method: "POST",
        headers: {
          "api-key": env.brevoApiKey,
          accept: "application/json",
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
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
            error: `Brevo SMS API error: ${res.statusCode}`,
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

    req.write(body);
    req.end();
  });

const sendSms = async ({ to, message }) => {
  if (env.smsProvider === "MOCK") {
    logger.info(`Mock SMS sent to ${to}: ${message}`);
    return {
      ok: true,
      provider: "mock",
      externalId: `mock-${Date.now()}`,
    };
  }

  if (env.smsProvider === "BREVO") {
    return sendBrevoSms({ to, message });
  }

  return {
    ok: false,
    provider: env.smsProvider.toLowerCase(),
    error: "Unsupported SMS provider",
  };
};

module.exports = {
  sendSms,
};
