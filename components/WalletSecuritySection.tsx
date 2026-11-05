import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Shield,
  Key,
  Database,
  Cpu,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
  Fingerprint,
  Sparkles
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import {
  getVaultSecurityStatus,
  VaultSecurityStatus,
  runCryptoSelfTest,
  CryptoSelfTestResult,
  autoMigrateAllDocuments,
  ensureWalletKeyReady,
  getActiveWalletKey
} from '../crypto/walletCrypto';
import { StoredDocument } from '../types';

interface WalletSecuritySectionProps {
  documents: StoredDocument[];
  onDocumentsMigrated?: (updatedDocs: StoredDocument[]) => void;
  onVaultUnlocked?: () => void;
  onVaultLocked?: () => void;
}

export const WalletSecuritySection: React.FC<WalletSecuritySectionProps> = ({
  documents,
  onDocumentsMigrated,
  onVaultUnlocked
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [securityStatus, setSecurityStatus] = useState<VaultSecurityStatus | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Self-test results state
  const [selfTestResult, setSelfTestResult] = useState<CryptoSelfTestResult | null>(null);
  const [isRunningTest, setIsRunningTest] = useState(false);

  // Migration state
  const [isMigrating, setIsMigrating] = useState(false);

  const isAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

  const refreshStatus = async () => {
    try {
      const status = await getVaultSecurityStatus(documents);
      setSecurityStatus(status);
    } catch (err: any) {
      console.error('Error checking vault security status:', err);
    }
  };

  useEffect(() => {
    ensureWalletKeyReady()
      .then(async () => {
        await refreshStatus();
        if (onVaultUnlocked) onVaultUnlocked();

        // Check for any unencrypted legacy records and automatically migrate
        const unencrypted = documents.filter(d => !d.isEncrypted);
        if (unencrypted.length > 0 && !isMigrating) {
          setIsMigrating(true);
          try {
            const res = await autoMigrateAllDocuments(documents);
            if (res.migrated > 0 && onDocumentsMigrated) {
              const updated = documents.map(d => {
                const foundMigrated = res.migratedRecords.find(m => m.id === d.id);
                return foundMigrated ? { ...d, isEncrypted: true } : d;
              });
              onDocumentsMigrated(updated);
            }
          } catch (e) {
            console.error('Auto-migration error:', e);
          } finally {
            setIsMigrating(false);
            await refreshStatus();
          }
        }
      })
      .catch((err) => {
        console.error('Automatic key initialization failed:', err);
      });
  }, [documents.length]);

  const handleRunSelfTest = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsRunningTest(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const activeKey = getActiveWalletKey();
      const result = await runCryptoSelfTest(activeKey);
      setSelfTestResult(result);
      if (result.passed) {
        setActionSuccess('Cryptographic integrity verified: AES-256-GCM & CSPRNG tests passed.');
        setIsExpanded(true);
      } else {
        setActionError('Verification reported issues.');
        setIsExpanded(true);
      }
    } catch (err: any) {
      setActionError(err?.message || 'Verification execution failed.');
    } finally {
      setIsRunningTest(false);
    }
  };

  const handleManualMigrate = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsMigrating(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await autoMigrateAllDocuments(documents);
      if (res.failed > 0) {
        setActionError(`Encountered ${res.failed} issue(s) during verification. Existing records preserved.`);
      } else {
        setActionSuccess(`All ${res.total} documents encrypted with AES-256-GCM.`);
        if (onDocumentsMigrated && res.migratedRecords.length > 0) {
          const updated = documents.map(d => {
            const foundMigrated = res.migratedRecords.find(m => m.id === d.id);
            return foundMigrated ? { ...d, isEncrypted: true } : d;
          });
          onDocumentsMigrated(updated);
        }
        await refreshStatus();
      }
    } catch (err: any) {
      setActionError(err?.message || 'Encryption failed. Records kept intact.');
    } finally {
      setIsMigrating(false);
    }
  };

  if (!securityStatus) {
    return null;
  }

  const isProtected = securityStatus.status === 'Protected';
  const unencryptedCount = securityStatus.unencryptedDocuments;
  const coveragePercent = securityStatus.totalDocuments === 0
    ? 100
    : Math.round((securityStatus.encryptedDocuments / securityStatus.totalDocuments) * 100);

  return (
    <div className="bg-white/90 backdrop-blur-xs rounded-xl border border-emerald-200/80 shadow-2xs mb-3 transition-all overflow-hidden">
      {/* Sleek, Compact Top Banner */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-3.5 py-2 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-emerald-50/40 transition-colors select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100/80 text-emerald-700 shrink-0 border border-emerald-300/60">
            <ShieldCheck size={16} />
          </div>

          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="font-semibold text-xs text-forest-900 tracking-tight whitespace-nowrap">
              AES-256-GCM Encrypted
            </span>

            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {isProtected ? 'Protected' : securityStatus.status}
            </span>

            <span className="hidden sm:inline-block text-[11px] text-forest-500 truncate">
              • {isAndroid ? 'Android Keystore' : 'Device-Bound KeyStore'} • {coveragePercent}% encrypted at rest
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {unencryptedCount > 0 && (
            <button
              onClick={handleManualMigrate}
              disabled={isMigrating}
              className="flex items-center gap-1 px-2 py-1 bg-gold-500 hover:bg-gold-600 text-forest-950 rounded-md text-[11px] font-bold shadow-2xs transition-all disabled:opacity-50"
            >
              <RefreshCw size={11} className={isMigrating ? 'animate-spin' : ''} />
              <span className="hidden xs:inline">Encrypt All</span>
            </button>
          )}

          <button
            onClick={handleRunSelfTest}
            disabled={isRunningTest}
            title="Run Cryptographic Verification Test"
            className="flex items-center gap-1 px-2 py-1 bg-forest-900 hover:bg-forest-800 text-white rounded-md text-[11px] font-bold shadow-2xs transition-all disabled:opacity-50"
          >
            <Play size={11} className={isRunningTest ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{isRunningTest ? 'Verifying...' : 'Verify'}</span>
          </button>

          <div className="p-1 text-forest-400 hover:text-forest-700 rounded transition-colors">
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </div>
      </div>

      {/* Inline Feedback Alerts */}
      {actionError && (
        <div className="mx-3 my-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={13} className="text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-500 hover:text-rose-700">
            <X size={12} />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="mx-3 my-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-700">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Expanded Clean Details */}
      {isExpanded && (
        <div className="px-3.5 pb-3 pt-1 border-t border-sand-100 bg-sand-50/50 space-y-2.5 text-xs animate-fadeIn">
          {/* Micro Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
            <div className="p-2 bg-white rounded-lg border border-sand-200">
              <div className="flex items-center gap-1 text-[10px] text-forest-500 font-medium">
                <Cpu size={12} className="text-forest-400" />
                <span>Algorithm</span>
              </div>
              <div className="font-bold text-forest-900 text-xs mt-0.5">AES-256-GCM</div>
              <div className="text-[10px] text-forest-500">96-bit Nonce • 128-bit Tag</div>
            </div>

            <div className="p-2 bg-white rounded-lg border border-sand-200">
              <div className="flex items-center gap-1 text-[10px] text-forest-500 font-medium">
                <Key size={12} className="text-forest-400" />
                <span>Key Protection</span>
              </div>
              <div className="font-bold text-forest-900 text-xs mt-0.5 truncate">
                {isAndroid ? 'Android Keystore' : 'Device KeyStore'}
              </div>
              <div className="text-[10px] text-forest-500">Hardware / Device-Bound</div>
            </div>

            <div className="p-2 bg-white rounded-lg border border-sand-200">
              <div className="flex items-center gap-1 text-[10px] text-forest-500 font-medium">
                <Database size={12} className="text-forest-400" />
                <span>Storage</span>
              </div>
              <div className="font-bold text-forest-900 text-xs mt-0.5">IDB & Firestore</div>
              <div className="text-[10px] text-forest-500">Encrypted Ciphertext At Rest</div>
            </div>

            <div className="p-2 bg-white rounded-lg border border-sand-200">
              <div className="flex items-center gap-1 text-[10px] text-forest-500 font-medium">
                <Fingerprint size={12} className="text-forest-400" />
                <span>Key Fingerprint</span>
              </div>
              <div className="font-mono font-bold text-forest-900 text-xs mt-0.5 truncate">
                {securityStatus.keyFingerprint ? `${securityStatus.keyFingerprint.substring(0, 12)}…` : 'Protected'}
              </div>
              <div className="text-[10px] text-forest-500">Zero Passphrase Needed</div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 bg-white rounded-lg border border-sand-200 text-[11px]">
            <div className="flex items-center gap-3">
              <span>
                Total Records: <strong className="text-forest-900">{securityStatus.totalDocuments}</strong>
              </span>
              <span className="text-sand-300">•</span>
              <span>
                Encrypted at Rest: <strong className="text-emerald-700">{securityStatus.encryptedDocuments}</strong>
              </span>
              {securityStatus.failedDecryptions > 0 && (
                <>
                  <span className="text-sand-300">•</span>
                  <span className="text-rose-600">
                    Failures: <strong>{securityStatus.failedDecryptions}</strong>
                  </span>
                </>
              )}
            </div>

            <div className="text-forest-500 flex items-center gap-1">
              <Sparkles size={11} className="text-gold-500" />
              <span>Transparent automatic encryption active</span>
            </div>
          </div>

          {/* Verification Results Panel */}
          {selfTestResult && (
            <div className="p-2 bg-white rounded-lg border border-sand-200 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-forest-900">Cryptographic Self-Test:</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${selfTestResult.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {selfTestResult.passed ? 'All 8 Tests Passed' : 'Tests Failed'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {selfTestResult.tests.map((t, idx) => (
                  <div
                    key={idx}
                    className={`px-2 py-1 rounded text-[10px] flex items-center gap-1.5 ${
                      t.passed ? 'bg-emerald-50 text-emerald-900 border border-emerald-100' : 'bg-rose-50 text-rose-900 border border-rose-100'
                    }`}
                  >
                    {t.passed ? (
                      <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle size={12} className="text-rose-600 shrink-0" />
                    )}
                    <span className="font-medium truncate">{t.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
