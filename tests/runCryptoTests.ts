import {
  encryptDocument,
  decryptDocument,
  generateCspRngBytes,
  computeKeyFingerprint,
  deriveKekFromPassphrase,
  runCryptoSelfTest,
  migratePlaintextDocuments,
  EncryptedWalletRecord
} from '../crypto/walletCrypto';
import { StoredDocument, DocumentType } from '../types';

async function runAllTests() {
  console.log('====================================================');
  console.log(' Running Digital-DocuFolio Cryptographic Test Suite ');
  console.log(' Algorithm: AES-256-GCM | Key Derivation: PBKDF2    ');
  console.log('====================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName} ${detail ? `(${detail})` : ''}`);
      passedCount++;
    } else {
      console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failedCount++;
    }
  }

  // Test 1: Nonce Uniqueness across consecutive encryptions
  console.log('[1/6] Testing CSPRNG Nonce Uniqueness...');
  const testKeyRaw = generateCspRngBytes(32);
  const testKey = await crypto.subtle.importKey(
    'raw',
    testKeyRaw as any,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const fingerprint = await computeKeyFingerprint(testKeyRaw);

  const dummyDoc: StoredDocument = {
    id: 'test_doc_alpha',
    type: DocumentType.PASSPORT,
    ownerName: 'Test User',
    relation: 'SELF',
    dateUploaded: new Date().toISOString(),
    documentNumber: 'KE-P12345678',
    customName: 'Official Passport',
    files: [
      { name: 'passport.png', mimeType: 'image/png', url: 'data:image/png;base64,ZmFrZV9wYXNzcG9ydA==' }
    ]
  };

  const enc1 = await encryptDocument(dummyDoc, testKey, fingerprint);
  const enc2 = await encryptDocument(dummyDoc, testKey, fingerprint);
  const enc3 = await encryptDocument(dummyDoc, testKey, fingerprint);

  assert(enc1.nonce !== enc2.nonce, 'Consecutive Nonces #1 and #2 are unique');
  assert(enc2.nonce !== enc3.nonce, 'Consecutive Nonces #2 and #3 are unique');
  assert(enc1.ciphertext !== enc2.ciphertext, 'Ciphertexts differ due to unique nonces');

  // Test 2: Round-Trip Encryption and Decryption
  console.log('\n[2/6] Testing AES-256-GCM Round-Trip Integrity...');
  const decrypted1 = await decryptDocument(enc1, testKey);
  assert(decrypted1.id === dummyDoc.id, 'Decrypted Document ID matches');
  assert(decrypted1.documentNumber === dummyDoc.documentNumber, 'Decrypted Document Number matches');
  assert(decrypted1.files.length === 1, 'Decrypted File array length matches');
  assert(decrypted1.files[0].url === dummyDoc.files[0].url, 'Decrypted File Base64 data matches exactly');

  // Test 3: Tampered Ciphertext Rejection
  console.log('\n[3/6] Testing Tampered Ciphertext & Auth Tag Verification...');
  const ciphertextBytes = Buffer.from(enc1.ciphertext, 'base64');
  ciphertextBytes[5] ^= 0x42; // Corrupt single byte
  const tamperedEnv: EncryptedWalletRecord = {
    ...enc1,
    ciphertext: ciphertextBytes.toString('base64')
  };

  let caughtTamper = false;
  try {
    await decryptDocument(tamperedEnv, testKey);
  } catch (err: any) {
    caughtTamper = true;
  }
  assert(caughtTamper, 'Tampered ciphertext rejected by AES-GCM 128-bit authentication tag');

  // Test 4: Tampered AAD / Transplant Rejection
  console.log('\n[4/6] Testing Additional Authenticated Data (AAD) Binding...');
  const transplantedEnv: EncryptedWalletRecord = {
    ...enc1,
    aad: 'docId:attacker_transplanted_id:v1'
  };

  let caughtAadTamper = false;
  try {
    await decryptDocument(transplantedEnv, testKey);
  } catch {
    caughtAadTamper = true;
  }
  assert(caughtAadTamper, 'Transplanted ciphertext with altered AAD rejected');

  // Test 5: Incorrect Key Authentication Rejection
  console.log('\n[5/8] Testing Incorrect Key Authentication Rejection...');
  const wrongKeyRaw = generateCspRngBytes(32);
  wrongKeyRaw[0] ^= 0xff;
  const wrongKey = await crypto.subtle.importKey(
    'raw',
    wrongKeyRaw as any,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  let caughtWrongKey = false;
  try {
    await decryptDocument(enc1, wrongKey);
  } catch {
    caughtWrongKey = true;
  }
  assert(caughtWrongKey, 'Decryption with wrong key rejected without data exposure');

  // Test 6: Locked / Missing Key Failure Handling
  console.log('\n[6/8] Testing Missing / Locked Key Failure Handling...');
  let caughtMissingKey = false;
  try {
    await decryptDocument(enc1, null);
  } catch (err: any) {
    if (err?.message?.includes('locked')) {
      caughtMissingKey = true;
    }
  }
  assert(caughtMissingKey, 'Null/locked key throws safe vault locked error without crashing');

  // Test 7: PBKDF2 Key Derivation & Passphrase Protection
  console.log('\n[7/8] Testing Browser PBKDF2 Key Derivation & Passphrase Protection...');
  const salt = generateCspRngBytes(16);
  const correctPassphrase = 'VaultPassword!2026';
  const wrongPassphrase = 'WrongPassword!2026';

  const kekCorrect = await deriveKekFromPassphrase(correctPassphrase, salt, 10000);
  const kekWrong = await deriveKekFromPassphrase(wrongPassphrase, salt, 10000);

  // Wrap DEK with correct KEK
  const wrapNonce = generateCspRngBytes(12);
  const wrappedDek = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: wrapNonce, tagLength: 128 },
    kekCorrect,
    testKeyRaw as any
  );

  // Attempt unwrap with wrong KEK
  let wrongPassphraseRejected = false;
  try {
    await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: wrapNonce, tagLength: 128 },
      kekWrong,
      wrappedDek
    );
  } catch {
    wrongPassphraseRejected = true;
  }
  assert(wrongPassphraseRejected, 'Wrong PBKDF2 passphrase fails DEK unwrapping safely');

  // Unwrap with correct KEK
  const unwrappedRaw = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: wrapNonce, tagLength: 128 },
    kekCorrect,
    wrappedDek
  );
  const unwrappedBytes = new Uint8Array(unwrappedRaw);
  assert(Buffer.from(unwrappedBytes).equals(Buffer.from(testKeyRaw)), 'Correct passphrase unwraps matching DEK');

  // Test 8: Migration of Plaintext Records & Self-Test Suite
  console.log('\n[8/9] Testing Migration & Built-In Self-Test Suite...');
  const legacyPlaintextDoc: StoredDocument = {
    id: 'legacy_doc_beta',
    type: DocumentType.BIRTH_CERTIFICATE,
    ownerName: 'Child',
    relation: 'DAUGHTER',
    dateUploaded: new Date().toISOString(),
    documentNumber: 'BC-987654',
    files: [{ name: 'cert.pdf', mimeType: 'application/pdf', url: 'data:application/pdf;base64,ZmFrZV9wZGY=' }]
  };

  const migrationRes = await migratePlaintextDocuments([legacyPlaintextDoc, enc1 as any], testKey, fingerprint);
  assert(migrationRes.total === 2, 'Migration evaluated 2 records');
  assert(migrationRes.alreadyEncrypted === 1, 'Migration skipped already encrypted record');
  assert(migrationRes.migrated === 1, 'Migration encrypted 1 legacy plaintext record');
  assert(migrationRes.failed === 0, 'Migration completed with zero failures');

  // Test 9: Automatic Passphrase-Free Key Initialization & Auto-Decryption
  console.log('\n[9/9] Testing Automatic Key Management & Transparent Encryption (No Passphrase)...');
  const { ensureWalletKeyReady, processLoadedRecords } = await import('../crypto/walletCrypto');
  const readyResult = await ensureWalletKeyReady();
  assert(readyResult.success && !!readyResult.key, 'Automatic cryptographic key initialized without passphrase prompt');
  assert(typeof readyResult.fingerprint === 'string' && readyResult.fingerprint.length > 0, 'Automatic key fingerprint generated');

  // Test auto-decryption through processLoadedRecords without manually providing key
  const autoDecryptedRes = await processLoadedRecords([enc1], null);
  assert(autoDecryptedRes.decryptedDocs.length === 1, 'Encrypted document auto-decrypted without manual key parameter');
  assert(autoDecryptedRes.decryptedDocs[0].id === dummyDoc.id, 'Auto-decrypted document ID verified');

  // Run self-test runner
  const selfTestResult = await runCryptoSelfTest(testKey);
  assert(selfTestResult.passed, 'Internal Self-Test suite passed all sub-tests', `${selfTestResult.tests.length} tests`);

  console.log('\n====================================================');
  console.log(` Results: ${passedCount} Passed | ${failedCount} Failed`);
  console.log('====================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
