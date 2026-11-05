import React, { useState, useMemo, useRef, useEffect } from 'react';
import { UserProfile, StoredDocument, DocumentType, RelationType, DocumentFile, SubscriptionPlan } from '../types';
import { DOCUMENT_TYPES_LIST, RELATIONS_LIST } from '../constants';
import { Plus, Search, Cloud, FileText, Calendar, User, X, UploadCloud, Trash2, ExternalLink, RefreshCw, AlertCircle, CheckCircle, ChevronRight, Sparkles, Loader2, Users, Download, Eye, Image as ImageIcon, ChevronDown, ChevronUp, Mic, MicOff, ArrowLeft, Save, Briefcase, Lock, Share2, Landmark, GraduationCap, HeartPulse, Car, WalletCards, ShieldCheck, Building2, Camera as CameraIcon } from 'lucide-react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ShareModal } from './ShareModal';
import { BiometricLock } from './BiometricLock';
import { createCalendarEvent } from '../googleCalendar';
import { useVoiceSearch } from '../useVoiceSearch';
import { uploadToGoogleDrive } from '../drive';
import { apiFetch } from '../api';

interface WalletProps {
  profile?: UserProfile;
  onUseAiCredit?: (amount?: number) => boolean;
  documents: StoredDocument[];
  currentPlan: SubscriptionPlan;
  onNavigateToPlans: () => void;
  onAddDocument: (doc: StoredDocument) => void;
  onUpdateDocument: (doc: StoredDocument) => void;
  onDeleteDocument: (id: string) => void;
}

const getPlanLimits = (plan: SubscriptionPlan) => {
  switch (plan) {
    case SubscriptionPlan.BUSINESS: return { maxDocs: Infinity, maxFileSizeMB: 100 };
    case SubscriptionPlan.ELITE: return { maxDocs: 5000, maxFileSizeMB: 50 };
    case SubscriptionPlan.PRO: return { maxDocs: 1000, maxFileSizeMB: 15 };
    case SubscriptionPlan.PREMIUM: return { maxDocs: 200, maxFileSizeMB: 5 };
    case SubscriptionPlan.BASIC:
    default: return { maxDocs: 10, maxFileSizeMB: 2 };
  }
};

const isDocumentOwnerProfile = (ownerName?: string, profile?: UserProfile): boolean => {
  if (!ownerName) return false;
  const cleanOwner = ownerName.trim().toLowerCase();
  if (cleanOwner === 'self' || cleanOwner === '') return true;

  const profileFullName = (profile?.fullName || '').trim().toLowerCase();
  const profileNickName = (profile?.nickName || '').trim().toLowerCase();

  if (!profileFullName && !profileNickName) {
    return cleanOwner === 'self';
  }

  if (profileFullName && cleanOwner === profileFullName) return true;
  if (profileNickName && cleanOwner === profileNickName) return true;

  if (profileFullName) {
    const ownerParts = cleanOwner.split(/\s+/).filter(p => p.length >= 2);
    const profileParts = profileFullName.split(/\s+/).filter(p => p.length >= 2);

    const matchingParts = ownerParts.filter(part => profileParts.includes(part));
    if (profileParts.length >= 2 && matchingParts.length >= 2) return true;
    if (profileParts.length === 1 && matchingParts.length >= 1) return true;
  }

  return false;
};

const isBusinessNature = (ownerName?: string, docType?: DocumentType | string, customName?: string): boolean => {
  const textToScan = `${ownerName || ''} ${docType || ''} ${customName || ''}`.toLowerCase();

  const businessKeywords = [
    'ltd', 'limited', 'inc', 'incorporated', 'llc', 'corp', 'corporation',
    'enterprise', 'enterprises', 'business', 'company', 'co.', 'group', 'holdings',
    'ventures', 'solutions', 'services', 'agency', 'associates', 'consulting',
    'store', 'shop', 'mart', 'traders', 'trading', 'industry', 'industries',
    'technologies', 'tech', 'studio', 'partners', 'firm', 'sacco', 'society',
    'organisation', 'organization', 'foundation', 'club', 'hotel', 'resort'
  ];

  const words = textToScan.split(/[\s,.\-/()]+/);
  if (words.some(word => businessKeywords.includes(word))) {
    return true;
  }

  const businessDocTypes: (DocumentType | string)[] = [
    DocumentType.BUSINESS_LICENSE,
    DocumentType.TAX_CERTIFICATE,
    DocumentType.CONTRACT,
    DocumentType.INCORPORATION_CERTIFICATE,
    DocumentType.ASSET_RECORD,
    DocumentType.STAFF_DETAILS,
    DocumentType.VEHICLE_DETAILS,
    'Business License',
    'Tax Certificate',
    'Contract',
    'Incorporation Certificate',
    'Asset Record',
    'Staff Details',
    'Vehicle Details',
    'Certificate of Incorporation',
    'CR12',
    'KRA PIN (Company)',
    'VAT Certificate'
  ];

  if (docType && businessDocTypes.some(bt => bt.toString().toLowerCase() === docType.toString().toLowerCase())) {
    return true;
  }

  return false;
};

const Wallet: React.FC<WalletProps> = ({ profile, onUseAiCredit, documents, currentPlan, onNavigateToPlans, onAddDocument, onUpdateDocument, onDeleteDocument }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { isListening: isVoiceSearching, toggleListening: toggleVoiceSearch } = useVoiceSearch((text) => setSearchTerm(text));
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [activeCategory, setActiveCategory] = useState<'PERSONAL' | 'OTHERS' | 'BUSINESS'>('PERSONAL');

  const handleDownload = (url: string, name: string, _mimeType?: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name || 'document';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDriveUpload = async (url: string, name: string, mimeType?: string) => {
    try {
      await uploadToGoogleDrive(url, name, mimeType || 'application/octet-stream');
      alert('Successfully saved to Google Drive!');
    } catch (err: any) {
      alert(err?.message || 'Failed to save to Google Drive');
    }
  };

  const isPaidActive = Boolean(currentPlan !== SubscriptionPlan.BASIC && profile?.subscriptionStatus === 'active');
  const isBasic = !isPaidActive;
  const isPremium = isPaidActive && currentPlan === SubscriptionPlan.PREMIUM;
  const isPro = isPaidActive && currentPlan === SubscriptionPlan.PRO;
  const isBusinessPlan = isPaidActive && (currentPlan === SubscriptionPlan.BUSINESS || currentPlan === SubscriptionPlan.WINDOWS_BUSINESS);
  const isProOrHigher = isPaidActive && (currentPlan === SubscriptionPlan.PRO || currentPlan === SubscriptionPlan.ELITE || currentPlan === SubscriptionPlan.BUSINESS || currentPlan === SubscriptionPlan.WINDOWS_BUSINESS);

  const handleCategoryClick = (cat: 'PERSONAL' | 'OTHERS' | 'BUSINESS') => {
    if (cat === 'OTHERS' && (!isPaidActive || (currentPlan !== SubscriptionPlan.PRO && currentPlan !== SubscriptionPlan.ELITE && currentPlan !== SubscriptionPlan.BUSINESS && currentPlan !== SubscriptionPlan.WINDOWS_BUSINESS))) {
       alert("The 'Others / Someone Else' document vault is a Pro feature (KES 1,000/mo). Please upgrade your subscription to access it.");
       onNavigateToPlans();
       return;
    }
    if (cat === 'BUSINESS' && (!isPaidActive || (currentPlan !== SubscriptionPlan.BUSINESS && currentPlan !== SubscriptionPlan.WINDOWS_BUSINESS))) {
       alert("The Business document vault requires an active Business subscription (KES 7,000/mo). Please upgrade to access it.");
       onNavigateToPlans();
       return;
    }
    setActiveCategory(cat);
  };

  const handleOpenShare = (doc: StoredDocument) => {
    if (!isPaidActive) {
      alert("View-Once Secure Sharing is a paid subscription feature. Please upgrade your subscription to share documents securely.");
      onNavigateToPlans();
      return;
    }
    setSharingDoc(doc);
  };
  
  // Add Document State
  const [isAdding, setIsAdding] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [namePrompt, setNamePrompt] = useState<{ detectedName: string } | null>(null);

  // Voice State
  const [isListening, setIsListening] = useState(false);

  const [newDoc, setNewDoc] = useState<Partial<StoredDocument>>({
    type: DocumentType.ID_CARD,
    relation: 'SELF',
    ownerName: 'Self',
    syncToGoogleCalendar: true,
    files: []
  });
  
  // Document View State
  const [selectedDoc, setSelectedDoc] = useState<StoredDocument | null>(null);
  const [docToUnlock, setDocToUnlock] = useState<StoredDocument | null>(null);
  const [previewFile, setPreviewFile] = useState<DocumentFile | null>(null);
  const [sharingDoc, setSharingDoc] = useState<StoredDocument | null>(null);
  
  // Renewal State
  const [isRenewing, setIsRenewing] = useState(false);
  const [renewalDate, setRenewalDate] = useState('');
  const [renewalFile, setRenewalFile] = useState<DocumentFile | null>(null);

  // Group Navigation State (Folder View)
  const [viewingRelation, setViewingRelation] = useState<string | null>(null);
  const [viewingOwner, setViewingOwner] = useState<string | null>(null);

  // Edit Document State
  const [isEditingDoc, setIsEditingDoc] = useState(false);
  const [editDocForm, setEditDocForm] = useState<Partial<StoredDocument>>({});
  const [editDocError, setEditDocError] = useState<string | null>(null);

  const handleStartEditDoc = () => {
    if (!selectedDoc) return;
    setEditDocForm({ ...selectedDoc });
    setIsEditingDoc(true);
    setEditDocError(null);
  };

  const handleCancelEditDoc = () => {
    setIsEditingDoc(false);
    setEditDocForm({});
    setEditDocError(null);
  };

  const handleSaveEditDoc = () => {
    if (!editDocForm.ownerName || !editDocForm.ownerName.trim()) {
      setEditDocError("Document owner name is required.");
      return;
    }
    if (!editDocForm.type) {
      setEditDocError("Document type is required.");
      return;
    }

    const updatedDoc: StoredDocument = {
      ...selectedDoc!,
      type: editDocForm.type || selectedDoc!.type,
      ownerName: editDocForm.ownerName.trim(),
      documentNumber: editDocForm.documentNumber?.trim() || '',
      expiryDate: editDocForm.expiryDate || '',
      customName: editDocForm.customName?.trim() || '',
      customType: editDocForm.customType?.trim() || '',
    };

    onUpdateDocument(updatedDoc);
    setSelectedDoc(updatedDoc);
    setIsEditingDoc(false);
    setEditDocForm({});
    setEditDocError(null);
    setScanMessage("✨ Document updated successfully!");
    setTimeout(() => setScanMessage(null), 3000);
  };

  // Duplicate Detection State
  const [duplicateModalInfo, setDuplicateModalInfo] = useState<{
    existingDoc: StoredDocument;
    pendingDocData: Partial<StoredDocument>;
  } | null>(null);

  const handleKeepBothDuplicate = () => {
    if (!duplicateModalInfo) return;
    const { pendingDocData } = duplicateModalInfo;

    const baseName = pendingDocData.customName || pendingDocData.type;
    const sameTypeCount = (documents || []).filter(d => (d.customName || d.type).startsWith(baseName as string)).length;
    const suffix = ` (${sameTypeCount + 1})`;

    const modifiedDoc = {
      ...pendingDocData,
      customName: baseName + suffix
    };

    setDuplicateModalInfo(null);
    executeSaveNewDoc(modifiedDoc);
  };

  const handleCancelDuplicate = () => {
    setDuplicateModalInfo(null);
  };

  // Reset navigation when changing categories
  useEffect(() => {
    setViewingOwner(null);
  }, [activeCategory]);

  // --- AI Logic ---

  const compressImageForScan = (base64Url: string, maxWidth = 1200, maxHeight = 1200, quality = 0.85): Promise<{ base64Data: string; mimeType: string }> => {
    return new Promise((resolve) => {
      const parts = base64Url.split(',');
      const rawData = parts.length > 1 ? parts[1] : parts[0];
      const initialMime = base64Url.startsWith('data:') ? (base64Url.split(';')[0].split(':')[1] || 'image/jpeg') : 'image/jpeg';

      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return resolve({ base64Data: rawData, mimeType: initialMime });
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve({ base64Data: rawData, mimeType: initialMime });
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        const compressedParts = compressedDataUrl.split(',');
        resolve({ base64Data: compressedParts[1] || compressedParts[0], mimeType: 'image/jpeg' });
      };

      img.onerror = () => {
        resolve({ base64Data: rawData, mimeType: initialMime });
      };

      img.src = base64Url.startsWith('data:') ? base64Url : `data:${initialMime};base64,${rawData}`;
    });
  };

  const analyzeDocumentImage = async (base64Data: string, mimeType: string): Promise<any> => {
      if (!isPaidActive || !isProOrHigher) {
          throw new Error("AI Document Scanning requires an active Pro or higher subscription.");
      }
      if (onUseAiCredit && !onUseAiCredit(1)) {
          throw new Error("You have no AI credits remaining. Please upgrade your plan.");
      }
      const supportedTypes = DOCUMENT_TYPES_LIST.filter(t => t !== DocumentType.OTHER_DOCUMENT).join(', ');
      
      const compressed = await compressImageForScan(base64Data);

      const res = await apiFetch('/api/scan-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: compressed.base64Data, mimeType: compressed.mimeType, supportedTypes })
      });
      
      if (!res.ok) {
         const errData = await res.json().catch(() => ({}));
         throw new Error(errData.error || "Failed to scan document via server. Please try again.");
      }
      
      const data = await res.json();
      return data || {};
  };

  const applyScanResultToNewDoc = (result: any) => {
    const autofilledFields: string[] = [];

    setNewDoc(prev => {
        const updates: Partial<StoredDocument> = {};
        
        // Document Type
        if (result.documentType && typeof result.documentType === 'string') {
             const cleanType = result.documentType.trim();
             const exactMatch = DOCUMENT_TYPES_LIST.find(t => t.toLowerCase() === cleanType.toLowerCase());
             if (exactMatch) {
                 updates.type = exactMatch;
                 autofilledFields.push(`Type: ${exactMatch}`);
             } else {
                 const partialMatch = DOCUMENT_TYPES_LIST.find(t => 
                   t.toLowerCase().includes(cleanType.toLowerCase()) || cleanType.toLowerCase().includes(t.toLowerCase())
                 );
                 if (partialMatch) {
                     updates.type = partialMatch;
                     autofilledFields.push(`Type: ${partialMatch}`);
                 } else if (cleanType.length > 0) {
                     updates.type = DocumentType.OTHER_DOCUMENT;
                     updates.customType = cleanType;
                     autofilledFields.push(`Type: ${cleanType}`);
                 }
             }
        }

        // Document Number
        if (result.documentNumber && typeof result.documentNumber === 'string') {
          const cleanNum = result.documentNumber.trim();
          if (cleanNum && !['n/a', 'none', 'null', 'unknown', '-'].includes(cleanNum.toLowerCase())) {
            updates.documentNumber = cleanNum;
            autofilledFields.push(`No: ${cleanNum}`);
          }
        }

        // Expiration Date
        if (result.expiryDate && typeof result.expiryDate === 'string') {
          const cleanExpiry = result.expiryDate.trim();
          if (cleanExpiry && !['n/a', 'none', 'null', 'unknown', '-'].includes(cleanExpiry.toLowerCase())) {
            updates.expiryDate = cleanExpiry;
            autofilledFields.push(`Expires: ${cleanExpiry}`);
          }
        }

        // Owner / Cardholder Name & Auto-routing
        const detectedName = (result.fullName && typeof result.fullName === 'string') ? result.fullName.trim() : '';
        const detectedType = updates.type || prev.type || '';

        if (detectedName && !['n/a', 'none', 'null', 'unknown', '-'].includes(detectedName.toLowerCase())) {
          const isOwner = isDocumentOwnerProfile(detectedName, profile);
          const isBiz = isBusinessNature(detectedName, detectedType, prev.customName);

          if (isBiz) {
            updates.ownerName = detectedName;
            updates.relation = RelationType.BUSINESS;
            autofilledFields.push(`Name: ${detectedName} (Saved under Biz Folder)`);
          } else if (isOwner) {
            updates.ownerName = 'Self';
            updates.relation = 'SELF';
            autofilledFields.push(`Name: Self (${profile?.fullName || detectedName})`);
          } else {
            updates.ownerName = detectedName;
            updates.relation = RelationType.OTHER;
            autofilledFields.push(`Name: ${detectedName} (Saved under Others)`);
            setTimeout(() => {
              setNamePrompt({ detectedName });
            }, 400);
          }
        } else if (detectedType && isBusinessNature('', detectedType, prev.customName)) {
          updates.relation = RelationType.BUSINESS;
          if (!updates.ownerName || updates.ownerName === 'Self') {
            updates.ownerName = profile?.companyName || 'Business';
          }
          autofilledFields.push(`Type: ${detectedType} (Saved under Biz Folder)`);
        }

        // Auto-Suggested Tags
        if (Array.isArray(result.suggestedTags) && result.suggestedTags.length > 0) {
          const cleanTags = result.suggestedTags
            .filter((t: any) => typeof t === 'string' && t.trim().length > 0)
            .map((t: string) => t.trim());
          if (cleanTags.length > 0) {
            updates.tags = Array.from(new Set([...(prev.tags || []), ...cleanTags]));
            autofilledFields.push(`Tags: ${cleanTags.join(', ')}`);
          }
        }

        return { ...prev, ...updates };
    });

    if (autofilledFields.length > 0) {
      setScanMessage(`✨ Autofilled: ${autofilledFields.join(' • ')}`);
    } else {
      setScanMessage("Scan completed. No distinct document details found — please verify or enter them manually.");
    }

    setTimeout(() => {
      setScanMessage(null);
    }, 7000);
  };

  const scanNewDocument = async (base64Data: string, mimeType: string) => {
    if (!isPaidActive || !isProOrHigher) {
      setScanMessage("AI Auto-Scan requires an active Pro or higher subscription.");
      setTimeout(() => setScanMessage(null), 5000);
      return;
    }
    setIsScanning(true);
    setScanMessage("AI is scanning document for details...");
    try {
        const result = await analyzeDocumentImage(base64Data, mimeType);
        applyScanResultToNewDoc(result);
    } catch (error: any) {
      console.warn("Scan failed:", error);
      const msg = (typeof error === 'string' ? error : (error?.message || JSON.stringify(error) || "")).toLowerCase();
      if (msg.includes("quota") || msg.includes("resource_exhausted") || msg.includes("rate") || msg.includes("limit") || msg.includes("permission") || msg.includes("unauthenticated") || msg.includes("429") || msg.includes("403") || msg.includes("401") || error?.status === 403 || error?.status === 401 || error?.status === 429) {
        setScanMessage("API limit or permission error. Please enter details manually.");
      } else {
        setScanMessage(error?.message || "Could not extract details automatically.");
      }
      setTimeout(() => setScanMessage(null), 5000);
    } finally {
      setIsScanning(false);
    }
  };

  const triggerScanOnSelectedDoc = async () => {
    if (!selectedDoc || !selectedDoc.files.length) return;
    if (!isPaidActive || !isProOrHigher) {
      alert("AI Document OCR Extraction is a Pro feature. Please upgrade your subscription to unlock.");
      onNavigateToPlans();
      return;
    }
    const imageFile = selectedDoc.files.find(f => f.mimeType.startsWith('image/'));
    if (!imageFile) {
        setScanMessage("No image file found to scan.");
        setTimeout(() => setScanMessage(null), 3000);
        return;
    }

    setIsScanning(true);
    setScanMessage("AI is updating document details...");
    try {
        const result = await analyzeDocumentImage(imageFile.url, imageFile.mimeType);
        
        const updated: StoredDocument = { ...selectedDoc };
        const updatedFields: string[] = [];

        if (result.documentNumber && typeof result.documentNumber === 'string') {
          const cleanNum = result.documentNumber.trim();
          if (cleanNum && !['n/a', 'none', 'null', 'unknown', '-'].includes(cleanNum.toLowerCase())) {
            updated.documentNumber = cleanNum;
            updatedFields.push(`No: ${cleanNum}`);
          }
        }

        if (result.expiryDate && typeof result.expiryDate === 'string') {
          const cleanExpiry = result.expiryDate.trim();
          if (cleanExpiry && !['n/a', 'none', 'null', 'unknown', '-'].includes(cleanExpiry.toLowerCase())) {
            updated.expiryDate = cleanExpiry;
            updatedFields.push(`Expires: ${cleanExpiry}`);
          }
        }

        if (result.documentType && typeof result.documentType === 'string') {
          const cleanType = result.documentType.trim();
          const match = DOCUMENT_TYPES_LIST.find(t => t.toLowerCase() === cleanType.toLowerCase() || t.toLowerCase().includes(cleanType.toLowerCase()));
          if (match && match !== updated.type) {
            updated.type = match;
            updatedFields.push(`Type: ${match}`);
          }
        }

        if (result.fullName && typeof result.fullName === 'string') {
          const cleanName = result.fullName.trim();
          if (cleanName && !['n/a', 'none', 'null', 'unknown', '-'].includes(cleanName.toLowerCase()) && (!updated.ownerName || updated.ownerName === 'Self')) {
            updated.ownerName = cleanName;
            updatedFields.push(`Name: ${cleanName}`);
          }
        }
        
        if (updatedFields.length > 0) {
            setSelectedDoc(updated);
            onUpdateDocument(updated);
            setScanMessage(`✨ Updated: ${updatedFields.join(' • ')}`);
        } else {
            setScanMessage("No new details found on this document image.");
        }
    } catch (e: any) {
        console.warn("Update scan failed:", e);
        const msg = (typeof e === 'string' ? e : (e?.message || JSON.stringify(e) || "")).toLowerCase();
        const isRateOrPerm = msg.includes("quota") || msg.includes("resource_exhausted") || msg.includes("rate") || msg.includes("limit") || msg.includes("permission") || msg.includes("unauthenticated") || msg.includes("429") || msg.includes("403") || msg.includes("401") || e?.status === 403 || e?.status === 401 || e?.status === 429;
        
        if (isRateOrPerm) {
            setScanMessage("API limit or permission reached.");
        } else {
            setScanMessage("Failed to update details.");
        }
    } finally {
        setIsScanning(false);
        setTimeout(() => setScanMessage(null), 5000);
    }
  };

  // --- Voice Command Logic ---
  const handleVoiceCommand = async () => {
      setIsListening(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        const audioChunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);
        
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
                 const base64Audio = (reader.result as string).split(',')[1];
                 
                 try {
                     const res = await apiFetch('/api/wallet-voice', {
                       method: 'POST',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({ audio: base64Audio, mimeType: 'audio/webm' })
                     });

                     if (!res.ok) {
                       throw new Error("Voice command failed");
                     }

                     const result = await res.json();
                     if (result.action === 'SCAN') {
                         if (selectedDoc) {
                             triggerScanOnSelectedDoc();
                         } else {
                             setScanMessage("Open a document to scan first.");
                         }
                     }
                 } catch (e) {
                     console.error("Voice AI Error", e);
                     setScanMessage("Voice command failed. Try again.");
                 }
            };
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        // Record for 3 seconds
        setTimeout(() => {
            if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
            setIsListening(false);
        }, 3000);

      } catch (e) {
          console.error("Voice Error", e);
          setIsListening(false);
          setScanMessage("Microphone access needed for Hey Wallet.");
      }
  };


  // --- Event Handlers ---

  const compressImage = async (file: File): Promise<{base64: string, isImage: boolean}> => {
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        const objUrl = URL.createObjectURL(file);
        i.onload = () => {
          URL.revokeObjectURL(objUrl);
          resolve(i);
        };
        i.onerror = () => {
          URL.revokeObjectURL(objUrl);
          reject(new Error("Failed to load image"));
        };
        i.src = objUrl;
      });

      const MAX_WIDTH = 1920;
      const MAX_HEIGHT = 1920;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height = Math.round(height * (MAX_WIDTH / width));
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width = Math.round(width * (MAX_HEIGHT / height));
          height = MAX_HEIGHT;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("No canvas context");
      
      ctx.drawImage(img, 0, 0, width, height);

      // Free up memory aggressively
      img.src = '';
      
      return { base64: canvas.toDataURL('image/jpeg', 0.85), isImage: true };
    } catch (e) {
      console.warn("Failed to compress image, might not be an image", e);
      return { base64: '', isImage: false };
    }
  };

  const processFiles = async (files: FileList | File[]) => {
    if (files && files.length > 0) {
      for (const file of Array.from(files)) {
        // iOS Safari sometimes has empty file.type. Try to treat everything as an image unless it's explicitly a PDF.
        if (file.type === 'application/pdf') {
        if (file.size > 0.7 * 1024 * 1024) {
           alert(`PDF File is too large (${(file.size / (1024*1024)).toFixed(1)}MB). The maximum supported PDF size is 0.7MB due to database limits.`);
           return;
        }
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          
          const limits = getPlanLimits(currentPlan);
          const maxPdfSize = 0.7; // Firestore limit per document
          if (file.size > maxPdfSize * 1024 * 1024) { 
             alert(`PDF File is too large (${(file.size / (1024*1024)).toFixed(1)}MB). The maximum supported PDF size is ${maxPdfSize}MB due to database limits.`); 
             return; // block it
          }
          setNewDoc(prev => ({
            ...prev,
            files: [...(prev.files || []), {
              url: base64,
              name: file.name,
              mimeType: file.type
            }]
          }));
        } else {
          try {
            const result = await compressImage(file);
            if (result.isImage) {
               setNewDoc(prev => ({
                 ...prev,
                 files: [...(prev.files || []), {
                   url: result.base64,
                   name: file.name,
                   mimeType: 'image/jpeg'
                 }]
               }));
               // Await scan before processing next file to prevent concurrent API crashes
               await scanNewDocument(result.base64, 'image/jpeg');
            } else {
               // Fallback if not actually an image
               const base64 = await new Promise<string>((resolve) => {
                 const reader = new FileReader();
                 reader.onloadend = () => resolve(reader.result as string);
                 reader.readAsDataURL(file);
               });

               const limits = getPlanLimits(currentPlan);
               if (file.size > limits.maxFileSizeMB * 1024 * 1024) {
                  alert(`File is too large (${(file.size / (1024*1024)).toFixed(1)}MB). Your plan limits uploads to ${limits.maxFileSizeMB}MB.`);
                  return; // block it
               }
               setNewDoc(prev => ({
                 ...prev,
                 files: [...(prev.files || []), {
                   url: base64,
                   name: file.name,
                   mimeType: file.type || 'application/octet-stream'
                 }]
               }));
            }
          } catch (e) {
            console.error("File processing failed", e);
          }
        }
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleNativeCameraCapture = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 92,
        allowEditing: false,
        correctOrientation: true,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera
      });

      if (photo && photo.base64String) {
        const mimeType = photo.format ? `image/${photo.format}` : 'image/jpeg';
        const base64Url = `data:${mimeType};base64,${photo.base64String}`;
        const fileName = `camera_scan_${Date.now()}.${photo.format || 'jpg'}`;

        setNewDoc(prev => ({
          ...prev,
          files: [...(prev.files || []), {
            url: base64Url,
            name: fileName,
            mimeType: mimeType
          }]
        }));

        await scanNewDocument(base64Url, mimeType);
      }
    } catch (e: any) {
      // User cancelled or camera not available, fall back to file picker
      if (!e?.message?.includes("cancelled") && !e?.message?.includes("User cancelled")) {
        console.warn("Native camera capture fallback:", e);
      }
    }
  };

  const handleOpenAddModal = () => {
      if (profile?.subscriptionStatus === 'unpaid' || profile?.subscriptionStatus === 'past_due') {
          alert("Your subscription is unpaid or expired. Please renew your subscription to upload documents.");
          onNavigateToPlans();
          return;
      }
      const limits = getPlanLimits(currentPlan);
      if (documents.length >= limits.maxDocs) {
          alert(`You have reached the ${limits.maxDocs} document storage limit for your ${currentPlan || 'BASIC'} plan. Upgrade your plan to store more documents.`);
          onNavigateToPlans();
          return;
      }
      
      if (!isProOrHigher && activeCategory === 'OTHERS') {
          alert("The 'Others / Someone Else' vault requires an active Pro (KES 1,000/mo) or higher subscription. Please upgrade to access it.");
          onNavigateToPlans();
          return;
      }
      
      if (!isBusinessPlan && activeCategory === 'BUSINESS') {
          alert("The Business document vault requires an active Business subscription. Please upgrade to access it.");
          onNavigateToPlans();
          return;
      }

      setNewDoc({
        type: activeCategory === 'BUSINESS' ? DocumentType.BUSINESS_LICENSE : DocumentType.ID_CARD,
        relation: activeCategory === 'PERSONAL' ? 'SELF' : activeCategory === 'BUSINESS' ? RelationType.BUSINESS : RelationType.OTHER,
        ownerName: activeCategory === 'PERSONAL' ? 'Self' : '',
        files: []
      });
      setIsAdding(true);
  };

  const handleSaveNewDoc = async (skipDuplicateCheck: boolean = false) => {
    if (!newDoc.type || !newDoc.ownerName || !newDoc.files?.length) return;

    if (!skipDuplicateCheck) {
      const existing = (documents || []).find(d =>
        d.type === newDoc.type &&
        d.ownerName.toLowerCase() === (newDoc.ownerName || '').toLowerCase() &&
        ((d.documentNumber && newDoc.documentNumber && d.documentNumber === newDoc.documentNumber) ||
         (d.customName && newDoc.customName && d.customName.toLowerCase() === (newDoc.customName || '').toLowerCase()))
      );

      if (existing) {
        setDuplicateModalInfo({ existingDoc: existing, pendingDocData: newDoc });
        return;
      }
    }

    await executeSaveNewDoc(newDoc);
  };

  const executeSaveNewDoc = async (docData: Partial<StoredDocument>) => {
    const currentOwner = (docData.ownerName || '').trim();
    const isOwner = isDocumentOwnerProfile(currentOwner, profile);
    const isBiz = isBusinessNature(currentOwner, docData.type, docData.customName) || docData.relation === RelationType.BUSINESS || (docData.relation as string) === 'BUSINESS';

    let docOwner = currentOwner;
    let docRelation = docData.relation || 'SELF';

    if (isBiz) {
      docOwner = currentOwner === 'Self' ? (profile?.companyName || 'Business') : currentOwner;
      docRelation = RelationType.BUSINESS;
    } else if (isOwner) {
      docOwner = 'Self';
      docRelation = 'SELF';
    } else {
      if (docRelation === 'SELF' || !docRelation) {
        docRelation = RelationType.OTHER;
      }
    }

    const docObj: StoredDocument = {
      id: Math.random().toString(36).substr(2, 9),
      type: docData.type!,
      ownerName: docOwner,
      relation: docRelation,
      files: docData.files || [],
      dateUploaded: new Date().toISOString(),
      documentNumber: docData.documentNumber,
      expiryDate: docData.expiryDate,
      customName: docData.customName,
      customType: docData.customType,
      isPrivate: docData.isPrivate,
      syncToGoogleCalendar: docData.syncToGoogleCalendar,
      reminderConfig: {
        oneMonth: true,
        twoWeeks: true,
        oneWeek: true,
        threeDays: true
      }
    };
    
    if (docObj.expiryDate && profile?.googleCalendarConnected && docObj.syncToGoogleCalendar !== false) {
      try {
        const { getCalendarToken } = await import('../googleCalendar');
        const token = await getCalendarToken('393681011941-m5r8dpkm1cu82gs34kdvigbofmtet92e.apps.googleusercontent.com');
        const eventTitle = `Expiry: ${docObj.customName || docObj.type}`;
        const eventDesc = `Your document ${docObj.customName || docObj.type} (Owner: ${docObj.ownerName}) is expiring on ${docObj.expiryDate}.`;
        
        const eventRes = await createCalendarEvent(token, {
          title: eventTitle,
          description: eventDesc,
          date: docObj.expiryDate,
          reminders: [{ days: 90 }, { days: 30 }, { days: 7 }]
        });
        
        docObj.googleCalendarEventId = eventRes.id;
      } catch (err) {
        console.error('Failed to sync with Google Calendar', err);
      }
    }
    
    onAddDocument(docObj);
    setIsAdding(false);
    setNewDoc({
        type: DocumentType.ID_CARD,
        relation: 'SELF',
        ownerName: 'Self',
        syncToGoogleCalendar: true,
        files: []
    });
    setScanMessage(null);
  };

  const handleRenewalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onloadend = () => {
          setRenewalFile({
              url: reader.result as string,
              name: file.name,
              mimeType: file.type
          });
        };
        reader.readAsDataURL(file);
      } else {
        try {
          const result = await compressImage(file);
          if (result.isImage) {
             setRenewalFile({
                 url: result.base64,
                 name: file.name,
                 mimeType: 'image/jpeg'
             });
          } else {
             const reader = new FileReader();
             reader.onloadend = () => {
               setRenewalFile({
                   url: reader.result as string,
                   name: file.name,
                   mimeType: file.type || 'application/octet-stream'
               });
             };
             reader.readAsDataURL(file);
          }
        } catch (e) {
          console.error("Compression failed", e);
        }
      }
    }
  };

  const saveRenewedDocument = async () => {
      if (!selectedDoc || !renewalDate || !renewalFile) return;
      
      const updated = {
          ...selectedDoc,
          expiryDate: renewalDate,
          files: [renewalFile, ...selectedDoc.files],
          dateUploaded: new Date().toISOString()
      };
      
      if (updated.googleCalendarEventId && profile?.googleCalendarConnected) {
        try {
          const { getCalendarToken, updateCalendarEvent } = await import('../googleCalendar');
          const token = await getCalendarToken('393681011941-m5r8dpkm1cu82gs34kdvigbofmtet92e.apps.googleusercontent.com');
          const eventTitle = `Expiry: ${updated.customName || updated.type}`;
          const eventDesc = `Your document ${updated.customName || updated.type} (Owner: ${updated.ownerName}) is expiring on ${updated.expiryDate}.`;
          
          await updateCalendarEvent(token, updated.googleCalendarEventId, {
            title: eventTitle,
            description: eventDesc,
            date: updated.expiryDate,
            reminders: [{ days: 90 }, { days: 30 }, { days: 7 }]
          });
        } catch (err) {
          console.error("Failed to update Google Calendar event", err);
        }
      }

      onUpdateDocument(updated);
      setSelectedDoc(updated);
      setIsRenewing(false);
      setRenewalDate('');
      setRenewalFile(null);
  };

  const deleteSelectedDoc = async () => {
      if (selectedDoc) {
          const docName = selectedDoc.customName || selectedDoc.type;
          const confirmed = window.confirm(`Are you sure you want to delete "${docName}"? This action cannot be undone.`);
          if (!confirmed) return;

          if (selectedDoc.googleCalendarEventId && profile?.googleCalendarConnected) {
             try {
                const { getCalendarToken, deleteCalendarEvent } = await import('../googleCalendar');
                const token = await getCalendarToken('393681011941-m5r8dpkm1cu82gs34kdvigbofmtet92e.apps.googleusercontent.com');
                await deleteCalendarEvent(token, selectedDoc.googleCalendarEventId);
             } catch (err) {
                console.error("Failed to delete Google Calendar event", err);
             }
          }
          onDeleteDocument(selectedDoc.id);
          setSelectedDoc(null);
      }
  };

  // Filter Logic
  const filteredDocs = documents.filter(doc => {
      const isOwner = isDocumentOwnerProfile(doc.ownerName, profile);
      const isBiz = isBusinessNature(doc.ownerName, doc.type, doc.customName) || doc.relation === RelationType.BUSINESS || (doc.relation as string) === 'BUSINESS';

      const isPersonal = (doc.relation === 'SELF' || doc.ownerName.toLowerCase() === 'self') && isOwner && !isBiz;
      const isBusiness = isBiz;
      
      let matchesCategory = false;
      if (activeCategory === 'PERSONAL') {
        matchesCategory = isPersonal && !isBusiness;
      } else if (activeCategory === 'BUSINESS') {
        matchesCategory = isBusiness;
      } else {
        matchesCategory = !isPersonal && !isBusiness;
      }

      const matchesSearch = (doc.customName || doc.type).toLowerCase().includes(searchTerm.toLowerCase()) || 
                            doc.ownerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === 'ALL' || doc.type === selectedType;
      
      return matchesCategory && matchesSearch && matchesType;
  });

  // Hierarchical Grouping Logic for "Others" and "Business"
  const groupedDocsByRelation = useMemo<Record<string, Record<string, StoredDocument[]>> | null>(() => {
    if (activeCategory === 'PERSONAL') return null;
    
    return filteredDocs.reduce((acc, doc) => {
        const relation = doc.relation;
        const owner = doc.ownerName;
        
        if (!acc[relation]) acc[relation] = {};
        if (!acc[relation][owner]) acc[relation][owner] = [];
        
        acc[relation][owner].push(doc);
        return acc;
    }, {} as Record<string, Record<string, StoredDocument[]>>);
  }, [filteredDocs, activeCategory]);


  // Helper Component for Rendering a Card
  
  const getDocumentCategoryMeta = (type: DocumentType | string) => {
    switch(type) {
      case DocumentType.ID_CARD:
      case DocumentType.PASSPORT:
      case DocumentType.KRA_PIN:
      case DocumentType.BIRTH_CERTIFICATE:
      case DocumentType.TAX_CERTIFICATE:
        return { icon: Landmark, color: 'text-indigo-600', bg: 'bg-indigo-100', gradient: 'from-indigo-500 to-blue-600' };
      
      case DocumentType.STUDENTS_CARD:
        return { icon: GraduationCap, color: 'text-amber-600', bg: 'bg-amber-100', gradient: 'from-amber-400 to-orange-500' };
        
      case DocumentType.MEDICAL_INSURANCE:
      case DocumentType.HOSPITAL_CARD:
        return { icon: HeartPulse, color: 'text-rose-600', bg: 'bg-rose-100', gradient: 'from-rose-400 to-red-500' };
        
      case DocumentType.DRIVERS_LICENSE:
      case DocumentType.VEHICLE_INSURANCE:
      case DocumentType.VEHICLE_DETAILS:
        return { icon: Car, color: 'text-emerald-600', bg: 'bg-emerald-100', gradient: 'from-emerald-400 to-teal-600' };
        
      case DocumentType.BUSINESS_LICENSE:
      case DocumentType.INCORPORATION_CERTIFICATE:
      case DocumentType.EMPLOYMENT_CARD:
      case DocumentType.STAFF_DETAILS:
        return { icon: Building2, color: 'text-sky-600', bg: 'bg-sky-100', gradient: 'from-sky-500 to-blue-700' };
        
      case DocumentType.SHOPPING_CARD:
      case DocumentType.REWARD_CARD:
      case DocumentType.CONTRACT:
      case DocumentType.ASSET_RECORD:
        return { icon: WalletCards, color: 'text-purple-600', bg: 'bg-purple-100', gradient: 'from-purple-500 to-fuchsia-600' };
        
      default:
        return { icon: ShieldCheck, color: 'text-slate-600', bg: 'bg-slate-100', gradient: 'from-slate-600 to-slate-800' };
    }
  };

  const DocumentCard: React.FC<{ doc: StoredDocument }> = ({ doc }) => {
     const isExpired = doc.expiryDate && new Date(doc.expiryDate) < new Date();
     const meta = getDocumentCategoryMeta(doc.type);
     const Icon = meta.icon;

     return (
        <div 
            onClick={() => {
                if (doc.isPrivate) {
                    setDocToUnlock(doc);
                } else {
                    setSelectedDoc(doc);
                }
            }}
            className="group bg-white rounded-3xl border border-sand-200 shadow-sm hover:shadow-xl hover:border-gold-300 transition-all cursor-pointer relative overflow-hidden flex flex-col h-56 p-5 ring-1 ring-black/5"
        >
            {/* Elegant Gradient Header */}
            <div className={`absolute top-0 left-0 w-full h-24 bg-gradient-to-br ${meta.gradient} opacity-90`} />
            
            {/* Top Bar with Icon & Actions */}
            <div className="relative z-10 flex justify-between items-start mb-auto">
                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-white shadow-md ${meta.color} ring-1 ring-black/5`}>
                    <Icon size={24} strokeWidth={1.5} />
                 </div>
                 
                 <div className="flex items-center gap-1">
                   {doc.isPrivate && (
                     <div className="bg-rose-500 text-white backdrop-blur-md p-1.5 rounded-lg shadow-xs" title="Secure Document">
                       <Lock size={12} />
                     </div>
                   )}
                   <button
                     onClick={(e) => {
                       e.stopPropagation();
                       handleOpenShare(doc);
                     }}
                     className="bg-white/90 hover:bg-white text-forest-800 hover:text-gold-600 backdrop-blur-md p-1.5 rounded-lg shadow-xs transition-all border border-sand-100"
                     title="Share Document (View Once)"
                   >
                     <Share2 size={12} />
                   </button>
                   {doc.files.length > 0 && (
                     <>
                       <button
                         onClick={(e) => {
                           e.stopPropagation();
                           handleDownload(doc.files[0].url, doc.files[0].name, doc.files[0].mimeType);
                         }}
                         className="bg-white/90 hover:bg-white text-forest-800 hover:text-emerald-600 backdrop-blur-md p-1.5 rounded-lg shadow-xs transition-all border border-sand-100"
                         title="Download"
                       >
                         <Download size={12} />
                       </button>
                       <button
                         onClick={(e) => {
                           e.stopPropagation();
                           handleDriveUpload(doc.files[0].url, doc.files[0].name, doc.files[0].mimeType);
                         }}
                         className="bg-white/90 hover:bg-white text-sky-600 hover:text-sky-700 backdrop-blur-md p-1.5 rounded-lg shadow-xs transition-all border border-sand-100"
                         title="Save to Google Drive"
                       >
                         <Cloud size={12} />
                       </button>
                     </>
                   )}
                 </div>
            </div>

            {/* Bottom Content Area */}
            <div className="relative z-10 mt-6 pt-2">
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 opacity-90 truncate ${meta.color}`}>
                    {doc.type === DocumentType.OTHER_DOCUMENT ? (doc.customType || 'Document') : doc.type}
                </p>
                <h3 className="font-display font-bold text-lg leading-tight mb-3 truncate text-forest-900">
                    {doc.customName || doc.type}
                </h3>
                
                <div className="flex items-center gap-2 text-xs font-medium">
                    <span className="flex items-center gap-1 bg-sand-100 text-forest-700 px-2.5 py-1 rounded-lg">
                        <Users size={12} /> {doc.ownerName}
                    </span>
                    {doc.expiryDate && (
                        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg ${isExpired ? 'bg-red-50 text-red-600 ring-1 ring-red-200' : 'bg-sand-100 text-forest-600'}`}>
                            {isExpired ? <AlertCircle size={12} /> : <Calendar size={12} />} 
                            {isExpired ? 'Expired' : `Exp: ${doc.expiryDate}`}
                        </span>
                    )}
                </div>
            </div>
            
            {/* Hover Action Gradient overlay */}
            <div className="absolute inset-0 bg-forest-900/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
     );
  };


  return (
    <div className="h-full flex flex-col animate-fadeIn relative">
       {docToUnlock && (
           <BiometricLock
               onUnlock={() => {
                   setSelectedDoc(docToUnlock);
                   setDocToUnlock(null);
               }}
               onCancel={() => setDocToUnlock(null)}
               credentialId={profile?.biometricCredentialId}
           />
       )}
       {/* Compact Header Toolbar */}
       <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-3 shrink-0 bg-white/50 p-3 rounded-xl border border-sand-200 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 w-full md:w-auto">
             <h2 className="text-lg font-display font-bold text-forest-900 shrink-0 hidden md:block">Digital Wallet</h2>
             
             <div className="h-6 w-px bg-sand-300 hidden md:block"></div>
             
             {/* Compact Tabs */}
             <div className="flex bg-sand-200/50 p-1 rounded-lg border border-sand-200 w-full md:w-auto overflow-x-auto custom-scrollbar">
                 <button 
                   onClick={() => handleCategoryClick('PERSONAL')}
                   className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeCategory === 'PERSONAL' ? 'bg-white text-forest-900 shadow-sm' : 'text-forest-500 hover:text-forest-700'}`}
                 >
                     <User size={14} className={activeCategory === 'PERSONAL' ? 'text-gold-600' : 'text-forest-400'} />
                     <span className="hidden sm:inline">My Documents</span>
                     <span className="sm:hidden">Me</span>
                 </button>
                 <button 
                   onClick={() => {
                     if (!isProOrHigher) {
                       onNavigateToPlans();
                       return;
                     }
                     setActiveCategory('OTHERS');
                   }}
                   className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeCategory === 'OTHERS' ? 'bg-white text-forest-900 shadow-sm' : 'text-forest-500 hover:text-forest-700'}`}
                 >
                     <Users size={14} className={activeCategory === 'OTHERS' ? 'text-gold-600' : 'text-forest-400'} />
                     <span className="hidden sm:inline">Others / Someone Else</span>
                     <span className="sm:hidden">Others</span>
                     {!isProOrHigher && <Lock size={12} className="text-sand-400" />}
                 </button>
                 <button 
                   onClick={() => handleCategoryClick('BUSINESS')}
                   className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeCategory === 'BUSINESS' ? 'bg-white text-forest-900 shadow-sm' : 'text-forest-500 hover:text-forest-700'}`}
                 >
                     <Briefcase size={14} className={activeCategory === 'BUSINESS' ? 'text-gold-600' : 'text-forest-400'} />
                     <span className="hidden sm:inline">Business</span>
                     <span className="sm:hidden">Biz</span>
                     {!isBusinessPlan && <Lock size={12} className="text-sand-400" />}
                 </button>
             </div>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                   <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-forest-400" size={14} />
                   <input 
                     className="w-full bg-white border border-sand-200 rounded-lg py-1.5 pl-9 pr-9 text-sm text-forest-900 placeholder-forest-400 focus:outline-none focus:border-gold-500 transition-all h-9"
                     placeholder="Search docs..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                   />
                   <button 
                     onClick={toggleVoiceSearch}
                     className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md transition-all ${isVoiceSearching ? 'bg-rose-100 text-rose-500 animate-pulse' : 'text-forest-400 hover:text-forest-600 hover:bg-sand-100'}`}
                   >
                     {isVoiceSearching ? <Mic size={14} /> : <MicOff size={14} />}
                   </button>
              </div>
              <button 
                onClick={handleOpenAddModal}
                className="flex items-center justify-center gap-2 px-4 py-1.5 bg-forest-900 text-white rounded-lg hover:bg-forest-800 transition-all shadow-md font-bold text-xs h-9 whitespace-nowrap"
              >
                <Plus size={16} /> <span className="hidden sm:inline">Add Document</span><span className="sm:hidden">Add</span>
              </button>
          </div>
       </div>

       {/* Scrollable Content Area */}
       <div className="flex-1 overflow-y-auto pb-20 custom-scrollbar pr-2">
           
           {/* View: Personal Grid */}
           {activeCategory === 'PERSONAL' && (
               <>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                       {filteredDocs.map(doc => (
                           <DocumentCard key={doc.id} doc={doc} />
                       ))}
                   </div>
                   {filteredDocs.length === 0 && (
                       <div className="flex flex-col items-center justify-center py-20 text-forest-400">
                           <FileText size={48} className="mb-4 opacity-20" />
                           <p>No personal documents found.</p>
                           <button onClick={handleOpenAddModal} className="mt-4 text-gold-600 font-bold text-sm hover:underline">Add your first document</button>
                       </div>
                   )}
               </>
           )}

           
           {/* View: Grouped (Folder Navigation) for OTHERS and BUSINESS */}
           {(activeCategory === 'OTHERS' || activeCategory === 'BUSINESS') && groupedDocsByRelation && (
               <div className="animate-fadeIn">
                   {!viewingRelation ? (
                       // Level 1: Folders / Relations
                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                           {Object.entries(groupedDocsByRelation).map(([relation, owners]) => {
                               const ownerCount = Object.keys(owners).length;
                               const totalDocs = Object.values(owners).reduce((sum, docs) => sum + docs.length, 0);
                               return (
                                   <div 
                                       key={relation}
                                       onClick={() => setViewingRelation(relation)}
                                       className="bg-white p-6 rounded-2xl border border-sand-200 shadow-sm hover:shadow-md hover:border-gold-400 transition-all cursor-pointer group flex items-center gap-4"
                                   >
                                       {/* Folder Icon */}
                                       <div className="w-16 h-16 rounded-2xl bg-forest-50 text-gold-600 flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:bg-gold-50 transition-all flex-shrink-0">
                                            <Briefcase size={28} />
                                       </div>
                                       
                                       {/* Info */}
                                       <div className="min-w-0 flex-1">
                                           <h3 className="font-display font-bold text-lg text-forest-900 group-hover:text-gold-600 transition-colors truncate">{relation}</h3>
                                           <p className="text-xs font-bold text-forest-400 mb-1">{ownerCount} {ownerCount === 1 ? 'Entity' : 'Entities'}</p>
                                           <div className="inline-flex items-center gap-1.5 bg-sand-100 px-2 py-0.5 rounded-md text-[10px] font-bold text-forest-600">
                                               <FileText size={10} /> {totalDocs} Docs
                                           </div>
                                       </div>
                                       
                                       <div className="text-sand-300 group-hover:text-gold-500 transition-colors">
                                           <ChevronRight size={24} />
                                       </div>
                                   </div>
                               );
                           })}
                           {Object.keys(groupedDocsByRelation).length === 0 && (
                                <div className="col-span-full flex flex-col items-center justify-center py-20 text-forest-400">
                                   {activeCategory === 'BUSINESS' ? (
                                       <>
                                            <Briefcase size={48} className="mb-4 opacity-20" />
                                            <p>No business directories found.</p>
                                            <button onClick={handleOpenAddModal} className="mt-4 text-gold-600 font-bold text-sm hover:underline">Add business record</button>
                                       </>
                                   ) : (
                                       <>
                                            <Users size={48} className="mb-4 opacity-20" />
                                            <p>No family or external directories found.</p>
                                            <button onClick={handleOpenAddModal} className="mt-4 text-gold-600 font-bold text-sm hover:underline">Add external record</button>
                                       </>
                                   )}
                               </div>
                           )}
                       </div>
                   ) : !viewingOwner ? (
                       // Level 2: Folders / People / Entities within a Relation
                       <div className="animate-fadeIn">
                           <div className="flex items-center gap-2 mb-6">
                               <button 
                                   onClick={() => setViewingRelation(null)}
                                   className="p-2 bg-white border border-sand-200 rounded-lg hover:bg-sand-50 transition-all text-forest-500 hover:text-forest-900 shadow-sm"
                               >
                                   <ArrowLeft size={20} />
                               </button>
                               <div>
                                   <h3 className="font-display font-bold text-2xl text-forest-900">{viewingRelation} Directory</h3>
                                   <p className="text-xs text-forest-500 font-medium">Select an entity to view documents</p>
                               </div>
                           </div>

                           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                               {Object.entries(groupedDocsByRelation[viewingRelation] || {} as Record<string, StoredDocument[]>).map(([owner, docs]: [string, any]) => (
                                   <div 
                                       key={owner}
                                       onClick={() => setViewingOwner(owner)}
                                       className="bg-white p-6 rounded-2xl border border-sand-200 shadow-sm hover:shadow-md hover:border-gold-400 transition-all cursor-pointer group flex items-center gap-4"
                                   >
                                       {/* Avatar */}
                                       <div className="w-16 h-16 rounded-full bg-forest-50 text-forest-700 flex items-center justify-center text-xl font-display font-bold border-2 border-white shadow-sm group-hover:scale-110 transition-transform flex-shrink-0">
                                            {owner.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                       </div>
                                       
                                       {/* Info */}
                                       <div className="min-w-0 flex-1">
                                           <h3 className="font-display font-bold text-lg text-forest-900 group-hover:text-gold-600 transition-colors truncate">{owner}</h3>
                                           <div className="inline-flex items-center gap-1.5 mt-2 bg-sand-100 px-2 py-0.5 rounded-md text-[10px] font-bold text-forest-600">
                                               <FileText size={10} /> {docs.length} Documents
                                           </div>
                                       </div>
                                       
                                       <div className="text-sand-300 group-hover:text-gold-500 transition-colors">
                                           <ChevronRight size={24} />
                                       </div>
                                   </div>
                               ))}
                           </div>
                       </div>
                   ) : (
                       // Level 3: Documents for selected owner
                       <div className="animate-fadeIn">
                           <div className="flex items-center gap-2 mb-6">
                               <button 
                                   onClick={() => setViewingOwner(null)}
                                   className="p-2 bg-white border border-sand-200 rounded-lg hover:bg-sand-50 transition-all text-forest-500 hover:text-forest-900 shadow-sm"
                               >
                                   <ArrowLeft size={20} />
                               </button>
                               <div>
                                   <h3 className="font-display font-bold text-2xl text-forest-900">{viewingOwner}</h3>
                                   <p className="text-xs text-forest-500 font-medium flex items-center gap-2">
                                       <span className="bg-forest-100 text-forest-600 px-2 py-0.5 rounded-md font-bold uppercase text-[10px]">{viewingRelation}</span>
                                       <span>•</span>
                                       <span>{groupedDocsByRelation[viewingRelation]?.[viewingOwner]?.length || 0} Documents</span>
                                   </p>
                               </div>
                           </div>

                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                               {groupedDocsByRelation[viewingRelation]?.[viewingOwner]?.map(doc => (
                                   <DocumentCard key={doc.id} doc={doc} />
                               ))}
                           </div>
                       </div>
                   )}
               </div>
           )}
       </div>

       {/* Add Document Modal */}
       {isAdding && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/60 backdrop-blur-sm animate-fadeIn">
               <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                   <div className="p-6 border-b border-sand-200 flex justify-between items-center bg-sand-50">
                       <h3 className="font-display font-bold text-lg text-forest-900">Add New Document</h3>
                       <button onClick={() => setIsAdding(false)} className="text-forest-400 hover:text-forest-900">
                           <X size={20} />
                       </button>
                   </div>
                   <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                       {/* Upload Area */}
                       <div>
                           <div className="flex items-center justify-between mb-1">
                               <label className="block text-xs font-bold text-forest-500 uppercase">Upload or Snap File</label>
                               <button
                                 type="button"
                                 onClick={handleNativeCameraCapture}
                                 className="inline-flex items-center gap-1.5 text-xs font-bold text-gold-600 bg-gold-50 hover:bg-gold-100 px-2.5 py-1 rounded-lg border border-gold-200 transition-colors"
                               >
                                   <CameraIcon size={13} />
                                   <span>Take Photo</span>
                               </button>
                           </div>
                           <div 
                             className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors relative group
                               ${isDragging ? 'border-gold-500 bg-gold-50' : 'border-sand-300 hover:bg-sand-50'}`}
                             onDragOver={handleDragOver}
                             onDragLeave={handleDragLeave}
                             onDrop={handleDrop}
                           >
                               <input 
                                 type="file" 
                                 className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                 onChange={handleFileUpload}
                                 accept="image/*,application/pdf"
                                 multiple
                               />
                               <div className="p-4 bg-white rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                                   <UploadCloud size={24} className={`transition-colors ${isDragging ? 'text-gold-500' : 'text-forest-500'}`} />
                               </div>
                               <p className="text-sm font-bold text-forest-700">
                                 {isDragging ? 'Drop files here' : 'Click or drag files to upload'}
                               </p>
                               <p className="text-xs text-forest-400 mt-1">{isProOrHigher ? 'Images will be auto-scanned by AI' : 'AI Document Auto-Scan available on Pro & Business plans'}</p>
                           </div>
                           
                           {(isScanning || scanMessage) && (
                                <div className={`mt-3 p-3 rounded-lg flex items-center justify-between gap-2 text-xs font-bold border transition-all ${
                                    isScanning 
                                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse'
                                      : scanMessage?.includes('Autofilled') || scanMessage?.includes('Updated') || scanMessage?.includes('Identified')
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        {isScanning ? (
                                            <Loader2 size={15} className="animate-spin text-indigo-600 flex-shrink-0" />
                                        ) : scanMessage?.includes('Autofilled') || scanMessage?.includes('Updated') || scanMessage?.includes('Identified') ? (
                                            <CheckCircle size={15} className="text-emerald-600 flex-shrink-0" />
                                        ) : (
                                            <AlertCircle size={15} className="text-amber-600 flex-shrink-0" />
                                        )}
                                        <span>{scanMessage}</span>
                                    </div>
                                    {newDoc.files && newDoc.files.length > 0 && !isScanning && (
                                        <button 
                                          type="button"
                                          onClick={() => {
                                            const firstImg = newDoc.files?.find(f => f.mimeType.startsWith('image/'));
                                            if (firstImg) scanNewDocument(firstImg.url, firstImg.mimeType);
                                          }}
                                          className="px-2 py-1 bg-white border border-sand-300 hover:bg-sand-50 rounded text-[11px] text-forest-700 font-semibold flex items-center gap-1 shadow-sm flex-shrink-0"
                                        >
                                          <Sparkles size={11} className="text-gold-500" /> Re-Scan
                                        </button>
                                    )}
                                </div>
                            )}

                           {newDoc.files && newDoc.files.length > 0 && (
                               <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                                   {newDoc.files.map((file, idx) => (
                                       <div key={idx} className="relative w-16 h-16 rounded-lg border border-sand-200 overflow-hidden flex-shrink-0 group">
                                           {file.mimeType.startsWith('image/') ? (
                                               <img src={file.url} className="w-full h-full object-cover" />
                                           ) : (
                                               <div className="w-full h-full bg-sand-50 flex items-center justify-center text-forest-400"><FileText size={20} /></div>
                                           )}
                                           <button 
                                             onClick={(e) => {
                                               e.preventDefault();
                                               e.stopPropagation();
                                               setNewDoc(prev => ({
                                                 ...prev,
                                                 files: prev.files?.filter((_, i) => i !== idx)
                                               }));
                                             }}
                                             className="absolute top-1 right-1 bg-white/90 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm p-0.5 hover:bg-red-50"
                                             title="Remove file"
                                           >
                                             <X size={12} />
                                           </button>
                                       </div>
                                   ))}
                               </div>
                           )}
                       </div>

                       {/* Form Fields */}
                       <div className="grid grid-cols-2 gap-4">
                           <div className="col-span-2">
                               <label className="block text-xs font-bold text-forest-500 uppercase mb-1">Owner</label>
                               <div className="flex gap-2">
                                   <button 
                                     onClick={() => setNewDoc(prev => ({ ...prev, relation: 'SELF', ownerName: 'Self' }))}
                                     className={`flex-1 py-2 rounded-lg text-[11px] sm:text-sm font-bold border transition-all ${newDoc.relation === 'SELF' ? 'bg-forest-900 text-white border-forest-900' : 'bg-white text-forest-600 border-sand-300'}`}
                                   >
                                       Myself
                                   </button>
                                   <button 
                                     onClick={() => {
                                         if (!isProOrHigher) {
                                             onNavigateToPlans();
                                             return;
                                         }
                                         setNewDoc(prev => ({ ...prev, relation: RelationType.OTHER, ownerName: '' }));
                                     }}
                                     className={`flex-1 py-2 flex items-center justify-center gap-1.5 rounded-lg text-[11px] sm:text-sm font-bold border transition-all ${newDoc.relation !== 'SELF' && newDoc.relation !== RelationType.BUSINESS ? 'bg-forest-900 text-white border-forest-900' : 'bg-white text-forest-600 border-sand-300 hover:bg-sand-50'}`}
                                   >
                                       Someone Else
                                       {!isProOrHigher && <Lock size={12} className="text-sand-400" />}
                                   </button>
                                   <button 
                                     onClick={() => {
                                         if (!isBusinessPlan) {
                                             onNavigateToPlans();
                                             return;
                                         }
                                         setNewDoc(prev => ({ ...prev, relation: RelationType.BUSINESS, ownerName: '' }))
                                     }}
                                     className={`flex-1 py-2 flex items-center justify-center gap-1.5 rounded-lg text-[11px] sm:text-sm font-bold border transition-all ${newDoc.relation === RelationType.BUSINESS ? 'bg-forest-900 text-white border-forest-900' : 'bg-white text-forest-600 border-sand-300 hover:bg-sand-50'}`}
                                   >
                                       Business
                                       {!isBusinessPlan && <Lock size={12} className="text-sand-400" />}
                                   </button>
                               </div>
                           </div>

                           {newDoc.relation === 'SELF' ? (
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-forest-500 uppercase mb-1">
                                      Document Holder / Your Name
                                    </label>
                                    <input 
                                      className="w-full bg-white border border-sand-300 rounded-lg p-2 text-sm text-forest-900 focus:outline-none focus:border-gold-500"
                                      placeholder={profile?.fullName || "Your Full Name"}
                                      value={newDoc.ownerName === 'Self' ? (profile?.fullName || 'Self') : (newDoc.ownerName || '')}
                                      onChange={(e) => setNewDoc(prev => ({ ...prev, ownerName: e.target.value }))}
                                    />
                                </div>
                            ) : (
                                <div className="col-span-2 space-y-3 p-3 bg-sand-50 rounded-xl border border-sand-200">
                                    {newDoc.relation !== RelationType.BUSINESS && (
                                      <div>
                                          <label className="block text-xs font-bold text-forest-500 uppercase mb-1">Relation</label>
                                          <select 
                                            className="w-full bg-white border border-sand-300 rounded-lg p-2 text-sm text-forest-900 focus:outline-none focus:border-gold-500"
                                            value={newDoc.relation}
                                            onChange={(e) => setNewDoc(prev => ({ ...prev, relation: e.target.value as RelationType }))}
                                          >
                                              {RELATIONS_LIST.filter(r => r !== RelationType.BUSINESS).map(r => <option key={r} value={r}>{r}</option>)}
                                          </select>
                                      </div>
                                    )}
                                    <div>
                                        <label className="block text-xs font-bold text-forest-500 uppercase mb-1">
                                          {newDoc.relation === RelationType.BUSINESS ? 'Business Name' : 'Full Name'}
                                        </label>
                                        <input 
                                          className="w-full bg-white border border-sand-300 rounded-lg p-2 text-sm text-forest-900 focus:outline-none focus:border-gold-500"
                                          placeholder={newDoc.relation === RelationType.BUSINESS ? "e.g. Acme Corp" : "e.g. John Doe"}
                                          value={newDoc.ownerName}
                                          onChange={(e) => setNewDoc(prev => ({ ...prev, ownerName: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="col-span-2">
                               <label className="block text-xs font-bold text-forest-500 uppercase mb-1">Document Type</label>
                               <select 
                                 className="w-full bg-white border border-sand-300 rounded-lg p-2.5 text-sm text-forest-900 focus:outline-none focus:border-gold-500 font-medium"
                                 value={newDoc.type}
                                 onChange={(e) => setNewDoc(prev => ({ ...prev, type: e.target.value as DocumentType }))}
                               >
                                   {DOCUMENT_TYPES_LIST.map(t => <option key={t} value={t}>{t}</option>)}
                               </select>
                           </div>

                           {newDoc.type === DocumentType.OTHER_DOCUMENT && (
                               <div className="col-span-2">
                                   <label className="block text-xs font-bold text-forest-500 uppercase mb-1">Custom Type Name</label>
                                   <input 
                                     className="w-full bg-white border border-sand-300 rounded-lg p-2 text-sm text-forest-900 focus:outline-none focus:border-gold-500"
                                     placeholder="e.g. Warranty Card"
                                     value={newDoc.customType || ''}
                                     onChange={(e) => setNewDoc(prev => ({ ...prev, customType: e.target.value }))}
                                   />
                               </div>
                           )}

                           <div className="col-span-2">
                               <label className="block text-xs font-bold text-forest-500 uppercase mb-1">Document Name (Optional)</label>
                               <input 
                                 className="w-full bg-white border border-sand-300 rounded-lg p-2 text-sm text-forest-900 focus:outline-none focus:border-gold-500"
                                 placeholder="e.g. My Old Passport"
                                 value={newDoc.customName || ''}
                                 onChange={(e) => setNewDoc(prev => ({ ...prev, customName: e.target.value }))}
                               />
                           </div>

                           <div>
                               <label className="block text-xs font-bold text-forest-500 uppercase mb-1">Expiry Date</label>
                               <input 
                                 type="date"
                                 className="w-full bg-white border border-sand-300 rounded-lg p-2 text-sm text-forest-900 focus:outline-none focus:border-gold-500"
                                 value={newDoc.expiryDate || ''}
                                 onChange={(e) => setNewDoc(prev => ({ ...prev, expiryDate: e.target.value }))}
                               />
                               {profile?.googleCalendarConnected && newDoc.expiryDate && (
                                  <label className="flex items-center gap-2 mt-2 text-sm text-forest-700 cursor-pointer">
                                     <input 
                                       type="checkbox"
                                       checked={newDoc.syncToGoogleCalendar !== false}
                                       onChange={(e) => setNewDoc(prev => ({...prev, syncToGoogleCalendar: e.target.checked}))}
                                       className="rounded text-gold-500 focus:ring-gold-500"
                                     />
                                     <span>Sync to Google Calendar</span>
                                  </label>
                               )}
                           </div>

                           <div>
                               <label className="block text-xs font-bold text-forest-500 uppercase mb-1">Document Number</label>
                               <input 
                                 className="w-full bg-white border border-sand-300 rounded-lg p-2 text-sm text-forest-900 focus:outline-none focus:border-gold-500"
                                 placeholder="ID / Ref #"
                                 value={newDoc.documentNumber || ''}
                                 onChange={(e) => setNewDoc(prev => ({ ...prev, documentNumber: e.target.value }))}
                               />
                           </div>

                           <div className="col-span-2 mt-2">
                               <label className="flex items-center gap-3 p-3 bg-red-50/40 border border-red-100 rounded-xl cursor-pointer hover:bg-red-50 transition-colors">
                                 <div className="flex-1">
                                    <div className="flex items-center gap-2 text-sm font-bold text-forest-900">
                                       <Lock size={16} className="text-red-500" />
                                       Secure Document
                                    </div>
                                    <p className="text-xs text-forest-500 mt-0.5">Require Biometric or PIN authentication to view this document.</p>
                                 </div>
                                 <input 
                                   type="checkbox"
                                   checked={!!newDoc.isPrivate}
                                   onChange={(e) => setNewDoc(prev => ({...prev, isPrivate: e.target.checked}))}
                                   className="w-5 h-5 rounded text-red-500 focus:ring-red-500 border-red-200"
                                 />
                               </label>
                           </div>
                       </div>
                   </div>
                   
                   <div className="p-4 border-t border-sand-200 bg-white flex justify-end gap-3">
                       <button onClick={() => setIsAdding(false)} className="px-5 py-2 text-sm font-bold text-forest-600 hover:bg-sand-50 rounded-lg transition-colors">
                           Cancel
                       </button>
                       <button 
                         onClick={handleSaveNewDoc}
                         disabled={!newDoc.files?.length || !newDoc.ownerName}
                         className="px-6 py-2 bg-forest-900 text-white text-sm font-bold rounded-lg hover:bg-gold-600 shadow-lg shadow-forest-900/20 disabled:opacity-50 disabled:shadow-none transition-all"
                       >
                           Save Document
                       </button>
                   </div>
               </div>
           </div>
       )}

       {/* Document Detail & Renewal Modal */}
       {selectedDoc && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/60 backdrop-blur-sm animate-fadeIn">
               <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
                   
                   {/* Left: Preview */}
                   <div className="w-full md:w-1/2 bg-forest-900 p-8 flex flex-col justify-center items-center relative overflow-hidden group">
                       <div className="absolute inset-0 bg-modern-mesh opacity-40"></div>
                       {selectedDoc.files.length > 0 && selectedDoc.files[0].mimeType.startsWith('image/') ? (
                           <img 
                             src={selectedDoc.files[0].url} 
                             className="max-w-full max-h-[300px] md:max-h-full object-contain rounded-lg shadow-2xl border-4 border-white/10 z-10" 
                           />
                       ) : (
                           <div className="w-full h-64 bg-white/10 rounded-2xl flex items-center justify-center text-white/30 border-2 border-white/5 backdrop-blur-md z-10">
                               <FileText size={64} />
                           </div>
                       )}
                       
                       <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-3 z-20">
                            {selectedDoc.files.length > 0 && (
                                <button 
                                    onClick={() => setPreviewFile(selectedDoc.files[0])}
                                    className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all"
                                >
                                    <Eye size={16} /> View Full
                                </button>
                            )}
                            <button 
                                onClick={triggerScanOnSelectedDoc}
                                disabled={isScanning}
                                className="bg-gold-600 hover:bg-gold-500 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg shadow-gold-600/30 transition-all disabled:opacity-50"
                            >
                                {isScanning ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                {isScanning ? 'Scanning...' : 'AI Scan'}
                            </button>
                            
                            {/* Voice Button Removed */}
                       </div>
                       
                       {scanMessage && (
                           <div className="absolute top-6 left-6 right-6 p-3 bg-white/90 backdrop-blur-md rounded-xl text-xs font-bold text-forest-900 shadow-xl z-30 animate-in slide-in-from-top-4 flex items-center justify-center text-center">
                               {scanMessage}
                           </div>
                       )}
                   </div>

                   {/* Right: Details & Actions */}
                   <div className="w-full md:w-1/2 p-6 md:p-8 overflow-y-auto custom-scrollbar bg-white flex flex-col">
                       <div className="flex justify-between items-start mb-6">
                           <div>
                               <p className="text-xs font-bold text-gold-600 uppercase tracking-wider mb-1">{selectedDoc.type}</p>
                               <h2 className="text-2xl font-display font-bold text-forest-900 leading-tight">
                                 {isEditingDoc ? 'Edit Document' : (selectedDoc.customName || selectedDoc.type)}
                               </h2>
                           </div>
                           <button onClick={() => { setSelectedDoc(null); setIsEditingDoc(false); }} className="p-2 bg-sand-50 rounded-full hover:bg-sand-100 transition-colors text-forest-500">
                               <X size={20} />
                           </button>
                       </div>

                       {editDocError && (
                         <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2">
                           <AlertCircle size={16} /> {editDocError}
                         </div>
                       )}

                       {isEditingDoc ? (
                         <div className="space-y-4 flex-1">
                           <div>
                             <label className="block text-xs font-bold text-forest-500 uppercase mb-1">Document Type *</label>
                             <select
                               className="w-full bg-white border border-sand-300 rounded-lg p-2.5 text-sm text-forest-900 focus:outline-none focus:border-gold-500 font-medium"
                               value={editDocForm.type || selectedDoc.type}
                               onChange={(e) => setEditDocForm(prev => ({ ...prev, type: e.target.value as DocumentType }))}
                             >
                               {DOCUMENT_TYPES_LIST.map(t => <option key={t} value={t}>{t}</option>)}
                             </select>
                           </div>

                           {editDocForm.type === DocumentType.OTHER_DOCUMENT && (
                             <div>
                               <label className="block text-xs font-bold text-forest-500 uppercase mb-1">Custom Type Name</label>
                               <input
                                 className="w-full bg-white border border-sand-300 rounded-lg p-2 text-sm text-forest-900 focus:outline-none focus:border-gold-500"
                                 value={editDocForm.customType || ''}
                                 onChange={(e) => setEditDocForm(prev => ({ ...prev, customType: e.target.value }))}
                               />
                             </div>
                           )}

                           <div>
                             <label className="block text-xs font-bold text-forest-500 uppercase mb-1">Document Name (Optional)</label>
                             <input
                               className="w-full bg-white border border-sand-300 rounded-lg p-2 text-sm text-forest-900 focus:outline-none focus:border-gold-500"
                               value={editDocForm.customName || ''}
                               onChange={(e) => setEditDocForm(prev => ({ ...prev, customName: e.target.value }))}
                             />
                           </div>

                           <div>
                             <label className="block text-xs font-bold text-forest-500 uppercase mb-1">Owner Name *</label>
                             <input
                               className="w-full bg-white border border-sand-300 rounded-lg p-2 text-sm text-forest-900 focus:outline-none focus:border-gold-500"
                               value={editDocForm.ownerName || ''}
                               onChange={(e) => setEditDocForm(prev => ({ ...prev, ownerName: e.target.value }))}
                             />
                           </div>

                           <div>
                             <label className="block text-xs font-bold text-forest-500 uppercase mb-1">Document Number</label>
                             <input
                               className="w-full bg-white border border-sand-300 rounded-lg p-2 text-sm text-forest-900 focus:outline-none focus:border-gold-500"
                               value={editDocForm.documentNumber || ''}
                               onChange={(e) => setEditDocForm(prev => ({ ...prev, documentNumber: e.target.value }))}
                             />
                           </div>

                           <div>
                             <label className="block text-xs font-bold text-forest-500 uppercase mb-1">Expiry Date</label>
                             <input
                               type="date"
                               className="w-full bg-white border border-sand-300 rounded-lg p-2 text-sm text-forest-900 focus:outline-none focus:border-gold-500"
                               value={editDocForm.expiryDate || ''}
                               onChange={(e) => setEditDocForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                             />
                           </div>

                           <div className="pt-4 flex gap-3">
                             <button
                               onClick={handleCancelEditDoc}
                               className="flex-1 py-2.5 bg-sand-100 hover:bg-sand-200 text-forest-700 rounded-xl font-bold text-sm transition-colors"
                             >
                               Cancel
                             </button>
                             <button
                               onClick={handleSaveEditDoc}
                               className="flex-1 py-2.5 bg-forest-900 hover:bg-gold-600 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-1.5"
                             >
                               <Save size={16} /> Save Changes
                             </button>
                           </div>
                         </div>
                       ) : (
                         <div className="space-y-6 flex-1">
                           <div className="grid grid-cols-2 gap-4">
                               <div className="p-4 bg-sand-50 rounded-2xl border border-sand-100">
                                   <p className="text-xs font-bold text-forest-400 uppercase mb-1">Owner</p>
                                   <p className="font-bold text-forest-900">{selectedDoc.ownerName}</p>
                               </div>
                               <div className="p-4 bg-sand-50 rounded-2xl border border-sand-100">
                                   <p className="text-xs font-bold text-forest-400 uppercase mb-1">Document #</p>
                                   <p className="font-bold text-forest-900 truncate" title={selectedDoc.documentNumber || 'N/A'}>
                                     {selectedDoc.documentNumber || 'N/A'}
                                   </p>
                               </div>
                               <div className="p-4 bg-sand-50 rounded-2xl border border-sand-100 col-span-2 flex items-center justify-between">
                                   <div>
                                       <p className="text-xs font-bold text-forest-400 uppercase mb-1">Expiry Date</p>
                                       <p className={`font-bold ${selectedDoc.expiryDate && new Date(selectedDoc.expiryDate) < new Date() ? 'text-red-500' : 'text-forest-900'}`}>
                                         {selectedDoc.expiryDate || 'No expiry'}
                                       </p>
                                   </div>
                                   <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
                                       {selectedDoc.expiryDate && new Date(selectedDoc.expiryDate) < new Date() ? (
                                           <AlertCircle size={24} className="text-red-500" />
                                       ) : selectedDoc.expiryDate ? (
                                           <Calendar size={24} />
                                       ) : (
                                           <FileText size={24} />
                                       )}
                                   </div>
                               </div>
                           </div>

                           {/* Renewal Section */}
                           <div className="border-t border-sand-100 pt-6">
                               <button 
                                 onClick={() => setIsRenewing(!isRenewing)}
                                 className="flex items-center justify-between w-full text-left font-bold text-forest-900 hover:text-gold-600 transition-colors mb-4"
                               >
                                   <span className="flex items-center gap-2"><RefreshCw size={18} /> Renew Document</span>
                                   {isRenewing ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                               </button>

                               {isRenewing && (
                                   <div className="bg-sand-50 p-4 rounded-xl border border-sand-200 animate-fadeIn space-y-4">
                                       <div>
                                           <label className="block text-xs font-bold text-forest-500 uppercase mb-1">New Expiry Date</label>
                                           <input 
                                             type="date" 
                                             className="w-full bg-white border border-sand-300 rounded-lg p-2 text-sm"
                                             value={renewalDate}
                                             onChange={(e) => setRenewalDate(e.target.value)}
                                           />
                                       </div>
                                       <div>
                                           <label className="block text-xs font-bold text-forest-500 uppercase mb-1">Upload New Version</label>
                                           <input 
                                             type="file" 
                                             className="w-full text-sm text-forest-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-white file:text-forest-700 hover:file:bg-forest-50"
                                             onChange={handleRenewalFileChange}
                                           />
                                       </div>
                                       <button 
                                         onClick={saveRenewedDocument}
                                         disabled={!renewalDate || !renewalFile}
                                         className="w-full py-2 bg-forest-900 text-white rounded-lg text-sm font-bold hover:bg-gold-600 disabled:opacity-50 transition-all shadow-md"
                                       >
                                           Confirm Renewal
                                       </button>
                                   </div>
                               )}
                           </div>
                         </div>
                       )}

                       {!isEditingDoc && (
                         <div className="mt-6 pt-5 border-t border-sand-100 flex items-center justify-between gap-2 shrink-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    onClick={handleStartEditDoc}
                                    className="px-3.5 py-2 bg-sky-600 text-white rounded-xl font-bold text-xs hover:bg-sky-500 flex items-center gap-1.5 transition-all shadow-sm"
                                    title="Edit Document"
                                >
                                    <Save size={14} /> Edit
                                </button>
                                <button
                                    onClick={() => handleOpenShare(selectedDoc)}
                                    className="px-3.5 py-2 bg-forest-900 text-white rounded-xl font-bold text-xs hover:bg-gold-600 flex items-center gap-1.5 transition-all shadow-sm"
                                    title="Share (View Once)"
                                >
                                    <Share2 size={14} /> Share
                                </button>
                                {selectedDoc.files.length > 0 && (
                                    <>
                                      <button
                                        onClick={() => handleDownload(selectedDoc.files[0].url, selectedDoc.files[0].name, selectedDoc.files[0].mimeType)}
                                        className="px-3.5 py-2 bg-sand-50 border border-sand-200 text-forest-800 hover:bg-sand-100 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs"
                                        title="Download File"
                                      >
                                          <Download size={14} /> Download
                                      </button>
                                    </>
                                )}
                            </div>

                            <button 
                                onClick={deleteSelectedDoc}
                                className="px-3 py-2 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl font-bold text-xs hover:bg-rose-100 flex items-center gap-1.5 transition-all"
                                title="Delete Document"
                            >
                                <Trash2 size={14} /> <span className="hidden sm:inline">Delete</span>
                            </button>
                         </div>
                       )}
                   </div>
               </div>
           </div>
       )}

       {/* Full File Preview Modal */}
       {previewFile && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 md:p-8 animate-fadeIn" onClick={() => setPreviewFile(null)}>
               <button 
                   onClick={() => setPreviewFile(null)} 
                   className="absolute top-6 right-6 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all"
               >
                   <X size={24} />
               </button>
               
               <div className="w-full max-w-5xl h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                   {previewFile.mimeType.startsWith('image/') ? (
                       <img 
                           src={previewFile.url} 
                           className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" 
                       />
                   ) : (
                       <iframe 
                           src={previewFile.url} 
                           className="w-full h-full bg-white rounded-2xl shadow-2xl"
                           title="PDF Preview"
                       />
                   )}
               </div>
               
               <div className="absolute bottom-6 flex items-center gap-2 bg-white/10 backdrop-blur-xl border border-white/20 p-2 rounded-2xl shadow-2xl z-20">
                 <button 
                     onClick={(e) => { e.stopPropagation(); handleDownload(previewFile.url, previewFile.name, previewFile.mimeType); }}
                     className="text-white hover:bg-white/20 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                 >
                     <Download size={14} /> Download
                 </button>
                 <button 
                     onClick={(e) => { e.stopPropagation(); handleDriveUpload(previewFile.url, previewFile.name, previewFile.mimeType); }}
                     className="text-sky-300 bg-sky-500/20 hover:bg-sky-500/30 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-sky-400/30"
                 >
                     <Cloud size={14} /> Save to Drive
                 </button>
               </div>
           </div>
       )}
            {/* Share Modal */}
        {sharingDoc && (
            <ShareModal 
                document={sharingDoc} 
                onClose={() => setSharingDoc(null)} 
            />
        )}

       {/* Name Discrepancy Choice Modal */}
       {namePrompt && (
           <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-forest-950/70 backdrop-blur-md animate-fadeIn">
               <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-sand-200 text-forest-900">
                    <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-4 mx-auto">
                        <User size={24} />
                    </div>
                    <h3 className="text-xl font-bold font-display text-center text-forest-900 mb-2">
                        Owner Name Verification
                    </h3>
                    <p className="text-sm text-forest-600 text-center mb-6 leading-relaxed">
                        The document belongs to <strong>"{namePrompt.detectedName}"</strong>, which differs from your profile name (<strong>"{profile?.fullName || 'Your Profile Name'}"</strong>).
                    </p>

                    <div className="space-y-3">
                        <button
                          onClick={() => {
                            setNewDoc(prev => ({
                              ...prev,
                              ownerName: 'Self',
                              relation: 'SELF'
                            }));
                            setNamePrompt(null);
                            setTimeout(() => handleSaveNewDoc(true), 100);
                          }}
                          className="w-full py-3 bg-forest-900 hover:bg-forest-800 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm"
                        >
                          <User size={16} /> Save under "For Me" (Personal Vault)
                        </button>

                        <button
                          onClick={() => {
                            const detected = namePrompt.detectedName;
                            setNewDoc(prev => ({
                              ...prev,
                              ownerName: detected,
                              relation: prev.relation === 'SELF' ? RelationType.OTHER : prev.relation
                            }));
                            setNamePrompt(null);
                            setTimeout(() => handleSaveNewDoc(true), 100);
                          }}
                          className="w-full py-3 bg-sand-100 hover:bg-sand-200 text-forest-900 font-bold rounded-xl transition-all border border-sand-300 flex items-center justify-center gap-2 text-sm"
                        >
                          <Users size={16} /> Save under "Others / Someone Else" ({namePrompt.detectedName})
                        </button>
                    </div>
               </div>
           </div>
       )}
     </div>
   );
};

export default Wallet;
