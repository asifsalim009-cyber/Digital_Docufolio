import React, { useEffect, useState, useMemo } from 'react';
import { StoredDocument, Task, ReminderConfig, DocumentType, DocumentFile } from '../types';
import { Calendar, BellRing, Clock, AlertTriangle, CheckCircle2, Shield, AlertCircle, User, FileText, Check, CalendarDays, ArrowRight, Eye, Download, X, Image as ImageIcon, Settings, ChevronRight, ExternalLink } from 'lucide-react';
import {
  scheduleDocumentExpiryNotifications,
  scheduleTaskNotifications,
  syncDocumentToGoogleCalendar,
  syncTaskToGoogleCalendar,
  openGoogleCalendarUrl
} from '../notificationService';

interface RemindersProps {
  documents: StoredDocument[];
  tasks: Task[];
  onUpdateDocument: (doc: StoredDocument) => void;
  onUpdateTask: (task: Task) => void;
}

const Reminders: React.FC<RemindersProps> = ({ documents, tasks, onUpdateDocument, onUpdateTask }) => {
  const [activeTab, setActiveTab] = useState<'expiry' | 'tasks'>('expiry');
  const [reminderFilter, setReminderFilter] = useState<'all' | 'expired' | '1month' | '3months' | '6months' | '1year'>('all');
  const [previewFile, setPreviewFile] = useState<DocumentFile | null>(null);
  const [selectedReminderDoc, setSelectedReminderDoc] = useState<StoredDocument | null>(null);
  const [calSyncStatus, setCalSyncStatus] = useState<string | null>(null);

  // 1. Process Documents for Expiry
  const documentsWithExpiry = useMemo(() => {
    return documents
      .filter((doc) => doc.expiryDate)
      .sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime());
  }, [documents]);

  const getDaysUntilExpiry = (dateStr: string) => {
    const today = new Date();
    const expiry = new Date(dateStr);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  };

  const filteredDocumentsWithExpiry = useMemo(() => {
    return documentsWithExpiry.filter(doc => {
      if (!doc.expiryDate) return false;
      const days = getDaysUntilExpiry(doc.expiryDate);
      if (reminderFilter === 'expired') return days < 0;
      if (reminderFilter === '1month') return days >= 0 && days <= 30;
      if (reminderFilter === '3months') return days >= 0 && days <= 90;
      if (reminderFilter === '6months') return days >= 0 && days <= 180;
      if (reminderFilter === '1year') return days >= 0 && days <= 365;
      return true; // 'all'
    });
  }, [documentsWithExpiry, reminderFilter]);

  const groupedDocuments = useMemo<Record<string, StoredDocument[]>>(() => {
    return filteredDocumentsWithExpiry.reduce((acc: Record<string, StoredDocument[]>, doc: StoredDocument) => {
      const owner = doc.ownerName;
      if (!acc[owner]) acc[owner] = [];
      acc[owner].push(doc);
      return acc;
    }, {} as Record<string, StoredDocument[]>);
  }, [filteredDocumentsWithExpiry]);

  // Schedule Android System Notifications for both Document Expirations and Tasks
  useEffect(() => {
    scheduleDocumentExpiryNotifications(documentsWithExpiry);
  }, [documentsWithExpiry]);

  useEffect(() => {
    scheduleTaskNotifications(tasks);
  }, [tasks]);

  const getStatusColor = (days: number) => {
    if (days < 0) return 'text-gray-500 bg-gray-100 border-gray-200'; // Expired
    if (days <= 7) return 'text-red-600 bg-red-50 border-red-200'; // Critical
    if (days <= 30) return 'text-amber-600 bg-amber-50 border-amber-200'; // Warning
    return 'text-green-600 bg-green-50 border-green-200'; // Good
  };

  const getStatusText = (days: number) => {
    if (days < 0) return 'Expired';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `${days} Days`;
  };

  const handleToggleReminder = (doc: StoredDocument, key: keyof ReminderConfig) => {
    if (!doc.reminderConfig) return;
    const newConfig = { ...doc.reminderConfig, [key]: !doc.reminderConfig[key] };
    const updatedDoc = { ...doc, reminderConfig: newConfig };
    onUpdateDocument(updatedDoc);
    if (selectedReminderDoc?.id === doc.id) {
      setSelectedReminderDoc(updatedDoc);
    }
  };

  const handleSyncDocToCalendar = async (doc: StoredDocument) => {
    setCalSyncStatus('Syncing to Google Calendar...');
    try {
      const result = await syncDocumentToGoogleCalendar(doc);
      if (result.success) {
        onUpdateDocument({
          ...doc,
          syncToGoogleCalendar: true,
          googleCalendarEventId: result.eventId || doc.googleCalendarEventId
        });
        setCalSyncStatus('Synced to Google Calendar!');
      }
    } catch (err) {
      console.error('Google Calendar Sync error:', err);
      setCalSyncStatus('Failed to sync to Google Calendar.');
    } finally {
      setTimeout(() => setCalSyncStatus(null), 3000);
    }
  };

  const handleSyncTaskToCalendar = async (task: Task) => {
    try {
      const result = await syncTaskToGoogleCalendar(task);
      if (result.success) {
        onUpdateTask({
          ...task,
          syncToGoogleCalendar: true,
          googleCalendarEventId: result.eventId || task.googleCalendarEventId
        });
      }
    } catch (err) {
      console.error('Task Google Calendar Sync error:', err);
      openGoogleCalendarUrl({
        title: `📌 Task: ${task.title}`,
        description: `Digital DocuFolio Task scheduled for ${task.date} at ${task.time || '09:00'}`,
        date: task.date,
        time: task.time
      });
    }
  };

  // 2. Process Tasks
  const incompleteTasks: Task[] = tasks
    .filter(t => !t.completed)
    .sort((a, b) => new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime());

  return (
    <div className="h-full flex flex-col animate-fadeIn relative">
      
      {/* Header & Navigation Switcher */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-4 gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold text-forest-900">Reminders & Alerts</h2>
            <p className="text-forest-500 text-sm">System notifications & Google Calendar sync for expirations and to-dos.</p>
          </div>

          <div className="flex bg-sand-200/50 p-1.5 rounded-xl border border-sand-200 shadow-inner">
             <button
               onClick={() => setActiveTab('expiry')}
               className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                 activeTab === 'expiry'
                 ? 'bg-white text-forest-900 shadow-sm ring-1 ring-black/5'
                 : 'text-forest-500 hover:text-forest-700 hover:bg-white/50'
               }`}
             >
               <Shield size={16} className={activeTab === 'expiry' ? 'text-gold-600' : 'text-forest-400'} />
               Document Expiry
               <span className={`ml-1 text-xs px-2 py-0.5 rounded-full ${activeTab === 'expiry' ? 'bg-forest-100 text-forest-600' : 'bg-sand-200/50 text-forest-400'}`}>
                 {documentsWithExpiry.length}
               </span>
             </button>
             <button
               onClick={() => setActiveTab('tasks')}
               className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                 activeTab === 'tasks'
                 ? 'bg-white text-forest-900 shadow-sm ring-1 ring-black/5'
                 : 'text-forest-500 hover:text-forest-700 hover:bg-white/50'
               }`}
             >
               <Clock size={16} className={activeTab === 'tasks' ? 'text-gold-600' : 'text-forest-400'} />
               Upcoming Tasks
               <span className={`ml-1 text-xs px-2 py-0.5 rounded-full ${activeTab === 'tasks' ? 'bg-forest-100 text-forest-600' : 'bg-sand-200/50 text-forest-400'}`}>
                 {incompleteTasks.length}
               </span>
             </button>
          </div>
      </div>

      {/* Filter Bar for Document Expiry */}
      {activeTab === 'expiry' && (
        <div className="flex flex-wrap gap-2 mb-4 px-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'expired', label: 'Expired' },
            { id: '1month', label: 'Expiry within 1 Month' },
            { id: '3months', label: '3 Months' },
            { id: '6months', label: '6 Months' },
            { id: '1year', label: '1 Year' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setReminderFilter(f.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                reminderFilter === f.id
                  ? 'bg-forest-900 text-white shadow-sm ring-1 ring-forest-900'
                  : 'bg-white hover:bg-sand-100 text-forest-700 border border-sand-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative bg-white/40 rounded-3xl border border-white/50 shadow-sm p-1 ring-1 ring-white/20">
         
         {/* --- DOCUMENT EXPIRY VIEW (GROUPED COMPACT LIST) --- */}
         {activeTab === 'expiry' && (
            <div className="h-full overflow-y-auto p-4 md:p-6 custom-scrollbar space-y-8">
                {filteredDocumentsWithExpiry.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center text-center p-8">
                      <div className="w-20 h-20 bg-sand-50 rounded-full flex items-center justify-center mb-4 shadow-inner">
                          <Shield size={40} className="text-sand-300" />
                      </div>
                      <p className="text-forest-900 font-bold text-lg">No documents expiring soon</p>
                      <p className="text-forest-500 text-sm mt-1 max-w-xs mx-auto">Upload documents with expiry dates to the Wallet to track their renewal status here.</p>
                   </div>
                ) : (
                   Object.entries(groupedDocuments).map(([owner, docs]: [string, any]) => (
                       <div key={owner} className="animate-fadeIn">
                           {/* Owner Header */}
                           <div className="flex items-center gap-3 mb-3 pl-1">
                               <div className="w-8 h-8 rounded-full bg-forest-900 text-white flex items-center justify-center font-bold text-xs shadow-md">
                                   {owner.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
                               </div>
                               <div>
                                   <h3 className="font-bold text-forest-900">{owner}</h3>
                                   <p className="text-[10px] text-forest-500 uppercase tracking-wide font-bold">{docs.length} Documents</p>
                               </div>
                           </div>

                           {/* Compact Grid */}
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                               {docs.map(doc => {
                                   const daysLeft = getDaysUntilExpiry(doc.expiryDate!);
                                   const statusClass = getStatusColor(daysLeft);
                                   const displayType = doc.type === DocumentType.OTHER_DOCUMENT ? (doc.customType || 'Document') : doc.type;
                                   const imageFile = doc.files.find(f => f.mimeType.startsWith('image/'));
                                   
                                   return (
                                       <div 
                                         key={doc.id}
                                         onClick={() => setSelectedReminderDoc(doc)}
                                         className="bg-white rounded-lg border border-sand-200 p-3 hover:border-gold-400 hover:shadow-md transition-all cursor-pointer flex items-center gap-3 group"
                                       >
                                           {/* Tiny Thumbnail */}
                                           <div className="w-10 h-10 rounded-lg bg-sand-50 flex-shrink-0 border border-sand-100 overflow-hidden flex items-center justify-center text-forest-300">
                                               {imageFile ? (
                                                   <img src={imageFile.url} className="w-full h-full object-cover" alt="" />
                                               ) : (
                                                   <FileText size={18} />
                                               )}
                                           </div>

                                           {/* Info */}
                                           <div className="flex-1 min-w-0">
                                               <h4 className="font-bold text-forest-900 text-sm truncate leading-tight">{doc.customName || displayType}</h4>
                                               <p className="text-[10px] text-forest-500 truncate">{doc.type}</p>
                                           </div>

                                           {/* Status Pill */}
                                           <div className={`px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${statusClass}`}>
                                               {getStatusText(daysLeft)}
                                           </div>
                                           
                                           <ChevronRight size={14} className="text-forest-300 group-hover:text-gold-500 transition-colors" />
                                       </div>
                                   );
                               })}
                           </div>
                       </div>
                   ))
                )}
            </div>
         )}

         {/* --- TASKS VIEW --- */}
         {activeTab === 'tasks' && (
            <div className="h-full overflow-y-auto p-4 md:p-6 custom-scrollbar">
                {incompleteTasks.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center text-center p-8">
                      <div className="w-20 h-20 bg-sand-50 rounded-full flex items-center justify-center mb-4 shadow-inner">
                          <CheckCircle2 size={40} className="text-green-500/50" />
                      </div>
                      <p className="text-forest-900 font-bold text-lg">You're all caught up!</p>
                      <p className="text-forest-500 text-sm mt-1">Check your Journal to add new tasks or planning items.</p>
                   </div>
                ) : (
                   <div className="max-w-3xl mx-auto space-y-8">
                       {/* Group tasks by date for better readability */}
                       {Array.from(new Set(incompleteTasks.map(t => t.date))).map((dateGroup: string) => {
                           const tasksForDate = incompleteTasks.filter(t => t.date === dateGroup);
                           const isToday = dateGroup === new Date().toISOString().split('T')[0];
                           const dateObj = new Date(dateGroup);
                           
                           return (
                               <div key={dateGroup} className="animate-fadeIn">
                                   <div className="flex items-center gap-4 mb-4">
                                       <div className={`px-4 py-1.5 rounded-full text-sm font-bold border ${isToday ? 'bg-gold-50 text-gold-700 border-gold-200' : 'bg-sand-100 text-forest-600 border-sand-200'}`}>
                                           {isToday ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                       </div>
                                       <div className="h-px flex-1 bg-sand-200"></div>
                                   </div>

                                   <div className="space-y-3">
                                       {tasksForDate.map(task => (
                                           <div key={task.id} className="group bg-white p-5 rounded-xl border border-sand-200 shadow-sm flex items-start gap-4 hover:border-gold-300 hover:shadow-md transition-all">
                                                <button 
                                                  onClick={() => onUpdateTask({...task, completed: true})}
                                                  className="mt-1 w-6 h-6 rounded-full border-2 border-sand-300 text-white hover:border-gold-500 hover:bg-gold-500 flex items-center justify-center transition-all shadow-inner"
                                                  title="Mark as Completed"
                                                >
                                                  <Check size={14} className="opacity-0 hover:opacity-100" />
                                                </button>
                                                
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-forest-900 text-lg">{task.title}</h4>
                                                    <div className="flex items-center gap-4 mt-2">
                                                        <span className={`text-xs font-bold flex items-center gap-1.5 bg-sand-50 px-2 py-1 rounded-md border border-sand-100 ${isToday ? 'text-gold-600' : 'text-forest-500'}`}>
                                                           <Clock size={12} /> 
                                                           {task.time}
                                                        </span>
                                                        <span className="text-xs text-forest-400">
                                                            Scheduled in Journal
                                                        </span>
                                                    </div>
                                                </div>

                                                <button
                                                  onClick={() => handleSyncTaskToCalendar(task)}
                                                  className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold border border-sky-200"
                                                  title="Sync to Google Calendar"
                                                >
                                                    <CalendarDays size={16} />
                                                    <span className="hidden sm:inline">Add to Calendar</span>
                                                </button>
                                           </div>
                                       ))}
                                   </div>
                               </div>
                           );
                       })}
                   </div>
                )}
            </div>
         )}
      </div>

       {/* Reminder Settings Modal */}
       {selectedReminderDoc && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/60 backdrop-blur-sm animate-fadeIn">
               <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-sand-100 flex justify-between items-center bg-sand-50">
                        <h3 className="font-display font-bold text-lg text-forest-900">Configure Alerts & Calendar</h3>
                        <button onClick={() => setSelectedReminderDoc(null)} className="text-forest-400 hover:text-forest-900">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="p-6 space-y-6">
                        {/* Doc Info */}
                        <div className="flex items-start gap-4">
                            <div className="w-16 h-16 rounded-xl bg-sand-100 border border-sand-200 flex items-center justify-center text-forest-400 overflow-hidden">
                                {selectedReminderDoc.files.find(f => f.mimeType.startsWith('image/')) ? (
                                    <img src={selectedReminderDoc.files.find(f => f.mimeType.startsWith('image/'))!.url} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <FileText size={24} />
                                )}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-forest-900">{selectedReminderDoc.customName || selectedReminderDoc.type}</h4>
                                <p className="text-xs text-forest-500 mb-1">{selectedReminderDoc.ownerName}</p>
                                <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(getDaysUntilExpiry(selectedReminderDoc.expiryDate!))}`}>
                                    Expires: {selectedReminderDoc.expiryDate}
                                </div>
                            </div>
                        </div>

                        {/* Google Calendar Sync Action */}
                        <div className="bg-sky-50 border border-sky-200 p-4 rounded-xl flex flex-col gap-2">
                             <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-2 text-sky-900 font-bold text-sm">
                                     <CalendarDays size={18} className="text-sky-600" />
                                     <span>Google Calendar Integration</span>
                                 </div>
                                 {selectedReminderDoc.syncToGoogleCalendar && (
                                     <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                                         Synced
                                     </span>
                                 )}
                             </div>
                             <p className="text-xs text-sky-700">Add or update this document's expiration alert directly on your Google Calendar.</p>
                             <button
                               onClick={() => handleSyncDocToCalendar(selectedReminderDoc)}
                               className="mt-1 w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
                             >
                               <ExternalLink size={14} /> Add/Update on Google Calendar
                             </button>
                             {calSyncStatus && (
                                 <p className="text-[11px] text-center font-bold text-sky-800 animate-fadeIn">{calSyncStatus}</p>
                             )}
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-forest-500 uppercase mb-3">Android System Notifications</h4>
                          <div className="space-y-2">
                               {[
                                 { key: 'oneMonth', label: '1 Month before expiry' },
                                 { key: 'twoWeeks', label: '2 Weeks before expiry' },
                                 { key: 'oneWeek', label: 'Daily during final week' },
                                 { key: 'threeDays', label: '3 Days before expiry' },
                               ].map((opt) => (
                                  <button
                                    key={opt.key}
                                    onClick={() => handleToggleReminder(selectedReminderDoc, opt.key as keyof ReminderConfig)}
                                    className={`
                                       w-full flex items-center justify-between p-3 rounded-xl border transition-all text-sm font-medium
                                       ${selectedReminderDoc.reminderConfig?.[opt.key as keyof ReminderConfig]
                                          ? 'bg-forest-900 border-forest-900 text-white shadow-md'
                                          : 'bg-white border-sand-200 text-forest-600 hover:bg-sand-50'}
                                    `}
                                  >
                                    <span>{opt.label}</span>
                                    {selectedReminderDoc.reminderConfig?.[opt.key as keyof ReminderConfig] && <CheckCircle2 size={16} className="text-gold-400" />}
                                  </button>
                               ))}
                          </div>
                        </div>

                        {selectedReminderDoc.files.length > 0 && (
                            <button 
                                onClick={() => { 
                                    setPreviewFile(selectedReminderDoc.files[0]);
                                    setSelectedReminderDoc(null);
                                }}
                                className="w-full py-3 bg-white border border-sand-300 text-forest-700 font-bold rounded-xl hover:bg-gold-50 hover:border-gold-200 hover:text-gold-700 transition-all flex items-center justify-center gap-2"
                            >
                                <Eye size={16} /> View Full Document
                            </button>
                        )}
                    </div>
               </div>
           </div>
       )}

       {/* Full Screen File Preview Modal */}
       {previewFile && (
           <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex flex-col animate-fadeIn">
                {/* Preview Toolbar */}
                <div className="flex justify-between items-center p-4 text-white bg-black/40 border-b border-white/10 backdrop-blur-sm fixed top-0 left-0 right-0 z-10">
                   <div className="flex items-center gap-3 overflow-hidden">
                       <div className="p-2 bg-white/10 rounded-lg">
                           {previewFile.mimeType.startsWith('image/') ? <ImageIcon size={20} /> : <FileText size={20} />}
                       </div>
                       <h3 className="font-bold text-lg truncate max-w-[200px] md:max-w-md">{previewFile.name}</h3>
                   </div>
                   <div className="flex items-center gap-3">
                      <a 
                        href={previewFile.url} 
                        download={previewFile.name}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 px-4 py-2 bg-gold-600 hover:bg-gold-500 text-white rounded-lg transition-colors font-bold text-sm shadow-lg shadow-gold-600/20"
                      >
                        <Download size={18} /> <span className="hidden sm:inline">Download</span>
                      </a>
                      <button 
                        onClick={() => setPreviewFile(null)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-bold text-sm"
                      >
                        <X size={18} /> <span className="hidden sm:inline">Close</span>
                      </button>
                   </div>
                </div>
                
                {/* Preview Content */}
                <div className="flex-1 flex items-center justify-center p-4 md:p-8 overflow-hidden mt-16" onClick={() => setPreviewFile(null)}>
                   <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                       {previewFile.mimeType.startsWith('image/') ? (
                          <img 
                            src={previewFile.url} 
                            alt={previewFile.name} 
                            className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" 
                          />
                       ) : previewFile.mimeType === 'application/pdf' ? (
                          <iframe 
                            src={previewFile.url} 
                            className="w-full h-full max-w-5xl bg-white rounded-lg shadow-2xl" 
                            title="PDF Preview" 
                          />
                       ) : (
                          <div className="text-center text-white/50 flex flex-col items-center p-8 border-2 border-dashed border-white/10 rounded-2xl">
                             <FileText size={64} className="mb-6 opacity-50" />
                             <p className="text-xl font-bold text-white mb-2">Preview not available</p>
                             <p className="text-sm">This file type cannot be previewed directly.</p>
                             <a 
                                href={previewFile.url} 
                                download={previewFile.name}
                                className="mt-6 px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors"
                             >
                                 Download to View
                             </a>
                          </div>
                       )}
                   </div>
                </div>
           </div>
       )}
    </div>
  );
};

export default Reminders;