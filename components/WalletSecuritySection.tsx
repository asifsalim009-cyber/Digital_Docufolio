import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import {
  getVaultSecurityStatus,
  VaultSecurityStatus,
  autoMigrateAllDocuments,
  ensureWalletKeyReady
} from '../crypto/walletCrypto';
import { StoredDocument } from '../types';

interface WalletSecuritySectionProps {
  documents: StoredDocument[];
  onDocumentsMigrated?: (updated: StoredDocument[]) => void;
  onVaultUnlocked?: () => void;
  onVaultLocked?: () => void;
}

export const WalletSecuritySection: React.FC<WalletSecuritySectionProps> = ({
  documents,
  onDocumentsMigrated,
  onVaultUnlocked
}) => {
  const [securityStatus, setSecurityStatus] = useState<VaultSecurityStatus | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

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
            await refreshStatus();
          } catch (mErr: any) {
            console.error('Auto migration encountered error:', mErr);
          } finally {
            setIsMigrating(false);
          }
        }
      })
      .catch((err) => {
        console.error('Automatic key initialization failed:', err);
      });
  }, [documents.length]);

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
      <div className="px-3.5 py-2 flex items-center justify-between gap-2.5 select-none">
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

            <span className="text-[11px] text-forest-500 truncate">
              • {isAndroid ? 'Android Keystore' : 'Device-Bound KeyStore'} • {coveragePercent}% encrypted at rest
            </span>
          </div>
        </div>

        {unencryptedCount > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleManualMigrate}
              disabled={isMigrating}
              className="flex items-center gap-1 px-2 py-1 bg-gold-500 hover:bg-gold-600 text-forest-950 rounded-md text-[11px] font-bold shadow-2xs transition-all disabled:opacity-50"
            >
              <RefreshCw size={11} className={isMigrating ? 'animate-spin' : ''} />
              <span className="hidden xs:inline">Encrypt All</span>
            </button>
          </div>
        )}
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
    </div>
  );
};
