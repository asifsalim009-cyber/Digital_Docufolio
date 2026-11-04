import React, { useState, useEffect, useRef } from 'react';
import { ViewOnceShare, DocumentFile } from '../types';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { Shield, ShieldAlert, Lock, AlertCircle, Eye, X, Clock, CheckCircle2, ChevronRight, FileText, Sparkles, User, Calendar, Tag, AlertTriangle } from 'lucide-react';

interface ViewOnceViewerProps {
  token: string;
  onExit: () => void;
}

export const ViewOnceViewer: React.FC<ViewOnceViewerProps> = ({ token, onExit }) => {
  const [share, setShare] = useState<ViewOnceShare | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeFileIndex, setActiveFileIndex] = useState(0);

  const sessionKeyRef = useRef<string>('');
  const hasStartedSessionRef = useRef(false);

  // Print prevention & keydown blockers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Ctrl+P / Cmd+P (Print)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        alert('Printing is disabled for this View-Once document.');
        return false;
      }
      // Block Ctrl+S / Cmd+S (Save)
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        alert('Saving is disabled for this View-Once document.');
        return false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // Listen to Firestore document state
  useEffect(() => {
    if (!token) {
      setLoading(false);
      setErrorMessage('Invalid share token.');
      return;
    }

    const shareDocRef = doc(db, 'viewOnceShares', token);

    const unsubscribe = onSnapshot(shareDocRef, (snapshot) => {
      setLoading(false);
      if (!snapshot.exists()) {
        setShare(null);
        setErrorMessage('Document Unavailable: This document link does not exist or has been removed.');
        return;
      }

      const data = { id: snapshot.id, ...snapshot.data() } as ViewOnceShare;
      setShare(data);

      const isExpired = new Date(data.expiresAt) < new Date();
      if (isExpired && (data.status === 'available' || data.status === 'viewing')) {
        setErrorMessage('Document Unavailable: This link has expired.');
      } else if (data.status === 'consumed') {
        setSessionEnded(true);
      } else if (data.status === 'revoked') {
        setErrorMessage('Document Unavailable: Access to this document has been revoked by the owner.');
      }
    }, (error) => {
      console.error('Error fetching share document:', error);
      setLoading(false);
      setErrorMessage('Failed to load document. Please check your network connection.');
    });

    return () => unsubscribe();
  }, [token]);

  // Session end handler (invalidates token in Firestore)
  const consumeSession = async () => {
    if (!share || share.shareType !== 'view_once') return;
    try {
      const shareDocRef = doc(db, 'viewOnceShares', token);
      await updateDoc(shareDocRef, {
        status: 'consumed',
        consumedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to consume session:', err);
    }
  };

  // Auto-cleanup on unmount, tab close, or navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasStartedSessionRef.current && share?.shareType === 'view_once' && share?.status !== 'consumed') {
        // Mark as consumed immediately
        consumeSession();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      if (hasStartedSessionRef.current && share?.shareType === 'view_once' && share?.status !== 'consumed') {
        consumeSession();
      }
    };
  }, [share, token]);

  const handleStartSession = async () => {
    if (!share) return;

    // If Normal Share, open immediately
    if (share.shareType === 'normal') {
      setSessionActive(true);
      return;
    }

    // If View Once Share:
    const sessionKey = Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessionKeyRef.current = sessionKey;
    sessionStorage.setItem(`view_once_active_${token}`, sessionKey);
    hasStartedSessionRef.current = true;

    try {
      const shareDocRef = doc(db, 'viewOnceShares', token);
      await updateDoc(shareDocRef, {
        status: 'viewing',
        sessionStartedAt: new Date().toISOString(),
        currentSessionKey: sessionKey,
        viewedAt: new Date().toISOString()
      });
      setSessionActive(true);
    } catch (err) {
      console.error('Error starting session:', err);
      // If direct update failed, still allow local session if status was available
      setSessionActive(true);
    }
  };

  const handleCloseViewer = async () => {
    if (share?.shareType === 'view_once') {
      await consumeSession();
      setSessionEnded(true);
    }
    setSessionActive(false);
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f1eb] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-sand-200 shadow-xl max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="font-display font-bold text-lg text-forest-900">Verifying Security Token...</h3>
          <p className="text-xs text-forest-500">Checking document authorization and access state.</p>
        </div>
      </div>
    );
  }

  // 2. Unavailable / Expired / Consumed / Revoked State
  const isExpired = share ? new Date(share.expiresAt) < new Date() : false;
  const isUnavailable = !share || share.status === 'consumed' || share.status === 'revoked' || isExpired || sessionEnded || !!errorMessage;

  if (isUnavailable) {
    return (
      <div className="min-h-screen bg-[#f4f1eb] flex items-center justify-center p-4">
        <style dangerouslySetInnerHTML={{ __html: `@media print { body { display: none !important; } }` }} />
        <div className="bg-white p-8 md:p-10 rounded-3xl border border-sand-200 shadow-2xl max-w-lg w-full text-center space-y-6 animate-fadeIn">
          
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border-4 border-red-100 shadow-sm">
            <Lock size={32} />
          </div>

          <div className="space-y-2">
            <h2 className="font-display font-bold text-2xl text-forest-900">
              Document Unavailable
            </h2>
            <p className="text-sm font-semibold text-red-600">
              This document has already been viewed, revoked, or has expired.
            </p>
          </div>

          <div className="p-4 bg-sand-50 rounded-2xl border border-sand-200 text-left text-xs text-forest-600 space-y-2">
            <div className="flex items-center gap-2 font-bold text-forest-800">
              <ShieldAlert size={14} className="text-gold-600" />
              <span>Security Guarantee</span>
            </div>
            <p className="leading-relaxed">
              This document was shared with <strong>View Once</strong> protection. To protect sensitive privacy, once the viewing session has been completed or closed, the security token is permanently revoked and can never be reopened.
            </p>
          </div>

          <button
            onClick={onExit}
            className="w-full py-3.5 bg-forest-900 hover:bg-forest-800 text-white rounded-xl font-bold text-sm shadow-md transition-all"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  // 3. Pre-View Gate / Verification Screen (Before entering active session)
  if (!sessionActive) {
    return (
      <div className="min-h-screen bg-[#f4f1eb] flex items-center justify-center p-4">
        <style dangerouslySetInnerHTML={{ __html: `@media print { body { display: none !important; } }` }} />
        <div className="bg-white p-8 md:p-10 rounded-3xl border border-sand-200 shadow-2xl max-w-lg w-full space-y-6 animate-fadeIn">
          
          {/* Header Badge */}
          <div className="flex items-center justify-between border-b border-sand-200 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-forest-900 text-gold-400 flex items-center justify-center shadow-sm">
                <Shield size={16} />
              </div>
              <span className="font-bold text-xs uppercase tracking-wider text-forest-800">
                Secure Document Share
              </span>
            </div>
            <span className="bg-gold-100 text-gold-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
              {share.shareType === 'view_once' ? 'View Once' : 'Standard Share'}
            </span>
          </div>

          {/* Document Summary Card */}
          <div className="p-5 bg-sand-50 rounded-2xl border border-sand-200 space-y-3">
            <p className="text-[11px] font-bold text-gold-600 uppercase tracking-wider">
              {share.payload.type}
            </p>
            <h3 className="font-display font-bold text-xl text-forest-900 leading-tight">
              {share.payload.customName || share.payload.type}
            </h3>
            <div className="flex items-center gap-3 text-xs text-forest-600">
              <span className="flex items-center gap-1 font-medium">
                <User size={12} /> Owner: {share.payload.ownerName}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-medium">
                <FileText size={12} /> {share.payload.files?.length || 0} File(s)
              </span>
            </div>
          </div>

          {/* View Once Warning Notice */}
          {share.shareType === 'view_once' ? (
            <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-2xl space-y-2 text-amber-950 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                <span>Single-Use Session Notice</span>
              </div>
              <p className="leading-relaxed">
                You are about to start a single-use viewing session. Once you open this document, it will remain visible until you close or leave this page. <strong>You will not be able to reopen this link later.</strong>
              </p>
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 text-xs leading-relaxed">
              This document has been shared with you for standard viewing and reference.
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleStartSession}
            className="w-full py-4 bg-forest-900 hover:bg-gold-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-forest-900/10 transition-all flex items-center justify-center gap-2"
          >
            <Eye size={18} />
            <span>Open Document</span>
          </button>
        </div>
      </div>
    );
  }

  // 4. Active Dedicated View-Once Document Viewer
  const files: DocumentFile[] = share.payload.files || [];
  const currentFile = files[activeFileIndex] || null;
  const watermarkText = share.recipientWatermark || share.recipientEmail || 'CONFIDENTIAL • VIEW ONCE';
  const timestamp = new Date().toLocaleString();

  return (
    <div className="fixed inset-0 z-50 bg-forest-950 text-white flex flex-col select-none overflow-hidden animate-fadeIn">
      {/* Strict CSS Print Block */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body, html, * {
              display: none !important;
              visibility: hidden !important;
            }
          }
        `
      }} />

      {/* Top Header Bar */}
      <header className="h-16 px-4 md:px-6 bg-forest-900/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gold-500/20 text-gold-400 border border-gold-500/30 flex items-center justify-center shadow-sm">
            <Lock size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-sm md:text-base text-white truncate max-w-xs md:max-w-md">
                {share.payload.customName || share.payload.type}
              </h1>
              <span className="hidden sm:inline-block bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                {share.shareType === 'view_once' ? 'View-Only Session' : 'Standard Share'}
              </span>
            </div>
            <p className="text-[11px] text-white/60">
              Belongs to: {share.payload.ownerName} • {share.payload.type}
            </p>
          </div>
        </div>

        {/* Header Right: Session Badge & Close */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleCloseViewer}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-red-600/30 transition-all flex items-center gap-1.5"
            title="End Session and Revoke Access"
          >
            <X size={14} />
            <span>{share.shareType === 'view_once' ? 'Close & End Session' : 'Close Document'}</span>
          </button>
        </div>
      </header>

      {/* Main Document Content Stage */}
      <div className="flex-1 relative flex items-center justify-center p-4 md:p-8 overflow-auto">
        
        {/* Dynamic Security Watermark Overlay */}
        <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-around items-center opacity-30 overflow-hidden select-none p-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="text-amber-300 text-xs md:text-sm font-mono font-bold tracking-widest -rotate-12 whitespace-nowrap drop-shadow-md select-none"
            >
              🔒 {watermarkText} • {timestamp} • TOKEN:{share.token.substring(0, 8)}
            </div>
          ))}
        </div>

        {/* Content Renderer */}
        <div className="relative z-10 max-w-4xl max-h-full w-full flex flex-col items-center justify-center">
          {currentFile ? (
            currentFile.mimeType.startsWith('image/') ? (
              <img
                src={currentFile.url}
                alt={currentFile.name}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
                className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/10 select-none pointer-events-none"
              />
            ) : (
              <div className="w-full h-[75vh] bg-white rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative">
                <iframe
                  src={`${currentFile.url}#toolbar=0&navpanes=0`}
                  className="w-full h-full border-0"
                  title="PDF Viewer"
                />
              </div>
            )
          ) : (
            <div className="text-center text-white/50 space-y-2">
              <FileText size={48} className="mx-auto opacity-30" />
              <p>No document files found.</p>
            </div>
          )}

          {/* Multiple Files Thumbnail Selector */}
          {files.length > 1 && (
            <div className="mt-4 flex items-center gap-2 bg-forest-900/80 p-2 rounded-2xl border border-white/10 backdrop-blur-md z-30">
              {files.map((file, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveFileIndex(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeFileIndex === idx
                      ? 'bg-gold-500 text-forest-950 shadow-md'
                      : 'text-white/70 hover:bg-white/10'
                  }`}
                >
                  <FileText size={12} />
                  <span>Page {idx + 1}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Footer Notice */}
      <footer className="h-10 bg-forest-900/90 border-t border-white/10 px-4 flex items-center justify-between text-[11px] text-white/60 z-30">
        <div className="flex items-center gap-2">
          <Shield size={12} className="text-gold-400" />
          <span>Protected by Secure View-Once Enclave</span>
        </div>
        <div className="hidden sm:block">
          Exiting or refreshing this window will invalidate your viewing token.
        </div>
      </footer>
    </div>
  );
};
