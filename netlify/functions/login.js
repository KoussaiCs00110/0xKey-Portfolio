const crypto = require("crypto");
const { issueAdminToken, TOKEN_TTL_MS } = require("./lib/auth");

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a), "utf8");
  const bufB = Buffer.from(String(b), "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

exports.handler = async (event, context) => {
  const headers = {
    "Content-Type": "application/json",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains"
  };

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: "Method Not Allowed" }) };
  }

  // Fail closed: if credentials are not configured, deny everything.
  // (Without this, undefined === undefined would authenticate anyone.)
  const expectedUser = process.env.ADMIN_USER;
  const expectedPass = process.env.ADMIN_PASS;
  if (!expectedUser || !expectedPass) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ success: false, message: "Authentication unavailable" }),
    };
  }

  try {
    const { username, password } = JSON.parse(event.body || "{}");

    if (typeof username !== "string" || typeof password !== "string") {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ success: false, message: "Invalid username or password" }),
      };
    }

    if (safeEqual(username, expectedUser) && safeEqual(password, expectedPass)) {
      // Same credentials, no separate auth system: the token below is
      // what the admin CTF API accepts as proof of this login.
      const token = issueAdminToken(username);
      if (!token) {
        return {
          statusCode: 503,
          headers,
          body: JSON.stringify({ success: false, message: "Authentication unavailable" }),
        };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: "Authentication successful",
          token,
          expiresIn: TOKEN_TTL_MS
        }),
      };
    }

    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ success: false, message: "Invalid username or password" }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, message: "Bad request" }),
    };
  }
};
