import React, { useState, useEffect } from 'react';
import { UserProfile, SocialHandles, CustomLink, SubscriptionPlan } from '../types';
import { Edit2, Save, X, Activity, Droplet, Ruler, UserCircle, Camera, Fingerprint, Globe, Twitter, Linkedin, Github, Facebook, Instagram, Search, Sparkles, Link as LinkIcon, ExternalLink, RefreshCw, Mail, Music2, Video, Share2, Plus, Trash2, Copy, Check, Phone, Briefcase, AlertCircle, Building2, MapPin, Users, Shield } from 'lucide-react';

interface BusinessProfileProps {
  profile: UserProfile;
  onUpdateProfile: (p: UserProfile) => void;
  onUseAiCredit?: (amount?: number) => boolean;
  onReplaySplash?: () => void;
}

const BusinessProfile: React.FC<BusinessProfileProps> = ({ profile, onUpdateProfile, onUseAiCredit, onReplaySplash }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<UserProfile>(profile);

  useEffect(() => {
    setEditForm(profile);
  }, [profile]);

  const handleSave = () => {
    onUpdateProfile(editForm);
    setIsEditing(false);
  };

  const handleChange = (field: keyof UserProfile, value: any) => {
    setEditForm({ ...editForm, [field]: value });
  };

  return (
    <div className="h-full animate-fadeIn max-w-6xl mx-auto relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-forest-900 mb-2">Business Dashboard</h2>
          <p className="text-forest-500">Manage your enterprise profile and personal details.</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
            {isEditing ? (
                <>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-sand-200 text-forest-700 rounded-lg hover:bg-sand-50 transition-colors font-bold shadow-sm text-xs"
                  >
                    <X size={14} /> Cancel
                  </button>
                  <button 
                    onClick={handleSave}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors font-bold shadow-md text-xs"
                  >
                    <Save size={14} /> Save Changes
                  </button>
                </>
            ) : (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-forest-900 text-white rounded-lg hover:bg-forest-800 transition-colors font-bold shadow-md text-xs"
                >
                  <Edit2 size={14} /> Edit Business Profile
                </button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Personal Details & Avatar */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-sand-200">
             <div className="relative group w-full aspect-square rounded-2xl overflow-hidden bg-sand-100 ring-1 ring-black/5 mb-6">
                 {profile.profileImage ? (
                    <img src={profile.profileImage} alt="Profile" className="w-full h-full object-cover" />
                 ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Camera size={48} className="text-sand-300" />
                    </div>
                 )}
             </div>

             <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-forest-900 tracking-tight">{profile.fullName}</h3>
                <p className="text-forest-500 font-medium">{profile.jobTitle || "Executive"}</p>
                <div className="mt-3 inline-flex px-3 py-1 bg-sky-50 text-sky-600 border border-sky-100 rounded-full text-xs font-bold uppercase tracking-wider items-center gap-1.5 shadow-sm">
                    <Shield size={14} className="text-sky-500" />
                    {profile.plan || 'Business Vault'}
                </div>
             </div>

             <div className="space-y-4 border-t border-sand-100 pt-6">
                 <h4 className="text-xs font-bold text-forest-400 uppercase tracking-wider mb-2">Personal Details</h4>
                 <div className="grid grid-cols-2 gap-3">
                     <div className="bg-sand-50 p-3 rounded-xl border border-sand-100">
                        <div className="flex items-center gap-1.5 text-forest-500 mb-1">
                           <UserCircle size={14} />
                           <span className="text-[10px] font-bold uppercase">Age</span>
                        </div>
                        <div className="font-display font-bold text-forest-900">{profile.age}</div>
                     </div>
                     <div className="bg-sand-50 p-3 rounded-xl border border-sand-100">
                        <div className="flex items-center gap-1.5 text-forest-500 mb-1">
                           <Droplet size={14} />
                           <span className="text-[10px] font-bold uppercase">Blood</span>
                        </div>
                        <div className="font-display font-bold text-forest-900">{profile.bloodType}</div>
                     </div>
                 </div>
                 
                 <div className="bg-sand-50 p-3 rounded-xl border border-sand-100 mt-3">
                     <div className="flex items-center gap-1.5 text-forest-500 mb-1">
                         <Mail size={14} />
                         <span className="text-[10px] font-bold uppercase">Email</span>
                     </div>
                     <div className="font-medium text-sm text-forest-900 truncate">{profile.email}</div>
                 </div>
                 
                 <div className="bg-sand-50 p-3 rounded-xl border border-sand-100 mt-3">
                     <div className="flex items-center gap-1.5 text-forest-500 mb-1">
                         <Phone size={14} />
                         <span className="text-[10px] font-bold uppercase">Phone</span>
                     </div>
                     <div className="font-medium text-sm text-forest-900">{profile.phoneNumber || "N/A"}</div>
                 </div>
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Company Details */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-sand-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-sand-100">
                <div className="p-2.5 bg-indigo-50 text-gold-600 rounded-xl">
                    <Building2 size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-forest-900">Company Details</h3>
                    <p className="text-sm text-forest-500">Official business registration and operational information</p>
                </div>
            </div>

            <div className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className="block text-xs font-bold text-forest-500 uppercase tracking-wider mb-2">Company Name</label>
                   {isEditing ? (
                     <div className="relative">
                        <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-400" />
                        <input 
                           className="w-full bg-sand-50 border border-sand-300 p-3 pl-10 rounded-xl text-lg font-display font-medium text-forest-900 focus:outline-none focus:border-gold-500 transition-colors"
                           value={editForm.companyName || ''}
                           onChange={(e) => handleChange('companyName', e.target.value)}
                           placeholder="Acme Corp"
                        />
                     </div>
                   ) : (
                     <div className="text-xl font-display font-medium text-forest-900 border-b border-transparent p-3 pl-0 flex items-center gap-2">
                        <Building2 size={20} className="text-gold-500" />
                        {profile.companyName || <span className="text-forest-300 italic">Not set</span>}
                     </div>
                   )}
                 </div>

                 <div>
                   <label className="block text-xs font-bold text-forest-500 uppercase tracking-wider mb-2">Industry</label>
                   {isEditing ? (
                     <div className="relative">
                        <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-400" />
                        <input 
                            className="w-full bg-sand-50 border border-sand-300 p-3 pl-10 rounded-xl text-lg font-display font-medium text-forest-900 focus:outline-none focus:border-gold-500 transition-colors"
                            value={editForm.companyIndustry || ''}
                            onChange={(e) => handleChange('companyIndustry', e.target.value)}
                            placeholder="e.g. Technology"
                        />
                     </div>
                   ) : (
                     <div className="text-xl font-display font-medium text-forest-900 border-b border-transparent p-3 pl-0 flex items-center gap-2">
                        <Briefcase size={20} className="text-gold-500" />
                        {profile.companyIndustry || <span className="text-forest-300 italic">Not set</span>}
                     </div>
                   )}
                 </div>
                    
                 <div>
                   <label className="block text-xs font-bold text-forest-500 uppercase tracking-wider mb-2">Registration Number</label>
                   {isEditing ? (
                     <div className="relative">
                         <Fingerprint size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-400" />
                         <input 
                            className="w-full bg-sand-50 border border-sand-300 p-3 pl-10 rounded-xl text-lg font-display font-medium text-forest-900 focus:outline-none focus:border-gold-500 transition-colors"
                            value={editForm.companyRegistration || ''}
                            onChange={(e) => handleChange('companyRegistration', e.target.value)}
                            placeholder="Reg No / EIN"
                         />
                     </div>
                   ) : (
                     <div className="flex items-center gap-2 text-xl font-display font-medium text-forest-900 border-b border-transparent p-3 pl-0">
                         <Fingerprint size={20} className="text-gold-500" />
                         {profile.companyRegistration || <span className="text-forest-300 italic">Not set</span>}
                     </div>
                   )}
                 </div>

                 <div>
                   <label className="block text-xs font-bold text-forest-500 uppercase tracking-wider mb-2">Company Size</label>
                   {isEditing ? (
                     <div className="relative">
                         <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-400" />
                         <input 
                            className="w-full bg-sand-50 border border-sand-300 p-3 pl-10 rounded-xl text-lg font-display font-medium text-forest-900 focus:outline-none focus:border-gold-500 transition-colors"
                            value={editForm.companySize || ''}
                            onChange={(e) => handleChange('companySize', e.target.value)}
                            placeholder="e.g. 50-200 Employees"
                         />
                     </div>
                   ) : (
                     <div className="flex items-center gap-2 text-xl font-display font-medium text-forest-900 border-b border-transparent p-3 pl-0">
                         <Users size={20} className="text-gold-500" />
                         {profile.companySize || <span className="text-forest-300 italic">Not set</span>}
                     </div>
                   )}
                 </div>
                 
                 <div className="md:col-span-2">
                   <label className="block text-xs font-bold text-forest-500 uppercase tracking-wider mb-2">Registered Address</label>
                   {isEditing ? (
                     <div className="relative">
                         <MapPin size={16} className="absolute left-3 top-4 text-forest-400" />
                         <textarea 
                            className="w-full bg-sand-50 border border-sand-300 p-3 pl-10 rounded-xl text-lg font-display font-medium text-forest-900 focus:outline-none focus:border-gold-500 transition-colors resize-none"
                            rows={3}
                            value={editForm.companyAddress || ''}
                            onChange={(e) => handleChange('companyAddress', e.target.value)}
                            placeholder="Headquarters Address"
                         />
                     </div>
                   ) : (
                     <div className="flex items-start gap-2 text-xl font-display font-medium text-forest-900 border-b border-transparent p-3 pl-0">
                         <MapPin size={20} className="text-gold-500 mt-1" />
                         {profile.companyAddress || <span className="text-forest-300 italic">Not set</span>}
                     </div>
                   )}
                 </div>
               </div>

               {/* Bio / Description */}
               <div>
                 <label className="block text-xs font-bold text-forest-500 uppercase tracking-wider mb-2 mt-4">Company Overview</label>
                 {isEditing ? (
                   <textarea 
                     className="w-full bg-sand-50 border border-sand-300 p-4 rounded-xl text-forest-900 focus:outline-none focus:border-gold-500 transition-colors resize-none leading-relaxed"
                     rows={5}
                     value={editForm.bio || ''}
                     onChange={(e) => handleChange('bio', e.target.value)}
                     placeholder="A brief overview of the company's mission and operations..."
                   />
                 ) : (
                   <div className="bg-sand-50/50 p-4 rounded-xl border border-sand-100 text-forest-700 leading-relaxed italic">
                     {profile.bio || "No overview provided."}
                   </div>
                 )}
               </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BusinessProfile;
