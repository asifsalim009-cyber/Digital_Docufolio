const fs = require('fs');
let code = fs.readFileSync('components/Wallet.tsx', 'utf8');

const startStr = '{/* View: Grouped (Folder Navigation) for OTHERS and BUSINESS */}';
const endStr = '{/* Add Document Modal */}';
const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find start or end bounds.");
    process.exit(1);
}

const replacement = `
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
                               {Object.entries(groupedDocsByRelation[viewingRelation] || {}).map(([owner, docs]) => (
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

       `;

code = code.slice(0, startIndex) + replacement + code.slice(endIndex);
fs.writeFileSync('components/Wallet.tsx', code);
