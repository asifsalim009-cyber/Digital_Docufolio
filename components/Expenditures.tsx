import React, { useState, useRef, useMemo } from 'react';
import { Expenditure, Budget, RecurringExpense, UserProfile, SubscriptionPlan } from '../types';
import { Receipt, Search, Plus, Save, X, Calendar, Hash, CheckCircle, AlertCircle, Upload, PieChart, FileText, Camera, Loader2, Trash, Download, Lock, Mic, MicOff, Sparkles, Bot, Repeat } from 'lucide-react';
import { useVoiceSearch } from '../useVoiceSearch';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { apiFetch } from '../api';

interface ExpendituresProps {
  profile?: UserProfile;
  expenditures: Expenditure[];
  budgets?: Budget[];
  recurringExpenses?: RecurringExpense[];
  onAddExpenditure: (expenditure: Omit<Expenditure, 'id' | 'createdAt'>) => void;
  onDeleteExpenditure: (id: string) => void;
  onUpdateBudget?: (budget: Budget) => void;
  onDeleteBudget?: (id: string) => void;
  onAddRecurring?: (expense: Omit<RecurringExpense, 'id' | 'createdAt'>) => void;
  onDeleteRecurring?: (id: string) => void;
  onNavigateToPlans?: () => void;
  onUseAiCredit?: (amount?: number) => boolean;
}

type Tab = 'transactions' | 'budget' | 'statements';

const Expenditures: React.FC<ExpendituresProps> = ({ 
  profile,
  expenditures, 
  budgets = [], 
  recurringExpenses = [], 
  onAddExpenditure, 
  onDeleteExpenditure,
  onUpdateBudget,
  onDeleteBudget,
  onAddRecurring,
  onDeleteRecurring,
  onNavigateToPlans,
  onUseAiCredit
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('transactions');
  
  // Modals state
  const [isAdding, setIsAdding] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf');
  const [exportRange, setExportRange] = useState<'this_month' | 'last_month' | 'this_week' | 'custom'>('this_month');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  const [addMode, setAddMode] = useState<'mpesa' | 'receipt' | 'manual'>('mpesa');
  const [rawMessage, setRawMessage] = useState('');
  const [parsedData, setParsedData] = useState<Partial<Expenditure> | null>(null);
  const [parseError, setParseError] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { isListening: isVoiceSearching, toggleListening: toggleVoiceSearch } = useVoiceSearch((text) => setSearchQuery(text));
  
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // AI Assistant State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);

  const paymentForSuggestions = useMemo(() => {
    return Array.from(new Set(expenditures.map(e => e.paymentFor).filter(Boolean))) as string[];
  }, [expenditures]);

  const isPaidSubscription = Boolean(profile?.plan && profile.plan !== SubscriptionPlan.BASIC && profile?.subscriptionStatus === 'active');

  if (!isPaidSubscription) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 border border-emerald-500/30">
          <Lock size={32} className="text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Paid Subscription Required</h2>
        <p className="text-slate-400 max-w-md mb-8 leading-relaxed">
          Expense Tracking, Budgets, M-PESA SMS auto-parsing, and Financial Reports require an active paid subscription (Starting from Premium at KES 300/mo). Upgrade your account to unlock this suite.
        </p>
        <button
          onClick={onNavigateToPlans}
          className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]"
        >
          View Subscription Plans
        </button>
      </div>
    );
  }

  const confirmAndDeleteExpenditure = (exp: Expenditure) => {
    const title = exp.recipient || 'transaction';
    const amountStr = `Ksh ${exp.amount.toLocaleString()}`;
    const confirmed = window.confirm(`Are you sure you want to delete the transaction "${title}" (${amountStr})? This action cannot be undone.`);
    if (confirmed) {
      onDeleteExpenditure(exp.id);
    }
  };

  const confirmAndDeleteBudget = (b: Budget) => {
    const confirmed = window.confirm(`Are you sure you want to delete the budget for "${b.category}"? This action cannot be undone.`);
    if (confirmed && onDeleteBudget) {
      onDeleteBudget(b.id);
    }
  };

  const confirmAndDeleteRecurring = (r: RecurringExpense) => {
    const confirmed = window.confirm(`Are you sure you want to delete recurring expense "${r.name}"? This action cannot be undone.`);
    if (confirmed && onDeleteRecurring) {
      onDeleteRecurring(r.id);
    }
  };

  // M-Pesa Parser (local)
  const parseMpesa = (message: string) => {
    setRawMessage(message);
    setParseError('');
    if (!message.trim()) {
      setParsedData(null);
      return;
    }
    try {
      const refMatch = message.match(/^[A-Z0-9]{10}/);
      const reference = refMatch ? refMatch[0] : '';
      const amountMatch = message.match(/Ksh\s*([\d,]+\.\d{2})/i);
      let amount = 0;
      if (amountMatch) { amount = parseFloat(amountMatch[1].replace(/,/g, '')); }
      
      let recipient = 'Unknown';
      let type: 'income' | 'expense' = 'expense';
      
      const incomeMatch = message.match(/(?:received|have received)\s+Ksh[\d,.]+\s+from\s+(.*?)\s+on\s+/i) || message.match(/received Ksh[\d,.]+ from (.*?) \d+/i);
      
      if (incomeMatch) {
        type = 'income';
        recipient = incomeMatch[1].trim();
      } else if (message.match(/bought Ksh.* (?:of )?airtime/i)) { 
        recipient = 'Airtime'; 
      } else {
        const recipientMatch = message.match(/(?:sent to|paid to)\s+(.*?)\s+on\s+/i) || message.match(/(?:sent to|paid to)\s+(.*?)\.\s+on\s+/i);
        if (recipientMatch) {
          recipient = recipientMatch[1].trim();
        }
      }
      
      if (recipient.endsWith('.')) recipient = recipient.slice(0, -1);
      
      const dateMatch = message.match(/on\s+(\d{1,2}\/\d{1,2}\/\d{2})/i);
      let date = new Date().toISOString().split('T')[0];
      if (dateMatch) {
        const parts = dateMatch[1].split('/');
        if (parts.length === 3) date = `20${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      const timeMatch = message.match(/at\s+(\d{1,2}:\d{2}\s+[AP]M)/i);
      const time = timeMatch ? timeMatch[1] : '';

      if (!reference || amount === 0) {
        setParseError('Could not fully parse this M-PESA message.');
        setParsedData({ reference: reference || 'UNKNOWN', amount: amount || 0, recipient, date, time, rawMessage: message, paymentMethod: 'M-PESA', type });
      } else {
        setParsedData({ reference, amount, recipient, date, time, rawMessage: message, paymentMethod: 'M-PESA', type });
      }
    } catch (err) {
      setParseError('Error parsing message.');
    }
  };

  const compressImageForScan = (dataUrl: string, maxWidth = 1200, maxHeight = 1200, quality = 0.85): Promise<{ base64Data: string; mimeType: string }> => {
    return new Promise((resolve) => {
      const parts = dataUrl.split(',');
      const rawData = parts.length > 1 ? parts[1] : parts[0];
      const initialMime = dataUrl.startsWith('data:') ? (dataUrl.split(';')[0].split(':')[1] || 'image/jpeg') : 'image/jpeg';

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

      img.src = dataUrl.startsWith('data:') ? dataUrl : `data:${initialMime};base64,${rawData}`;
    });
  };

  // Receipt Scanner via API
  const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onUseAiCredit && !onUseAiCredit(1)) {
        setParseError("You have no AI credits remaining. Please upgrade your plan.");
        return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsParsing(true);
    setParseError('');
    setParsedData(null);
    setRawMessage('');
    
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        const compressed = await compressImageForScan(dataUrl);
        
        try {
          const res = await apiFetch('/api/parse-receipt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: compressed.base64Data, mimeType: compressed.mimeType })
          });
          
          if (!res.ok) {
             const errData = await res.json().catch(() => ({}));
             throw new Error(errData.error || "Failed to parse receipt via server.");
          }
          const data = await res.json();

          if (data) {
            setParsedData({
              amount: data.amount || 0,
              recipient: data.recipient || 'Unknown',
              date: data.date || new Date().toISOString().split('T')[0],
              time: data.time || '',
              paymentMethod: data.paymentMethod || 'Unknown',
              reference: data.reference || 'RECEIPT-' + Math.floor(Math.random()*10000),
              purchasedItems: data.purchasedItems || [],
              type: data.type === 'income' ? 'income' : 'expense',
              rawMessage: 'Parsed from scanned receipt/statement'
            });
          } else {
            setParseError(data?.error || 'Failed to parse receipt.');
          }
        } catch (err: any) {
          console.warn("Receipt scan failed:", err);
          const msg = (typeof err === 'string' ? err : (err?.message || JSON.stringify(err) || "")).toLowerCase();
          if (msg.includes("quota") || msg.includes("resource_exhausted") || msg.includes("rate") || msg.includes("limit") || msg.includes("permission") || msg.includes("unauthenticated") || msg.includes("429") || msg.includes("403") || msg.includes("401") || err?.status === 403 || err?.status === 401 || err?.status === 429) {
            setParseError("API limit or permission error. Please enter details manually.");
          } else {
            setParseError("Error while parsing receipt.");
          }
        } finally {
          setIsParsing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setParseError('Failed to read file.');
      setIsParsing(false);
    }
  };

  const handleSaveExpense = () => {
    if (parsedData && parsedData.reference && parsedData.amount) {
      const recipient = (parsedData.recipient || '').toLowerCase();
      const paymentFor = (parsedData.paymentFor || '').toLowerCase();

      const matchedBudget = (budgets || []).find(b => recipient.includes(b.category.toLowerCase()) || paymentFor.includes(b.category.toLowerCase()));
      const matchedRecurring = (recurringExpenses || []).find(r => recipient.includes(r.name.toLowerCase()) || paymentFor.includes(r.name.toLowerCase()));

      if (matchedBudget) {
        const confirmed = window.confirm(`Is this payment for your "${matchedBudget.category}" budget?`);
        if (confirmed && !parsedData.paymentFor) {
           parsedData.paymentFor = matchedBudget.category;
        }
      } else if (matchedRecurring) {
        const confirmed = window.confirm(`Would you like to link this transaction to your recurring budget/expense "${matchedRecurring.name}"?`);
        if (confirmed && !parsedData.paymentFor) {
           parsedData.paymentFor = matchedRecurring.name;
        }
      }

      onAddExpenditure(parsedData as Omit<Expenditure, 'id' | 'createdAt'>);
      setIsAdding(false);
      setRawMessage('');
      setParsedData(null);
    }
  };

  // Statements PDF handling
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
    }
  };

  // Budgeting logic placeholders
  const [newBudget, setNewBudget] = useState({ category: '', amount: '' });
  const [newRecurring, setNewRecurring] = useState({ name: '', amount: '', frequency: 'monthly' as const, dayOfMonth: '5' });

  const handleAskAi = async () => {
    if (!aiQuery.trim()) return;
    if (onUseAiCredit && !onUseAiCredit(1)) {
        setAiAnswer("You have no AI credits remaining. Please upgrade your plan.");
        return;
    }
    setIsAiLoading(true);
    setAiAnswer(null);
    try {
        const contextData = expenditures.map(e => ({ 
            date: e.date, 
            amount: e.amount,
            type: e.type || 'expense',
            recipient: e.recipient,
            category: (e as any).category || e.paymentFor || 'General',
            items: e.purchasedItems?.map(i => i.name).join(', ')
        }));

        const res = await apiFetch('/api/analyze-finances', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: aiQuery, contextData })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to analyze finances.");
        }

        const data = await res.json();
        setAiAnswer(data.answer);
    } catch (e: any) {
        console.error("AI Analysis failed", e);
        const msg = (typeof e === 'string' ? e : (e?.message || JSON.stringify(e) || "")).toLowerCase();
        if (msg.includes("quota") || msg.includes("rate") || msg.includes("limit") || msg.includes("resource_exhausted") || msg.includes("429")) {
            setAiAnswer("AI quota or rate limit reached. Please try again in a few moments.");
        } else {
            setAiAnswer(e.message || "Sorry, I couldn't analyze the financial data right now.");
        }
    } finally {
        setIsAiLoading(false);
    }
  };

  const filteredExpenditures = useMemo(() => {
    return expenditures.filter(exp =>
      exp.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.reference.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenditures, searchQuery]);


  const groupedExpenditures = useMemo(() => {
    const groups: Record<string, Expenditure[]> = {};
    filteredExpenditures.forEach(exp => {
       if (!groups[exp.date]) groups[exp.date] = [];
       groups[exp.date].push(exp);
    });
    return Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map(date => ({
       date,
       items: groups[date]
    }));
  }, [filteredExpenditures]);

  const totalIncome = filteredExpenditures.filter(e => e.type === 'income').reduce((sum, exp) => sum + exp.amount, 0);

  const totalExpense = filteredExpenditures.filter(e => e.type !== 'income').reduce((sum, exp) => sum + exp.amount, 0);
  const totalBalance = totalIncome - totalExpense;

  const totalMonthlyRecurring = useMemo(() => {
    return recurringExpenses.reduce((sum, r) => {
      let monthly = 0;
      if (r.frequency === 'daily') monthly = r.amount * 30;
      else if (r.frequency === 'weekly') monthly = r.amount * 4.333;
      else if (r.frequency === 'monthly') monthly = r.amount;
      else if (r.frequency === 'bi-monthly') monthly = r.amount / 2;
      else if (r.frequency === 'quarterly') monthly = r.amount / 3;
      else if (r.frequency === 'bi-annually') monthly = r.amount / 6;
      else if (r.frequency === 'yearly') monthly = r.amount / 12;
      return sum + monthly;
    }, 0);
  }, [recurringExpenses]);

  const handleGenerateReport = () => {
    // 1. Filter expenditures by date
    let filtered = [...expenditures];
    const now = new Date();
    let titleRange = '';

    if (exportRange === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      filtered = filtered.filter(e => e.date >= startOfMonth);
      titleRange = 'This Month';
    } else if (exportRange === 'last_month') {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      filtered = filtered.filter(e => e.date >= startOfLastMonth && e.date <= endOfLastMonth);
      titleRange = 'Last Month';
    } else if (exportRange === 'this_week') {
      const firstDay = now.getDate() - now.getDay();
      const startOfWeek = new Date(now.setDate(firstDay)).toISOString().split('T')[0];
      filtered = filtered.filter(e => e.date >= startOfWeek);
      titleRange = 'This Week';
    } else if (exportRange === 'custom') {
      if (exportStartDate) filtered = filtered.filter(e => e.date >= exportStartDate);
      if (exportEndDate) filtered = filtered.filter(e => e.date <= exportEndDate);
      titleRange = `${exportStartDate || 'Start'} to ${exportEndDate || 'End'}`;
    }

    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const total = filtered.reduce((sum, exp) => sum + exp.amount, 0);

    const userName = profile?.fullName || 'User';
    const userEmail = profile?.email || '';
    const company = profile?.companyName || '';
    
    if (exportFormat === 'pdf') {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(18);
      doc.text('Expenditure Report', 14, 22);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      let startY = 32;
      doc.text(`Name: ${userName}`, 14, startY);
      if (company) { startY += 6; doc.text(`Company: ${company}`, 14, startY); }
      if (userEmail) { startY += 6; doc.text(`Email: ${userEmail}`, 14, startY); }
      startY += 6;
      doc.text(`Period: ${titleRange}`, 14, startY);
      startY += 6;
      doc.text(`Generated On: ${new Date().toLocaleDateString()}`, 14, startY);
      
      startY += 10;
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(`Total Expenditures: Ksh ${total.toLocaleString(undefined, {minimumFractionDigits:2})}`, 14, startY);
      
      const tableData = filtered.map(exp => {
        const itemsStr = exp.purchasedItems ? exp.purchasedItems.map(i => `${i.name} (${i.amount})`).join(', ') : '';
        return [
          exp.date,
          exp.type === 'income' ? 'Income' : 'Expense',
          exp.recipient,
          exp.paymentFor || '',
          `Ksh ${exp.amount.toLocaleString(undefined, {minimumFractionDigits:2})}`,
          exp.paymentMethod || 'Unknown',
          exp.reference,
          itemsStr
        ];
      });

      autoTable(doc, {
        startY: startY + 5,
        head: [['Date', 'Type', 'Recipient/Sender', 'Payment For', 'Amount', 'Payment Method', 'Reference', 'Items']],
        body: tableData,
        theme: 'striped',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [44, 94, 62] } // forest-800 approx
      });

      doc.save(`Expenditure_Report_${titleRange.replace(/ /g, '_')}.pdf`);
    } else {
      // Excel
      const wsData: any[][] = [];
      
      // Header rows
      wsData.push(['Expenditure Report']);
      wsData.push(['Name', userName]);
      if (company) wsData.push(['Company', company]);
      if (userEmail) wsData.push(['Email', userEmail]);
      wsData.push(['Period', titleRange]);
      wsData.push(['Generated On', new Date().toLocaleDateString()]);
      wsData.push(['Total Income', `Ksh ${totalIncome.toLocaleString(undefined, {minimumFractionDigits:2})}`]);
      wsData.push(['Total Expenses', `Ksh ${totalExpense.toLocaleString(undefined, {minimumFractionDigits:2})}`]);
      wsData.push(['Balance', `Ksh ${totalBalance.toLocaleString(undefined, {minimumFractionDigits:2})}`]);
      wsData.push([]);
      
      // Table Header
      wsData.push(['Date', 'Time', 'Type', 'Recipient/Sender', 'Payment For', 'Amount', 'Payment Method', 'Reference', 'Items']);
      
      filtered.forEach(exp => {
        const itemsStr = exp.purchasedItems ? exp.purchasedItems.map(i => `${i.name} (${i.amount})`).join(', ') : '';
        wsData.push([
          exp.date,
          exp.time || '',
          exp.type === 'income' ? 'Income' : 'Expense',
          exp.recipient,
          exp.paymentFor || '',
          exp.amount,
          exp.paymentMethod || 'Unknown',
          exp.reference,
          itemsStr
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Expenditures");
      
      XLSX.writeFile(wb, `Expenditure_Report_${titleRange.replace(/ /g, '_')}.xlsx`);
    }

    setShowExportModal(false);
  };

  return (
    <div className="h-full flex flex-col animate-fadeIn relative p-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-forest-900 mb-1">Finances</h2>
          <p className="text-forest-500 text-sm">Track expenses, budgets, and statements.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => { setShowAiModal(true); setAiQuery(''); setAiAnswer(null); }}
            className="bg-gold-50 hover:bg-gold-100 text-gold-700 px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors border border-gold-200 shrink-0 shadow-sm"
            title="Ask AI about your finances"
          >
            <Sparkles size={18} />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
          <button 
            onClick={() => setShowExportModal(true)}
            className="bg-sand-100 hover:bg-sand-200 text-forest-700 px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors shrink-0"
            title="Download Report"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button 
            onClick={() => { setIsAdding(true); setRawMessage(''); setParsedData(null); setParseError(''); }}
            className="bg-gold-500 hover:bg-gold-600 text-forest-900 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Plus size={16} />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      <div className="flex border-b border-sand-200 mb-6 space-x-6">
        {(['transactions', 'budget', 'statements'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-medium transition-colors relative capitalize ${activeTab === tab ? 'text-forest-900' : 'text-forest-400 hover:text-forest-600'}`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-forest-900 rounded-t-full"></span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'transactions' && (
        <div className="flex-1 flex flex-col min-h-0 space-y-6 pb-6">
          
          {/* Ledger Dashboard */}
          <div className="bg-gradient-to-br from-forest-900 to-forest-800 rounded-3xl p-6 sm:p-8 shadow-xl text-white relative overflow-hidden flex flex-col sm:flex-row justify-between sm:items-end gap-6">
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <PieChart size={120} />
            </div>
            <div className="relative z-10 flex-1">
               <p className="text-forest-200 text-sm uppercase tracking-widest font-bold mb-2">Net Ledger Balance</p>
               <h3 className="text-4xl sm:text-5xl font-display font-light">
                 <span className="text-forest-300 text-2xl sm:text-3xl pr-1">Ksh</span>
                 <span className="font-bold">{totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
               </h3>
            </div>
            
            <div className="relative z-10 flex gap-6 sm:gap-10 border-t sm:border-t-0 sm:border-l border-forest-700 pt-4 sm:pt-0 sm:pl-10">
               <div>
                  <p className="text-forest-400 text-xs uppercase tracking-wider font-bold mb-1">Income</p>
                  <p className="text-lg font-medium text-emerald-400">+{totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
               </div>
               <div>
                  <p className="text-forest-400 text-xs uppercase tracking-wider font-bold mb-1">Expenses</p>
                  <p className="text-lg font-medium text-rose-400">-{totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
               </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-forest-400" size={18} />
              <input 
                type="text" 
                placeholder="Search ledger entries..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-sand-200 rounded-2xl pl-11 pr-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-gold-500/50 text-forest-900 placeholder:text-forest-400 shadow-sm transition-all"
              />
              <button 
                 onClick={toggleVoiceSearch}
                 className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${isVoiceSearching ? 'bg-rose-100 text-rose-500 animate-pulse' : 'text-forest-400 hover:text-forest-600 hover:bg-sand-100'}`}
                 title="Voice Search"
              >
                 {isVoiceSearching ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
            </div>
            <div className="text-sm font-medium text-forest-500 hidden sm:block">
              {filteredExpenditures.length} transactions
            </div>
          </div>

          <div className="flex-1 bg-white/50 rounded-3xl border border-sand-200 shadow-sm overflow-hidden flex flex-col min-h-0">
            {groupedExpenditures.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-forest-400">
                <Receipt size={48} className="mb-4 opacity-30" />
                <p className="font-medium text-forest-900 text-lg">Your ledger is empty</p>
                <p className="text-sm mt-1">Add an expense or income to start tracking.</p>
              </div>
            ) : (
              <div className="overflow-y-auto px-4 py-2 sm:px-6 sm:py-4 flex-1 space-y-8">
                {groupedExpenditures.map(group => (
                  <div key={group.date} className="space-y-3">
                     <h4 className="text-xs font-bold text-forest-400 uppercase tracking-widest sticky top-0 bg-[#FAFAFA]/95 backdrop-blur-md py-2 z-10">
                        {new Date(group.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                     </h4>
                     <div className="bg-white rounded-2xl border border-sand-100 shadow-sm divide-y divide-sand-50 overflow-hidden">
                       {group.items.map(exp => (
                         <div key={exp.id} className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center hover:bg-sand-50/50 transition-colors group relative">
                           <div className="flex-1 min-w-0 flex items-start gap-4 w-full">
                              <div className={`w-10 h-10 rounded-full flex shrink-0 items-center justify-center ${exp.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                                 {exp.type === 'income' ? <Plus size={18} /> : <Receipt size={18} />}
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5">
                                 <div className="flex justify-between items-start gap-2 mb-1">
                                    <h5 className="font-bold text-forest-900 text-base truncate pr-2">{exp.recipient}</h5>
                                    <div className={`font-display font-bold whitespace-nowrap ${exp.type === 'income' ? 'text-emerald-600' : 'text-forest-900'}`}>
                                      {exp.type === 'income' ? '+' : '-'} Ksh {exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                 </div>
                                 <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-forest-500">
                                    {exp.time && <span>{exp.time}</span>}
                                    {exp.time && <span className="w-1 h-1 rounded-full bg-sand-300"></span>}
                                    {exp.paymentMethod && <span className="uppercase tracking-wider font-bold bg-sand-100 px-1.5 py-0.5 rounded text-[10px]">{exp.paymentMethod}</span>}
                                    {exp.reference && (
                                       <>
                                         <span className="w-1 h-1 rounded-full bg-sand-300"></span>
                                         <span className="font-mono">{exp.reference}</span>
                                       </>
                                    )}
                                 </div>
                                 {exp.paymentFor && (
                                    <p className="text-sm text-forest-600 mt-2">{exp.paymentFor}</p>
                                 )}
                                 {exp.purchasedItems && exp.purchasedItems.length > 0 && (
                                    <div className="mt-3 bg-sand-50 rounded-xl p-3 border border-sand-100">
                                      <p className="text-xs font-bold text-forest-400 uppercase tracking-wider mb-2">Receipt Items</p>
                                      <ul className="space-y-1.5">
                                        {exp.purchasedItems.map((item, idx) => (
                                          <li key={idx} className="flex justify-between text-xs text-forest-700">
                                            <span className="truncate pr-4">{item.name}</span>
                                            <span className="font-medium whitespace-nowrap text-forest-900">{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                 )}
                              </div>
                           </div>
                           <button 
                             onClick={() => confirmAndDeleteExpenditure(exp)}
                             className="absolute top-4 right-4 sm:static text-forest-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 p-2 sm:p-1 rounded-lg hover:bg-rose-50"
                             title="Delete entry"
                           >
                             <X size={18} />
                           </button>
                         </div>
                       ))}
                     </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'budget' && (
        <div className="flex-1 overflow-y-auto space-y-6 pb-6">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Budgets Section */}
              <div className="bg-white rounded-2xl p-6 border border-sand-200 shadow-sm flex flex-col">
                 <div className="flex justify-between items-center mb-4">
                   <h3 className="font-display font-bold text-forest-900 flex items-center gap-2"><PieChart size={18} className="text-forest-500"/> Budgets</h3>
                 </div>
                 
                 <div className="space-y-4 mb-6">
                    {budgets.length === 0 ? (
                      <p className="text-sm text-forest-400 text-center py-4">No budgets set.</p>
                    ) : budgets.map(b => {
                      const spent = expenditures.filter(exp => exp.recipient.toLowerCase().includes(b.category.toLowerCase())).reduce((s, exp) => s + exp.amount, 0);
                      const percent = Math.min(100, Math.round((spent / (b.amount || 1)) * 100));
                      return (
                        <div key={b.id} className="group relative border border-sand-100 rounded-xl p-4">
                           <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium text-forest-900">{b.category}</span>
                              <span className="text-forest-500">Ksh {spent.toLocaleString()} / {b.amount.toLocaleString()}</span>
                           </div>
                           <div className="h-2 w-full bg-sand-100 rounded-full overflow-hidden">
                             <div className={`h-full rounded-full ${percent >= 100 ? 'bg-red-500' : percent > 80 ? 'bg-gold-500' : 'bg-forest-500'}`} style={{ width: `${percent}%` }}></div>
                           </div>
                           <button onClick={() => confirmAndDeleteBudget(b)} className="absolute top-2 right-2 p-1 text-forest-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash size={14}/>
                           </button>
                        </div>
                      );
                    })}
                 </div>

                 <div className="mt-auto border-t border-sand-100 pt-4">
                   <h4 className="text-xs font-bold text-forest-500 uppercase mb-3">Create New Budget</h4>
                   <div className="flex gap-2">
                     <input type="text" placeholder="Category" value={newBudget.category} onChange={e => setNewBudget(p => ({...p, category: e.target.value}))} className="flex-1 bg-sand-50 border border-sand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30" />
                     <input type="number" placeholder="Amount" value={newBudget.amount} onChange={e => setNewBudget(p => ({...p, amount: e.target.value}))} className="w-24 bg-sand-50 border border-sand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30" />
                     <button 
                       disabled={!newBudget.category || !newBudget.amount}
                       onClick={() => {
                         onUpdateBudget?.({ id: crypto.randomUUID(), category: newBudget.category, amount: Number(newBudget.amount), createdAt: new Date().toISOString() });
                         setNewBudget({category: '', amount: ''});
                       }}
                       className="bg-forest-900 text-white p-2 rounded-lg disabled:opacity-50 hover:bg-forest-800 transition-colors"
                      >
                       <Plus size={18}/>
                     </button>
                   </div>
                 </div>
              </div>

              {/* Recurring Section */}
              <div className="bg-white rounded-2xl p-6 border border-sand-200 shadow-sm flex flex-col h-full max-h-[600px]">
                 <div className="flex justify-between items-start mb-6">
                   <div>
                     <h3 className="font-display font-bold text-forest-900 flex items-center gap-2 mb-1">
                       <Repeat size={18} className="text-forest-500"/> Recurring
                     </h3>
                     <p className="text-xs text-forest-500">Fixed expenses over time</p>
                   </div>
                   <div className="text-right">
                     <p className="text-xs text-forest-500 uppercase font-bold tracking-wider mb-1">Monthly Eqv.</p>
                     <p className="text-lg font-display font-bold text-forest-900">
                       Ksh {totalMonthlyRecurring.toLocaleString(undefined, {maximumFractionDigits: 0})}
                     </p>
                   </div>
                 </div>
                 
                 <div className="space-y-3 mb-6 overflow-y-auto custom-scrollbar flex-1 pr-1 min-h-[150px]">
                    {recurringExpenses.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-forest-300 py-8">
                        <Repeat size={32} className="mb-3 opacity-20" />
                        <p className="text-sm font-medium text-forest-500">No recurring expenses</p>
                        <p className="text-xs text-forest-400 mt-1 text-center">Add subscriptions, rent, or bills below</p>
                      </div>
                    ) : recurringExpenses.map(r => {
                      const frequencyLabels: Record<string, string> = {
                        'daily': 'Daily',
                        'weekly': 'Weekly',
                        'monthly': 'Monthly',
                        'bi-monthly': 'Every 2 Months',
                        'quarterly': 'Quarterly (3 Mo)',
                        'bi-annually': 'Half Year (6 Mo)',
                        'yearly': 'Yearly'
                      };
                      const freqDisplay = frequencyLabels[r.frequency] || r.frequency;

                      return (
                      <div key={r.id} className="group relative flex justify-between items-center p-3 border border-sand-100 rounded-xl bg-sand-50/50 hover:bg-white hover:border-sand-200 transition-all shadow-sm gap-2">
                         <div className="flex items-center gap-3 min-w-0 flex-1">
                           <div className="w-8 h-8 rounded-full bg-sand-200 text-forest-500 flex items-center justify-center shrink-0">
                             <Repeat size={14} />
                           </div>
                           <div className="min-w-0">
                             <p className="font-medium text-forest-900 text-sm leading-tight truncate">{r.name}</p>
                             <p className="text-xs text-forest-500 font-medium">{freqDisplay} {r.dayOfMonth ? `• Fixed on the ${r.dayOfMonth}${r.dayOfMonth === 1 ? 'st' : r.dayOfMonth === 2 ? 'nd' : r.dayOfMonth === 3 ? 'rd' : 'th'}` : ''}</p>
                           </div>
                         </div>
                         <div className="text-right shrink-0 flex items-center gap-2">
                           <div>
                             <p className="font-bold text-forest-900 text-sm">Ksh {r.amount.toLocaleString()}</p>
                           </div>
                           <button
                             onClick={() => {
                               setAddMode('manual');
                               setParsedData({
                                 date: new Date().toISOString().split('T')[0],
                                 time: '',
                                 recipient: r.name,
                                 amount: r.amount,
                                 paymentMethod: 'M-PESA / Bank',
                                 reference: 'RECURRING-' + Math.floor(Math.random()*10000),
                                 rawMessage: `Recurring payment for ${r.name}`,
                                 paymentFor: r.name,
                                 type: 'expense'
                               });
                               setRawMessage('');
                               setParseError('');
                               setIsAdding(true);
                             }}
                             className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs rounded-lg transition-colors border border-emerald-200 shadow-xs"
                             title="Open transaction details to pay"
                           >
                             Pay
                           </button>
                         </div>
                         <button onClick={() => confirmAndDeleteRecurring(r)} className="absolute -right-2 -top-2 p-1.5 bg-white shadow-sm border border-sand-100 rounded-full text-forest-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash size={12}/>
                         </button>
                      </div>
                    );})}
                 </div>

                 <div className="mt-auto border-t border-sand-100 pt-4">
                   <h4 className="text-xs font-bold text-forest-500 uppercase mb-3">Add Recurring & Fixed Reminder</h4>
                   <div className="flex flex-col gap-2">
                     <div className="flex gap-2">
                       <input type="text" placeholder="Name (e.g. Rent, Subscription)" value={newRecurring.name} onChange={e => setNewRecurring(p => ({...p, name: e.target.value}))} className="flex-1 bg-sand-50 border border-sand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30 transition-colors" />
                       <input type="number" placeholder="Amount" value={newRecurring.amount} onChange={e => setNewRecurring(p => ({...p, amount: e.target.value}))} className="w-28 bg-sand-50 border border-sand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30 transition-colors" />
                     </div>
                     <div className="flex gap-2">
                       <select value={newRecurring.frequency} onChange={e => setNewRecurring(p => ({...p, frequency: e.target.value as any}))} className="flex-1 bg-sand-50 border border-sand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30 transition-colors cursor-pointer text-forest-900 font-medium">
                         <option value="monthly">Monthly</option>
                         <option value="daily">Daily</option>
                         <option value="weekly">Weekly</option>
                         <option value="bi-monthly">Every 2 Months</option>
                         <option value="quarterly">Quarterly (Every 3 Months)</option>
                         <option value="bi-annually">Half Year (Every 6 Months)</option>
                         <option value="yearly">Yearly (Annual)</option>
                       </select>
                       <input type="number" min="1" max="31" placeholder="Day (e.g. 5)" value={newRecurring.dayOfMonth} onChange={e => setNewRecurring(p => ({...p, dayOfMonth: e.target.value}))} className="w-24 bg-sand-50 border border-sand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30 transition-colors" title="Fixed day of month (e.g. 5th)" />
                       <button
                         disabled={!newRecurring.name || !newRecurring.amount}
                         onClick={() => {
                           onAddRecurring?.({
                             name: newRecurring.name,
                             amount: Number(newRecurring.amount),
                             frequency: newRecurring.frequency as any,
                             nextDueDate: new Date().toISOString().split('T')[0],
                             dayOfMonth: newRecurring.dayOfMonth ? Number(newRecurring.dayOfMonth) : undefined
                           });
                           setNewRecurring({name: '', amount: '', frequency: 'monthly', dayOfMonth: '5'});
                         }}
                         className="bg-forest-900 text-white px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-forest-800 transition-colors text-sm font-medium flex items-center gap-1.5"
                        >
                         <Plus size={16}/> Save
                       </button>
                     </div>
                   </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'statements' && (
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-sand-200 shadow-sm overflow-hidden p-6">
          <div className="flex justify-between items-center mb-6">
             <div>
               <h3 className="font-display font-bold text-forest-900 text-lg flex items-center gap-2"><FileText size={20} className="text-forest-500"/> PDF Statements</h3>
               <p className="text-sm text-forest-500">View bank or M-PESA PDF statements</p>
             </div>
             <div>
               <label className="cursor-pointer bg-sand-100 hover:bg-sand-200 text-forest-900 px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
                 <Upload size={16} />
                 <span>Upload PDF</span>
                 <input type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} />
               </label>
             </div>
          </div>
          <div className="flex-1 bg-sand-50 rounded-xl border border-sand-200 overflow-hidden relative flex items-center justify-center">
            {pdfUrl ? (
              <iframe src={pdfUrl} className="w-full h-full border-none" title="PDF Viewer" />
            ) : (
              <div className="text-center text-forest-400">
                <FileText size={48} className="mx-auto mb-3 opacity-50" />
                <p>No document selected</p>
                <p className="text-sm mt-1">Upload a PDF to view it here securely.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {isAdding && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-4">
           <div className="absolute inset-0 bg-forest-900/60 backdrop-blur-sm" onClick={() => setIsAdding(false)}></div>
           <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-xl relative z-10 animate-scaleIn flex flex-col max-h-full">
              <button 
                onClick={() => setIsAdding(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-sand-100 text-forest-500 hover:bg-sand-200 transition-colors"
              >
                <X size={18} />
              </button>
              
              <h3 className="text-xl font-display font-bold text-forest-900 mb-4">Log Transaction</h3>
              
              <div className="flex gap-2 mb-4 bg-sand-100 p-1 rounded-xl">
                <button 
                  onClick={() => { setAddMode('mpesa'); setParsedData(null); setRawMessage(''); setParseError(''); }} 
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${addMode === 'mpesa' ? 'bg-white shadow-sm text-forest-900' : 'text-forest-500 hover:text-forest-700'}`}
                >
                  Paste SMS
                </button>
                <button 
                  onClick={() => { setAddMode('receipt'); setParsedData(null); setRawMessage(''); setParseError(''); }} 
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${addMode === 'receipt' ? 'bg-white shadow-sm text-forest-900' : 'text-forest-500 hover:text-forest-700'}`}
                >
                  <Camera size={16}/> Scan
                </button>
                <button 
                  onClick={() => { 
                    setAddMode('manual'); 
                    setParsedData({ 
                      date: new Date().toISOString().split('T')[0], 
                      time: '', 
                      recipient: '', 
                      amount: 0, 
                      paymentMethod: 'Cash',
                      reference: 'MANUAL-' + Math.floor(Math.random()*10000), 
                      rawMessage: 'Manual entry',
                      type: 'expense'
                    }); 
                    setRawMessage(''); 
                    setParseError(''); 
                  }} 
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${addMode === 'manual' ? 'bg-white shadow-sm text-forest-900' : 'text-forest-500 hover:text-forest-700'}`}
                >
                  <FileText size={16}/> Manual
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto pr-2 pb-2">
                {addMode === 'mpesa' && (
                  <div>
                    <label className="block text-sm font-medium text-forest-700 mb-1">Paste M-PESA Message</label>
                    <textarea 
                      value={rawMessage}
                      onChange={(e) => parseMpesa(e.target.value)}
                      placeholder="e.g. PK12ABCD34 Confirmed. Ksh1,500.00 sent to JOHN DOE..."
                      className="w-full h-32 bg-sand-50 border border-sand-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-gold-500/50 text-forest-900 text-sm resize-none"
                    ></textarea>
                  </div>
                )}
                
                {addMode === 'receipt' && (
                  <div>
                    <div className="border-2 border-dashed border-sand-300 bg-sand-50 rounded-xl p-8 text-center hover:border-gold-400 transition-colors relative">
                       {isParsing ? (
                         <div className="flex flex-col items-center text-forest-600">
                           <Loader2 size={32} className="animate-spin mb-2" />
                           <p className="text-sm font-medium">Scanning Receipt/Statement via AI...</p>
                         </div>
                       ) : (
                         <>
                           <Camera size={32} className="mx-auto mb-3 text-forest-400" />
                           <p className="text-sm font-medium text-forest-900 mb-1">Upload Receipt or Statement</p>
                           <p className="text-xs text-forest-500">Supports JPG, PNG, PDF</p>
                           <input type="file" accept="image/*,application/pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleReceiptScan} />
                         </>
                       )}
                    </div>
                  </div>
                )}

                {parseError && (
                  <div className="flex items-start gap-2 bg-red-50 text-red-700 p-3 rounded-xl text-sm">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <p>{parseError}</p>
                  </div>
                )}

                {parsedData && (
                  <div className="bg-forest-50 border border-forest-100 rounded-xl p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 text-forest-900 font-medium">
                        <CheckCircle size={18} className="text-forest-600" />
                        <span>{addMode === 'manual' ? 'Transaction Details' : 'Extracted Data'}</span>
                      </div>
                      <div className="flex bg-sand-200/50 p-1 rounded-lg">
                        <button 
                          onClick={() => setParsedData({...parsedData, type: 'income'})}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${parsedData.type === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-forest-500 hover:text-forest-700'}`}
                        >
                          Income
                        </button>
                        <button 
                          onClick={() => setParsedData({...parsedData, type: 'expense'})}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${(parsedData.type === 'expense' || !parsedData.type) ? 'bg-white text-red-600 shadow-sm' : 'text-forest-500 hover:text-forest-700'}`}
                        >
                          Expense
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-forest-500 block text-xs">Amount</span>
                        <input type="number" value={parsedData.amount} onChange={(e) => setParsedData({...parsedData, amount: Number(e.target.value)})} className={`font-bold bg-transparent border-b border-forest-200 focus:outline-none w-full ${parsedData.type === 'income' ? 'text-green-700' : 'text-red-700'}`} />
                      </div>
                      <div>
                        <span className="text-forest-500 block text-xs">{parsedData.type === 'income' ? 'Sender / Source' : 'Recipient / Store'}</span>
                        <input type="text" value={parsedData.recipient} onChange={(e) => setParsedData({...parsedData, recipient: e.target.value})} className="font-medium text-forest-900 bg-transparent border-b border-forest-200 focus:outline-none w-full" />
                      </div>
                      <div>
                        <span className="text-forest-500 block text-xs flex items-center gap-1"><Hash size={12} /> Reference</span>
                        <input type="text" value={parsedData.reference} onChange={(e) => setParsedData({...parsedData, reference: e.target.value})} className="font-mono text-forest-900 bg-transparent border-b border-forest-200 focus:outline-none w-full" />
                      </div>
                      <div>
                        <span className="text-forest-500 block text-xs flex items-center gap-1"><Calendar size={12} /> Date</span>
                        <input type="date" value={parsedData.date} onChange={(e) => setParsedData({...parsedData, date: e.target.value})} className="font-medium text-forest-900 bg-transparent border-b border-forest-200 focus:outline-none w-full" />
                      </div>
                      <div className="col-span-2">
                        <span className="text-forest-500 block text-xs">Payment Method</span>
                        <select value={parsedData.paymentMethod || 'Unknown'} onChange={(e) => setParsedData({...parsedData, paymentMethod: e.target.value})} className="font-medium text-forest-900 bg-transparent border-b border-forest-200 focus:outline-none w-full py-1">
                          <option value="Cash">Cash</option>
                          <option value="M-PESA">M-PESA</option>
                          <option value="Card">Card</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="Unknown">Unknown</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <span className="text-forest-500 block text-xs">Payment For (Description)</span>
                        <input 
                          type="text" 
                          list="paymentForSuggestions"
                          placeholder="e.g. Rent, Groceries, Internet"
                          value={parsedData.paymentFor || ''} 
                          onChange={(e) => setParsedData({...parsedData, paymentFor: e.target.value})} 
                          className="font-medium text-forest-900 bg-transparent border-b border-forest-200 focus:outline-none w-full pb-1" 
                        />
                        <datalist id="paymentForSuggestions">
                          {paymentForSuggestions.map(suggestion => (
                            <option key={suggestion} value={suggestion} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-2 mt-auto">
                  <button 
                    onClick={handleSaveExpense}
                    disabled={!parsedData || !parsedData.reference || !parsedData.amount || !parsedData.recipient || isParsing}
                    className="w-full bg-gold-500 hover:bg-gold-600 disabled:bg-sand-200 disabled:text-forest-400 text-forest-900 font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Save size={18} />
                    Save Transaction
                  </button>
                </div>
              </div>
           </div>
        </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 bg-forest-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scaleIn">
            <div className="p-6 border-b border-sand-100 flex justify-between items-center bg-sand-50/50">
              <h3 className="font-display font-bold text-xl text-forest-900">Export Report</h3>
              <button onClick={() => setShowExportModal(false)} className="text-forest-400 hover:text-forest-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-forest-700 mb-2">Report Format</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setExportFormat('pdf')}
                    className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-medium transition-all ${exportFormat === 'pdf' ? 'border-gold-500 bg-gold-50 text-gold-700' : 'border-sand-200 text-forest-600 hover:bg-sand-50'}`}
                  >
                    <FileText size={18} /> PDF
                  </button>
                  <button 
                    onClick={() => {
                      if (profile?.plan === SubscriptionPlan.PREMIUM) {
                        alert("Excel Statement Export is a Pro Suite (KES 1,000/mo) and Elite feature. Premium includes comprehensive PDF reports. Please upgrade to export in Excel.");
                        onNavigateToPlans();
                        setShowExportModal(false);
                        return;
                      }
                      setExportFormat('excel');
                    }}
                    className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-medium transition-all ${exportFormat === 'excel' ? 'border-gold-500 bg-gold-50 text-gold-700' : 'border-sand-200 text-forest-600 hover:bg-sand-50'}`}
                  >
                    <PieChart size={18} /> Excel {profile?.plan === SubscriptionPlan.PREMIUM && <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">PRO+</span>}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-forest-700 mb-2">Date Range</label>
                <select 
                  value={exportRange}
                  onChange={(e) => setExportRange(e.target.value as any)}
                  className="w-full bg-sand-50 border border-sand-200 rounded-xl px-4 py-3 text-forest-900 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500"
                >
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>

              {exportRange === 'custom' && (
                <div className="grid grid-cols-2 gap-4 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-bold text-forest-500 mb-1">Start Date</label>
                    <input 
                      type="date" 
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className="w-full bg-sand-50 border border-sand-200 rounded-xl px-3 py-2 text-forest-900 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-forest-500 mb-1">End Date</label>
                    <input 
                      type="date" 
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className="w-full bg-sand-50 border border-sand-200 rounded-xl px-3 py-2 text-forest-900 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-sand-100 flex justify-end gap-3 bg-sand-50/50">
              <button 
                onClick={() => setShowExportModal(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-forest-600 hover:bg-sand-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleGenerateReport}
                className="px-6 py-2.5 bg-forest-600 hover:bg-forest-700 text-white rounded-xl font-bold transition-colors flex items-center gap-2 shadow-sm shadow-forest-900/10"
              >
                <Download size={18} />
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {showAiModal && (
        <div className="fixed inset-0 bg-forest-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-scaleIn border border-gold-200">
            <div className="p-5 border-b border-sand-100 flex justify-between items-center bg-gradient-to-r from-gold-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gold-100 flex items-center justify-center text-gold-600">
                  <Bot size={20} />
                </div>
                <div>
                   <h3 className="font-display font-bold text-lg text-forest-900">Financial AI Assistant</h3>
                   <p className="text-xs text-forest-500">Ask about your income, spending habits, top expenses, etc.</p>
                </div>
              </div>
              <button onClick={() => setShowAiModal(false)} className="text-forest-400 hover:text-forest-600 transition-colors p-2 rounded-lg hover:bg-sand-100">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-sand-50/30 custom-scrollbar flex flex-col gap-4">
              {aiAnswer ? (
                <div className="bg-white rounded-xl border border-gold-200 p-5 shadow-sm">
                   <h4 className="text-xs font-bold text-gold-600 uppercase mb-3 flex items-center gap-2">
                      <Sparkles size={14} /> AI Analysis
                   </h4>
                   <div className="text-forest-800 text-sm leading-relaxed whitespace-pre-line">
                      {aiAnswer}
                   </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-forest-400 text-center px-4">
                    <Bot size={48} className="mb-4 opacity-20" />
                    <p className="font-medium text-forest-800 mb-1">How can I help you with your finances?</p>
                    <p className="text-sm max-w-md">Try asking things like: "Where did I spend the most this month?", "List my income sources", or "Summarize my spending categories."</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-sand-100 bg-white">
               <div className="relative">
                  <input 
                    type="text"
                    placeholder="Ask a question about your finances..."
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
                    className="w-full bg-sand-50 border border-sand-200 rounded-xl pl-4 pr-14 py-3.5 focus:outline-none focus:ring-2 focus:ring-gold-500/50 text-forest-900 placeholder:text-forest-400"
                  />
                  <button
                    onClick={handleAskAi}
                    disabled={!aiQuery.trim() || isAiLoading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gold-500 hover:bg-gold-600 disabled:bg-sand-200 text-white disabled:text-forest-400 rounded-lg transition-colors flex items-center justify-center"
                  >
                    {isAiLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Expenditures;
