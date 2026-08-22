const crypto = require('crypto');

// Generate a random 32-byte key for AES-256 if not provided in ENV.
// In a real app, you MUST store this securely in .env and never change it.
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16; // For AES, this is always 16

function encrypt(text) {
  if (!text) return text;
  // If it's already a hex string that looks like our encryption format (iv:content), skip (basic check)
  if (text.includes(':') && text.length > 32) {
      const parts = text.split(':');
      if (parts.length === 2 && parts[0].length === 32) return text;
  }
  
  let key = Buffer.from(ENCRYPTION_KEY, 'hex');
  // fallback if key isn't exactly 32 bytes (64 hex chars)
  if (key.length !== 32) {
      key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  if (!text) return text;
  if (!text.includes(':')) return text; // Probably not encrypted, return as is (legacy support)

  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    
    let key = Buffer.from(ENCRYPTION_KEY, 'hex');
    if (key.length !== 32) {
        key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    }
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    // If decryption fails, it might be legacy unencrypted text that coincidentally had a colon
    return text;
  }
}

module.exports = { encrypt, decrypt };
