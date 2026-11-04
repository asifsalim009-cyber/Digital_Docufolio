import React, { useState, useEffect } from 'react';
import { StoredDocument, ViewOnceShare, ShareType, ShareStatus } from '../types';
import { db, auth } from '../firebase';
import { doc, setDoc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { X, Share2, Shield, Eye, Lock, Copy, Check, AlertTriangle, Trash2, Clock, CheckCircle2, ShieldAlert, Sparkles, ExternalLink, RefreshCw, Send } from 'lucide-react';
import { CLOUD_RUN_BACKEND_URL } from '../api';

interface ShareModalProps {
  document: StoredDocument;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ document: docItem, onClose }) => {
  const [shareType, setShareType] = useState<ShareType>('view_once');
  const [expiryHours, setExpiryHours] = useState<number>(24);
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [customWatermark, setCustomWatermark] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [createdShare, setCreatedShare] = useState<ViewOnceShare | null>(null);
  const [copied, setCopied] = useState(false);
  const [existingShares, setExistingShares] = useState<ViewOnceShare[]>([]);
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');

  const currentUser = auth.currentUser;

  // Listen to existing shares for this document by this user
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'viewOnceShares'),
      where('documentId', '==', docItem.id),
      where('ownerUid', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const shares = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ViewOnceShare));
      // Sort newest first
      shares.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setExistingShares(shares);

      // Keep createdShare updated if it changes
      if (createdShare) {
        const found = shares.find(s => s.id === createdShare.id);
        if (found) setCreatedShare(found);
      }
    });

    return () => unsubscribe();
  }, [docItem.id, currentUser]);

  const generateSecureToken = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      const uuid1 = crypto.randomUUID().replace(/-/g, '');
      const randomBytes = new Uint8Array(8);
      crypto.getRandomValues(randomBytes);
      const hexExtra = Array.from(randomBytes, b => b.toString(16).padStart(2, '0')).join('');
      return `${uuid1}${hexExtra}`;
    }
    return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  const getShareUrl = (token: string): string => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1') && !origin.startsWith('capacitor://')) {
        return `${origin}${window.location.pathname}?shareToken=${token}`;
      }
    }
    const cleanBase = CLOUD_RUN_BACKEND_URL.replace(/\/$/, '');
    return `${cleanBase}/?shareToken=${token}`;
  };

  const handleCreateShare = async () => {
    if (!currentUser) return;
    setIsGenerating(true);

    try {
      const token = generateSecureToken();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000).toISOString();
      const defaultWatermark = customWatermark.trim() || recipientEmail.trim() || `CONFIDENTIAL • ${currentUser.displayName || 'RESTRICTED VIEW'}`;

      const newShare: ViewOnceShare = {
        id: token,
        token: token,
        documentId: docItem.id,
        documentTitle: docItem.customName || docItem.type,
        documentType: docItem.type,
        ownerUid: currentUser.uid,
        ownerName: currentUser.displayName || currentUser.email || 'Document Owner',
        senderEmail: currentUser.email || undefined,
        shareType: shareType,
        status: 'available',
        createdAt: now.toISOString(),
        expiresAt: expiresAt,
        sessionStartedAt: null,
        currentSessionKey: null,
        viewedAt: null,
        consumedAt: null,
        recipientEmail: recipientEmail.trim() || undefined,
        recipientWatermark: defaultWatermark,
        payload: {
          type: docItem.type,
          customName: docItem.customName,
          customType: docItem.customType,
          ownerName: docItem.ownerName,
          relation: docItem.relation,
          documentNumber: docItem.documentNumber,
          expiryDate: docItem.expiryDate,
          files: docItem.files || []
        }
      };

      await setDoc(doc(db, 'viewOnceShares', token), JSON.parse(JSON.stringify(newShare)));
      setCreatedShare(newShare);
    } catch (error) {
      console.error('Failed to create share link:', error);
      alert('Failed to generate secure share link. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = (token: string) => {
    const url = getShareUrl(token);
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeShare = async (token: string) => {
    const url = getShareUrl(token);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Secure Document: ${docItem.customName || docItem.type}`,
          text: `You have been sent a secure ${shareType === 'view_once' ? 'View Once' : 'Document'} link.`,
          url: url,
        });
      } catch (err) {
        console.warn('Native share cancelled or failed:', err);
      }
    } else {
      handleCopyLink(token);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    if (!confirm('Are you sure you want to revoke this link immediately? The recipient will no longer be able to view it.')) return;
    try {
      await updateDoc(doc(db, 'viewOnceShares', shareId), {
        status: 'revoked',
        consumedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to revoke share:', err);
      alert('Failed to revoke share link.');
    }
  };

  const getStatusBadge = (status: ShareStatus, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date();
    const effectiveStatus = isExpired && (status === 'available' || status === 'viewing') ? 'expired' : status;

    switch (effectiveStatus) {
      case 'available':
        return <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>Available</span>;
      case 'viewing':
        return <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>Currently Viewing</span>;
      case 'consumed':
        return <span className="inline-flex items-center gap-1 bg-sand-200 text-forest-600 text-[11px] font-bold px-2 py-0.5 rounded-full"><Check size={10} /> Consumed (Viewed)</span>;
      case 'revoked':
        return <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-[11px] font-bold px-2 py-0.5 rounded-full"><ShieldAlert size={10} /> Revoked</span>;
      case 'expired':
        return <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-full"><Clock size={10} /> Expired</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-sand-200">
        
        {/* Header */}
        <div className="p-6 border-b border-sand-200 bg-sand-50/80 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-forest-900 text-gold-400 flex items-center justify-center shadow-md">
              <Share2 size={20} />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-forest-900 leading-tight">
                Share Document
              </h3>
              <p className="text-xs text-forest-500 font-medium truncate max-w-sm">
                {docItem.customName || docItem.type} • {docItem.ownerName}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-forest-400 hover:text-forest-900 hover:bg-sand-200/60 rounded-full transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-sand-200 bg-sand-100/40 px-6 pt-2">
          <button
            onClick={() => setActiveTab('new')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'new'
                ? 'border-forest-900 text-forest-900'
                : 'border-transparent text-forest-500 hover:text-forest-800'
            }`}
          >
            Create Share Link
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-forest-900 text-forest-900'
                : 'border-transparent text-forest-500 hover:text-forest-800'
            }`}
          >
            <span>Active & Past Links</span>
            {existingShares.length > 0 && (
              <span className="bg-forest-900 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                {existingShares.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          
          {activeTab === 'new' && (
            <>
              {createdShare ? (
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
                      <CheckCircle2 size={28} />
                    </div>
                    <div>
                      <h4 className="font-bold text-forest-900 text-base">
                        {createdShare.shareType === 'view_once' ? 'View Once Link Generated' : 'Share Link Generated'}
                      </h4>
                      <p className="text-xs text-forest-600 mt-1">
                        {createdShare.shareType === 'view_once'
                          ? 'This link can only be viewed once. Access is permanently invalidated as soon as the recipient closes the document.'
                          : 'This link allows normal view access until expired or revoked.'}
                      </p>
                    </div>

                    <div className="flex justify-center pt-1">
                      {getStatusBadge(createdShare.status, createdShare.expiresAt)}
                    </div>
                  </div>

                  {/* Watermark Confirmation Box */}
                  <div className="bg-sand-50 p-4 rounded-xl border border-sand-200 flex items-center gap-3 text-xs text-forest-700">
                    <Shield size={18} className="text-gold-600 shrink-0" />
                    <div>
                      <span className="font-bold block text-forest-900">Security Watermark Stamped:</span>
                      <span className="font-mono text-[11px] text-forest-600">"{createdShare.recipientWatermark}"</span>
                    </div>
                  </div>

                  {/* Link Box */}
                  <div>
                    <label className="block text-xs font-bold text-forest-500 uppercase mb-1.5">
                      Live Share Link (Accessible Anywhere)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={getShareUrl(createdShare.token)}
                        className="flex-1 bg-sand-50 border border-sand-300 rounded-xl px-3.5 py-2.5 text-xs text-forest-900 font-mono select-all focus:outline-none"
                      />
                      <button
                        onClick={() => handleCopyLink(createdShare.token)}
                        className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all ${
                          copied
                            ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                            : 'bg-forest-900 hover:bg-forest-800 text-white'
                        }`}
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        <span>{copied ? 'Copied!' : 'Copy'}</span>
                      </button>

                      <button
                        onClick={() => handleNativeShare(createdShare.token)}
                        className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                        title="Share via App / WhatsApp / Email"
                      >
                        <Send size={14} />
                        <span>Share</span>
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-sand-200">
                    <button
                      onClick={() => handleRevokeShare(createdShare.id)}
                      disabled={createdShare.status === 'revoked' || createdShare.status === 'consumed'}
                      className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                    >
                      <ShieldAlert size={14} />
                      <span>Revoke Link</span>
                    </button>

                    <button
                      onClick={() => {
                        setCreatedShare(null);
                        setRecipientEmail('');
                        setCustomWatermark('');
                      }}
                      className="px-4 py-2 text-xs font-bold text-forest-700 hover:bg-sand-100 rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCw size={14} />
                      <span>Create Another Link</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Share Creation Form */
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* Share Options Radio Group */}
                  <div>
                    <label className="block text-xs font-bold text-forest-500 uppercase tracking-wider mb-2.5">
                      Share Type
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      
                      {/* View Once Option */}
                      <label
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          shareType === 'view_once'
                            ? 'border-gold-500 bg-gold-50/50 shadow-sm ring-1 ring-gold-500/30'
                            : 'border-sand-200 hover:border-sand-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="shareType"
                            value="view_once"
                            checked={shareType === 'view_once'}
                            onChange={() => setShareType('view_once')}
                            className="mt-1 text-gold-600 focus:ring-gold-500"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-forest-900 text-sm">View Once</span>
                              <span className="bg-gold-200/80 text-gold-900 text-[10px] font-extrabold px-1.5 py-0.2 rounded-md uppercase">
                                High Security
                              </span>
                            </div>
                            <p className="text-xs text-forest-600 mt-1 leading-relaxed">
                              Single-use viewing session. Document cannot be downloaded or reopened once closed.
                            </p>
                          </div>
                        </div>
                      </label>

                      {/* Normal Share Option */}
                      <label
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          shareType === 'normal'
                            ? 'border-forest-900 bg-forest-50/50 shadow-sm'
                            : 'border-sand-200 hover:border-sand-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="shareType"
                            value="normal"
                            checked={shareType === 'normal'}
                            onChange={() => setShareType('normal')}
                            className="mt-1 text-forest-900 focus:ring-forest-900"
                          />
                          <div>
                            <span className="font-bold text-forest-900 text-sm">Normal Share</span>
                            <p className="text-xs text-forest-600 mt-1 leading-relaxed">
                              Standard link allowing the recipient to view and download files until expired.
                            </p>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Expiration Timer */}
                  <div>
                    <label className="block text-xs font-bold text-forest-500 uppercase mb-1.5">
                      Link Expiration Window
                    </label>
                    <select
                      value={expiryHours}
                      onChange={(e) => setExpiryHours(Number(e.target.value))}
                      className="w-full bg-white border border-sand-300 rounded-xl p-2.5 text-sm text-forest-900 focus:outline-none focus:border-gold-500"
                    >
                      <option value={1}>1 Hour (Quick Access)</option>
                      <option value={6}>6 Hours</option>
                      <option value={24}>24 Hours (1 Day - Default)</option>
                      <option value={72}>3 Days</option>
                      <option value={168}>7 Days (1 Week)</option>
                    </select>
                  </div>

                  {/* Recipient Email & Security Watermark */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-forest-500 uppercase mb-1">
                        Recipient Email <span className="text-forest-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="email"
                        placeholder="recipient@example.com"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        className="w-full bg-white border border-sand-300 rounded-xl p-2.5 text-sm text-forest-900 focus:outline-none focus:border-gold-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-forest-500 uppercase mb-1">
                        Security Watermark
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Confidential for John Doe"
                        value={customWatermark}
                        onChange={(e) => setCustomWatermark(e.target.value)}
                        className="w-full bg-white border border-sand-300 rounded-xl p-2.5 text-sm text-forest-900 focus:outline-none focus:border-gold-500"
                      />
                    </div>
                  </div>

                  {/* Live Watermark Preview Banner */}
                  <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-xl text-xs space-y-1 text-amber-900">
                    <span className="font-bold flex items-center gap-1.5 text-amber-800">
                      <Shield size={14} className="text-amber-600" /> Live Watermark Preview:
                    </span>
                    <p className="font-mono text-[11px] text-amber-900 bg-amber-100/80 p-2 rounded border border-amber-200/60 truncate">
                      🔒 {customWatermark.trim() || recipientEmail.trim() || `CONFIDENTIAL • ${currentUser?.displayName || 'RESTRICTED VIEW'}`}
                    </p>
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleCreateShare}
                    disabled={isGenerating}
                    className="w-full py-3.5 bg-forest-900 text-white rounded-xl font-bold text-sm hover:bg-gold-600 shadow-lg shadow-forest-900/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Generating Token...</span>
                      </>
                    ) : (
                      <>
                        <Lock size={16} />
                        <span>Generate {shareType === 'view_once' ? 'View Once' : 'Share'} Link</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3 animate-fadeIn">
              {existingShares.length === 0 ? (
                <div className="py-12 text-center text-forest-400">
                  <Share2 size={36} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm font-medium">No share links created for this document yet.</p>
                </div>
              ) : (
                existingShares.map((share) => {
                  const isExpired = new Date(share.expiresAt) < new Date();
                  const isRevokedOrConsumed = share.status === 'consumed' || share.status === 'revoked';

                  return (
                    <div
                      key={share.id}
                      className="p-4 bg-sand-50/70 rounded-2xl border border-sand-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-forest-900 text-xs">
                            {share.shareType === 'view_once' ? 'View Once Link' : 'Normal Share Link'}
                          </span>
                          {getStatusBadge(share.status, share.expiresAt)}
                        </div>
                        <p className="text-[11px] text-forest-500">
                          Created {new Date(share.createdAt).toLocaleDateString()} at {new Date(share.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Expires {new Date(share.expiresAt).toLocaleDateString()}
                        </p>
                        {share.recipientWatermark && (
                          <p className="text-[11px] text-amber-800 font-mono font-medium">
                            Watermark: "{share.recipientWatermark}"
                          </p>
                        )}
                        {share.consumedAt && (
                          <p className="text-[11px] text-forest-400">
                            Closed/Consumed on {new Date(share.consumedAt).toLocaleDateString()} at {new Date(share.consumedAt).toLocaleTimeString()}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!isRevokedOrConsumed && !isExpired && (
                          <>
                            <button
                              onClick={() => handleCopyLink(share.token)}
                              className="px-3 py-1.5 bg-white border border-sand-200 hover:border-gold-300 text-forest-700 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1"
                              title="Copy Link"
                            >
                              <Copy size={12} />
                              <span>Copy</span>
                            </button>
                            <button
                              onClick={() => handleNativeShare(share.token)}
                              className="px-3 py-1.5 bg-sky-50 border border-sky-200 text-sky-700 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1"
                              title="Share Link"
                            >
                              <Send size={12} />
                              <span>Share</span>
                            </button>
                            <button
                              onClick={() => handleRevokeShare(share.id)}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                              title="Revoke Link"
                            >
                              <ShieldAlert size={12} />
                              <span>Revoke</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-sand-200 bg-sand-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-forest-600 hover:bg-sand-200/50 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
