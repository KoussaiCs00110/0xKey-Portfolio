exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { username, password } = JSON.parse(event.body);

    const validUser = process.env.ADMIN_USER;
    const validPass = process.env.ADMIN_PASS;

    // For local dev, ensure you use `netlify dev` so it loads .env variables. 
    // We remove the hardcoded fallbacks so Netlify's secret scanner doesn't complain.
    const expectedUser = validUser;
    const expectedPass = validPass;

    if (username === expectedUser && password === expectedPass) {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: 'Authentication successful' }),
      };
    } else {
      return {
        statusCode: 401,
        body: JSON.stringify({ success: false, message: 'Invalid username or password' }),
      };
    }
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, message: 'Bad request' }),
    };
  }
};
