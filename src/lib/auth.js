import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'xbot_super_secret_key_1234567890_change_me';
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

/**
 * Signs a payload to generate a JWT token.
 * @param {object} payload - The payload to encode (e.g. { userId, email })
 * @returns {Promise<string>} The JWT string.
 */
export async function signToken(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // Session lasts 7 days
    .sign(SECRET_KEY);
}

/**
 * Verifies a JWT token and returns the payload.
 * @param {string} token - The JWT string to verify.
 * @returns {Promise<object|null>} The payload if verified, or null.
 */
export async function verifyToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Extracts the token from the Request's cookies.
 * @param {Request} req - The Next.js API or Middleware request.
 * @returns {string|null} The token string or null.
 */
export function getTokenFromCookies(req) {
  // If the request object is not available or has no cookies helper (e.g. in older structures)
  if (!req?.cookies) return null;
  
  // Next.js standard Request.cookies API
  if (typeof req.cookies.get === 'function') {
    const cookie = req.cookies.get('session');
    return cookie ? cookie.value : null;
  }
  
  // Alternative fallback for headers mapping
  return req.cookies['session'] || null;
}
