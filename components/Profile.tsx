import React, { useState, useEffect } from 'react';
import { UserProfile, SocialHandles, CustomLink } from '../types';
import { Edit2, Save, X, Activity, Droplet, Ruler, UserCircle, Camera, Fingerprint, Globe, Twitter, Linkedin, Github, Facebook, Instagram, Search, Sparkles, Link as LinkIcon, ExternalLink, RefreshCw, Mail, Music2, Video, Share2, Plus, Trash2, Copy, Check, Phone, Briefcase, AlertCircle, Shield, Car, Heart, Lock, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../api';

interface ProfileProps {
  profile: UserProfile;
  onUpdateProfile: (p: UserProfile) => void;
  onUseAiCredit?: (amount?: number) => boolean;
}

interface ShareItem {
  key: string;
  label: string;
  value: string;
  category: 'Personal' | 'Social';
}

const Profile: React.FC<ProfileProps> = ({ profile, onUpdateProfile, onUseAiCredit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<UserProfile>(profile);
  const [copied, setCopied] = useState(false);
  
  // Sync state when props change (e.g. via Gmail Login Auto-fill)
  useEffect(() => {
    setEditForm(profile);
  }, [profile]);
  
  // Share Modal State
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedShareItems, setSelectedShareItems] = useState<Set<string>>(new Set());
  
  // Social Discovery State
  const [searchQuery, setSearchQuery] = useState(profile.fullName);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [groundingSources, setGroundingSources] = useState<{title: string, uri: string}[]>([]);

  const handleSave = () => {
    onUpdateProfile(editForm);
    setIsEditing(false);
  };

  const handleChange = (field: keyof UserProfile, value: string | number) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSocialChange = (key: keyof SocialHandles, value: string) => {
    setEditForm(prev => ({
      ...prev,
      socialHandles: {
        ...prev.socialHandles,
        [key]: value
      }
    }));
  };

  // Custom Link Handlers
  const addCustomLink = () => {
    const newLink: CustomLink = { id: Math.random().toString(36), label: '', url: '' };
    setEditForm(prev => ({
        ...prev,
        socialHandles: {
            ...prev.socialHandles,
            custom: [...(prev.socialHandles?.custom || []), newLink]
        }
    }));
  };

  const updateCustomLink = (id: string, field: 'label' | 'url', value: string) => {
    setEditForm(prev => ({
        ...prev,
        socialHandles: {
            ...prev.socialHandles,
            custom: prev.socialHandles?.custom?.map(link => 
                link.id === id ? { ...link, [field]: value } : link
            )
        }
    }));
  };

  const removeCustomLink = (id: string) => {
    setEditForm(prev => ({
        ...prev,
        socialHandles: {
            ...prev.socialHandles,
            custom: prev.socialHandles?.custom?.filter(link => link.id !== id)
        }
    }));
  };

  // Helper to generate list of shareable items
  const getShareableItems = (): ShareItem[] => {
    const items: ShareItem[] = ([
        { key: 'fullName', label: 'Full Name', value: profile.fullName, category: 'Personal' },
        { key: 'jobTitle', label: 'Job Title', value: profile.jobTitle || '', category: 'Personal' },
        { key: 'email', label: 'Email', value: profile.email, category: 'Personal' },
        { key: 'phoneNumber', label: 'Phone', value: profile.phoneNumber || '', category: 'Personal' },
        { key: 'bio', label: 'Bio', value: profile.bio || '', category: 'Personal' },
    ] as ShareItem[]).filter(i => i.value.trim() !== '');

    const socialKeys = ['website', 'ecitizen', 'ntsa', 'sha', 'linkedin', 'twitter', 'github', 'instagram', 'facebook', 'tiktok', 'soundcloud', 'youtube'] as const;
    socialKeys.forEach(key => {
        if (profile.socialHandles?.[key]) {
            items.push({ 
                key: `social_${key}`, 
                label: key.charAt(0).toUpperCase() + key.slice(1), 
                value: profile.socialHandles[key]!, 
                category: 'Social' 
            });
        }
    });

    profile.socialHandles?.custom?.forEach((link, idx) => {
        if (link.url) {
            items.push({ 
                key: `custom_${idx}`, 
                label: link.label || 'Link', 
                value: link.url, 
                category: 'Social' 
            });
        }
    });

    return items;
  };

  const handleOpenShareModal = () => {
    const items = getShareableItems();
    // Default select all
    setSelectedShareItems(new Set(items.map(i => i.key)));
    setShowShareModal(true);
  };

  const executeShare = async () => {
    const items = getShareableItems().filter(i => selectedShareItems.has(i.key));
    if (items.length === 0) return;

    const textLines = ['CONTACT CARD'];
    items.forEach(item => {
        textLines.push(`${item.label}: ${item.value}`);
    });

    const textToShare = textLines.join('\n');

    if (navigator.share) {
        try {
            await navigator.share({
                title: `${profile.fullName} - Contact Info`,
                text: textToShare,
            });
            setShowShareModal(false);
        } catch (error) {
            console.log('Error sharing:', error);
        }
    } else {
        navigator.clipboard.writeText(textToShare);
        setCopied(true);
        setTimeout(() => {
            setCopied(false);
            setShowShareModal(false);
        }, 2000);
    }
  };

  const toggleShareItem = (key: string) => {
    const newSet = new Set(selectedShareItems);
    if (newSet.has(key)) {
        newSet.delete(key);
    } else {
        newSet.add(key);
    }
    setSelectedShareItems(newSet);
  };

  const compressImage = async (file: File): Promise<string> => {
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

      const MAX_WIDTH = 400; // Profile pictures don't need to be very large
      const MAX_HEIGHT = 400;
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
      img.src = ''; // Free memory

      return canvas.toDataURL('image/jpeg', 0.6);
    } catch (e) {
      console.warn("Failed to compress image, falling back to raw data", e);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const base64 = await compressImage(file);
      setEditForm(prev => ({ ...prev, profileImage: base64 }));
    }
  };

  const discoverSocialHandles = async (forceDiscover = false) => {
    const name = profile.fullName || searchQuery;
    if (!name && !profile.email) return;
    
    setIsDiscovering(true);
    setDiscoveryError(null);
    setGroundingSources([]);

    try {
      const response = await apiFetch('/api/discover-socials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: profile.email, name })
      });

      if (!response.ok) {
        let errMsg = "Failed to discover social handles.";
        try {
          const errData = await response.json();
          if (errData.error) errMsg = errData.error;
        } catch (e) {}
        throw new Error(errMsg);
      }

      const { data, sources } = await response.json();
      
      if (sources) {
        setGroundingSources(sources);
      }

      if (data) {
        setEditForm(prev => ({
          ...prev,
          email: data.email || prev.email || '',
          socialHandles: {
            ...prev.socialHandles,
            linkedin: data.linkedin || prev.socialHandles?.linkedin || '',
            twitter: data.twitter || prev.socialHandles?.twitter || '',
            github: data.github || prev.socialHandles?.github || '',
            instagram: data.instagram || prev.socialHandles?.instagram || '',
            facebook: data.facebook || prev.socialHandles?.facebook || '',
            website: data.website || prev.socialHandles?.website || '',
            tiktok: data.tiktok || prev.socialHandles?.tiktok || '',
            soundcloud: data.soundcloud || prev.socialHandles?.soundcloud || '',
            youtube: data.youtube || prev.socialHandles?.youtube || '',
          }
        }));
        
        if (forceDiscover) {
          onUpdateProfile({
            ...profile,
            email: data.email || profile.email || '',
            socialHandles: {
              ...profile.socialHandles,
              linkedin: data.linkedin || profile.socialHandles?.linkedin || '',
              twitter: data.twitter || profile.socialHandles?.twitter || '',
              github: data.github || profile.socialHandles?.github || '',
              instagram: data.instagram || profile.socialHandles?.instagram || '',
              facebook: data.facebook || profile.socialHandles?.facebook || '',
              website: data.website || profile.socialHandles?.website || '',
              tiktok: data.tiktok || profile.socialHandles?.tiktok || '',
              soundcloud: data.soundcloud || profile.socialHandles?.soundcloud || '',
              youtube: data.youtube || profile.socialHandles?.youtube || '',
            }
          });
        }
        
        if (!isEditing && !forceDiscover) setIsEditing(true);
      } else {
        setDiscoveryError("No structured data found.");
      }
    } catch (err: any) {
      console.error(err);
      setDiscoveryError(err.message || 'Failed to discover social profiles. Please try again.');
    } finally {
      setIsDiscovering(false);
    }
  };

  const SocialIcon = ({ type, size = 18 }: { type: string, size?: number }) => {
    switch (type) {
      case 'twitter': return <Twitter size={size} className="text-sky-500" />;
      case 'linkedin': return <Linkedin size={size} className="text-blue-700" />;
      case 'github': return <Github size={size} className="text-gray-900" />;
      case 'facebook': return <Facebook size={size} className="text-blue-600" />;
      case 'instagram': return <Instagram size={size} className="text-pink-600" />;
      case 'website': return <Globe size={size} className="text-emerald-600" />;
      case 'ecitizen': return <Shield size={size} className="text-green-700" />;
      case 'ntsa': return <Car size={size} className="text-blue-800" />;
      case 'sha': return <Heart size={size} className="text-red-700" />;
      case 'tiktok': return <div style={{width: size, height: size}} className="bg-black text-white rounded-full flex items-center justify-center font-bold text-[8px]">Tk</div>; 
      case 'soundcloud': return <Music2 size={size} className="text-orange-600" />;
      case 'youtube': return <Video size={size} className="text-red-600" />;
      default: return <LinkIcon size={size} className="text-gray-500" />;
    }
  };

  return (
    <div className="h-full animate-fadeIn max-w-5xl mx-auto relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-display text-forest-900 font-bold mb-1">My Identity</h2>
          <p className="text-forest-500">Manage your personal details and biometrics.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
            {!isEditing && (
                <button 
                  onClick={handleOpenShareModal}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-sand-300 text-forest-700 rounded-lg hover:bg-sand-50 transition-all shadow-sm font-bold text-xs"
                >
                   <Share2 size={14} /> Share Contact
                </button>
            )}
            {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-forest-900 text-white rounded-lg hover:bg-forest-800 transition-all shadow-sm font-medium text-xs">
                <Edit2 size={14} /> Edit Profile
            </button>
            ) : (
            <div className="flex gap-2 w-full md:w-auto">
                <button onClick={() => setIsEditing(false)} className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-sand-300 text-forest-600 rounded-lg hover:bg-sand-50 transition-all font-medium text-xs">
                <X size={14} /> Cancel
                </button>
                <button onClick={handleSave} className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gold-600 text-white rounded-lg hover:bg-gold-500 transition-all shadow-md font-medium text-xs">
                <Save size={14} /> Save Changes
                </button>
            </div>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Avatar Card */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-sand-200 flex flex-col items-center">
             <div className="relative group w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-sand-100 ring-4 ring-forest-900/5 shadow-md">
                {(isEditing ? editForm.profileImage : profile.profileImage) ? (
                  <img 
                    src={isEditing ? editForm.profileImage : profile.profileImage} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-sand-200 text-sand-400">
                    <UserCircle size={44} />
                  </div>
                )}
                {isEditing && (
                  <div className="absolute inset-0 bg-forest-900/60 backdrop-blur-xs flex items-center justify-center cursor-pointer transition-opacity opacity-0 group-hover:opacity-100">
                    <label className="cursor-pointer flex flex-col items-center gap-0.5 text-white font-medium text-[10px] p-1.5 rounded-full hover:bg-white/10 transition-colors">
                      <Camera size={16} />
                      <span>Change</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                  </div>
                )}
             </div>
             
             <div className="mt-4 text-center w-full">
                {isEditing ? (
                   <div className="px-2">
                       <label className="block text-xs font-bold text-forest-400 uppercase tracking-wider mb-2 text-left">Nickname</label>
                       <input 
                         type="text" 
                         value={editForm.nickName}
                         onChange={(e) => handleChange('nickName', e.target.value)}
                         className="w-full bg-sand-50 border border-sand-300 p-2.5 rounded-lg text-forest-900 focus:outline-none focus:border-gold-500 transition-colors text-center font-bold text-lg"
                         placeholder="Nickname"
                       />
                   </div>
                ) : (
                   <div>
                       <h3 className="text-2xl font-bold text-forest-900 tracking-tight">{profile.fullName}</h3>
                       <p className="text-gold-600 font-medium">@{profile.nickName}</p>
                       <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                           <div className="inline-flex px-3 py-1 bg-sky-50 text-sky-600 border border-sky-100 rounded-full text-xs font-bold uppercase tracking-wider items-center gap-1.5 shadow-sm">
                               <Shield size={14} className="text-sky-500" />
                               {profile.plan || 'Basic Vault'}
                           </div>
                           <div className="inline-flex px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full text-[11px] font-bold items-center gap-1 shadow-xs" title="Client-side AES-256-GCM authenticated encryption active">
                               <ShieldCheck size={13} className="text-emerald-600" />
                               <span>AES-256 Encrypted</span>
                           </div>
                       </div>
                       <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-sand-50 border border-sand-200 rounded-lg text-[11px] text-forest-600 font-medium">
                           <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                           <Lock size={11} className="text-emerald-600" />
                           <span>Vault Encryption Active • Zero-Knowledge</span>
                       </div>
                   </div>
                )}
             </div>
          </div>

          {/* Bio Card */}
           <div className="bg-white p-6 rounded-2xl border border-sand-200 shadow-sm flex-1">
             <div className="flex items-center gap-3 mb-4 pb-4 border-b border-sand-100">
                <div className="p-2 bg-indigo-50 text-gold-600 rounded-xl">
                    <Activity size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-forest-900">Bio</h3>
                  <p className="text-xs text-forest-400">About yourself</p>
                </div>
             </div>
             {isEditing ? (
                <textarea 
                  className="w-full bg-sand-50 border border-sand-300 p-4 rounded-xl text-forest-900 focus:outline-none focus:border-gold-500 transition-colors min-h-[120px] resize-none text-sm"
                  value={editForm.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  placeholder="Write something about yourself..."
                />
             ) : (
                <p className="text-forest-600 leading-relaxed text-sm">
                  {profile.bio || "No bio added yet."}
                </p>
             )}
          </div>
        </div>

        {/* Info Grid */}
        <div className="lg:col-span-8 space-y-6">
          {/* Main Stats Card */}
          <div className="bg-white p-8 rounded-2xl border border-sand-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-sand-100">
                <div className="p-2.5 bg-indigo-50 text-gold-600 rounded-xl">
                    <Fingerprint size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-forest-900">Personal Information</h3>
                  <p className="text-xs text-forest-400">Official identification details</p>
                </div>
            </div>
            
            <div className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className="block text-xs font-bold text-forest-500 uppercase tracking-wider mb-2">Full Legal Name</label>
                   {isEditing ? (
                     <input 
                        className="w-full bg-sand-50 border border-sand-300 p-3 rounded-xl text-lg font-display font-medium text-forest-900 focus:outline-none focus:border-gold-500 transition-colors"
                        value={editForm.fullName}
                        onChange={(e) => handleChange('fullName', e.target.value)}
                     />
                   ) : (
                     <div className="text-xl font-display font-medium text-forest-900 border-b border-transparent p-3 pl-0">{profile.fullName}</div>
                   )}
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-forest-500 uppercase tracking-wider mb-2">Job Title</label>
                   {isEditing ? (
                     <div className="relative">
                        <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-400" />
                        <input 
                            className="w-full bg-sand-50 border border-sand-300 p-3 pl-10 rounded-xl text-lg font-display font-medium text-forest-900 focus:outline-none focus:border-gold-500 transition-colors"
                            value={editForm.jobTitle || ''}
                            onChange={(e) => handleChange('jobTitle', e.target.value)}
                            placeholder="e.g. Software Engineer"
                        />
                     </div>
                   ) : (
                     <div className="text-xl font-display font-medium text-forest-900 border-b border-transparent p-3 pl-0 flex items-center gap-2">
                        {profile.jobTitle ? (
                            <>
                                <Briefcase size={20} className="text-gold-500" />
                                {profile.jobTitle}
                            </>
                        ) : <span className="text-forest-300 italic">Not set</span>}
                     </div>
                   )}
                 </div>
                 
                 <div>
                   <label className="block text-xs font-bold text-forest-500 uppercase tracking-wider mb-2">Email Address</label>
                   {isEditing ? (
                     <div className="relative">
                         <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-400" />
                         <input 
                            className="w-full bg-sand-50 border border-sand-300 p-3 pl-10 rounded-xl text-lg font-display font-medium text-forest-900 focus:outline-none focus:border-gold-500 transition-colors"
                            value={editForm.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            placeholder="email@example.com"
                         />
                     </div>
                   ) : (
                     <div className="flex items-center gap-2 text-xl font-display font-medium text-forest-900 border-b border-transparent p-3 pl-0">
                         <Mail size={20} className="text-gold-500" />
                         <a href={`mailto:${profile.email}`} className="hover:text-gold-600 hover:underline">{profile.email || "No email"}</a>
                     </div>
                   )}
                 </div>

                 <div>
                   <label className="block text-xs font-bold text-forest-500 uppercase tracking-wider mb-2">Phone Number</label>
                   {isEditing ? (
                     <div className="relative">
                         <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-400" />
                         <input 
                            className="w-full bg-sand-50 border border-sand-300 p-3 pl-10 rounded-xl text-lg font-display font-medium text-forest-900 focus:outline-none focus:border-gold-500 transition-colors"
                            value={editForm.phoneNumber || ''}
                            onChange={(e) => handleChange('phoneNumber', e.target.value)}
                            placeholder="+1 234 567 890"
                         />
                     </div>
                   ) : (
                     <div className="flex items-center gap-2 text-xl font-display font-medium text-forest-900 border-b border-transparent p-3 pl-0">
                         <Phone size={20} className="text-gold-500" />
                         <a href={`tel:${profile.phoneNumber}`} className="hover:text-gold-600 hover:underline">{profile.phoneNumber || <span className="text-forest-300 italic">No phone</span>}</a>
                     </div>
                   )}
                 </div>
               </div>
            </div>
          </div>
          
          {/* Social Records Card */}
          <div className="bg-white p-8 rounded-2xl border border-sand-200 shadow-sm">
             <div className="flex items-center justify-between mb-6 pb-4 border-b border-sand-100">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 text-gold-600 rounded-xl">
                        <Globe size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-forest-900">Social & Digital Presence</h3>
                      <p className="text-xs text-forest-400">Connect your online profiles</p>
                    </div>
                </div>
                {isEditing && (
                   <button 
                     onClick={() => discoverSocialHandles(false)}
                     disabled={isDiscovering}
                     className="flex items-center gap-2 text-xs font-bold text-gold-600 bg-gold-50 px-3 py-1.5 rounded-lg border border-gold-100 hover:bg-gold-100 transition-colors disabled:opacity-50"
                   >
                     {isDiscovering ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                     {isDiscovering ? 'Searching...' : 'Auto-Discover'}
                   </button>
                )}
             </div>

             {discoveryError && (
                 <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 flex items-center gap-2">
                     <AlertCircle size={14} /> {discoveryError}
                 </div>
             )}

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {(['ecitizen', 'ntsa', 'sha', 'linkedin', 'twitter', 'github', 'website', 'instagram', 'facebook', 'youtube', 'tiktok', 'soundcloud'] as const).map((platform) => (
                    <div key={platform} className="relative group">
                       <div className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-400 pointer-events-none group-focus-within:text-gold-500 transition-colors">
                          <SocialIcon type={platform} size={16} />
                       </div>
                       {isEditing ? (
                          <input 
                            className="w-full bg-sand-50 border border-sand-300 p-2.5 pl-10 rounded-xl text-sm font-medium text-forest-900 focus:outline-none focus:border-gold-500 transition-colors placeholder-forest-300"
                            placeholder={`${platform === 'ntsa' ? 'NTSA' : platform === 'sha' ? 'SHA' : platform === 'ecitizen' ? 'eCitizen' : platform.charAt(0).toUpperCase() + platform.slice(1)} URL`}
                            value={editForm.socialHandles?.[platform] || ''}
                            onChange={(e) => handleSocialChange(platform, e.target.value)}
                          />
                       ) : (
                          <div className={`w-full p-2.5 pl-10 rounded-xl text-sm font-medium border border-transparent flex items-center justify-between ${profile.socialHandles?.[platform] ? 'bg-white border-sand-200 text-forest-700 hover:border-gold-300' : 'bg-sand-50/50 text-forest-300'}`}>
                             <span className="truncate pr-2">{profile.socialHandles?.[platform] || 'Not connected'}</span>
                             {profile.socialHandles?.[platform] && (
                                <a href={profile.socialHandles[platform]} target="_blank" rel="noopener noreferrer" className="text-forest-400 hover:text-gold-600">
                                   <ExternalLink size={14} />
                                </a>
                             )}
                          </div>
                       )}
                    </div>
                 ))}
             </div>

             {/* Custom Links Section */}
             <div className="mt-6 pt-6 border-t border-sand-100">
                 <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-forest-700">Custom Links</h4>
                    {isEditing && (
                        <button onClick={addCustomLink} className="text-xs font-bold text-gold-600 hover:text-gold-700 flex items-center gap-1">
                            <Plus size={12} /> Add Link
                        </button>
                    )}
                 </div>
                 
                 <div className="space-y-3">
                     {editForm.socialHandles?.custom?.map((link, idx) => (
                         <div key={link.id} className="flex gap-2 items-start">
                             {isEditing ? (
                                 <>
                                    <div className="flex-1 space-y-2">
                                        <input 
                                            placeholder="Label (e.g. Portfolio)"
                                            className="w-full bg-sand-50 border border-sand-300 p-2 rounded-lg text-xs font-bold text-forest-900 focus:border-gold-500 outline-none"
                                            value={link.label}
                                            onChange={(e) => updateCustomLink(link.id, 'label', e.target.value)}
                                        />
                                        <input 
                                            placeholder="URL (https://...)"
                                            className="w-full bg-sand-50 border border-sand-300 p-2 rounded-lg text-xs text-forest-600 focus:border-gold-500 outline-none font-mono"
                                            value={link.url}
                                            onChange={(e) => updateCustomLink(link.id, 'url', e.target.value)}
                                        />
                                    </div>
                                    <button onClick={() => removeCustomLink(link.id)} className="p-2 text-forest-400 hover:text-red-500">
                                        <Trash2 size={16} />
                                    </button>
                                 </>
                             ) : (
                                 <a 
                                   href={link.url} 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   className="flex-1 flex items-center justify-between p-3 bg-white border border-sand-200 rounded-xl hover:border-gold-400 hover:shadow-sm transition-all group"
                                 >
                                    <div className="flex items-center gap-2">
                                        <LinkIcon size={16} className="text-forest-400 group-hover:text-gold-500" />
                                        <span className="text-sm font-bold text-forest-700">{link.label}</span>
                                    </div>
                                    <ExternalLink size={14} className="text-forest-300 group-hover:text-gold-500" />
                                 </a>
                             )}
                         </div>
                     ))}
                     {!isEditing && (!profile.socialHandles?.custom || profile.socialHandles.custom.length === 0) && (
                         <p className="text-xs text-forest-400 italic">No custom links added.</p>
                     )}
                 </div>
             </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/60 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/20">
                  <div className="p-6 border-b border-sand-100 flex justify-between items-center bg-sand-50">
                      <h3 className="font-display font-bold text-lg text-forest-900">Share Contact Card</h3>
                      <button onClick={() => setShowShareModal(false)} className="text-forest-400 hover:text-forest-900">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                      <p className="text-sm text-forest-500 mb-4">Select the information you want to share:</p>
                      <div className="space-y-2">
                          {getShareableItems().map(item => (
                              <div 
                                key={item.key} 
                                onClick={() => toggleShareItem(item.key)}
                                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedShareItems.has(item.key) ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-sand-200 hover:border-sand-300'}`}
                              >
                                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedShareItems.has(item.key) ? 'bg-gold-500 border-gold-500 text-white' : 'border-sand-300 bg-white'}`}>
                                      {selectedShareItems.has(item.key) && <Check size={12} />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-forest-500 uppercase">{item.label}</p>
                                      <p className="text-sm font-medium text-forest-900 truncate">{item.value}</p>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
                  <div className="p-4 border-t border-sand-200 bg-white flex gap-3">
                      <button onClick={() => setShowShareModal(false)} className="flex-1 py-3 text-forest-600 font-bold text-sm hover:bg-sand-50 rounded-xl border border-sand-200">
                          Cancel
                      </button>
                      <button onClick={executeShare} className="flex-1 py-3 bg-forest-900 text-white font-bold text-sm hover:bg-gold-600 rounded-xl shadow-lg flex items-center justify-center gap-2">
                          {copied ? <Check size={18} /> : <Share2 size={18} />}
                          {copied ? 'Copied!' : 'Share Selected'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Profile;