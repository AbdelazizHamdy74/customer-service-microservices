const http = require("http");
const https = require("https");
const { URL } = require("url");

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
]);

const readRequestBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];

    req.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
    req.on("aborted", () => reject(new Error("Client request aborted")));
  });

const sanitizeRequestHeaders = (headers, bodyBuffer) => {
  const nextHeaders = {};

  for (const [key, value] of Object.entries(headers || {})) {
    const lowerKey = String(key).toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lowerKey) || lowerKey === "host" || lowerKey === "content-length") {
      continue;
    }
    nextHeaders[key] = value;
  }

  if (bodyBuffer.length > 0) {
    nextHeaders["content-length"] = String(bodyBuffer.length);
  }

  return nextHeaders;
};

const writeResponseHeaders = (res, headers = {}) => {
  for (const [key, value] of Object.entries(headers)) {
    if (HOP_BY_HOP_HEADERS.has(String(key).toLowerCase())) {
      continue;
    }
    if (value !== undefined) {
      res.setHeader(key, value);
    }
  }
};

const proxyRequest = async ({ req, res, targetBaseUrl, targetPath }) => {
  const targetUrl = new URL(targetPath, targetBaseUrl);
  const bodyBuffer = await readRequestBody(req);
  const headers = sanitizeRequestHeaders(req.headers, bodyBuffer);

  await new Promise((resolve, reject) => {
    const transport = targetUrl.protocol === "https:" ? https : http;
    const proxyReq = transport.request(
      targetUrl,
      {
        method: req.method,
        headers,
      },
      (proxyRes) => {
        const chunks = [];

        proxyRes.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        proxyRes.on("end", () => {
          writeResponseHeaders(res, proxyRes.headers);
          res.statusCode = proxyRes.statusCode || 502;
          res.end(Buffer.concat(chunks));
          resolve();
        });
        proxyRes.on("error", reject);
      }
    );

    proxyReq.on("error", reject);

    if (bodyBuffer.length > 0) {
      proxyReq.write(bodyBuffer);
    }

    proxyReq.end();
  });
};

module.exports = { proxyRequest };
