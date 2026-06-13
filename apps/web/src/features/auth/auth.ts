// Gate-cookie helpers. The cookie stores sha256(APP_PASSWORD) so the raw
// password never sits in the browser; works in both Node and Edge runtimes.

export const AUTH_COOKIE = 'lifeos_auth';

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
