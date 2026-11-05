import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Key, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Loader2, 
  Sparkles, 
  Cpu, 
  Database, 
  RefreshCw, 
  Play, 
  FileCheck, 
  Check, 
  HelpCircle 
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { 
  VaultSecurityStatus, 
  getVaultSecurityStatus, 
  initBrowserVault, 
  unlockBrowserVault, 
  lockWalletVault, 
  changeBrowserPassphrase, 
  initOrUnlockAndroidKeystoreVault, 
  migratePlaintextDocuments, 
  runCryptoSelfTest, 
  CryptoSelfTestItem, 
  getActiveWalletKey, 
  getActiveKeyFingerprint 
} from '../crypto/walletCrypto';
import { StoredDocument } from '../types';

interface WalletSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: StoredDocument[];
  onVaultStateChanged: () => void;
  onSaveMigratedDocuments: (migratedDocs: StoredDocument[]) => Promise<void>;
}

export const WalletSecurityModal: React.FC<WalletSecurityModalProps> = ({
  isOpen,
  onClose,
  documents,
  onVaultStateChanged,
  onSaveMigratedDocuments
}) => {
  const [securityStatus, setSecurityStatus] = useState<VaultSecurityStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Forms
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [currentPassphrase, setCurrentPassphrase] = useState('');
  const [showChangePassModal, setShowChangePassModal] = useState(false);

  // Self-test state
  const [selfTestRunning, setSelfTestRunning] = useState(false);
  const [selfTestResults, setSelfTestResults] = useState<CryptoSelfTestItem[] | null>(null);

  // Migration state
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationSummary, setMigrationSummary] = useState<string | null>(null);

  const isAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

  const refreshStatus = async () => {
    try {
      const status = await getVaultSecurityStatus(documents);
      setSecurityStatus(status);
    } catch (e: any) {
      console.error('Failed to get security status', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshStatus();
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, documents]);

  if (!isOpen) return null;

  const handleSetupVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (isAndroid) {
      setLoading(true);
      try {
        const res = await initOrUnlockAndroidKeystoreVault();
        if (res.success) {
          setSuccessMsg('Android Keystore hardware vault initialized successfully!');
          await refreshStatus();
          onVaultStateChanged();
        } else {
          setErrorMsg(res.error || 'Failed to initialize Android Keystore.');
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'Android Keystore initialization failed.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (passphrase.length < 8) {
      setErrorMsg('Master passphrase must be at least 8 characters long.');
      return;
    }

    if (passphrase !== confirmPassphrase) {
      setErrorMsg('Passphrases do not match. Please verify.');
      return;
    }

    setLoading(true);
    try {
      const res = await initBrowserVault(passphrase);
      if (res.success) {
        setSuccessMsg(`Encrypted vault initialized! Key Fingerprint: ${res.keyFingerprint}`);
        setPassphrase('');
        setConfirmPassphrase('');
        await refreshStatus();
        onVaultStateChanged();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to initialize encrypted vault.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockVault = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isAndroid) {
        const res = await initOrUnlockAndroidKeystoreVault();
        if (res.success) {
          setSuccessMsg('Hardware-backed vault unlocked successfully.');
          await refreshStatus();
          onVaultStateChanged();
        } else {
          setErrorMsg(res.error || 'Android Keystore unlock failed.');
        }
      } else {
        if (!passphrase) {
          setErrorMsg('Please enter your vault passphrase.');
          setLoading(false);
          return;
        }
        const res = await unlockBrowserVault(passphrase);
        if (res.success) {
          setSuccessMsg('Vault unlocked successfully.');
          setPassphrase('');
          await refreshStatus();
          onVaultStateChanged();
        } else {
          setErrorMsg(res.error || 'Incorrect passphrase.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to unlock vault.');
    } finally {
      setLoading(false);
    }
  };

  const handleLockVault = () => {
    lockWalletVault();
    setSuccessMsg('Vault locked. In-memory keys cleared.');
    refreshStatus();
    onVaultStateChanged();
  };

  const handleChangePassphraseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (passphrase.length < 8) {
      setErrorMsg('New passphrase must be at least 8 characters.');
      return;
    }

    if (passphrase !== confirmPassphrase) {
      setErrorMsg('New passphrases do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await changeBrowserPassphrase(currentPassphrase, passphrase);
      if (res.success) {
        setSuccessMsg('Vault passphrase updated successfully without re-encrypting records.');
        setShowChangePassModal(false);
        setPassphrase('');
        setConfirmPassphrase('');
        setCurrentPassphrase('');
        await refreshStatus();
      } else {
        setErrorMsg(res.error || 'Failed to change passphrase.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Passphrase change failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunSelfTest = async () => {
    setSelfTestRunning(true);
    setErrorMsg(null);
    try {
      const key = getActiveWalletKey();
      const res = await runCryptoSelfTest(key);
      setSelfTestResults(res.tests);
      if (res.passed) {
        setSuccessMsg('All cryptographic validation checks passed successfully!');
      } else {
        setErrorMsg('One or more cryptographic validation checks failed.');
      }
    } catch (e: any) {
      setErrorMsg(`Self-test error: ${e.message}`);
    } finally {
      setSelfTestRunning(false);
    }
  };

  const handleMigrateDocuments = async () => {
    const key = getActiveWalletKey();
    const fingerprint = getActiveKeyFingerprint();
    if (!key || !fingerprint) {
      setErrorMsg('Vault must be unlocked to migrate existing records.');
      return;
    }

    setIsMigrating(true);
    setErrorMsg(null);
    setMigrationSummary(null);

    try {
      const res = await migratePlaintextDocuments(documents, key, fingerprint);
      if (res.failed > 0) {
        setErrorMsg(`Migration encountered ${res.failed} errors. Data preserved safely.`);
      } else {
        await onSaveMigratedDocuments(res.migratedRecords as any);
        setMigrationSummary(
          `Migration Complete! Successfully encrypted ${res.migrated} records with AES-256-GCM. (${res.alreadyEncrypted} already encrypted).`
        );
        await refreshStatus();
        onVaultStateChanged();
      }
    } catch (err: any) {
      setErrorMsg(`Migration aborted: ${err.message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'Protected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-xs font-bold">
            <ShieldCheck size={14} className="text-emerald-600" />
            Protected
          </span>
        );
      case 'Locked':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 text-xs font-bold">
            <Lock size={14} className="text-amber-600" />
            Locked
          </span>
        );
      case 'Not configured':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold">
            <AlertTriangle size={14} className="text-slate-500" />
            Not configured
          </span>
        );
      case 'Unavailable':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs font-bold">
            <X size={14} className="text-rose-600" />
            Unavailable
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-forest-950/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden relative border border-sand-300 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-sand-200 flex items-center justify-between bg-gradient-to-r from-sand-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-forest-900 text-white flex items-center justify-center shadow-md">
              <Shield size={20} />
            </div>
            <div>
              <h3 className="font-display font-bold text-xl text-forest-900 flex items-center gap-2">
                Wallet Security & Encryption
              </h3>
              <p className="text-xs text-forest-500">
                AES-256-GCM client-side encryption for documents at rest
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-forest-400 hover:text-forest-900 p-2 rounded-full hover:bg-sand-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Alerts */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}
          {migrationSummary && (
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium flex items-start gap-2">
              <CheckCircle2 size={16} className="text-blue-500 shrink-0 mt-0.5" />
              <span>{migrationSummary}</span>
            </div>
          )}

          {/* Current Status Card */}
          <div className="bg-sand-50/70 rounded-2xl p-5 border border-sand-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-sand-200/60">
              <span className="text-xs font-bold text-forest-500 uppercase tracking-wider">
                Vault Security State
              </span>
              {getStatusBadge(securityStatus?.status)}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="font-semibold text-forest-500">Encryption Algorithm</p>
                <p className="font-bold text-forest-900 mt-0.5 font-mono">AES-256-GCM (Authenticated)</p>
                <p className="text-[11px] text-forest-500 mt-0.5">96-bit CSPRNG Nonce + 128-bit Auth Tag</p>
              </div>
              <div>
                <p className="font-semibold text-forest-500">Key Protection Method</p>
                <p className="font-bold text-forest-900 mt-0.5">
                  {securityStatus?.keyProtectionDescription || 'Detecting...'}
                </p>
              </div>
              <div>
                <p className="font-semibold text-forest-500">Storage Locations</p>
                <p className="font-bold text-forest-900 mt-0.5">
                  {securityStatus?.storageLocationDescription || 'IndexedDB & Firebase'}
                </p>
              </div>
              <div>
                <p className="font-semibold text-forest-500">Key Fingerprint (SHA-256)</p>
                <p className="font-mono font-bold text-forest-900 mt-0.5">
                  {securityStatus?.keyFingerprint || 'Vault Locked / Inactive'}
                </p>
              </div>
            </div>

            {/* Document Stats */}
            <div className="pt-3 border-t border-sand-200/60 grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-white border border-sand-200">
                <span className="block text-lg font-extrabold text-forest-900">
                  {securityStatus?.totalDocuments ?? documents.length}
                </span>
                <span className="text-[10px] font-semibold text-forest-500 uppercase">Total Docs</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-sand-200">
                <span className="block text-lg font-extrabold text-emerald-700">
                  {securityStatus?.encryptedDocuments ?? 0}
                </span>
                <span className="text-[10px] font-semibold text-forest-500 uppercase">Encrypted</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-sand-200">
                <span className="block text-lg font-extrabold text-amber-700">
                  {securityStatus?.unencryptedDocuments ?? 0}
                </span>
                <span className="text-[10px] font-semibold text-forest-500 uppercase">Plaintext</span>
              </div>
            </div>
          </div>

          {/* Action Sections according to Vault Status */}
          {securityStatus?.status === 'Not configured' && (
            <div className="bg-white rounded-2xl p-5 border border-amber-200 bg-amber-50/20 space-y-4">
              <div className="flex items-start gap-3">
                <Key className="text-amber-600 shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="font-bold text-forest-900 text-sm">Configure Client-Side Encryption</h4>
                  <p className="text-xs text-forest-600 mt-0.5">
                    {isAndroid
                      ? 'Initialize your hardware-backed Android Keystore master key to protect wallet records.'
                      : 'Create a Master Passphrase to derive your AES-256-GCM encryption key using PBKDF2 (600,000 iterations). Your raw key is never stored on disk.'}
                  </p>
                </div>
              </div>

              {isAndroid ? (
                <button
                  onClick={handleSetupVault}
                  disabled={loading}
                  className="w-full py-3 bg-forest-900 hover:bg-forest-800 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Cpu size={16} />}
                  <span>Initialize Android Keystore Master Key</span>
                </button>
              ) : (
                <form onSubmit={handleSetupVault} className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-forest-700 mb-1">
                      Vault Master Passphrase (min 8 characters)
                    </label>
                    <input
                      type="password"
                      required
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder="Enter strong passphrase..."
                      className="w-full px-3.5 py-2.5 border border-sand-300 rounded-xl text-xs font-medium focus:outline-none focus:border-forest-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-forest-700 mb-1">
                      Confirm Passphrase
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassphrase}
                      onChange={(e) => setConfirmPassphrase(e.target.value)}
                      placeholder="Re-enter passphrase..."
                      className="w-full px-3.5 py-2.5 border border-sand-300 rounded-xl text-xs font-medium focus:outline-none focus:border-forest-700"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-forest-900 hover:bg-forest-800 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                    <span>Initialize Vault with PBKDF2</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {securityStatus?.status === 'Locked' && (
            <div className="bg-white rounded-2xl p-5 border border-sand-300 space-y-4">
              <div className="flex items-start gap-3">
                <Lock className="text-amber-600 shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="font-bold text-forest-900 text-sm">Unlock Encrypted Vault</h4>
                  <p className="text-xs text-forest-600 mt-0.5">
                    {isAndroid
                      ? 'Decrypt your session Data Encryption Key using the Android Keystore system.'
                      : 'Enter your Master Passphrase to unwrap your DEK and access encrypted documents.'}
                  </p>
                </div>
              </div>

              {isAndroid ? (
                <button
                  onClick={handleUnlockVault}
                  disabled={loading}
                  className="w-full py-3 bg-forest-900 hover:bg-forest-800 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Unlock size={16} />}
                  <span>Unlock with Android Keystore</span>
                </button>
              ) : (
                <form onSubmit={handleUnlockVault} className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-forest-700 mb-1">Master Passphrase</label>
                    <input
                      type="password"
                      required
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder="Enter your master passphrase..."
                      className="w-full px-3.5 py-2.5 border border-sand-300 rounded-xl text-xs font-medium focus:outline-none focus:border-forest-700"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-forest-900 hover:bg-forest-800 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Unlock size={16} />}
                    <span>Unlock Vault</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {securityStatus?.status === 'Protected' && (
            <div className="space-y-4">
              {/* Migration Prompt if unencrypted records exist */}
              {(securityStatus.unencryptedDocuments > 0) && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                    <AlertTriangle size={16} />
                    <span>{securityStatus.unencryptedDocuments} Unencrypted Record(s) Detected</span>
                  </div>
                  <p className="text-xs text-amber-900/80 leading-relaxed">
                    You have existing plaintext records in storage. Migrate them now to AES-256-GCM. 
                    Every record is verified via test decryption before committing to disk and Firebase.
                  </p>
                  <button
                    onClick={handleMigrateDocuments}
                    disabled={isMigrating}
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xs"
                  >
                    {isMigrating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    <span>{isMigrating ? 'Verifying & Migrating Records...' : 'Migrate to AES-256-GCM Vault'}</span>
                  </button>
                </div>
              )}

              {/* Protected Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleLockVault}
                  className="py-2.5 px-4 bg-sand-100 hover:bg-sand-200 text-forest-800 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 border border-sand-300"
                >
                  <Lock size={14} />
                  <span>Lock Vault Now</span>
                </button>
                {!isAndroid && (
                  <button
                    onClick={() => setShowChangePassModal(true)}
                    className="py-2.5 px-4 bg-sand-100 hover:bg-sand-200 text-forest-800 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 border border-sand-300"
                  >
                    <Key size={14} />
                    <span>Change Passphrase</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Automated Self-Test Section */}
          <div className="pt-4 border-t border-sand-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-forest-900 text-xs">Automated Cryptographic Verification</h4>
                <p className="text-[11px] text-forest-500">
                  Tests CSPRNG nonce uniqueness, round-trip, tampered ciphertext, and key auth
                </p>
              </div>
              <button
                onClick={handleRunSelfTest}
                disabled={selfTestRunning}
                className="py-1.5 px-3 bg-forest-900 hover:bg-forest-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
              >
                {selfTestRunning ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                <span>{selfTestRunning ? 'Testing...' : 'Run Self-Test'}</span>
              </button>
            </div>

            {selfTestResults && (
              <div className="p-3 bg-sand-50 rounded-xl border border-sand-200 space-y-1.5 animate-fadeIn">
                {selfTestResults.map((t, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[11px]">
                    {t.passed ? (
                      <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <X size={14} className="text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-bold text-forest-900">{t.name}: </span>
                      <span className={t.passed ? 'text-forest-600' : 'text-rose-700 font-semibold'}>
                        {t.message}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Change Passphrase Modal */}
        {showChangePassModal && (
          <div className="absolute inset-0 bg-white/95 z-20 p-6 flex flex-col justify-center animate-fadeIn">
            <div className="max-w-md mx-auto w-full space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-forest-900 text-base">Change Vault Passphrase</h4>
                <button
                  onClick={() => setShowChangePassModal(false)}
                  className="p-1 rounded-full text-forest-400 hover:text-forest-900"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-xs text-forest-500">
                This re-encrypts your Data Encryption Key (DEK) with a new Key-Encryption Key. Existing document ciphertexts do not need to be re-encrypted.
              </p>
              <form onSubmit={handleChangePassphraseSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-forest-700 mb-1">Current Passphrase</label>
                  <input
                    type="password"
                    required
                    value={currentPassphrase}
                    onChange={(e) => setCurrentPassphrase(e.target.value)}
                    className="w-full px-3.5 py-2 border border-sand-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-forest-700 mb-1">New Passphrase (min 8 chars)</label>
                  <input
                    type="password"
                    required
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    className="w-full px-3.5 py-2 border border-sand-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-forest-700 mb-1">Confirm New Passphrase</label>
                  <input
                    type="password"
                    required
                    value={confirmPassphrase}
                    onChange={(e) => setConfirmPassphrase(e.target.value)}
                    className="w-full px-3.5 py-2 border border-sand-300 rounded-xl text-xs"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowChangePassModal(false)}
                    className="w-1/2 py-2.5 bg-sand-100 hover:bg-sand-200 text-forest-800 rounded-xl font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-1/2 py-2.5 bg-forest-900 hover:bg-forest-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <SaveIcon />}
                    <span>Update Key</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-sand-200 bg-sand-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-forest-900 hover:bg-forest-800 text-white rounded-xl font-bold text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

const SaveIcon = () => <FileCheck size={14} />;
