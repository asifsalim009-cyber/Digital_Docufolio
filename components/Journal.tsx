import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, JournalEntry, Task, SubscriptionPlan } from '../types';
import { Calendar as CalendarIcon, CheckCircle2, Circle, Clock, Plus, Trash, Bell, PenLine, Sun, Save, ChevronLeft, ChevronRight, Layout, PanelRightClose, CalendarDays, Search, Sparkles, X, ArrowRight, Loader2, Lock, Mic, MicOff } from 'lucide-react';
import { useVoiceSearch } from '../useVoiceSearch';

import { createCalendarEvent } from '../googleCalendar';
import { apiFetch } from '../api';

interface JournalProps {
  profile?: UserProfile;
  onUseAiCredit?: (amount?: number) => boolean;
  entries: JournalEntry[];
  tasks: Task[];
  currentPlan: SubscriptionPlan;
  onNavigateToPlans: () => void;
  onAddEntry: (entry: JournalEntry) => void;
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
}

const Journal: React.FC<JournalProps> = ({ 
  profile, onUseAiCredit, entries, tasks, currentPlan, onNavigateToPlans, onAddEntry, onAddTask, onUpdateTask, onDeleteTask 
}) => {
  // State
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [content, setContent] = useState('');
  const [isTaskPanelOpen, setIsTaskPanelOpen] = useState(false); // Default to closed for larger writing area
  const [isDirty, setIsDirty] = useState(false);
  
  const isPaidActive = Boolean(currentPlan !== SubscriptionPlan.BASIC && profile?.subscriptionStatus === 'active');
  const isBasic = !isPaidActive;
  const today = new Date().toISOString().split('T')[0];
  const hasEntryToday = entries.some(e => e.date === today && e.content.trim().length > 0);
  const canAddEntry = !isBasic || !hasEntryToday || selectedDate !== today || (selectedDate === today && hasEntryToday); // Simplify: if basic, and they already wrote today, maybe restrict saving more if we want strict 1/day limit. Actually, if they wrote today, they are just editing it. Let's restrict based on date selection or just show a warning. For now, allow editing today's, but maybe they can't save on other days? The prompt says "1 Journal Entry per day". Editing the single daily entry is fine.
  
  // Search / Retrieve State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{date: string, preview: string}[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);

  // Task Inputs
  const [taskTitle, setTaskTitle] = useState('');
  const [taskTime, setTaskTime] = useState('');
  const [taskReminderOffset, setTaskReminderOffset] = useState<number>(0);
  const [syncTaskToCalendar, setSyncTaskToCalendar] = useState(true);

  // Voice Memo State
  const [isRecordingMemo, setIsRecordingMemo] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleRecordMemo = async () => {
    if (isRecordingMemo) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      let recognitionInstance: any = null;
      let transcribedText = '';

      if (SpeechRecognition) {
        try {
          recognitionInstance = new SpeechRecognition();
          recognitionInstance.continuous = true;
          recognitionInstance.interimResults = false;
          recognitionInstance.lang = 'en-US';
          recognitionInstance.onresult = (e: any) => {
            for (let i = e.resultIndex; i < e.results.length; ++i) {
              if (e.results[i].isFinal) {
                transcribedText += ' ' + e.results[i][0].transcript;
              }
            }
          };
          recognitionInstance.start();
        } catch (recErr) {
          console.warn("Speech recognition unavailable:", recErr);
        }
      }

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        if (recognitionInstance) {
          try { recognitionInstance.stop(); } catch (e) {}
        }
        setIsRecordingMemo(false);
        setIsTranscribing(true);

        setTimeout(() => {
          setIsTranscribing(false);
          const memoNote = transcribedText.trim()
            ? `\n\n[Voice Dictation - ${new Date().toLocaleTimeString()}]: ${transcribedText.trim()}`
            : `\n\n[Voice Note recorded at ${new Date().toLocaleTimeString()}]`;
          setContent(prev => prev + memoNote);
          setIsDirty(true);
        }, 1000);
      };

      mediaRecorder.start();
      setIsRecordingMemo(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  // Refs for Auto-Save
  const stateRef = useRef({ content, entries, selectedDate, isDirty });

  // Sync refs with state
  useEffect(() => {
    stateRef.current = { content, entries, selectedDate, isDirty };
  }, [content, entries, selectedDate, isDirty]);

  // Auto-Save Interval
  useEffect(() => {
    const interval = setInterval(() => {
      const { content: currentContent, entries: currentEntries, selectedDate: currentDate, isDirty: currentIsDirty } = stateRef.current;
      
      if (currentIsDirty) {
        onAddEntry({
          id: currentEntries.find(e => e.date === currentDate)?.id || Math.random().toString(36),
          date: currentDate,
          content: currentContent
        });
        setIsDirty(false);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [onAddEntry]);

  // Derived state
  const displayDate = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  // Load content when selectedDate changes
  useEffect(() => {
    const entry = entries.find(e => e.date === selectedDate);
    setContent(entry ? entry.content : '');
    setIsDirty(false);
  }, [selectedDate, entries]);

  // Alarm Check Logic
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const todayString = now.toISOString().split('T')[0];
      const currentTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      
      tasks.forEach(task => {
        if (!task.completed && task.date === todayString && task.time === currentTime) {
          if (Notification.permission === 'granted') {
             new Notification(`Task Reminder: ${task.title}`);
          } else if (Notification.permission !== 'denied') {
             Notification.requestPermission();
          }
        }
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [tasks]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setIsDirty(true);
  };

  const handleSaveEntry = () => {
    if (profile?.subscriptionStatus === 'unpaid' || profile?.subscriptionStatus === 'past_due') {
        alert("Your subscription is unpaid or expired. Please renew your subscription to save journal entries.");
        onNavigateToPlans();
        return;
    }
    // If Basic plan and they are trying to save an entry for a date that isn't today, block it.
    if (isBasic && selectedDate !== today) {
        alert("Basic plan allows 1 Journal Entry per day for the current day only. Upgrade to a paid plan for unlimited backdated entries.");
        onNavigateToPlans();
        return;
    }

    onAddEntry({
      id: entries.find(e => e.date === selectedDate)?.id || Math.random().toString(36),
      date: selectedDate,
      content: content
    });
    setIsDirty(false);
  };

  const handleAddTask = async () => {
    if (!taskTitle || !taskTime) return;
    if (profile?.subscriptionStatus === 'unpaid' || profile?.subscriptionStatus === 'past_due') {
        alert("Your subscription is unpaid or expired. Please renew your subscription to add tasks.");
        onNavigateToPlans();
        return;
    }

    const newTask: Task = {
      id: Math.random().toString(36),
      title: taskTitle,
      time: taskTime,
      completed: false,
      date: selectedDate, // Tasks are attached to the currently viewed date
      syncToGoogleCalendar: syncTaskToCalendar,
      reminderOffsetMinutes: taskReminderOffset
    };

    if (profile?.googleCalendarConnected && syncTaskToCalendar) {
      try {
        const { getCalendarToken } = await import('../googleCalendar');
        const token = await getCalendarToken('393681011941-m5r8dpkm1cu82gs34kdvigbofmtet92e.apps.googleusercontent.com');
        const eventRes = await createCalendarEvent(token, {
          title: `Task: ${newTask.title}`,
          description: `Scheduled task from Digital Docufolio`,
          date: newTask.date,
          time: newTask.time,
          reminders: [{ minutes: taskReminderOffset }]
        });
        newTask.googleCalendarEventId = eventRes.id;
      } catch (err) {
        console.error('Failed to sync task with Google Calendar', err);
      }
    }

    onAddTask(newTask);
    setTaskTitle('');
    setTaskTime('');
    setTaskReminderOffset(0);
  };

  const handleTaskDelete = async (task: Task) => {
    const confirmed = window.confirm(`Are you sure you want to delete task "${task.title}"? This action cannot be undone.`);
    if (!confirmed) return;

    if (task.googleCalendarEventId && profile?.googleCalendarConnected) {
      try {
        const { getCalendarToken, deleteCalendarEvent } = await import('../googleCalendar');
        const token = await getCalendarToken('393681011941-m5r8dpkm1cu82gs34kdvigbofmtet92e.apps.googleusercontent.com');
        await deleteCalendarEvent(token, task.googleCalendarEventId);
      } catch (err) {
        console.error('Failed to delete Google Calendar event', err);
      }
    }
    onDeleteTask(task.id);
  };

  const toggleTask = (task: Task) => {
    onUpdateTask({ ...task, completed: !task.completed });
  };

  const handleDateChange = (newDateStr: string) => {
    setSelectedDate(newDateStr);
    
    // Auto-open tasks and prepopulate title if it's a future date
    if (newDateStr > today) {
       setIsTaskPanelOpen(true);
       setTaskTitle(`Task for ${newDateStr}`);
    }
  };

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    handleDateChange(date.toISOString().split('T')[0]);
  };

  // Search Logic
  const handleOpenSearch = () => {
    setIsSearchOpen(true);
    setSearchQuery('');
    setAiAnswer(null);
    setSearchResults(entries.map(e => ({
        date: e.date,
        preview: e.content.substring(0, 100) + '...'
    })).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
        setSearchResults(entries.map(e => ({
            date: e.date,
            preview: e.content.substring(0, 100) + '...'
        })).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } else {
        const filtered = entries.filter(e => e.content.toLowerCase().includes(query.toLowerCase()));
        setSearchResults(filtered.map(e => ({
            date: e.date,
            preview: e.content.substring(0, 100) + '...'
        })).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }
  };

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleSearchChange(e.target.value);
  };
  
  const { isListening: isVoiceSearching, toggleListening: toggleVoiceSearch } = useVoiceSearch((text) => handleSearchChange(text));

  const askAi = async () => {
    if (!searchQuery.trim()) return;
    if (!isPaidActive) {
        setAiAnswer("AI Journal Assistant requires an active paid subscription. Please upgrade your plan to unlock AI features.");
        return;
    }
    if (onUseAiCredit && !onUseAiCredit(1)) {
        setAiAnswer("You have no AI credits remaining. Please upgrade your plan.");
        return;
    }
    setIsAiLoading(true);
    setAiAnswer(null);
    try {
        const contextData = entries.map(e => ({ date: e.date, content: e.content }));
        const res = await apiFetch('/api/analyze-journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery, contextData })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to analyze journal.");
        }
        const data = await res.json();
        setAiAnswer(data.answer);
    } catch (e: any) {
        console.error("AI Retrieval failed", e);
        const msg = (typeof e === 'string' ? e : (e?.message || JSON.stringify(e) || "")).toLowerCase();
        if (msg.includes("quota") || msg.includes("rate") || msg.includes("limit") || msg.includes("resource_exhausted") || msg.includes("429")) {
            setAiAnswer("AI quota or rate limit reached. Please try again in a few moments.");
        } else {
            setAiAnswer(e.message || "Sorry, I couldn't retrieve that information right now.");
        }
    } finally {
        setIsAiLoading(false);
    }
  };

  const selectEntryFromSearch = (date: string) => {
    setSelectedDate(date);
    setIsSearchOpen(false);
  };

  return (
    <div className="h-full flex flex-col gap-4 animate-fadeIn relative">
      
      {/* Journal Controls Header - Compact */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-3 glass-panel rounded-2xl shadow-sm border border-sand-200 shrink-0">
        
        {/* Date Navigation */}
        <div className="flex items-center gap-2 bg-sand-50 p-1 rounded-xl border border-sand-200">
          <button onClick={() => changeDate(-1)} className="p-1.5 hover:bg-white hover:shadow-sm text-forest-600 rounded-lg transition-all">
            <ChevronLeft size={16} />
          </button>
          
          <div className="relative group px-2">
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
            />
            <div className="flex items-center gap-2 pointer-events-none group-hover:text-gold-600 transition-colors">
              <CalendarDays size={14} className="text-forest-400" />
              <span className="font-bold text-forest-900 text-xs md:text-sm whitespace-nowrap">
                {selectedDate === new Date().toISOString().split('T')[0] ? "Today" : selectedDate}
              </span>
            </div>
          </div>

          <button onClick={() => changeDate(1)} className="p-1.5 hover:bg-white hover:shadow-sm text-forest-600 rounded-lg transition-all">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button 
             onClick={handleOpenSearch}
             className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-xs bg-white text-forest-600 border border-sand-300 hover:bg-sand-50 transition-all shadow-sm"
          >
              <Search size={14} /> Search
          </button>

          <button 
            onClick={handleSaveEntry}
            disabled={!isDirty}
            className={`
              flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition-all
              ${isDirty 
                ? 'bg-gold-600 text-white hover:bg-gold-500 shadow-gold-500/20' 
                : 'bg-sand-100 text-forest-400 cursor-not-allowed'}
            `}
            title={isDirty ? "Save now" : "All changes saved"}
          >
            <Save size={14} />
            {isDirty ? 'Save Changes' : 'Saved'}
          </button>

          <button 
            onClick={() => setIsTaskPanelOpen(!isTaskPanelOpen)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs border transition-all
              ${isTaskPanelOpen 
                ? 'bg-forest-900 text-white border-forest-900 shadow-md' 
                : 'bg-white text-forest-600 border-sand-300 hover:bg-sand-50'}
            `}
          >
            {isTaskPanelOpen ? <PanelRightClose size={14} /> : <Layout size={14} />}
            <span className="hidden md:inline">Plan</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden relative">
        {/* Writing Area */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-sand-200 relative overflow-hidden transition-all duration-500">
          
          {/* Writing Header - Compact */}
          <div className="px-6 py-4 border-b border-sand-100 flex justify-between items-end bg-gradient-to-r from-white to-sand-50 shrink-0">
             <div>
               <h2 className="text-xl font-display font-bold text-forest-900 flex items-center gap-2">
                 <PenLine className="text-gold-600" size={20} /> 
                 <span className="truncate">Daily Journal</span>
               </h2>
               <p className="text-forest-400 text-xs mt-0.5 font-medium">{displayDate}</p>
             </div>
             <div className="text-[10px] font-bold text-forest-500 bg-sand-100 px-2 py-1 rounded-lg whitespace-nowrap border border-sand-200">
               {content.split(/\s+/).filter(Boolean).length} Words
             </div>
          </div>
          
          {/* Text Area - Reduced font size for better visibility */}
          <div className="flex-1 relative">
             <textarea 
              className="w-full h-full bg-transparent p-6 font-handwriting text-xl md:text-2xl leading-relaxed text-forest-800 focus:outline-none resize-none placeholder-forest-200"
              placeholder="Record your thoughts, ideas, and reflections here..."
              value={content}
              onChange={handleContentChange}
              spellCheck={false}
             />
             
             {/* Voice Memo Button */}
             <div className="absolute bottom-6 right-6 flex items-center gap-2">
               {isTranscribing && (
                 <span className="text-xs font-bold text-sky-600 bg-sky-50 px-3 py-1.5 rounded-full animate-pulse border border-sky-100 shadow-sm flex items-center gap-1.5">
                   <Loader2 size={12} className="animate-spin" />
                   Transcribing AI...
                 </span>
               )}
               <button
                 onClick={handleRecordMemo}
                 disabled={isTranscribing}
                 className={`p-3.5 rounded-full shadow-lg transition-all flex items-center justify-center ${
                   isRecordingMemo 
                     ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-red-500/30' 
                     : 'bg-forest-900 hover:bg-forest-800 text-gold-400 shadow-forest-900/20'
                 } disabled:opacity-50 disabled:cursor-not-allowed`}
                 title={isRecordingMemo ? "Stop Recording" : "Record Voice Memo"}
               >
                 {isRecordingMemo ? <MicOff size={20} /> : <Mic size={20} />}
               </button>
             </div>
          </div>
        </div>

        {/* Task Sidebar (Collapsible) */}
        <div 
          className={`
            absolute right-0 top-0 bottom-0 z-20 w-80 md:w-80 md:relative transform transition-all duration-500 ease-in-out
            ${isTaskPanelOpen 
              ? 'translate-x-0 opacity-100' 
              : 'translate-x-full md:translate-x-0 md:w-0 md:opacity-0 md:overflow-hidden pointer-events-none absolute'}
          `}
        >
          <div className="h-full flex flex-col bg-forest-900 rounded-2xl shadow-2xl md:shadow-none md:border border-forest-800 text-white overflow-hidden w-full">
            <div className="p-4 bg-forest-950/50 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gold-600 rounded-lg text-white shadow-lg shadow-gold-600/20">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Tasks</h3>
                  <p className="text-[10px] text-forest-400">For {selectedDate}</p>
                </div>
              </div>
              <button 
                className="md:hidden text-forest-400 hover:text-white"
                onClick={() => setIsTaskPanelOpen(false)}
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Add Task Form */}
            <div className="p-4 border-b border-white/5 bg-white/5">
               <div className="space-y-3">
                 <input 
                   className="w-full bg-forest-950/50 border border-forest-700/50 rounded-xl p-2.5 text-white focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-all placeholder-forest-500 text-xs font-medium"
                   placeholder="Add a new task..."
                   value={taskTitle}
                   onChange={(e) => setTaskTitle(e.target.value)}
                 />
                 <div className="flex flex-col gap-2">
                   <div className="flex gap-2">
                     <input 
                       type="time"
                       className="bg-forest-950/50 border border-forest-700/50 rounded-xl p-2.5 text-white focus:outline-none focus:border-gold-500 flex-[0.8] text-xs font-medium"
                       value={taskTime}
                       onChange={(e) => setTaskTime(e.target.value)}
                     />
                     <select
                       className="bg-forest-950/50 border border-forest-700/50 rounded-xl p-2.5 text-white focus:outline-none focus:border-gold-500 flex-1 text-xs font-medium outline-none"
                       value={taskReminderOffset}
                       onChange={(e) => setTaskReminderOffset(Number(e.target.value))}
                     >
                       <option value={0}>At time</option>
                       <option value={10}>10 mins before</option>
                       <option value={60}>1 hour before</option>
                       <option value={360}>6 hours before</option>
                       <option value={1440}>1 day before</option>
                     </select>
                     <button 
                      onClick={handleAddTask}
                      disabled={!taskTitle || !taskTime}
                      className="bg-gold-600 hover:bg-gold-500 text-white px-3 rounded-xl font-bold transition-all shadow-lg shadow-gold-600/20 disabled:opacity-50 disabled:shadow-none"
                     >
                       <Plus size={16} />
                     </button>
                   </div>
                   {profile?.googleCalendarConnected && (
                      <label className="flex items-center gap-2 text-xs text-forest-300 cursor-pointer px-1">
                         <input 
                           type="checkbox"
                           checked={syncTaskToCalendar}
                           onChange={(e) => setSyncTaskToCalendar(e.target.checked)}
                           className="rounded text-gold-500 focus:ring-gold-500 bg-forest-950 border-forest-700"
                         />
                         <span>Sync to Google Calendar</span>
                      </label>
                   )}
                 </div>
               </div>
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-2">
              {tasks.filter(t => t.date === selectedDate).length === 0 && (
                 <div className="flex flex-col items-center justify-center h-32 text-forest-500 opacity-60">
                    <Sun size={32} className="mb-2 text-forest-600" />
                    <p className="font-medium text-xs text-center px-4">No tasks scheduled.</p>
                 </div>
              )}
              
              {tasks.filter(t => t.date === selectedDate).sort((a,b) => a.time.localeCompare(b.time)).map(task => (
                <div key={task.id} className={`group flex items-start gap-3 p-3 rounded-xl border border-transparent hover:border-white/5 hover:bg-white/5 transition-all ${task.completed ? 'opacity-50' : 'opacity-100'}`}>
                   <button onClick={() => toggleTask(task)} className={`mt-0.5 transition-colors ${task.completed ? 'text-gold-500' : 'text-forest-500 hover:text-gold-400'}`}>
                     {task.completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                   </button>
                   <div className="flex-1 min-w-0">
                     <p className={`text-xs font-medium leading-relaxed ${task.completed ? 'line-through text-forest-500' : 'text-white'}`}>{task.title}</p>
                     <div className="flex items-center gap-1.5 text-[10px] text-forest-400 font-bold mt-1">
                        <Clock size={10} /> {task.time}
                        {!task.completed && <Bell size={10} className="ml-2 text-gold-500" />}
                     </div>
                   </div>
                   <button onClick={() => handleTaskDelete(task)} className="text-forest-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                     <Trash size={14} />
                   </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Search / Archive Modal */}
      {isSearchOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/60 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                  <div className="p-6 border-b border-sand-200 flex justify-between items-center bg-sand-50">
                      <div>
                          <h3 className="text-xl font-display font-bold text-forest-900">Journal Archive</h3>
                          <p className="text-sm text-forest-500">Retrieve past entries or ask AI about your history.</p>
                      </div>
                      <button onClick={() => setIsSearchOpen(false)} className="text-forest-400 hover:text-forest-900">
                          <X size={20} />
                      </button>
                  </div>

                  <div className="p-6 flex flex-col gap-4 bg-white border-b border-sand-100">
                      <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-400" size={18} />
                          <input 
                              autoFocus
                              className="w-full bg-sand-50 border border-sand-200 rounded-xl py-3 pl-10 pr-12 text-forest-900 placeholder-forest-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-all font-medium shadow-sm"
                              placeholder="Search text or ask a question (e.g. 'How was my week?')"
                              value={searchQuery}
                              onChange={handleSearchInput}
                              onKeyDown={(e) => e.key === 'Enter' && askAi()}
                          />
                          <button 
                             onClick={toggleVoiceSearch}
                             className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${isVoiceSearching ? 'bg-rose-100 text-rose-500 animate-pulse' : 'text-forest-400 hover:text-forest-600 hover:bg-sand-100'}`}
                             title="Voice Search"
                          >
                             {isVoiceSearching ? <Mic size={18} /> : <MicOff size={18} />}
                          </button>
                      </div>
                      <div className="flex gap-2 justify-end">
                           <button 
                             onClick={askAi} 
                             disabled={!searchQuery.trim() || isAiLoading}
                             className="flex items-center gap-2 px-4 py-2 bg-gold-50 text-gold-700 rounded-lg text-sm font-bold hover:bg-gold-100 transition-colors disabled:opacity-50"
                           >
                               {isAiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                               Ask AI
                           </button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 bg-sand-50/50 custom-scrollbar">
                      {aiAnswer && (
                          <div className="mb-6 p-5 bg-white rounded-xl border border-gold-200 shadow-sm relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-1 h-full bg-gold-500"></div>
                              <h4 className="text-xs font-bold text-gold-600 uppercase mb-2 flex items-center gap-2">
                                  <Sparkles size={12} /> AI Answer
                              </h4>
                              <p className="text-forest-800 text-sm leading-relaxed whitespace-pre-line">{aiAnswer}</p>
                          </div>
                      )}

                      <h4 className="text-xs font-bold text-forest-500 uppercase mb-3">
                          {searchQuery ? 'Search Results' : 'All Entries'} ({searchResults.length})
                      </h4>

                      {searchResults.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-forest-400">
                              <CalendarIcon size={48} className="mb-2 opacity-20" />
                              <p className="text-sm">No entries found.</p>
                          </div>
                      ) : (
                          <div className="space-y-3">
                              {searchResults.map((result) => (
                                  <div 
                                    key={result.date}
                                    onClick={() => selectEntryFromSearch(result.date)}
                                    className="bg-white p-4 rounded-xl border border-sand-200 hover:border-gold-300 hover:shadow-md transition-all cursor-pointer group"
                                  >
                                      <div className="flex justify-between items-start mb-2">
                                          <span className="font-bold text-forest-900 text-sm">
                                              {new Date(result.date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                                          </span>
                                          <ArrowRight size={16} className="text-forest-300 group-hover:text-gold-500 transition-colors" />
                                      </div>
                                      <p className="text-sm text-forest-600 line-clamp-2 font-handwriting text-base">
                                          {result.preview || <span className="italic opacity-50">Empty entry...</span>}
                                      </p>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Journal;