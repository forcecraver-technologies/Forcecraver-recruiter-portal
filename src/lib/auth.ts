import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "forcecraver-super-secret-master-token-key-2026";
export const AUTH_COOKIE_NAME = "forcecraver_auth_token";
export const RECRUITER_COOKIE_NAME = "recruiter_portal_auth_token";

export interface UserTokenPayload {
  id: string;
  email: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  role: string; // "DEVELOPER" | "ADMIN" | "RECRUITER"
  designation?: string | null;
  canPostJd?: boolean;
  canScreenCandidates?: boolean;
  canAccessCandidates?: boolean;
  canScheduleInterviews?: boolean;
  isDeveloper?: boolean;
  exp?: number;
}

export function isAllowedEmail(email: string): boolean {
  if (!email) return false;
  const cleaned = email.trim().toLowerCase();
  return (
    cleaned.endsWith("@forcecraver.com") ||
    cleaned === "test@forcecraver" ||
    cleaned.endsWith("@forcecraver") ||
    cleaned.includes("@") // allow any valid HR recruiter email
  );
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signAuthToken(payload: Omit<UserTokenPayload, "exp">): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 days session
  const fullPayload = { ...payload, exp };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const key = await getCryptoKey(JWT_SECRET);
  const enc = new TextEncoder();
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(data));

  const encodedSignature = Buffer.from(signature)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${data}.${encodedSignature}`;
}

export async function verifyAuthToken(token: string): Promise<UserTokenPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;

    const key = await getCryptoKey(JWT_SECRET);
    const enc = new TextEncoder();

    let base64Sig = encodedSignature.replace(/-/g, "+").replace(/_/g, "/");
    while (base64Sig.length % 4) base64Sig += "=";
    const sigBytes = Uint8Array.from(Buffer.from(base64Sig, "base64"));

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      enc.encode(data)
    );

    if (!isValid) return null;

    const payloadJson = base64UrlDecode(encodedPayload);
    const payload: UserTokenPayload = JSON.parse(payloadJson);

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getAuthSession(): Promise<UserTokenPayload | null> {
  try {
    const cookieStore = await cookies();
    // Check both cookie names for seamless interoperability
    const token =
      cookieStore.get(RECRUITER_COOKIE_NAME)?.value ||
      cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifyAuthToken(token);
  } catch {
    return null;
  }
}
