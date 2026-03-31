import crypto from "crypto";

/**
 * Legacy `Fireblocks-Signature` header: RSA-SHA512 over the raw body (base64 digest).
 */
export function verifyFireblocksWebhookLegacySignature(
  body: string,
  signatureBase64: string,
  publicKeyPem: string,
): boolean {
  try {
    const verifier = crypto.createVerify("RSA-SHA512");
    verifier.update(body);
    return verifier.verify(publicKeyPem, signatureBase64, "base64");
  } catch {
    return false;
  }
}
