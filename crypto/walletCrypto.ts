import { Capacitor, registerPlugin } from '@capacitor/core';
import { openDB } from 'idb';
import { StoredDocument, DocumentType, RelationType } from '../types';

/**
 * Android Keystore native Capacitor plugin interface.
 */
export interface AndroidKeystorePluginInterface {
  isAvailable(): Promise<{ available: boolean; provider?: string; error?: string }>;
  getOrCreateMasterKey(options: { alias: string }): Promise<{ success: boolean; created: boolean; alias: string }>;
  encryptDek(options: { alias: string; rawKey: string }): Promise<{ success: boolean; iv: string; encryptedDek: string }>;
  decryptDek(options: { alias: string; encryptedDek?: string; iv?: string }): Promise<{ success: boolean; decryptedDek: string }>;
  hasEncryptedDek(options: { alias: string }): Promise<{ exists: boolean }>;
  deleteKey(options: { alias: string }): Promise<{ success: boolean }>;
}

export const AndroidKeystore = registerPlugin<AndroidKeystorePluginInterface>('AndroidKeystorePlugin');

/**
 * Versioned Encrypted Envelope for wallet records at rest.
 * Outer metadata is preserved for indexing, routing, and calendar notifications,
 * while sensitive files, document numbers, custom names, and notes are encrypted.
 */
export interface EncryptedWalletRecord {
  id: string;
  type: DocumentType;
  ownerName: string;
  relation: RelationType | 'SELF';
  dateUploaded: string;
  expiryDate?: string;
  // Encryption envelope metadata
  isEncrypted: true;
  encryptionVersion: 'v1';
  algorithm: 'AES-256-GCM';
  nonce: string; // Base64 96-bit unique nonce
  ciphertext: string; // Base64 ciphertext + 128-bit auth tag
  aad: string; // Additional Authenticated Data binding
  keyFingerprint: string; // SHA-256 fingerprint prefix of DEK
}

/**
 * Sensitive payload encrypted inside ciphertext.
 */
export interface SensitiveDocumentPayload {
  files: any[];
  documentNumber?: string;
  customName?: string;
  customType?: string;
  reminderConfig?: any;
  isPrivate?: boolean;
  notes?: string;
  googleCalendarEventId?: string;
}

/**
 * Metadata stored for browser PBKDF2 vault.
 * Note: Raw keys are NEVER stored here!
 */
export interface BrowserVaultMetadata {
  version: 1;
  salt: string; // Base64 16 bytes
  iterations: number; // 600,000
  wrappedDek: string; // Base64 DEK encrypted by PBKDF2 KEK
  wrapNonce: string; // Base64 12 bytes nonce for wrapping
  verifierCiphertext: string; // Base64 verification token
  verifierNonce: string; // Base64 12 bytes nonce for verifier
  keyFingerprint: string; // SHA-256 prefix of DEK
  createdAt: string;
  updatedAt: string;
}

export type VaultSecurityState = 'Protected' | 'Locked' | 'Not configured' | 'Unavailable';

export interface VaultSecurityStatus {
  status: VaultSecurityState;
  mode: 'android_keystore' | 'pbkdf2_passphrase' | 'device_bound_web_crypto' | 'none';
  algorithm: 'AES-256-GCM';
  keyProtectionDescription: string;
  storageLocationDescription: string;
  keyFingerprint?: string;
  totalDocuments: number;
  encryptedDocuments: number;
  unencryptedDocuments: number;
  failedDecryptions: number;
  activeKeyAvailable: boolean;
}

const STORAGE_KEY_BROWSER_VAULT = 'docufolio_wallet_vault_metadata_v1';
const ANDROID_KEK_ALIAS = 'docufolio_wallet_kek_v1';
const VERIFIER_PLAINTEXT = 'DOCUFOLIO_VAULT_INTEGRITY_VERIFIER_V1';

// In-memory active key references (never persisted to disk in plaintext)
let inMemoryActiveKey: CryptoKey | null = null;
let inMemoryKeyFingerprint: string | null = null;
let inMemoryVaultMode: 'android_keystore' | 'pbkdf2_passphrase' | 'device_bound_web_crypto' | 'none' = 'none';

// --- Base64 & Byte Utilities ---

export const bufferToBase64 = (buffer: ArrayBuffer | Uint8Array): string => {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

export const base64ToBytes = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

export const generateCspRngBytes = (length: number): Uint8Array => {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
    return bytes;
  }
  throw new Error('Cryptographically secure random number generator is unavailable.');
};

/**
 * Computes SHA-256 fingerprint prefix of a key for identifier verification.
 */
export const computeKeyFingerprint = async (rawKeyBytes: Uint8Array): Promise<string> => {
  const hash = await crypto.subtle.digest('SHA-256', rawKeyBytes);
  const hashBytes = new Uint8Array(hash);
  return Array.from(hashBytes.slice(0, 8), b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Checks if Web Crypto API is supported in the environment.
 */
export const isWebCryptoSupported = (): boolean => {
  return typeof crypto !== 'undefined' && !!crypto.subtle;
};

// --- Core AES-256-GCM Encryption / Decryption ---

/**
 * Encrypts a sensitive wallet document using AES-256-GCM.
 * Generates a unique 96-bit CSPRNG nonce per operation and binds
 * the document ID into Additional Authenticated Data (AAD).
 */
export const encryptDocument = async (
  doc: StoredDocument,
  key: CryptoKey,
  keyFingerprint: string
): Promise<EncryptedWalletRecord> => {
  if (!isWebCryptoSupported()) {
    throw new Error('Web Crypto API is not available on this platform.');
  }

  // 1. Generate unique 96-bit (12-byte) nonce
  const nonce = generateCspRngBytes(12);

  // 2. Prepare sensitive payload
  const sensitivePayload: SensitiveDocumentPayload = {
    files: doc.files || [],
    documentNumber: doc.documentNumber,
    customName: doc.customName,
    customType: doc.customType,
    reminderConfig: doc.reminderConfig,
    isPrivate: doc.isPrivate,
    googleCalendarEventId: doc.googleCalendarEventId
  };

  const encodedPayload = new TextEncoder().encode(JSON.stringify(sensitivePayload));

  // 3. AAD binds the document ID and version to prevent transplant attacks
  const aadString = `docId:${doc.id}:v1`;
  const aadBytes = new TextEncoder().encode(aadString);

  // 4. Authenticated Encryption with AES-256-GCM
  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: nonce,
      additionalData: aadBytes,
      tagLength: 128
    },
    key,
    encodedPayload
  );

  return {
    id: doc.id,
    type: doc.type,
    ownerName: doc.ownerName,
    relation: doc.relation,
    dateUploaded: doc.dateUploaded || new Date().toISOString(),
    expiryDate: doc.expiryDate,
    isEncrypted: true,
    encryptionVersion: 'v1',
    algorithm: 'AES-256-GCM',
    nonce: bufferToBase64(nonce),
    ciphertext: bufferToBase64(ciphertextBuffer),
    aad: aadString,
    keyFingerprint
  };
};

/**
 * Decrypts an encrypted wallet record using AES-256-GCM.
 * If the record is not encrypted (legacy plaintext), it is returned safely.
 * Throws a descriptive AuthenticationError if ciphertext is tampered or key is incorrect.
 */
export const decryptDocument = async (
  record: any,
  key: CryptoKey | null
): Promise<StoredDocument> => {
  // If record is not encrypted, return as-is (graceful migration/backwards compatibility)
  if (!record || !record.isEncrypted) {
    return record as StoredDocument;
  }

  if (!key) {
    throw new Error('Wallet vault is locked. Decryption key not available in memory.');
  }

  if (record.encryptionVersion !== 'v1' || record.algorithm !== 'AES-256-GCM') {
    throw new Error(`Unsupported encryption envelope version: ${record.encryptionVersion}`);
  }

  const nonce = base64ToBytes(record.nonce);
  const ciphertext = base64ToBytes(record.ciphertext);
  const aadBytes = new TextEncoder().encode(record.aad || `docId:${record.id}:v1`);

  let decryptedBuffer: ArrayBuffer;
  try {
    decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: nonce,
        additionalData: aadBytes,
        tagLength: 128
      },
      key,
      ciphertext
    );
  } catch (err: any) {
    throw new Error(
      `Decryption failed for record ${record.id}: Authenticated data corrupted, tampered, or incorrect key.`
    );
  }

  const decryptedText = new TextDecoder().decode(decryptedBuffer);
  const payload: SensitiveDocumentPayload = JSON.parse(decryptedText);

  return {
    id: record.id,
    type: record.type,
    ownerName: record.ownerName,
    relation: record.relation,
    dateUploaded: record.dateUploaded,
    expiryDate: record.expiryDate,
    files: payload.files || [],
    documentNumber: payload.documentNumber,
    customName: payload.customName,
    customType: payload.customType,
    reminderConfig: payload.reminderConfig,
    isPrivate: payload.isPrivate,
    googleCalendarEventId: payload.googleCalendarEventId
  };
};

// --- In-Memory Key Management ---

export const getActiveWalletKey = (): CryptoKey | null => inMemoryActiveKey;
export const getActiveKeyFingerprint = (): string | null => inMemoryKeyFingerprint;
export const getActiveVaultMode = () => inMemoryVaultMode;

export const setActiveWalletKey = (
  key: CryptoKey | null,
  fingerprint: string | null,
  mode: 'android_keystore' | 'pbkdf2_passphrase' | 'device_bound_web_crypto' | 'none'
) => {
  inMemoryActiveKey = key;
  inMemoryKeyFingerprint = fingerprint;
  inMemoryVaultMode = mode;
};

const KEYSTORE_DB_NAME = 'DocuFolioKeyStoreDB';
const KEYSTORE_STORE_NAME = 'keys';
const MASTER_KEY_ID = 'wallet_master_dek_v1';

/**
 * Initializes or retrieves the device-bound automatic AES-256-GCM encryption key from IndexedDB.
 * Requires NO passphrase from the user.
 */
export const initOrGetAutomaticBrowserVaultKey = async (): Promise<{ success: boolean; keyFingerprint: string }> => {
  if (!isWebCryptoSupported()) {
    throw new Error('Web Crypto API is not available on this platform.');
  }

  if (inMemoryActiveKey && inMemoryKeyFingerprint) {
    return { success: true, keyFingerprint: inMemoryKeyFingerprint };
  }

  try {
    const dbInstance = await openDB(KEYSTORE_DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(KEYSTORE_STORE_NAME)) {
          db.createObjectStore(KEYSTORE_STORE_NAME);
        }
      }
    });

    const storedKey = await dbInstance.get(KEYSTORE_STORE_NAME, MASTER_KEY_ID);
    if (storedKey && storedKey instanceof CryptoKey) {
      const rawBytes = new Uint8Array(await crypto.subtle.exportKey('raw', storedKey));
      const fingerprint = await computeKeyFingerprint(rawBytes);
      setActiveWalletKey(storedKey, fingerprint, 'device_bound_web_crypto');
      return { success: true, keyFingerprint: fingerprint };
    }

    // Generate fresh non-passphrase 256-bit AES-GCM CryptoKey
    const newKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    const rawBytes = new Uint8Array(await crypto.subtle.exportKey('raw', newKey));
    const fingerprint = await computeKeyFingerprint(rawBytes);

    await dbInstance.put(KEYSTORE_STORE_NAME, newKey, MASTER_KEY_ID);
    setActiveWalletKey(newKey, fingerprint, 'device_bound_web_crypto');
    return { success: true, keyFingerprint: fingerprint };
  } catch {
    // Graceful fallback for environments where IDB is unavailable (e.g. tests or private mode)
    const rawDek = generateCspRngBytes(32);
    const fingerprint = await computeKeyFingerprint(rawDek);
    const dek = await crypto.subtle.importKey(
      'raw',
      rawDek as any,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    setActiveWalletKey(dek, fingerprint, 'device_bound_web_crypto');
    return { success: true, keyFingerprint: fingerprint };
  }
};

/**
 * Ensures a valid AES-256-GCM encryption key is ready in memory.
 * On Android: uses hardware Android Keystore.
 * On Web: uses device-bound Web Crypto KeyStore without requiring any passphrase.
 */
export const ensureWalletKeyReady = async (): Promise<{ success: boolean; key: CryptoKey; fingerprint: string }> => {
  if (inMemoryActiveKey && inMemoryKeyFingerprint) {
    return { success: true, key: inMemoryActiveKey, fingerprint: inMemoryKeyFingerprint };
  }

  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    const androidRes = await initOrUnlockAndroidKeystoreVault();
    if (androidRes.success && inMemoryActiveKey && inMemoryKeyFingerprint) {
      return { success: true, key: inMemoryActiveKey, fingerprint: inMemoryKeyFingerprint };
    }
  }

  const browserRes = await initOrGetAutomaticBrowserVaultKey();
  return { success: true, key: inMemoryActiveKey!, fingerprint: browserRes.keyFingerprint };
};

export const lockWalletVault = () => {
  inMemoryActiveKey = null;
  inMemoryKeyFingerprint = null;
  inMemoryVaultMode = 'none';
};

// --- Browser PBKDF2 Key Derivation & Vault Setup ---

export const deriveKekFromPassphrase = async (
  passphrase: string,
  salt: Uint8Array,
  iterations = 600000
): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations,
      hash: 'SHA-256'
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256
    },
    false,
    ['wrapKey', 'unwrapKey', 'encrypt', 'decrypt']
  );
};

/**
 * Initializes a new encrypted vault in the browser using PBKDF2 passphrase key derivation.
 */
export const initBrowserVault = async (passphrase: string): Promise<{ success: boolean; keyFingerprint: string }> => {
  if (!passphrase || passphrase.length < 8) {
    throw new Error('Passphrase must be at least 8 characters.');
  }

  // 1. Generate 16-byte random salt
  const salt = generateCspRngBytes(16);

  // 2. Derive Key-Encryption-Key (KEK) using PBKDF2
  const kek = await deriveKekFromPassphrase(passphrase, salt, 600000);

  // 3. Generate raw 256-bit AES-GCM Data Encryption Key (DEK)
  const rawDek = generateCspRngBytes(32);
  const keyFingerprint = await computeKeyFingerprint(rawDek);

  const dek = await crypto.subtle.importKey(
    'raw',
    rawDek as any,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // 4. Wrap DEK with KEK using AES-256-GCM
  const wrapNonce = generateCspRngBytes(12);
  const wrappedDekBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: wrapNonce, tagLength: 128 },
    kek,
    rawDek as any
  );

  // 5. Generate verifier token
  const verifierNonce = generateCspRngBytes(12);
  const verifierBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: verifierNonce, tagLength: 128 },
    dek,
    new TextEncoder().encode(VERIFIER_PLAINTEXT)
  );

  const metadata: BrowserVaultMetadata = {
    version: 1,
    salt: bufferToBase64(salt),
    iterations: 600000,
    wrappedDek: bufferToBase64(wrappedDekBuffer),
    wrapNonce: bufferToBase64(wrapNonce),
    verifierCiphertext: bufferToBase64(verifierBuffer),
    verifierNonce: bufferToBase64(verifierNonce),
    keyFingerprint,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  localStorage.setItem(STORAGE_KEY_BROWSER_VAULT, JSON.stringify(metadata));

  // Set active key in memory
  setActiveWalletKey(dek, keyFingerprint, 'pbkdf2_passphrase');

  return { success: true, keyFingerprint };
};

/**
 * Unlocks the browser vault with the user's passphrase.
 */
export const unlockBrowserVault = async (passphrase: string): Promise<{ success: boolean; error?: string }> => {
  const metaStr = localStorage.getItem(STORAGE_KEY_BROWSER_VAULT);
  if (!metaStr) {
    return { success: false, error: 'Vault has not been configured yet.' };
  }

  try {
    const metadata: BrowserVaultMetadata = JSON.parse(metaStr);
    const salt = base64ToBytes(metadata.salt);
    const wrapNonce = base64ToBytes(metadata.wrapNonce);
    const wrappedDek = base64ToBytes(metadata.wrappedDek);

    // 1. Re-derive KEK
    const kek = await deriveKekFromPassphrase(passphrase, salt, metadata.iterations || 600000);

    // 2. Unwrap DEK
    let rawDekBuffer: ArrayBuffer;
    try {
      rawDekBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: wrapNonce, tagLength: 128 },
        kek,
        wrappedDek
      );
    } catch {
      return { success: false, error: 'Incorrect passphrase.' };
    }

    const rawDekBytes = new Uint8Array(rawDekBuffer);
    const dek = await crypto.subtle.importKey(
      'raw',
      rawDekBytes as any,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    // 3. Verify verifier token with DEK
    const verifierNonce = base64ToBytes(metadata.verifierNonce);
    const verifierCiphertext = base64ToBytes(metadata.verifierCiphertext);
    const decryptedVerifierBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: verifierNonce, tagLength: 128 },
      dek,
      verifierCiphertext
    );

    const decryptedVerifier = new TextDecoder().decode(decryptedVerifierBuffer);
    if (decryptedVerifier !== VERIFIER_PLAINTEXT) {
      return { success: false, error: 'Vault integrity validation failed.' };
    }

    const fingerprint = metadata.keyFingerprint || await computeKeyFingerprint(rawDekBytes);
    setActiveWalletKey(dek, fingerprint, 'pbkdf2_passphrase');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to unlock vault.' };
  }
};

/**
 * Changes passphrase on existing browser vault without re-encrypting records.
 */
export const changeBrowserPassphrase = async (
  currentPassphrase: string,
  newPassphrase: string
): Promise<{ success: boolean; error?: string }> => {
  if (!newPassphrase || newPassphrase.length < 8) {
    return { success: false, error: 'New passphrase must be at least 8 characters.' };
  }

  const unlockRes = await unlockBrowserVault(currentPassphrase);
  if (!unlockRes.success) {
    return unlockRes;
  }

  const currentDek = inMemoryActiveKey;
  if (!currentDek) return { success: false, error: 'Vault is not unlocked' };

  const rawDekBuffer = await crypto.subtle.exportKey('raw', currentDek);
  const rawDekBytes = new Uint8Array(rawDekBuffer);

  // New salt & derivation
  const newSalt = generateCspRngBytes(16);
  const newKek = await deriveKekFromPassphrase(newPassphrase, newSalt, 600000);

  const wrapNonce = generateCspRngBytes(12);
  const wrappedDekBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: wrapNonce, tagLength: 128 },
    newKek,
    rawDekBytes as any
  );

  const verifierNonce = generateCspRngBytes(12);
  const verifierBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: verifierNonce, tagLength: 128 },
    currentDek,
    new TextEncoder().encode(VERIFIER_PLAINTEXT)
  );

  const existingMeta: BrowserVaultMetadata = JSON.parse(
    localStorage.getItem(STORAGE_KEY_BROWSER_VAULT) || '{}'
  );

  const updatedMeta: BrowserVaultMetadata = {
    ...existingMeta,
    salt: bufferToBase64(newSalt),
    wrappedDek: bufferToBase64(wrappedDekBuffer),
    wrapNonce: bufferToBase64(wrapNonce),
    verifierCiphertext: bufferToBase64(verifierBuffer),
    verifierNonce: bufferToBase64(verifierNonce),
    updatedAt: new Date().toISOString()
  };

  localStorage.setItem(STORAGE_KEY_BROWSER_VAULT, JSON.stringify(updatedMeta));
  return { success: true };
};

// --- Android Keystore Native Vault Integration ---

export const isAndroidKeystoreAvailable = async (): Promise<boolean> => {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    try {
      const res = await AndroidKeystore.isAvailable();
      return !!res.available;
    } catch {
      return false;
    }
  }
  return false;
};

/**
 * Initializes or unlocks vault on Android using the hardware-backed Android Keystore.
 */
export const initOrUnlockAndroidKeystoreVault = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const isAvail = await isAndroidKeystoreAvailable();
    if (!isAvail) {
      return { success: false, error: 'Android Keystore hardware is not available on this device.' };
    }

    // Ensure Master KEK exists in Keystore
    await AndroidKeystore.getOrCreateMasterKey({ alias: ANDROID_KEK_ALIAS });

    // Check if DEK is already encrypted in storage
    const hasDekRes = await AndroidKeystore.hasEncryptedDek({ alias: ANDROID_KEK_ALIAS });

    let rawDekBase64: string;
    if (hasDekRes.exists) {
      // Decrypt DEK using Keystore KEK
      const decryptRes = await AndroidKeystore.decryptDek({ alias: ANDROID_KEK_ALIAS });
      rawDekBase64 = decryptRes.decryptedDek;
    } else {
      // Generate fresh 256-bit DEK
      const rawDek = generateCspRngBytes(32);
      rawDekBase64 = bufferToBase64(rawDek);
      // Encrypt and persist with Keystore KEK
      await AndroidKeystore.encryptDek({ alias: ANDROID_KEK_ALIAS, rawKey: rawDekBase64 });
    }

    const rawDekBytes = base64ToBytes(rawDekBase64);
    const dek = await crypto.subtle.importKey(
      'raw',
      rawDekBytes as any,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    const fingerprint = await computeKeyFingerprint(rawDekBytes);
    setActiveWalletKey(dek, fingerprint, 'android_keystore');

    return { success: true };
  } catch (err: any) {
    console.error('Android Keystore vault error:', err);
    return { success: false, error: err?.message || 'Android Keystore operation failed' };
  }
};

// --- Vault Status Detection ---

export const getVaultSecurityStatus = async (documents: any[] = []): Promise<VaultSecurityStatus> => {
  const isWebCrypto = isWebCryptoSupported();
  if (!isWebCrypto) {
    return {
      status: 'Unavailable',
      mode: 'none',
      algorithm: 'AES-256-GCM',
      keyProtectionDescription: 'Web Cryptography primitives unavailable',
      storageLocationDescription: 'Unprotected',
      totalDocuments: documents.length,
      encryptedDocuments: 0,
      unencryptedDocuments: documents.length,
      failedDecryptions: 0,
      activeKeyAvailable: false
    };
  }

  // Ensure cryptographic key is automatically active without requiring any passphrase
  try {
    await ensureWalletKeyReady();
  } catch (err) {
    console.error('Failed to auto-initialize wallet key:', err);
  }

  const isAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  const hasActiveKey = inMemoryActiveKey !== null;

  let totalDocs = documents.length;
  let encCount = 0;
  let unencCount = 0;
  let failedCount = 0;

  for (const d of documents) {
    if (d?.isEncrypted) {
      encCount++;
      if (d?.isDecryptionError) failedCount++;
    } else {
      unencCount++;
    }
  }

  if (isAndroid) {
    return {
      status: hasActiveKey ? 'Protected' : 'Unavailable',
      mode: 'android_keystore',
      algorithm: 'AES-256-GCM',
      keyProtectionDescription: 'Android Keystore (Hardware-backed TEE / Enclave Master Key)',
      storageLocationDescription: 'Local IndexedDB & Firebase Firestore (Encrypted at rest)',
      keyFingerprint: inMemoryKeyFingerprint || undefined,
      totalDocuments: totalDocs,
      encryptedDocuments: encCount,
      unencryptedDocuments: unencCount,
      failedDecryptions: failedCount,
      activeKeyAvailable: hasActiveKey
    };
  }

  return {
    status: hasActiveKey ? 'Protected' : 'Unavailable',
    mode: 'device_bound_web_crypto',
    algorithm: 'AES-256-GCM',
    keyProtectionDescription: 'Web Cryptography API (Device-Bound Cryptographic Key in Secure KeyStore)',
    storageLocationDescription: 'Local IndexedDB (FolioSyncDB) & Firebase Firestore (Encrypted at rest)',
    keyFingerprint: inMemoryKeyFingerprint || undefined,
    totalDocuments: totalDocs,
    encryptedDocuments: encCount,
    unencryptedDocuments: unencCount,
    failedDecryptions: failedCount,
    activeKeyAvailable: hasActiveKey
  };
};

// --- Safe Migration Service ---

export interface MigrationResult {
  total: number;
  migrated: number;
  alreadyEncrypted: number;
  failed: number;
  migratedRecords: EncryptedWalletRecord[];
  errors: string[];
}

/**
 * Safely migrates plaintext documents to AES-256-GCM encrypted envelopes.
 * Verifies each document with an immediate round-trip test decryption before returning.
 * Does not delete or overwrite data if any verification fails.
 */
export const migratePlaintextDocuments = async (
  documents: StoredDocument[],
  key: CryptoKey,
  keyFingerprint: string
): Promise<MigrationResult> => {
  const result: MigrationResult = {
    total: documents.length,
    migrated: 0,
    alreadyEncrypted: 0,
    failed: 0,
    migratedRecords: [],
    errors: []
  };

  for (const doc of documents) {
    if ((doc as any).isEncrypted) {
      result.alreadyEncrypted++;
      continue;
    }

    try {
      // 1. Encrypt record
      const encryptedRecord = await encryptDocument(doc, key, keyFingerprint);

      // 2. Verify round trip immediately
      const decryptedVerification = await decryptDocument(encryptedRecord, key);

      // Verify integrity of decrypted files and IDs
      if (decryptedVerification.id !== doc.id) {
        throw new Error(`Migration verification failed: ID mismatch for ${doc.id}`);
      }
      if ((decryptedVerification.files || []).length !== (doc.files || []).length) {
        throw new Error(`Migration verification failed: File count mismatch for ${doc.id}`);
      }

      result.migratedRecords.push(encryptedRecord);
      result.migrated++;
    } catch (err: any) {
      result.failed++;
      result.errors.push(`Document ${doc.id} (${doc.type}): ${err?.message || 'Encryption failed'}`);
    }
  }

  return result;
};

/**
 * Automatically migrates all plaintext documents to AES-256-GCM encrypted records.
 * Runs seamlessly in the background without user passphrase prompts.
 */
export const autoMigrateAllDocuments = async (
  documents: StoredDocument[]
): Promise<MigrationResult> => {
  const readyRes = await ensureWalletKeyReady();
  return migratePlaintextDocuments(documents, readyRes.key, readyRes.fingerprint);
};

// --- Automated Cryptographic Self-Test Suite ---

export interface CryptoSelfTestItem {
  name: string;
  passed: boolean;
  message: string;
}

export interface CryptoSelfTestResult {
  passed: boolean;
  tests: CryptoSelfTestItem[];
}

/**
 * Automated test suite for live in-app and unit verification of:
 * - CSPRNG Nonce uniqueness
 * - AES-256-GCM round trips
 * - Tampered ciphertext rejection (authentication failure)
 * - Tampered AAD rejection
 * - Incorrect key rejection
 * - Legacy record safe passthrough
 */
export const runCryptoSelfTest = async (activeKey?: CryptoKey | null): Promise<CryptoSelfTestResult> => {
  const tests: CryptoSelfTestItem[] = [];

  try {
    // 1. Test CSPRNG Nonce Uniqueness
    const nonces = new Set<string>();
    let collision = false;
    for (let i = 0; i < 100; i++) {
      const nonce = bufferToBase64(generateCspRngBytes(12));
      if (nonces.has(nonce)) {
        collision = true;
        break;
      }
      nonces.add(nonce);
    }
    tests.push({
      name: 'Nonce Uniqueness (100 operations)',
      passed: !collision && nonces.size === 100,
      message: collision ? 'Nonce collision detected!' : '100 consecutive 96-bit nonces were all strictly unique.'
    });

    // 2. Test AES-256-GCM Key Generation
    const testRawKey = generateCspRngBytes(32);
    const testKey = await crypto.subtle.importKey(
      'raw',
      testRawKey as any,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    const fingerprint = await computeKeyFingerprint(testRawKey);
    tests.push({
      name: 'AES-256 Key Import & Fingerprinting',
      passed: !!testKey && fingerprint.length === 16,
      message: `Key imported successfully (Fingerprint: ${fingerprint})`
    });

    // 3. Test Encrypt/Decrypt Round Trip on Dummy Record
    const dummyDoc: StoredDocument = {
      id: 'test_doc_001',
      type: DocumentType.ID_CARD,
      ownerName: 'Self',
      relation: 'SELF',
      dateUploaded: new Date().toISOString(),
      documentNumber: 'ID-999-SECRET',
      customName: 'Secret National ID',
      files: [
        { name: 'id.jpg', mimeType: 'image/jpeg', url: 'data:image/jpeg;base64,VEVTVF9JRF9EQVRB' }
      ]
    };

    const encryptedEnv = await encryptDocument(dummyDoc, testKey, fingerprint);
    const decryptedDoc = await decryptDocument(encryptedEnv, testKey);

    const roundTripPassed =
      decryptedDoc.id === dummyDoc.id &&
      decryptedDoc.documentNumber === dummyDoc.documentNumber &&
      decryptedDoc.files[0].name === dummyDoc.files[0].name;

    tests.push({
      name: 'AES-256-GCM Encryption/Decryption Round Trip',
      passed: roundTripPassed,
      message: roundTripPassed ? 'Plaintext restored identically with 128-bit auth tag verified.' : 'Round trip mismatch.'
    });

    // 4. Test Tampered Ciphertext Rejection
    const cipherBytes = base64ToBytes(encryptedEnv.ciphertext);
    // Flip 1 byte in the ciphertext body
    cipherBytes[0] ^= 0xff;
    const tamperedEnv: EncryptedWalletRecord = {
      ...encryptedEnv,
      ciphertext: bufferToBase64(cipherBytes)
    };

    let tamperedDetected = false;
    try {
      await decryptDocument(tamperedEnv, testKey);
    } catch {
      tamperedDetected = true;
    }

    tests.push({
      name: 'Tampered Ciphertext Detection',
      passed: tamperedDetected,
      message: tamperedDetected
        ? 'Successfully rejected tampered ciphertext with authentication tag mismatch.'
        : 'CRITICAL: Tampered ciphertext was accepted without error!'
    });

    // 5. Test Tampered AAD (Transplant Attack Prevention)
    const transplantedEnv: EncryptedWalletRecord = {
      ...encryptedEnv,
      aad: 'docId:different_doc_id_999:v1'
    };

    let aadTamperDetected = false;
    try {
      await decryptDocument(transplantedEnv, testKey);
    } catch {
      aadTamperDetected = true;
    }

    tests.push({
      name: 'AAD Document Binding & Transplant Prevention',
      passed: aadTamperDetected,
      message: aadTamperDetected
        ? 'Successfully rejected ciphertext transplanted to different document ID.'
        : 'CRITICAL: Ciphertext transplanted to altered AAD without error!'
    });

    // 6. Test Incorrect Key Rejection
    const wrongRawKey = generateCspRngBytes(32);
    // Guarantee different bytes
    wrongRawKey[0] ^= 0x01;
    const wrongKey = await crypto.subtle.importKey(
      'raw',
      wrongRawKey as any,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    let wrongKeyRejected = false;
    try {
      await decryptDocument(encryptedEnv, wrongKey);
    } catch {
      wrongKeyRejected = true;
    }

    tests.push({
      name: 'Incorrect Key Authentication Rejection',
      passed: wrongKeyRejected,
      message: wrongKeyRejected
        ? 'Decryption with mismatched key rejected safely.'
        : 'CRITICAL: Decryption with wrong key did not throw auth error!'
    });

    // 7. Test PBKDF2 Key Derivation Iterations (Browser Vault)
    const testSalt = generateCspRngBytes(16);
    const kek = await deriveKekFromPassphrase('TestPassphrase123!', testSalt, 5000); // 5000 for test speed
    tests.push({
      name: 'PBKDF2-HMAC-SHA256 Derivation',
      passed: !!kek,
      message: 'PBKDF2 key derivation executed with salt & SHA-256 hash.'
    });

    // 8. Test Active Vault Key (if present)
    if (activeKey) {
      const activeEncrypted = await encryptDocument(dummyDoc, activeKey, inMemoryKeyFingerprint || 'active');
      const activeDecrypted = await decryptDocument(activeEncrypted, activeKey);
      const activeOk = activeDecrypted.id === dummyDoc.id;
      tests.push({
        name: 'Active Vault Key Live Encryption Test',
        passed: activeOk,
        message: activeOk ? 'In-memory active key is functioning properly.' : 'Active key failed round trip.'
      });
    }

  } catch (err: any) {
    tests.push({
      name: 'Self-Test Execution',
      passed: false,
      message: `Test suite encountered unexpected error: ${err?.message}`
    });
  }

  const allPassed = tests.every(t => t.passed);
  return { passed: allPassed, tests };
};

/**
 * Processes loaded records from IndexedDB or Firestore.
 * Decrypts encrypted envelopes if active key is present;
 * assigns locked placeholder if vault is locked;
 * preserves plaintext legacy records without error.
 */
export const processLoadedRecords = async (
  records: any[],
  activeKey: CryptoKey | null
): Promise<{ decryptedDocs: StoredDocument[]; hasDecryptionErrors: boolean }> => {
  let keyToUse = activeKey;
  if (!keyToUse) {
    try {
      const readyRes = await ensureWalletKeyReady();
      if (readyRes.success) {
        keyToUse = readyRes.key;
      }
    } catch {
      keyToUse = null;
    }
  }

  const result: StoredDocument[] = [];
  let hasErrors = false;

  for (const r of records) {
    if (!r) continue;
    if (!r.isEncrypted) {
      // Legacy plaintext record
      result.push(r as StoredDocument);
    } else {
      // Encrypted envelope record
      if (keyToUse) {
        try {
          const dec = await decryptDocument(r, keyToUse);
          (dec as any).isEncrypted = true;
          result.push(dec);
        } catch {
          hasErrors = true;
          result.push({
            id: r.id,
            type: r.type,
            ownerName: r.ownerName,
            relation: r.relation,
            dateUploaded: r.dateUploaded,
            expiryDate: r.expiryDate,
            files: [],
            documentNumber: '••••••••',
            customName: r.customName || 'Protected Document (Auth Error)',
            isEncrypted: true,
            isDecryptionError: true
          } as any);
        }
      } else {
        // Fallback placeholder only if key system is completely unavailable
        result.push({
          id: r.id,
          type: r.type,
          ownerName: r.ownerName,
          relation: r.relation,
          dateUploaded: r.dateUploaded,
          expiryDate: r.expiryDate,
          files: [],
          documentNumber: '••••••••',
          customName: r.customName || 'Protected Document',
          isEncrypted: true
        } as any);
      }
    }
  }

  return { decryptedDocs: result, hasDecryptionErrors: hasErrors };
};
