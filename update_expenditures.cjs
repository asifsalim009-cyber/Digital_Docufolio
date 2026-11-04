const fs = require('fs');
let code = fs.readFileSync('components/Expenditures.tsx', 'utf8');

// We need to inject `groupedExpenditures` around line 430
const groupLogic = `
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
`;

code = code.replace(
  `  const totalIncome = filteredExpenditures.filter(e => e.type === 'income').reduce((sum, exp) => sum + exp.amount, 0);`,
  groupLogic
);

// We need to replace the activeTab === 'transactions' block.
// The block spans from: `{activeTab === 'transactions' && (` down to `)}` before `{activeTab === 'budget' && (`

const regexTransactionsTab = /\{activeTab === 'transactions' && \([\s\S]*?(?=\{activeTab === 'budget' && \()/;

const newTransactionsTab = `{activeTab === 'transactions' && (
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
                 className={\`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all \${isVoiceSearching ? 'bg-rose-100 text-rose-500 animate-pulse' : 'text-forest-400 hover:text-forest-600 hover:bg-sand-100'}\`}
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
                              <div className={\`w-10 h-10 rounded-full flex shrink-0 items-center justify-center \${exp.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}\`}>
                                 {exp.type === 'income' ? <Plus size={18} /> : <Receipt size={18} />}
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5">
                                 <div className="flex justify-between items-start gap-2 mb-1">
                                    <h5 className="font-bold text-forest-900 text-base truncate pr-2">{exp.recipient}</h5>
                                    <div className={\`font-display font-bold whitespace-nowrap \${exp.type === 'income' ? 'text-emerald-600' : 'text-forest-900'}\`}>
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
                             onClick={() => onDeleteExpenditure(exp.id)}
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

      `;

code = code.replace(regexTransactionsTab, newTransactionsTab);

fs.writeFileSync('components/Expenditures.tsx', code);
