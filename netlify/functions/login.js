exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { username, password } = JSON.parse(event.body);

    const validUser = process.env.ADMIN_USER;
    const validPass = process.env.ADMIN_PASS;

    // Use default credentials if env vars are not set (for local dev if .env is not loaded correctly by netlify dev)
    const expectedUser = validUser || '0xkey';
    const expectedPass = validPass || '\\yRTktZqX/';

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
