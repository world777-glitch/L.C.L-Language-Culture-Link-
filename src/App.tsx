import { useState, useEffect, useRef, useMemo, Component, ReactNode, FC, FormEvent } from 'react';
import * as React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { 
  BookOpen, 
  GraduationCap, 
  MessageSquare, 
  Briefcase, 
  Globe, 
  ChevronRight, 
  ArrowRight,
  User, 
  LogOut, 
  Calendar, 
  Star,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  Image as ImageIcon,
  AlertCircle,
  Plus,
  Check,
  ShieldCheck,
  FileText,
  Music,
  Trash2,
  BarChart3,
  Users,
  Search,
  Download,
  MessageCircle,
  Send,
  Filter,
  MoreVertical,
  Upload,
  Edit,
  X,
  ExternalLink,
  Copy,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { COURSES, calculatePrice, RESOURCE_GROUPS, LEVEL_PRICES } from './constants';
import { cn } from './lib/utils';
import { LANGUAGES, TRANSLATIONS, LanguageCode } from './translations';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

import { auth, loginWithGoogle, logout as firebaseLogout, db, storage, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, setDoc, serverTimestamp, onSnapshot, query, where, orderBy, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';

// Helper to convert raw PCM from Gemini TTS to a playable WAV Blob
const pcmToWav = (pcmBase64: string, sampleRate: number = 24000) => {
  const binaryString = atob(pcmBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const header = new ArrayBuffer(44);
  const d = new DataView(header);
  d.setUint32(0, 0x52494646, false); // "RIFF"
  d.setUint32(4, 36 + bytes.length, true); // size
  d.setUint32(8, 0x57415645, false); // "WAVE"
  d.setUint32(12, 0x666d7420, false); // "fmt "
  d.setUint16(16, 16, true); // length (should be 16 for PCM)
  d.setUint16(20, 1, true); // PCM format
  d.setUint16(22, 1, true); // Mono
  d.setUint32(24, sampleRate, true); // Sample rate
  d.setUint32(28, sampleRate * 2, true); // Byte rate (SampleRate * Channels * BitsPerSample/8)
  d.setUint16(32, 2, true); // Block align (Channels * BitsPerSample/8)
  d.setUint16(34, 16, true); // Bits per sample
  d.setUint32(36, 0x64617461, false); // "data"
  d.setUint32(40, bytes.length, true); // Data length

  const blob = new Blob([header, bytes], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [view, setView] = useState<'landing' | 'booking' | 'mypage' | 'admin' | 'image-gen' | 'archive' | 'community' | 'inquiry' | 'curriculum' | 'pricing'>('landing');
  const [selectedCourse, setSelectedCourse] = useState(COURSES[0]);
  const [initialArchiveFilter, setInitialArchiveFilter] = useState<{ groupId: string | null, categoryId: string | null }>({ groupId: null, categoryId: null });
  const [language, setLanguage] = useState<LanguageCode>('ko');
  const t = TRANSLATIONS[language];

  const [isEditMode, setIsEditMode] = useState(false);
  const [siteContent, setSiteContent] = useState<Record<string, any>>({});
  const isAdmin = userProfile?.role === 'admin';

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'siteContent'), (snapshot) => {
      const content: Record<string, any> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (doc.id === 'event-discount' || doc.id === 'weeks-discounts' || doc.id === 'level-prices' || doc.id === 'ai-studio-access' || data.language === language) {
          content[data.key || doc.id] = { ...data, id: doc.id };
        }
      });
      setSiteContent(content);
    });
    return () => unsubscribe();
  }, [language]);

  const isEventPeriod = useMemo(() => {
    const event = siteContent['event-discount'];
    if (!event?.startDate || !event?.endDate) return false;
    const now = new Date();
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    end.setHours(23, 59, 59, 999);
    return now >= start && now <= end;
  }, [siteContent]);

  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userRef = doc(db, 'users', u.uid);
        const userSnap = await getDoc(userRef);
        let profile = userSnap.exists() ? userSnap.data() : { role: 'user' };
        
        // Fallback for default admin
        if (u.email === 'lhbin777@gmail.com') {
          profile.role = 'admin';
        }
        
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (e) {
      console.error('Login failed', e);
    }
  };

  const handleLogout = async () => {
    try {
      await firebaseLogout();
      setView('landing');
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  const scrollToSection = (sectionId: string) => {
    if (view !== 'landing') {
      setView('landing');
      // Small delay to ensure LandingView is mounted before scrolling
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const element = document.getElementById(sectionId);
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-8 right-8 z-50 w-12 h-12 bg-ink text-paper rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
          >
            <Plus className="rotate-45" size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-paper/80 backdrop-blur-md border-b border-ink/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => setView('landing')}
          >
            <div className="flex flex-col items-start justify-center leading-none">
              <span className="font-serif text-2xl font-bold tracking-tighter group-hover:text-gold transition-colors">L.C.L</span>
              <div className="h-[1px] w-full bg-gold/20 my-1 group-hover:bg-gold/50 transition-colors" />
              <span className="text-[8px] uppercase tracking-[0.25em] opacity-60 font-bold">Language & Culture Link</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 lg:gap-4 xl:gap-6">
            <div className="relative group">
              <button className="flex items-center gap-1 text-[10px] lg:text-xs uppercase tracking-widest hover:text-gold transition-colors">
                <Globe size={12} /> {LANGUAGES.find(l => l.code === language)?.nativeName}
              </button>
              <div className="absolute top-full right-0 mt-2 w-48 bg-paper border border-ink/10 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[60] max-h-[60vh] overflow-y-auto p-2">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={cn(
                      "w-full text-left px-4 py-2 text-xs rounded-xl transition-colors",
                      language === lang.code ? "bg-ink text-paper" : "hover:bg-ink/5"
                    )}
                  >
                    {lang.nativeName} ({lang.name})
                  </button>
                ))}
              </div>
            </div>
            <button 
              onClick={() => setView('curriculum')} 
              className={cn(
                "text-[10px] lg:text-xs uppercase tracking-widest transition-colors whitespace-nowrap",
                view === 'curriculum' ? "text-gold font-bold underline underline-offset-4" : "hover:text-gold"
              )}
            >
              {t.nav.curriculum}
            </button>
            <button 
              onClick={() => setView('pricing')} 
              className={cn(
                "text-[10px] lg:text-xs uppercase tracking-widest transition-colors whitespace-nowrap",
                view === 'pricing' ? "text-gold font-bold underline underline-offset-4" : "hover:text-gold"
              )}
            >
              {t.nav.pricing}
            </button>
            <button 
              onClick={() => setView('archive')} 
              className={cn(
                "text-[10px] lg:text-xs uppercase tracking-widest transition-colors whitespace-nowrap",
                view === 'archive' ? "text-gold font-bold underline underline-offset-4" : "hover:text-gold"
              )}
            >
              {t.nav.archive}
            </button>
            <button 
              onClick={() => setView('community')} 
              className={cn(
                "text-[10px] lg:text-xs uppercase tracking-widest transition-colors whitespace-nowrap",
                view === 'community' ? "text-gold font-bold underline underline-offset-4" : "hover:text-gold"
              )}
            >
              {t.nav.community}
            </button>
            <button 
              onClick={() => setView('inquiry')} 
              className={cn(
                "text-[10px] lg:text-xs uppercase tracking-widest transition-colors font-bold whitespace-nowrap",
                view === 'inquiry' ? "text-gold underline underline-offset-4" : "text-gold hover:opacity-80"
              )}
            >
              {t.nav.inquiry}
            </button>
            {(isAdmin || siteContent['ai-studio-access']?.access === 'all' || (siteContent['ai-studio-access']?.access === 'premium' && userProfile?.role === 'premium') || (siteContent['ai-studio-access']?.access === 'member' && userProfile)) && (
              <button 
                onClick={() => setView('image-gen')} 
                className={cn(
                  "text-[10px] lg:text-xs uppercase tracking-widest transition-colors flex items-center gap-1 whitespace-nowrap",
                  view === 'image-gen' ? "text-gold font-bold underline underline-offset-4" : "hover:text-gold"
                )}
              >
                {t.nav.aiStudio}
                {!isAdmin && <ShieldCheck size={10} className="text-gold/50" />}
              </button>
            )}
            {user ? (
              <div className="flex items-center gap-2 lg:gap-4">
                {userProfile?.role === 'admin' && (
                  <div className="flex items-center gap-2 lg:gap-4 border-r border-ink/10 pr-2 lg:pr-4">
                    <button 
                      onClick={() => setIsEditMode(!isEditMode)}
                      className={cn(
                        "flex items-center gap-1 text-[9px] uppercase tracking-[0.1em] px-2 py-0.5 rounded-full border transition-all whitespace-nowrap",
                        isEditMode ? "bg-gold text-ink border-gold font-bold" : "border-ink/20 opacity-50 hover:opacity-100"
                      )}
                    >
                      {isEditMode ? 'Edit ON' : 'Edit OFF'}
                    </button>
                    <button 
                      onClick={() => setView('admin')}
                      className="flex items-center gap-1 text-[10px] lg:text-xs uppercase tracking-widest text-gold font-bold hover:opacity-80 transition-colors whitespace-nowrap"
                    >
                      <LayoutDashboard size={14} /> {t.nav.admin}
                    </button>
                  </div>
                )}
                <button 
                  onClick={() => setView('mypage')}
                  className={cn(
                    "flex items-center gap-1 text-[10px] lg:text-xs uppercase tracking-widest transition-colors whitespace-nowrap",
                    view === 'mypage' ? "text-gold font-bold underline underline-offset-4" : "hover:text-gold"
                  )}
                >
                  <User size={14} /> {t.nav.myPage}
                </button>
                <button onClick={handleLogout} className="text-[10px] lg:text-xs uppercase tracking-widest opacity-50 hover:opacity-100"><LogOut size={14} /></button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="px-4 py-1.5 border border-ink rounded-full text-[10px] lg:text-xs uppercase tracking-widest hover:bg-ink hover:text-paper transition-all whitespace-nowrap"
              >
                {t.nav.login}
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        <AnimatePresence mode="wait">
          {view === 'landing' && <LandingView key="landing" setView={setView} onBook={(course) => { setSelectedCourse(course); setView('inquiry'); }} setInitialArchiveFilter={setInitialArchiveFilter} language={language} isEditMode={isEditMode} siteContent={siteContent} isEventPeriod={isEventPeriod} />}
          {view === 'curriculum' && <CurriculumView key="curriculum" language={language} onBook={(course) => { setSelectedCourse(course); setView('inquiry'); }} isEditMode={isEditMode} siteContent={siteContent} />}
          {view === 'pricing' && <PricingView key="pricing" language={language} setView={setView} isEditMode={isEditMode} siteContent={siteContent} isEventPeriod={isEventPeriod} />}
          {view === 'booking' && <BookingView key="booking" course={selectedCourse} onComplete={() => setView('mypage')} isEventPeriod={isEventPeriod} siteContent={siteContent} />}
          {view === 'mypage' && <MyPageView key="mypage" />}
          {view === 'admin' && <AdminView key="admin" language={language} siteContent={siteContent} />}
          {view === 'image-gen' && <ImageGenView key="image-gen" language={language} userProfile={userProfile} isAuthReady={isAuthReady} setView={setView} siteContent={siteContent} />}
          {view === 'archive' && <ArchiveView key="archive" initialFilter={initialArchiveFilter} onClearFilter={() => setInitialArchiveFilter({ groupId: null, categoryId: null })} language={language} isAdmin={isAdmin} />}
          {view === 'community' && <CommunityView key="community" language={language} />}
          {view === 'inquiry' && <InquiryView key="inquiry" language={language} onComplete={() => setView('landing')} isEventPeriod={isEventPeriod} siteContent={siteContent} isEditMode={isEditMode} />}
        </AnimatePresence>

        {/* Edit Mode Instruction Bar */}
        <AnimatePresence>
          {isEditMode && (
            <motion.div 
              initial={{ y: 100, x: '-50%' }}
              animate={{ y: 0, x: '-50%' }}
              exit={{ y: 100, x: '-50%' }}
              className="fixed bottom-8 left-1/2 z-[100] bg-gold text-ink px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 border border-ink/10"
            >
              <div className="w-8 h-8 bg-ink text-paper rounded-full flex items-center justify-center">
                <Edit size={16} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest font-bold leading-none">Admin Edit Mode</span>
                <span className="text-xs font-serif italic">Click on any text element to edit it directly.</span>
              </div>
              <button 
                onClick={() => setIsEditMode(false)}
                className="ml-4 p-1 hover:bg-ink/10 rounded-full transition-colors"
              >
                <Plus size={20} className="rotate-45" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="bg-ink text-paper py-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-paper text-ink rounded-full flex items-center justify-center font-serif text-lg font-bold">L</div>
              <span className="font-serif text-xl font-bold tracking-tight">{t.nav.systemName}</span>
            </div>
            <div className="font-serif text-2xl font-light leading-relaxed opacity-80 max-w-md">
              <EditableText contentKey="footer.quote" defaultValue={t.footer.quote} isEditMode={isEditMode} language={language} siteContent={siteContent} />
            </div>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-widest mb-6 opacity-50">
              <EditableText contentKey="footer.contact_label" defaultValue={t.footer.contact} isEditMode={isEditMode} language={language} siteContent={siteContent} />
            </h4>
            <div className="space-y-2">
              <EditableText contentKey="footer.contact_1" defaultValue="lhbin777@gmail.com" isEditMode={isEditMode} language={language} siteContent={siteContent} className="text-sm block" />
              <EditableText contentKey="footer.contact_2" defaultValue="" isEditMode={isEditMode} language={language} siteContent={siteContent} className="text-sm block" />
              <EditableText contentKey="footer.contact_3" defaultValue="" isEditMode={isEditMode} language={language} siteContent={siteContent} className="text-sm block" />
            </div>
            <div className="text-sm mt-4">
              <EditableText contentKey="footer.experience" defaultValue={language === 'ko' ? '20년 현지 경력 & 언어학 박사 직강' : '20 Years Local Experience & PhD Direct Instruction'} isEditMode={isEditMode} language={language} siteContent={siteContent} />
            </div>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-widest mb-6 opacity-50">
              <EditableText contentKey="footer.social_label" defaultValue={t.footer.social} isEditMode={isEditMode} language={language} siteContent={siteContent} />
            </h4>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-4">
                <EditableLink contentKey="footer.social_1" defaultText="Instagram" defaultUrl="#" isEditMode={isEditMode} language={language} siteContent={siteContent} className="text-sm hover:text-gold transition-colors" />
                <EditableLink contentKey="footer.social_2" defaultText="Blog" defaultUrl="#" isEditMode={isEditMode} language={language} siteContent={siteContent} className="text-sm hover:text-gold transition-colors" />
                <EditableLink contentKey="footer.social_3" defaultText="" defaultUrl="#" isEditMode={isEditMode} language={language} siteContent={siteContent} className="text-sm hover:text-gold transition-colors" />
                <EditableLink contentKey="footer.social_4" defaultText="" defaultUrl="#" isEditMode={isEditMode} language={language} siteContent={siteContent} className="text-sm hover:text-gold transition-colors" />
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-paper/10 flex justify-between items-center">
          <p className="text-[10px] uppercase tracking-widest opacity-40">{t.footer.rights}</p>
          <div className="text-[10px] uppercase tracking-widest opacity-40">
            <EditableText contentKey="footer.tagline" defaultValue={t.footer.tagline} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </div>
        </div>
      </footer>
    </div>
  );
}

const FONTS = [
  "SimSun", "SimHei", "Batang", "Gulim", "Dotum", "Gungsuh", "Malgun Gothic",
  "Microsoft YaHei", "Microsoft JhengHei", "KaiTi", "FangSong", "NSimSun",
  "MingLiU", "PMingLiU", "Arial", "Helvetica", "Times New Roman", "Georgia",
  "Courier New", "Verdana", "Tahoma", "Trebuchet MS", "Impact", "Comic Sans MS",
  "Lucida Sans Unicode", "Palatino Linotype", "Book Antiqua", "Century Gothic",
  "Franklin Gothic Medium", "Garamond"
];

const COLORS = [
  "#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#00FFFF", "#FF00FF",
  "#C0C0C0", "#808080", "#800000", "#808000", "#008000", "#800080", "#008080", "#000080",
  "#D4AF37", "#B8860B", "#DAA520", "#FFD700", "#F0E68C", "#BDB76B", "#556B2F", "#6B8E23",
  "#9ACD32", "#32CD32", "#228B22", "#006400", "#00FA9A", "#00CED1", "#1E90FF", "#4169E1"
];

const SIZES = ["10px", "12px", "14px", "16px", "18px", "20px", "24px", "32px", "40px", "48px", "64px", "72px", "80px", "96px", "112px"];

const EditableText: FC<{ 
  contentKey: string, 
  defaultValue: string, 
  isEditMode: boolean, 
  language: string,
  siteContent: Record<string, any>,
  className?: string,
  as?: any,
  highlight?: string,
  highlightClassName?: string
}> = ({ contentKey, defaultValue, isEditMode, language, siteContent, className, as: Component = 'span', highlight, highlightClassName }) => {
  const [isEditing, setIsEditing] = useState(false);
  const content = siteContent[contentKey] || {};
  const [value, setValue] = useState(content.value !== undefined ? content.value : defaultValue);
  const [fontFamily, setFontFamily] = useState(content.fontFamily || "");
  const [fontSize, setFontSize] = useState(content.fontSize || "");
  const [color, setColor] = useState(content.color || "");

  const displayValue = value || (isEditMode ? `[+ ${contentKey}]` : "");

  useEffect(() => {
    if (content.value !== undefined) {
      setValue(content.value);
    } else {
      setValue(defaultValue);
    }
    setFontFamily(content.fontFamily || "");
    setFontSize(content.fontSize || "");
    setColor(content.color || "");
  }, [content.value, content.fontFamily, content.fontSize, content.color, defaultValue]);

  const handleSave = async () => {
    const docId = `${language}_${contentKey.replace(/\./g, '_')}`;
    try {
      await setDoc(doc(db, 'siteContent', docId), {
        key: contentKey,
        language,
        value,
        fontFamily,
        fontSize,
        color,
        updatedAt: serverTimestamp()
      });
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'siteContent');
    }
  };

  const currentStyles = {
    fontFamily: fontFamily || undefined,
    fontSize: fontSize || undefined,
    color: color || undefined
  };

  const renderContent = () => {
    if (highlight && typeof displayValue === 'string' && displayValue.includes(highlight)) {
      const parts = displayValue.split(highlight);
      return (
        <>
          {parts[0]}
          <span className={highlightClassName}>{highlight}</span>
          {parts[1]}
        </>
      );
    }
    return displayValue;
  };

  if (!isEditMode && !value) return null;

  if (isEditMode) {
    return (
      <div className={cn("relative group", className)}>
        {isEditing ? (
          <div className="flex flex-col gap-3 w-full min-w-[300px] bg-white p-4 rounded-xl border border-gold shadow-2xl z-[100] absolute top-0 left-0">
            <textarea 
              value={value} 
              onChange={(e) => setValue(e.target.value)}
              className="w-full p-2 bg-paper border border-ink/10 rounded-lg text-ink font-serif text-sm focus:outline-none focus:ring-1 focus:ring-gold"
              rows={3}
              autoFocus
              placeholder="Enter text..."
            />
            <div className="grid grid-cols-2 gap-2">
              <select 
                value={fontFamily} 
                onChange={(e) => setFontFamily(e.target.value)}
                className="text-[10px] p-1 border border-ink/10 rounded bg-paper"
              >
                <option value="">Default Font</option>
                {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <select 
                value={fontSize} 
                onChange={(e) => setFontSize(e.target.value)}
                className="text-[10px] p-1 border border-ink/10 rounded bg-paper"
              >
                <option value="">Default Size</option>
                {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1 border border-ink/5 rounded">
              {COLORS.map(c => (
                <button 
                  key={c} 
                  onClick={() => setColor(c)}
                  className={cn("w-4 h-4 rounded-full border border-ink/10", color === c && "ring-2 ring-gold")}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setIsEditing(false)} className="px-3 py-1 text-[10px] uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity">Cancel</button>
              <button onClick={handleSave} className="px-3 py-1 bg-gold text-ink rounded-full text-[10px] uppercase tracking-widest font-bold hover:scale-105 transition-transform">Save</button>
            </div>
          </div>
        ) : (
          <div 
            className="relative cursor-pointer group/item"
            onClick={() => setIsEditing(true)}
          >
            <div className="absolute -inset-2 border border-dashed border-gold/0 group-hover/item:border-gold/40 rounded-lg transition-colors -z-10" />
            <Component className={cn(className, !value && "opacity-30 italic")} style={currentStyles}>{renderContent()}</Component>
            <button 
              className="absolute -top-2 -right-2 w-6 h-6 bg-gold text-ink rounded-full flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity shadow-lg z-10"
            >
              <Edit size={12} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return <Component className={className} style={currentStyles}>{renderContent()}</Component>;
};

const EditableImage: FC<{ 
  contentKey: string, 
  defaultUrl: string, 
  isEditMode: boolean, 
  language: string,
  siteContent: Record<string, any>,
  className?: string,
  alt?: string,
  rounded?: string,
  children?: React.ReactNode
}> = ({ contentKey, defaultUrl, isEditMode, language, siteContent, className, alt, rounded = "rounded-lg", children }) => {
  const [isUploading, setIsUploading] = useState(false);
  const content = siteContent[contentKey] || {};
  const url = content.value || defaultUrl;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const storageRef = ref(storage, `siteContent/${language}/${contentKey}_${Date.now()}`);
    try {
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      
      const docId = `${language}_${contentKey.replace(/\./g, '_')}`;
      await setDoc(doc(db, 'siteContent', docId), {
        key: contentKey,
        language,
        value: downloadUrl,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Upload failed', error);
    } finally {
      setIsUploading(false);
    }
  };

  // Filter out image-specific classes from the container
  const containerClasses = className?.split(' ').filter(c => !['object-cover', 'object-contain', 'opacity-80', 'opacity-70'].includes(c)).join(' ');
  const imgClasses = className?.split(' ').filter(c => ['object-cover', 'object-contain', 'opacity-80', 'opacity-70'].includes(c)).join(' ');

  if (isEditMode) {
    return (
      <div className={cn("relative group cursor-pointer", containerClasses, rounded)}>
        <div 
          className="relative w-full h-full"
          onClick={() => fileInputRef.current?.click()}
        >
          <img src={url} alt={alt} className={cn("w-full h-full", imgClasses)} referrerPolicy="no-referrer" />
          {children}
          
          {/* Dashed border - always visible in edit mode */}
          <div className={cn("absolute inset-0 border-2 border-dashed border-gold/60 pointer-events-none z-30", rounded)} />
          
          {/* Hover overlay with button */}
          <div className={cn(
            "absolute inset-0 bg-ink/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center z-50 backdrop-blur-[1px]",
            rounded
          )}>
            <div className="bg-white text-ink px-6 py-3 rounded-full text-[10px] uppercase tracking-widest font-bold shadow-2xl flex items-center gap-3 transform scale-90 group-hover:scale-100 transition-transform duration-300">
              {isUploading ? <Clock size={14} className="animate-spin text-gold" /> : <Upload size={14} className="text-gold" />}
              {isUploading ? 'Uploading...' : 'Change Image'}
            </div>
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleUpload} 
            className="hidden" 
            accept="image/*"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", containerClasses, rounded)}>
      <img src={url} alt={alt} className={cn("w-full h-full", imgClasses)} referrerPolicy="no-referrer" />
      {children}
    </div>
  );
};

const EditableLink: FC<{ 
  contentKey: string, 
  defaultText: string, 
  defaultUrl: string,
  isEditMode: boolean, 
  language: string,
  siteContent: Record<string, any>,
  className?: string
}> = ({ contentKey, defaultText, defaultUrl, isEditMode, language, siteContent, className }) => {
  const [isEditing, setIsEditing] = useState(false);
  const content = siteContent[contentKey] || {};
  const [text, setText] = useState(content.value !== undefined ? content.value : defaultText);
  const [url, setUrl] = useState(content.url !== undefined ? content.url : defaultUrl);

  const displayValue = text || (isEditMode ? `[+ ${contentKey}]` : "");

  useEffect(() => {
    if (content.value !== undefined) setText(content.value);
    if (content.url !== undefined) setUrl(content.url);
  }, [content.value, content.url]);

  const handleSave = async () => {
    const docId = `${language}_${contentKey.replace(/\./g, '_')}`;
    try {
      await setDoc(doc(db, 'siteContent', docId), {
        key: contentKey,
        language,
        value: text,
        url,
        updatedAt: serverTimestamp()
      });
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'siteContent');
    }
  };

  if (!isEditMode && !text) return null;

  if (isEditMode) {
    return (
      <div className={cn("relative group inline-block", className)}>
        {isEditing ? (
          <div className="flex flex-col gap-3 w-full min-w-[300px] bg-white p-4 rounded-xl border border-gold shadow-2xl z-[100] absolute bottom-full left-0 mb-2">
            <div className="space-y-1">
              <label className="text-[8px] uppercase tracking-widest opacity-50">Link Text</label>
              <input 
                value={text} 
                onChange={(e) => setText(e.target.value)}
                className="w-full p-2 bg-paper border border-ink/10 rounded-lg text-ink text-xs focus:outline-none focus:ring-1 focus:ring-gold"
                placeholder="Enter link text..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] uppercase tracking-widest opacity-50">URL</label>
              <input 
                value={url} 
                onChange={(e) => setUrl(e.target.value)}
                className="w-full p-2 bg-paper border border-ink/10 rounded-lg text-ink text-xs focus:outline-none focus:ring-1 focus:ring-gold"
                placeholder="Enter URL (e.g., https://...)"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setIsEditing(false)} className="px-3 py-1 text-[10px] uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity">Cancel</button>
              <button onClick={handleSave} className="px-3 py-1 bg-gold text-ink rounded-full text-[10px] uppercase tracking-widest font-bold hover:scale-105 transition-transform">Save</button>
            </div>
          </div>
        ) : (
          <div 
            className="relative cursor-pointer group/item"
            onClick={() => setIsEditing(true)}
          >
            <div className="absolute -inset-1 border border-dashed border-gold/0 group-hover/item:border-gold/40 rounded transition-colors -z-10" />
            <span className={cn(className, !text && "opacity-30 italic")}>{displayValue}</span>
            <button 
              className="absolute -top-2 -right-2 w-5 h-5 bg-gold text-ink rounded-full flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity shadow-lg z-10"
            >
              <Edit size={10} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return <a href={url} target="_blank" rel="noopener noreferrer" className={className}>{text}</a>;
};

const LandingView: FC<{ setView: (v: any) => void, onBook: (course: any) => void, setInitialArchiveFilter: (f: any) => void, language: LanguageCode, isEditMode: boolean, siteContent: Record<string, any>, isEventPeriod: boolean }> = ({ setView, onBook, setInitialArchiveFilter, language, isEditMode, siteContent, isEventPeriod }) => {
  const t = TRANSLATIONS[language];
  
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="space-y-32"
    >
      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center overflow-hidden px-6">
        <div className="absolute right-0 top-0 w-1/2 h-full bg-ink/5 z-0 flex items-center justify-center">
          <div className="w-[80%] aspect-[3/4] bg-ink/10 rounded-[200px] overflow-hidden relative">
            <EditableImage 
              contentKey="hero.image"
              defaultUrl="https://picsum.photos/seed/chinese-culture/800/1200" 
              alt="Chinese Culture" 
              className="w-full h-full object-cover opacity-80"
              isEditMode={isEditMode}
              language={language}
              siteContent={siteContent}
              rounded="rounded-[200px]"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-paper/40 to-transparent pointer-events-none" />
            </EditableImage>
          </div>
          <div className="absolute top-1/2 left-0 -translate-x-1/2 vertical-text opacity-20 text-4xl font-serif">
            Language & Culture Link
          </div>
        </div>

        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 relative z-10 pointer-events-none">
          <div className="space-y-8 pointer-events-auto">
            <motion.div 
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-block px-4 py-1 border border-gold text-gold text-[10px] uppercase tracking-[0.3em] rounded-full"
            >
              <EditableText contentKey="hero.badge" defaultValue={t.hero.badge} isEditMode={isEditMode} language={language} siteContent={siteContent} />
            </motion.div>
            <motion.h1 
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-7xl md:text-8xl font-serif font-light leading-[0.9] tracking-tighter"
            >
              <EditableText 
                contentKey="hero.title" 
                defaultValue={t.hero.title} 
                isEditMode={isEditMode} 
                language={language} 
                siteContent={siteContent} 
                as="div" 
                highlight={language === 'ko' ? "프리미엄 중국어" : "Premium Chinese"}
                highlightClassName="text-gold"
              />
            </motion.h1>
            <motion.div 
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-lg font-serif max-w-md opacity-70 leading-relaxed"
            >
              <EditableText contentKey="hero.subtitle" defaultValue={t.hero.subtitle} isEditMode={isEditMode} language={language} siteContent={siteContent} as="div" />
            </motion.div>
            <motion.div 
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex flex-wrap items-center gap-6"
            >
              <button 
                onClick={() => document.getElementById('curriculum')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-10 py-4 bg-ink text-paper rounded-full text-xs uppercase tracking-widest hover:scale-105 transition-transform"
              >
                {t.hero.cta}
              </button>
              <button 
                onClick={() => setView('inquiry')}
                className="px-10 py-4 border border-ink text-ink rounded-full text-xs uppercase tracking-widest hover:bg-ink hover:text-paper transition-all"
              >
                {t.inquiry.title}
              </button>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-paper bg-ink/20 overflow-hidden relative group/avatar">
                      <EditableImage 
                        contentKey={`hero.avatar_${i}`}
                        defaultUrl={`https://i.pravatar.cc/100?img=${i + 10}`}
                        alt="Student"
                        className="w-full h-full object-cover"
                        isEditMode={isEditMode}
                        language={language}
                        siteContent={siteContent}
                        rounded="rounded-full"
                      />
                    </div>
                  ))}
                </div>
                <span className="text-[10px] uppercase tracking-widest opacity-60">
                  <EditableText contentKey="hero.students_count" defaultValue={language === 'ko' ? '500+ 수강생 참여' : '500+ Students Joined'} isEditMode={isEditMode} language={language} siteContent={siteContent} />
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Curriculum Section */}
      <section id="curriculum" className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
          <div className="space-y-4">
            <span className="text-gold text-[10px] uppercase tracking-[0.4em]">
              <EditableText contentKey="curriculum.badge" defaultValue={t.curriculum.badge} isEditMode={isEditMode} language={language} siteContent={siteContent} />
            </span>
            <h2 className="text-5xl font-serif font-light">
              <EditableText contentKey="curriculum.title" defaultValue={t.curriculum.title} isEditMode={isEditMode} language={language} siteContent={siteContent} />
            </h2>
          </div>
          <div className="max-w-xs text-sm opacity-60 font-serif italic">
            <EditableText contentKey="curriculum.subtitle" defaultValue={t.curriculum.subtitle} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-px bg-ink/10 border border-ink/10">
          {COURSES.map((course, idx) => (
            <motion.div 
              key={course.id}
              whileHover={{ backgroundColor: 'rgba(26, 26, 26, 0.02)' }}
              className="bg-paper p-8 space-y-8 flex flex-col h-full"
            >
              <div className="space-y-4 flex-grow">
                <div className="w-12 h-12 rounded-full border border-ink/10 flex items-center justify-center">
                  {idx === 0 && <MessageSquare size={20} />}
                  {idx === 1 && <GraduationCap size={20} />}
                  {idx === 2 && <Star size={20} />}
                  {idx === 3 && <Briefcase size={20} />}
                  {idx === 4 && <Globe size={20} />}
                </div>
                <h3 className="text-2xl font-serif">{course.title}</h3>
                <p className="text-xs opacity-60 leading-relaxed">{course.description}</p>
                <div className="flex flex-wrap gap-2">
                  {course.levels.map(level => (
                    <span key={level} className="text-[9px] uppercase tracking-widest px-2 py-1 bg-ink/5 rounded-sm">{level}</span>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => onBook(course)}
                className="group flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold hover:text-gold transition-colors"
              >
                {language === 'ko' ? '수강 신청' : t.curriculum.bookNow} <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials / Quote */}
      <section className="max-w-4xl mx-auto px-6 py-32 text-center space-y-12">
        <div className="w-12 h-12 mx-auto border border-ink/10 rounded-full flex items-center justify-center opacity-20">"</div>
        <div className="text-4xl md:text-5xl font-serif font-light italic leading-tight">
          <EditableText contentKey="testimonial.quote" defaultValue={t.testimonial.quote} isEditMode={isEditMode} language={language} siteContent={siteContent} />
        </div>
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-widest font-bold">
            <EditableText contentKey="testimonial.author" defaultValue={t.testimonial.author} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </div>
          <div className="text-[10px] uppercase tracking-widest opacity-50">
            <EditableText contentKey="testimonial.authorTitle" defaultValue={t.testimonial.authorTitle} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </div>
        </div>
      </section>

      {/* Resource Marketing Section - Redesigned with Categories */}
      <section id="library" className="bg-paper py-32 px-6 border-y border-ink/5">
        <div className="max-w-7xl mx-auto space-y-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
            <div className="space-y-8">
              <span className="text-gold text-[10px] uppercase tracking-[0.4em]">
                <EditableText contentKey="library.badge" defaultValue="Knowledge Library" isEditMode={isEditMode} language={language} siteContent={siteContent} />
              </span>
              <h2 className="text-5xl md:text-6xl font-serif font-light leading-tight">
                <EditableText contentKey="library.title" defaultValue={language === 'ko' ? '"언어는 고립된 기호가 아니라, 역사가 숨 쉬는 생명체입니다."' : '"Language is not an isolated symbol, but a living organism where history breathes."'} isEditMode={isEditMode} language={language} siteContent={siteContent} as="div" />
              </h2>
              <div className="text-lg opacity-70 font-serif leading-relaxed">
                <EditableText contentKey="library.description" defaultValue={language === 'ko' ? 'L.C.L Knowledge Library는 중국 언어학 박사의 학문적 엄격함과 20년 현지 체류의 직관을 결합한 지식의 정수입니다. 단순한 학습 자료를 넘어, 언어의 구조적 원리와 문화적 맥락을 관통하는 통찰력을 제공합니다.' : 'The L.C.L Knowledge Library is the essence of knowledge that combines the academic rigor of a PhD in Chinese linguistics with the intuition of 20 years of local residence. Beyond simple learning materials, it provides insight into the structural principles and cultural context of language.'} isEditMode={isEditMode} language={language} siteContent={siteContent} as="div" />
              </div>
            </div>
            <div className="relative hidden md:block">
              <div className="aspect-[16/9] bg-ink/5 rounded-[40px] overflow-hidden rotate-1">
                <EditableImage 
                  contentKey="library.image"
                  defaultUrl="https://picsum.photos/seed/library-main/1200/800" 
                  alt="Library" 
                  className="w-full h-full object-cover opacity-80"
                  isEditMode={isEditMode}
                  language={language}
                  siteContent={siteContent}
                  rounded="rounded-[40px]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {RESOURCE_GROUPS.map((group) => (
              <motion.div 
                key={group.id}
                whileHover={{ y: -5 }}
                className="group p-8 bg-white border border-ink/5 rounded-[32px] shadow-sm hover:shadow-xl hover:border-gold/30 transition-all space-y-8"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-gold/10 text-gold flex items-center justify-center group-hover:bg-gold group-hover:text-ink transition-colors">
                    {group.id === 'group-a' && <BookOpen size={24} />}
                    {group.id === 'group-b' && <GraduationCap size={24} />}
                    {group.id === 'group-c' && <Globe size={24} />}
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif">{group.name.split(':')[1]?.trim() || group.name}</h3>
                    <p className="text-[10px] uppercase tracking-widest text-gold font-bold">{group.name.split(':')[0]}</p>
                  </div>
                  <p className="text-sm opacity-60 leading-relaxed">{group.description}</p>
                </div>

                <div className="space-y-3">
                  {group.categories.map((cat) => (
                    <button 
                      key={cat.id}
                      onClick={() => {
                        setInitialArchiveFilter({ groupId: group.id, categoryId: cat.id });
                        setView('archive');
                      }}
                      className="w-full text-left p-4 rounded-2xl hover:bg-paper border border-transparent hover:border-ink/5 transition-all group/item"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{cat.name}</span>
                        <ArrowRight size={14} className="opacity-0 group-hover/item:opacity-100 -translate-x-2 group-hover/item:translate-x-0 transition-all" />
                      </div>
                      <p className="text-[10px] opacity-40 mt-1">{cat.description}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center pt-8">
            <button 
              onClick={() => setView('archive')}
              className="px-12 py-5 bg-ink text-paper rounded-full text-xs uppercase tracking-widest hover:bg-gold hover:text-ink transition-all shadow-lg hover:shadow-gold/20"
            >
              전체 라이브러리 탐색하기
            </button>
          </div>
        </div>
      </section>
    </motion.div>
  );
};

const BookingView: FC<{ course: any, onComplete: () => void, isEventPeriod: boolean, siteContent: any }> = ({ course, onComplete, isEventPeriod, siteContent }) => {
  const [level, setLevel] = useState(course.levels[0]);
  const [weeks, setWeeks] = useState(12);
  const [sessions, setSessions] = useState(1);
  const [hours, setHours] = useState(1);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const priceResult = useMemo(() => {
    const customRate = siteContent['event-discount']?.discountRate;
    return calculatePrice(level, weeks, sessions, hours, isEventPeriod, customRate);
  }, [level, weeks, sessions, hours, isEventPeriod, siteContent]);

  const price = priceResult.discountedPrice;

  const toggleSlot = (slot: string) => {
    setSelectedSlots(prev => 
      prev.includes(slot) 
        ? prev.filter(s => s !== slot) 
        : [...prev, slot]
    );
  };

  const handleCompleteBooking = async () => {
    if (!auth.currentUser) return;
    setIsSubmitting(true);
    const path = 'reservations';
    try {
      await addDoc(collection(db, path), {
        studentUid: auth.currentUser.uid,
        courseId: course.id,
        level: level,
        durationWeeks: weeks,
        sessionsPerWeek: sessions,
        sessionDuration: hours,
        preferredSlots: selectedSlots,
        totalPrice: price,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      onComplete();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-6 py-20"
    >
      <div className="flex items-center gap-4 mb-12">
        <button onClick={() => window.history.back()} className="text-xs uppercase tracking-widest opacity-50 hover:opacity-100">Back</button>
        <div className="h-px flex-grow bg-ink/10" />
        <span className="text-[10px] uppercase tracking-widest opacity-50">Step {step} of 3</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="md:col-span-2 space-y-12">
          {step === 1 && (
            <div className="space-y-8">
              <h2 className="text-4xl font-serif">수강 과정 및 기간 선택</h2>
              
              <div className="space-y-4">
                <label className="text-[10px] uppercase tracking-widest opacity-50">상세 레벨 (Level)</label>
                <div className="flex flex-wrap gap-4">
                  {course.levels.map(l => (
                    <button 
                      key={l}
                      onClick={() => setLevel(l)}
                      className={cn(
                        "px-6 py-3 border rounded-xl text-sm transition-all",
                        level === l ? "border-ink bg-ink text-paper" : "border-ink/10 hover:border-ink/30"
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] uppercase tracking-widest opacity-50">수강 기간 (Weeks)</label>
                <div className="grid grid-cols-3 gap-4">
                  {[4, 8, 12].map(w => (
                    <button 
                      key={w}
                      onClick={() => setWeeks(w)}
                      className={cn(
                        "py-4 border rounded-xl text-sm transition-all",
                        weeks === w ? "border-ink bg-ink text-paper" : "border-ink/10 hover:border-ink/30"
                      )}
                    >
                      {w}주 {w === 12 && "(15%↓)"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] uppercase tracking-widest opacity-50">주당 횟수 (Sessions per Week)</label>
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map(s => (
                    <button 
                      key={s}
                      onClick={() => setSessions(s)}
                      className={cn(
                        "py-4 border rounded-xl text-sm transition-all",
                        sessions === s ? "border-ink bg-ink text-paper" : "border-ink/10 hover:border-ink/30"
                      )}
                    >
                      주 {s}회
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] uppercase tracking-widest opacity-50">수업 시간 (Hours per Session)</label>
                <div className="grid grid-cols-3 gap-4">
                  {[1, 1.5, 2].map(h => (
                    <button 
                      key={h}
                      onClick={() => setHours(h)}
                      className={cn(
                        "py-4 border rounded-xl text-sm transition-all",
                        hours === h ? "border-ink bg-ink text-paper" : "border-ink/10 hover:border-ink/30"
                      )}
                    >
                      {h}시간
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div className="flex justify-between items-end">
                <h2 className="text-4xl font-serif">희망 시간대 선택</h2>
                <p className="text-[10px] uppercase tracking-widest opacity-50">
                  주 {sessions}회 수업 / {selectedSlots.length}개 선택됨
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="space-y-2">
                    <span className="text-[10px] uppercase tracking-widest opacity-50 block text-center border-b border-ink/10 pb-1">{day}</span>
                    {['10:00', '14:00', '19:00'].map(time => {
                      const slotId = `${day}-${time}`;
                      const isSelected = selectedSlots.includes(slotId);
                      return (
                        <button 
                          key={time} 
                          onClick={() => toggleSlot(slotId)}
                          className={cn(
                            "w-full py-3 border rounded-xl text-xs transition-all",
                            isSelected 
                              ? "border-ink bg-ink text-paper" 
                              : "border-ink/10 hover:border-ink/30"
                          )}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
              <p className="text-[10px] opacity-50 italic">
                * 실제 수업 시간은 박사님과 상담 후 최종 확정됩니다. 여러 시간대를 선택해 주시면 조율이 더 원활합니다.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <h2 className="text-4xl font-serif">예약 확인 및 결제</h2>
              <div className="p-8 bg-ink/5 rounded-2xl space-y-6">
                <div className="flex justify-between items-center border-b border-ink/10 pb-4">
                  <span className="text-sm opacity-60">Course</span>
                  <span className="font-bold">{course.title} ({level})</span>
                </div>
                <div className="flex justify-between items-center border-b border-ink/10 pb-4">
                  <span className="text-sm opacity-60">Schedule</span>
                  <span>{weeks}주 / 주 {sessions}회 / {hours}시간</span>
                </div>
                {priceResult.isEventDiscount && (
                  <div className="flex justify-between items-center border-b border-ink/10 pb-4 text-gold">
                    <span className="text-sm">Event Discount</span>
                    <span>-{Math.round(priceResult.eventDiscountRate * 100)}%</span>
                  </div>
                )}
                {priceResult.weeksDiscountRate > 0 && (
                  <div className="flex justify-between items-center border-b border-ink/10 pb-4 text-green-600">
                    <span className="text-sm">Duration Discount</span>
                    <span>-{Math.round(priceResult.weeksDiscountRate * 100)}%</span>
                  </div>
                )}
                <div className="flex justify-between items-start border-b border-ink/10 pb-4">
                    <span className="text-sm opacity-60">Preferred Times</span>
                    <div className="text-right flex flex-wrap justify-end gap-1 max-w-[200px]">
                      {selectedSlots.map(s => (
                        <span key={s} className="text-[10px] bg-ink text-paper px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                <div className="flex justify-between items-center pt-4">
                  <span className="text-lg font-serif">Total Price</span>
                  <span className="text-3xl font-serif text-gold">₩{price.toLocaleString()}</span>
                </div>
              </div>
              <p className="text-xs opacity-50 text-center italic">
                * 결제 완료 후 박사님께서 직접 연락드려 상세 레벨 테스트 일정을 조율합니다.
              </p>
            </div>
          )}

          <div className="flex justify-between items-center pt-8">
            <button 
              disabled={step === 1}
              onClick={() => setStep(s => s - 1)}
              className="text-xs uppercase tracking-widest opacity-50 hover:opacity-100 disabled:opacity-0"
            >
              Previous
            </button>
            <button 
              onClick={() => step < 3 ? setStep(s => s + 1) : handleCompleteBooking()}
              disabled={isSubmitting}
              className="px-10 py-4 bg-ink text-paper rounded-full text-xs uppercase tracking-widest hover:scale-105 transition-transform disabled:opacity-50"
            >
              {isSubmitting ? 'Processing...' : (step === 3 ? 'Complete Booking' : 'Next Step')}
            </button>
          </div>
        </div>

        <div className="space-y-8">
          <div className="p-8 border border-ink/10 rounded-2xl space-y-6 sticky top-32">
            <h4 className="text-xs uppercase tracking-widest opacity-50">Summary</h4>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="opacity-60">Course</span>
                <span className="text-right">{course.id.toUpperCase()} ({level})</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="opacity-60">Duration</span>
                <span>{weeks} Weeks</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-4 border-t border-ink/10">
                <span>Total</span>
                <span className="text-gold">₩{price.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const AdminView: FC<{ language: LanguageCode, siteContent: any }> = ({ language, siteContent }) => {
  const t = TRANSLATIONS[language];
  const [reservations, setReservations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [downloads, setDownloads] = useState<any[]>([]);
  const [communityPosts, setCommunityPosts] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'reservations' | 'resources' | 'community' | 'users' | 'stats' | 'inquiries'>('reservations');
  
  const [feedbackText, setFeedbackText] = useState<{ [key: string]: string }>({});
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [editingResource, setEditingResource] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [editPostData, setEditPostData] = useState({ title: '', content: '' });
  const [isDragging, setIsDragging] = useState(false);
  
  // Resource Form State
  const [newResource, setNewResource] = useState({
    title: '',
    description: '',
    groupId: RESOURCE_GROUPS[0].id,
    categoryId: RESOURCE_GROUPS[0].categories[0].id,
    fileUrl: '',
    textContent: '',
    fileType: 'pdf' as 'pdf' | 'mp3' | 'image' | 'ppt' | 'word' | 'text',
    accessLevel: 'member' as 'public' | 'member' | 'premium',
    author: '',
    tags: '',
    color: '#F27D26',
    fontFamily: 'serif',
    fontSize: 16,
    fontColor: '#000000',
    fontWeight: '400'
  });

  useEffect(() => {
    const unsubRes = onSnapshot(query(collection(db, 'reservations'), orderBy('createdAt', 'desc')), (snapshot) => {
      setReservations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'reservations'));

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    const unsubResources = onSnapshot(query(collection(db, 'resources'), orderBy('createdAt', 'desc')), (snapshot) => {
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'resources'));

    const unsubDownloads = onSnapshot(collection(db, 'downloads'), (snapshot) => {
      setDownloads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'downloads'));

    const unsubCommunity = onSnapshot(query(collection(db, 'community'), orderBy('createdAt', 'desc')), (snapshot) => {
      setCommunityPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'community'));

    const unsubFeedbacks = onSnapshot(collection(db, 'feedback'), (snapshot) => {
      setFeedbacks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'feedback'));

    const unsubInquiries = onSnapshot(query(collection(db, 'inquiries'), orderBy('createdAt', 'desc')), (snapshot) => {
      setInquiries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'inquiries'));

    setLoading(false);

    return () => {
      unsubRes();
      unsubUsers();
      unsubResources();
      unsubDownloads();
      unsubCommunity();
      unsubFeedbacks();
      unsubInquiries();
    };
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const path = 'reservations';
    try {
      await updateDoc(doc(db, path, id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const [editingInquiry, setEditingInquiry] = useState<any>(null);
  const [inquiryForm, setInquiryForm] = useState<any>({});

  const handleEditInquiry = (inq: any) => {
    setEditingInquiry(inq);
    setInquiryForm({ ...inq });
  };

  const handleUpdateInquiry = async (e: FormEvent) => {
    e.preventDefault();
    const path = 'inquiries';
    try {
      await updateDoc(doc(db, path, editingInquiry.id), {
        ...inquiryForm,
        updatedAt: serverTimestamp()
      });
      setEditingInquiry(null);
      alert(language === 'ko' ? '수정되었습니다.' : 'Updated successfully.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleDeleteInquiry = async (id: string) => {
    if (!confirm(language === 'ko' ? '정말 삭제하시겠습니까?' : 'Are you sure you want to delete this?')) return;
    const path = 'inquiries';
    try {
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const submitFeedback = async (resId: string, studentUid: string) => {
    const content = feedbackText[resId];
    if (!content) return;
    const path = 'feedback';
    try {
      const existingFeedback = feedbacks.find(f => f.reservationId === resId);
      if (existingFeedback) {
        await updateDoc(doc(db, path, existingFeedback.id), {
          content,
          updatedAt: serverTimestamp()
        });
        alert(language === 'ko' ? '피드백이 수정되었습니다.' : 'Feedback has been updated.');
      } else {
        await addDoc(collection(db, path), {
          reservationId: resId,
          studentUid,
          content,
          createdAt: serverTimestamp()
        });
        alert(language === 'ko' ? '피드백이 전송되었습니다.' : 'Feedback has been sent.');
      }
      setFeedbackText(prev => ({ ...prev, [resId]: '' }));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleCreateResource = async (e: FormEvent) => {
    e.preventDefault();
    const path = 'resources';
    const resourceData = {
      ...newResource,
      tags: newResource.tags.split(',').map(t => t.trim()).filter(Boolean),
      updatedAt: serverTimestamp()
    };
    try {
      if (editingResource) {
        await updateDoc(doc(db, path, editingResource.id), resourceData);
        setEditingResource(null);
      } else {
        await addDoc(collection(db, path), {
          ...resourceData,
          downloadCount: 0,
          createdAt: serverTimestamp()
        });
      }
      setNewResource({
        title: '',
        description: '',
        groupId: RESOURCE_GROUPS[0].id,
        categoryId: RESOURCE_GROUPS[0].categories[0].id,
        fileUrl: '',
        textContent: '',
        fileType: 'pdf',
        accessLevel: 'member',
        author: '',
        tags: '',
        color: '#F27D26',
        fontFamily: 'serif',
        fontSize: 16,
        fontColor: '#000000',
        fontWeight: '400'
      });
      alert(language === 'ko' ? '처리가 완료되었습니다.' : 'Operation completed.');
    } catch (error) {
      handleFirestoreError(error, editingResource ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let file: File | null = null;
    if ('files' in e.target && (e.target as HTMLInputElement).files) {
      file = (e.target as HTMLInputElement).files![0];
    } else if ('dataTransfer' in e) {
      e.preventDefault();
      setIsDragging(false);
      file = (e as React.DragEvent).dataTransfer.files[0];
    }

    if (!file) return;

    // Basic validation
    const maxSize = 50 * 1024 * 1024; // 50MB limit
    if (file.size > maxSize) {
      alert(language === 'ko' ? '파일 크기가 너무 큽니다 (최대 50MB).' : 'File is too large (max 50MB).');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    
    console.log('Starting upload for file:', file.name, 'Size:', file.size);
    
    try {
      if (!storage) {
        console.error('Firebase Storage is not initialized!');
        throw new Error('Storage not initialized');
      }

      const storageRef = ref(storage, `resources/${Date.now()}_${file.name}`);
      console.log('Storage reference created:', storageRef.fullPath);
      
      // Use uploadBytesResumable for progress tracking
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
          console.log(`Upload progress: ${Math.round(progress)}% (${snapshot.bytesTransferred}/${snapshot.totalBytes})`);
        }, 
        (error: any) => {
          console.error('Upload error details:', error);
          let message = language === 'ko' ? '파일 업로드 중 오류가 발생했습니다.' : 'Error uploading file.';
          if (error.code === 'storage/unauthorized') {
            message = language === 'ko' ? '업로드 권한이 없습니다. (관리자 권한 확인 필요)' : 'No permission to upload. (Check admin role)';
          } else if (error.code === 'storage/canceled') {
            message = language === 'ko' ? '업로드가 취소되었습니다.' : 'Upload canceled.';
          } else if (error.code === 'storage/unknown') {
            message = language === 'ko' ? '알 수 없는 오류가 발생했습니다.' : 'Unknown storage error.';
          }
          alert(`${message}\nCode: ${error.code}\nMessage: ${error.message}`);
          setUploading(false);
        }, 
        async () => {
          try {
            console.log('Upload completed successfully. Getting download URL...');
            const url = await getDownloadURL(storageRef);
            console.log('Download URL obtained:', url);
            
            const extension = file.name.split('.').pop()?.toLowerCase();
            let fileType: 'pdf' | 'mp3' | 'image' | 'ppt' | 'word' | 'text' = 'pdf';
            if (extension === 'mp3') fileType = 'mp3';
            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) fileType = 'image';
            if (['ppt', 'pptx'].includes(extension || '')) fileType = 'ppt';
            if (['doc', 'docx'].includes(extension || '')) fileType = 'word';
            if (['txt', 'md', 'json', 'csv'].includes(extension || '')) fileType = 'text';
            
            let textContent = '';
            if (['txt', 'md', 'json', 'csv'].includes(extension || '')) {
              textContent = await file.text();
            }
            
            setNewResource(prev => ({ 
              ...prev, 
              fileUrl: url, 
              fileType,
              textContent: textContent || prev.textContent
            }));
            alert(language === 'ko' ? '파일이 업로드되었습니다.' : 'File uploaded successfully.');
          } catch (err: any) {
            console.error('Error getting download URL:', err);
            alert(`${language === 'ko' ? '다운로드 URL을 가져오는 중 오류가 발생했습니다.' : 'Error getting download URL.'} (${err.message})`);
          } finally {
            setUploading(false);
          }
        }
      );
    } catch (error: any) {
      console.error('Upload catch error:', error);
      alert(`${language === 'ko' ? '파일 업로드 중 오류가 발생했습니다.' : 'Error uploading file.'} (${error.message})`);
      setUploading(false);
    }
  };

  const handleEditResource = (res: any) => {
    setEditingResource(res);
    setNewResource({
      title: res.title,
      description: res.description,
      groupId: res.groupId,
      categoryId: res.categoryId,
      fileUrl: res.fileUrl || '',
      textContent: res.textContent || '',
      fileType: res.fileType,
      accessLevel: res.accessLevel,
      author: res.author || '',
      tags: Array.isArray(res.tags) ? res.tags.join(', ') : '',
      color: res.color || '#F27D26',
      fontFamily: res.fontFamily || 'serif',
      fontSize: res.fontSize || 16,
      fontColor: res.fontColor || '#000000',
      fontWeight: res.fontWeight || '400'
    });
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm(language === 'ko' ? '정말 삭제하시겠습니까?' : 'Are you sure you want to delete this?')) return;
    const path = 'resources';
    try {
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const seedResources = async () => {
    const path = 'resources';
    const samples = [
      // Group A: Standard & Test
      { 
        title: 'HSK 5급 필수 어휘 2500 (Part 1)', 
        description: 'HSK 5급 합격을 위한 필수 어휘 리스트와 예문. 언어학 박사가 엄선한 핵심 단어입니다.', 
        groupId: 'group-a', 
        categoryId: 'hsk', 
        fileType: 'text', 
        accessLevel: 'public', 
        textContent: `HSK 5급 필수 어휘 (1-50)

1. 哎 (āi) - [감탄사] 아이구, 어머나
2. 唉 (āi) - [감탄사] 네, 예 (대답할 때)
3. 爱护 (àihù) - [동사] 아끼고 보호하다
4. 爱惜 (àixī) - [동사] 아끼다, 소중히 여기다
5. 爱心 (àixīn) - [명사] 애심, 사랑하는 마음
6. 安慰 (ānwèi) - [동사] 위로하다
7. 安装 (ānzhuāng) - [동사] 설치하다
8. 岸 (àn) - [명사] 언덕, 기슭
9. 暗 (àn) - [형용사] 어둡다
10. 熬夜 (áoyè) - [동사] 밤을 새우다
... (중략) ...
다운로드 버튼을 눌러 전체 PDF를 확인하세요.`
      },
      { title: 'HSK 6급 핵심 요약집', description: '급수별 핵심 요약집, 최신 기출 변형 문제.', groupId: 'group-a', categoryId: 'hsk', fileType: 'pdf', accessLevel: 'member', fileUrl: 'https://example.com/hsk6_summary.pdf' },
      { title: 'HSK 5급 필수 단어 2500', description: '5급 합격을 위한 필수 어휘 리스트와 예문.', groupId: 'group-a', categoryId: 'hsk', fileType: 'pdf', accessLevel: 'public', fileUrl: 'https://example.com/hsk5_words.pdf' },
      { title: '상황별 필수 회화 100선', description: '박사님이 엄선한 상황별 필수 문장 리스트.', groupId: 'group-a', categoryId: 'conversation', fileType: 'pdf', accessLevel: 'public', fileUrl: 'https://example.com/conv100.pdf' },
      { title: '식당에서 바로 쓰는 중국어', description: '주문부터 결제까지, 식당 이용 필수 표현.', groupId: 'group-a', categoryId: 'conversation', fileType: 'pdf', accessLevel: 'member', fileUrl: 'https://example.com/restaurant_conv.pdf' },
      { title: '중국 마트 실전 표현', description: '중국 현지 마트, 병원 등에서 쓰이는 생생한 실전 표현.', groupId: 'group-a', categoryId: 'daily', fileType: 'pdf', accessLevel: 'member', fileUrl: 'https://example.com/daily_market.pdf' },
      { title: '중국 대중교통 이용 가이드', description: '지하철, 택시, 버스 이용 시 유용한 표현 모음.', groupId: 'group-a', categoryId: 'daily', fileType: 'pdf', accessLevel: 'public', fileUrl: 'https://example.com/transport_guide.pdf' },

      // Group B: Professional & Academic
      { title: 'AI 기술 트렌드 리포트', description: 'IT, AI, 공학 등 전문 분야의 중-한 대역어 및 기술 트렌드 리포트.', groupId: 'group-b', categoryId: 'science', fileType: 'pdf', accessLevel: 'premium', fileUrl: 'https://example.com/ai_tech_report.pdf' },
      { title: '중국 반도체 산업 분석', description: '최신 중국 반도체 시장 동향 및 전문 용어 정리.', groupId: 'group-b', categoryId: 'science', fileType: 'pdf', accessLevel: 'premium', fileUrl: 'https://example.com/semiconductor_china.pdf' },
      { title: '비즈니스 이메일 템플릿', description: '계약서 양식, 이메일 템플릿, 비즈니스 에티켓 가이드.', groupId: 'group-b', categoryId: 'business', fileType: 'pdf', accessLevel: 'member', fileUrl: 'https://example.com/biz_email_templates.pdf' },
      { title: '중국 비즈니스 협상 전략', description: '성공적인 비즈니스를 위한 협상 기술과 문화적 팁.', groupId: 'group-b', categoryId: 'business', fileType: 'pdf', accessLevel: 'premium', fileUrl: 'https://example.com/negotiation_strategy.pdf' },
      { title: '시사 이슈 찬반 토론 가이드', description: '찬반 논쟁이 가능한 시사 이슈 정리 및 핵심 표현.', groupId: 'group-b', categoryId: 'debate', fileType: 'pdf', accessLevel: 'premium', fileUrl: 'https://example.com/debate_guide.pdf' },
      { title: '환경 문제와 지속 가능성 토론', description: '중국의 환경 정책과 관련 시사 토론 자료.', groupId: 'group-b', categoryId: 'debate', fileType: 'pdf', accessLevel: 'member', fileUrl: 'https://example.com/env_debate.pdf' },

      // Group C: Culture & Trends
      { title: '중국 8대 요리 문화', description: '지역별 요리 특징과 식사 에티켓.', groupId: 'group-c', categoryId: 'culture', fileType: 'pdf', accessLevel: 'public', fileUrl: 'https://example.com/china_food_culture.pdf' },
      { title: '중국 명절과 전통 풍습', description: '춘절, 중추절 등 주요 명절의 유래와 현대적 변화.', groupId: 'group-c', categoryId: 'culture', fileType: 'pdf', accessLevel: 'member', fileUrl: 'https://example.com/festivals.pdf' },
      { title: '필수 사자성어 50선', description: '일상과 비즈니스에서 자주 쓰이는 고사성어.', groupId: 'group-c', categoryId: 'idioms', fileType: 'pdf', accessLevel: 'member', fileUrl: 'https://example.com/idioms_50.pdf' },
      { title: '고사성어로 배우는 중국 역사', description: '흥미로운 역사 이야기와 함께 익히는 사자성어.', groupId: 'group-c', categoryId: 'idioms', fileType: 'pdf', accessLevel: 'premium', fileUrl: 'https://example.com/history_idioms.pdf' },
      { title: '2024 중국 유행어 사전', description: 'SNS와 젊은 층 사이에서 쓰이는 최신 신조어.', groupId: 'group-c', categoryId: 'slang', fileType: 'pdf', accessLevel: 'member', fileUrl: 'https://example.com/slang_2024.pdf' },
      { title: '샤오홍슈(小红书) 마케팅 용어', description: '중국 MZ세대의 필수 앱, 샤오홍슈에서 쓰이는 용어 분석.', groupId: 'group-c', categoryId: 'slang', fileType: 'pdf', accessLevel: 'premium', fileUrl: 'https://example.com/xiaohongshu_terms.pdf' },
    ];

    try {
      for (const res of samples) {
        await addDoc(collection(db, path), {
          ...res,
          downloadCount: 0,
          createdAt: serverTimestamp()
        });
      }
      alert(language === 'ko' ? `샘플 자료 ${samples.length}개가 성공적으로 등록되었습니다.` : `Successfully seeded ${samples.length} sample resources.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const submitCommunityReply = async (postId: string) => {
    const reply = replyText[postId];
    if (!reply) return;
    const path = 'community';
    try {
      await updateDoc(doc(db, path, postId), { reply });
      setReplyText(prev => ({ ...prev, [postId]: '' }));
      alert(language === 'ko' ? '답변이 등록되었습니다.' : 'Reply has been registered.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const [isFullScreen, setIsFullScreen] = useState(false);

  const applyStyle = (command: string, value?: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    if (command === 'fontName') {
      document.execCommand('fontName', false, value);
    } else if (command === 'fontSize') {
      // execCommand fontSize is 1-7, which is limited. 
      // Better to wrap in span with style.
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.style.fontSize = value + 'px';
      range.surroundContents(span);
    } else if (command === 'foreColor') {
      document.execCommand('foreColor', false, value);
    } else if (command === 'bold') {
      document.execCommand('bold', false);
    } else if (command === 'fontWeight') {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.style.fontWeight = value || 'normal';
      range.surroundContents(span);
    }
    
    // Update state from contentEditable
    const editor = document.getElementById('rich-text-editor');
    if (editor) {
      setNewResource(prev => ({ ...prev, textContent: editor.innerHTML }));
    }
  };

  const handleEditPost = async (postId: string) => {
    const path = 'community';
    try {
      await updateDoc(doc(db, path, postId), {
        title: editPostData.title,
        content: editPostData.content,
        updatedAt: serverTimestamp()
      });
      setEditingPost(null);
      alert(language === 'ko' ? '게시글이 수정되었습니다.' : 'Post updated.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  if (loading) return <div className="py-20 text-center font-serif italic opacity-50">{t.community.loading}</div>;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto px-6 py-20 space-y-12"
    >
      <div className="flex flex-col md:flex-row justify-between items-end gap-8">
        <div className="space-y-4">
          <span className="text-gold text-[10px] uppercase tracking-[0.4em]">{t.admin.title}</span>
          <h2 className="text-5xl font-serif font-light">{t.nav.systemName}</h2>
        </div>
        <div className="flex bg-ink/5 p-1 rounded-2xl">
          {(['reservations', 'resources', 'community', 'inquiries', 'users', 'stats'] as const).map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-2 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all",
                activeTab === tab ? "bg-ink text-paper shadow-lg" : "opacity-40 hover:opacity-100"
              )}
            >
              {tab === 'inquiries' ? (language === 'ko' ? '수강 문의' : 'Inquiries') : (t.admin[tab] || tab)}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="flex flex-wrap gap-4 p-6 bg-gold/5 border border-gold/10 rounded-3xl">
        <button 
          onClick={() => { setActiveTab('resources'); setEditingResource(null); setNewResource({ title: '', description: '', groupId: RESOURCE_GROUPS[0].id, categoryId: RESOURCE_GROUPS[0].categories[0].id, fileUrl: '', textContent: '', fileType: 'pdf', accessLevel: 'member', author: '', tags: '', color: '#F27D26', fontFamily: 'serif', fontSize: 16, fontColor: '#000000', fontWeight: '400' }); }}
          className="flex items-center gap-2 px-6 py-3 bg-ink text-paper rounded-xl text-[10px] uppercase tracking-widest font-bold hover:bg-gold transition-all"
        >
          <Upload size={14} />
          {language === 'ko' ? '신규 자료 업로드' : 'Upload New Resource'}
        </button>
        <button 
          onClick={() => setActiveTab('resources')}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-ink/10 text-ink rounded-xl text-[10px] uppercase tracking-widest font-bold hover:border-gold transition-all"
        >
          <Edit size={14} />
          {language === 'ko' ? '자료 수정/관리' : 'Edit/Manage Resources'}
        </button>
        <button 
          onClick={() => setActiveTab('reservations')}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-ink/10 text-ink rounded-xl text-[10px] uppercase tracking-widest font-bold hover:border-gold transition-all"
        >
          <Calendar size={14} />
          {language === 'ko' ? '예약 현황 수정' : 'Edit Reservations'}
        </button>
        <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-ink/5">
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-50">AI Studio Access</span>
          <select 
            value={siteContent['ai-studio-access']?.access || 'admin'}
            onChange={async (e) => {
              const path = 'siteContent';
              await setDoc(doc(db, path, 'ai-studio-access'), { access: e.target.value }, { merge: true });
            }}
            className="text-[10px] p-1 border rounded bg-transparent font-bold"
          >
            <option value="admin">Admin Only</option>
            <option value="premium">Premium & Admin</option>
            <option value="member">Members & Admin</option>
            <option value="all">Everyone</option>
          </select>
        </div>
        <div className="flex-grow" />
          <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-ink/5">
            <span className="text-[10px] uppercase tracking-widest font-bold opacity-50">Event Discount</span>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                min="0" 
                max="100"
                value={Math.round((siteContent['event-discount']?.discountRate ?? 0.20) * 100)}
                onChange={async (e) => {
                  const path = 'siteContent';
                  const rate = parseFloat(e.target.value) / 100;
                  await setDoc(doc(db, path, 'event-discount'), { ...siteContent['event-discount'], discountRate: rate }, { merge: true });
                }}
                className="w-12 text-[10px] p-1 border rounded text-center"
              />
              <span className="text-[10px] font-bold">%</span>
            </div>
            <div className="h-4 w-px bg-ink/10 mx-2" />
            <span className="text-[10px] uppercase tracking-widest font-bold opacity-50">Period</span>
            <input 
              type="date" 
              value={siteContent['event-discount']?.startDate || ''}
              onChange={async (e) => {
                const path = 'siteContent';
                await setDoc(doc(db, path, 'event-discount'), { ...siteContent['event-discount'], startDate: e.target.value }, { merge: true });
              }}
              className="text-[10px] p-1 border rounded"
            />
            <span className="text-[10px] opacity-30">to</span>
            <input 
              type="date" 
              value={siteContent['event-discount']?.endDate || ''}
              onChange={async (e) => {
                const path = 'siteContent';
                await setDoc(doc(db, path, 'event-discount'), { ...siteContent['event-discount'], endDate: e.target.value }, { merge: true });
              }}
              className="text-[10px] p-1 border rounded"
            />
          </div>
      </div>

      {activeTab === 'reservations' && (
        <div className="space-y-12">
          {COURSES.map(course => {
            const courseReservations = reservations.filter(r => r.courseId === course.id);
            if (courseReservations.length === 0) return null;
            return (
              <div key={course.id} className="space-y-6">
                <div className="flex items-center gap-4 border-b border-ink/10 pb-4">
                  <div className="w-10 h-10 bg-gold text-ink rounded-xl flex items-center justify-center font-serif font-bold">
                    {course.id.toUpperCase()}
                  </div>
                  <h3 className="text-2xl font-serif">{course.title}</h3>
                  <span className="text-[10px] bg-ink/5 px-3 py-1 rounded-full opacity-50">{courseReservations.length} Reservations</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {courseReservations.map(res => {
                    const student = users.find(u => u.uid === res.studentUid);
                    return (
                      <div key={res.id} className="p-8 border border-ink/10 rounded-3xl bg-white space-y-6 hover:shadow-lg transition-all">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-ink/5">
                              <img src={student?.photoURL || "https://i.pravatar.cc/100"} alt="Profile" referrerPolicy="no-referrer" />
                            </div>
                            <div>
                              <p className="font-bold">{student?.displayName || student?.email || 'Unknown Student'}</p>
                              <p className="text-[10px] uppercase tracking-widest opacity-50">{student?.email}</p>
                            </div>
                          </div>
                          <div className={cn(
                            "px-3 py-1 text-[8px] uppercase tracking-widest rounded-full font-bold",
                            res.status === 'confirmed' ? "bg-green-100 text-green-700" : 
                            res.status === 'completed' ? "bg-blue-100 text-blue-700" : "bg-gold/20 text-gold"
                          )}>
                            {res.status}
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 items-center">
                          <select 
                            value={res.courseId}
                            onChange={async (e) => {
                              const path = 'reservations';
                              try {
                                await updateDoc(doc(db, path, res.id), { courseId: e.target.value });
                              } catch (error) {
                                handleFirestoreError(error, OperationType.UPDATE, path);
                              }
                            }}
                            className="px-4 py-2 border border-ink/10 rounded-xl text-[10px] uppercase tracking-widest bg-paper font-bold"
                          >
                            {COURSES.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                          </select>
                          <select 
                            value={res.level}
                            onChange={async (e) => {
                              const path = 'reservations';
                              try {
                                await updateDoc(doc(db, path, res.id), { level: e.target.value });
                              } catch (error) {
                                handleFirestoreError(error, OperationType.UPDATE, path);
                              }
                            }}
                            className="px-4 py-2 border border-ink/10 rounded-xl text-[10px] uppercase tracking-widest bg-paper font-bold"
                          >
                            {['intro', 'beginner', 'intermediate', 'advanced', 'expert'].map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                          <select 
                            value={res.status}
                            onChange={(e) => updateStatus(res.id, e.target.value)}
                            className="px-4 py-2 border border-ink/10 rounded-xl text-xs uppercase tracking-widest bg-paper"
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                          </select>
                          <button 
                            onClick={async () => {
                              if (!confirm(language === 'ko' ? '정말 삭제하시겠습니까?' : 'Are you sure you want to delete this reservation?')) return;
                              const path = 'reservations';
                              try {
                                await deleteDoc(doc(db, path, res.id));
                              } catch (error) {
                                handleFirestoreError(error, OperationType.DELETE, path);
                              }
                            }}
                            className="p-2 text-ink/20 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 py-4 border-t border-ink/5">
                          <div>
                            <p className="text-[10px] uppercase tracking-widest opacity-50 mb-1">Schedule</p>
                            <p className="text-sm">{res.durationWeeks}주 / 주 {res.sessionsPerWeek}회 / {res.sessionDuration}시간</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-widest opacity-50 mb-1">Price</p>
                            <p className="text-sm font-bold text-gold">₩{res.totalPrice.toLocaleString()}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-[10px] uppercase tracking-widest opacity-50 mb-1">Preferred Times</p>
                            <div className="flex flex-wrap gap-1">
                              {res.preferredSlots?.map((s: string) => (
                                <span key={s} className="text-[8px] bg-ink/5 px-1.5 py-0.5 rounded-full">{s}</span>
                              )) || <span className="text-xs opacity-30 italic">None</span>}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-ink/5">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] uppercase tracking-widest opacity-50">{t.admin.feedback}</label>
                            {feedbacks.find(f => f.reservationId === res.id) && (
                              <span className="text-[8px] uppercase tracking-widest text-gold font-bold">
                                {language === 'ko' ? '기존 피드백 있음' : 'Existing Feedback'}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-4">
                            <textarea 
                              value={feedbackText[res.id] !== undefined ? feedbackText[res.id] : (feedbacks.find(f => f.reservationId === res.id)?.content || '')}
                              onChange={(e) => setFeedbackText(prev => ({ ...prev, [res.id]: e.target.value }))}
                              placeholder={language === 'ko' ? "수강생에게 전달할 피드백을 입력하세요..." : "Enter feedback for the student..."}
                              className="flex-grow p-4 border border-ink/10 rounded-2xl text-sm bg-paper/50 focus:border-gold outline-none transition-colors"
                              rows={2}
                            />
                            <button 
                              onClick={() => submitFeedback(res.id, res.studentUid)}
                              className="px-6 py-4 bg-ink text-paper rounded-2xl text-[10px] uppercase tracking-widest hover:bg-gold transition-colors self-end"
                            >
                              {feedbacks.find(f => f.reservationId === res.id) ? (language === 'ko' ? '수정' : 'Update') : t.community.submit}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {reservations.length === 0 && (
            <div className="py-20 text-center opacity-30 italic">No reservations found.</div>
          )}
        </div>
      )}

      {activeTab === 'resources' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Upload Form */}
          <div className="md:col-span-1 space-y-8">
            <div className="p-8 border border-ink/10 rounded-3xl bg-white space-y-6 sticky top-32 max-h-[80vh] overflow-y-auto pr-2">
              <div className="flex justify-between items-center">
              <h3 className="text-xl font-serif">{editingResource ? (language === 'ko' ? '자료 수정' : 'Edit Resource') : t.admin.upload}</h3>
              {editingResource && (
                <button 
                  onClick={() => {
                    setEditingResource(null);
                    setNewResource({
                      title: '',
                      description: '',
                      groupId: RESOURCE_GROUPS[0].id,
                      categoryId: RESOURCE_GROUPS[0].categories[0].id,
                      fileUrl: '',
                      textContent: '',
                      fileType: 'pdf',
                      accessLevel: 'member',
                      author: '',
                      tags: '',
                      color: '#F27D26',
                      fontFamily: 'serif',
                      fontSize: 16,
                      fontColor: '#000000',
                      fontWeight: '400'
                    });
                  }}
                  className="text-xs text-gold underline"
                >
                  {language === 'ko' ? '취소' : 'Cancel'}
                </button>
              )}
            </div>
              <form onSubmit={handleCreateResource} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest opacity-50">{t.community.titleLabel}</label>
                  <input 
                    type="text" required
                    value={newResource.title}
                    onChange={(e) => setNewResource(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full p-3 bg-ink/5 border border-ink/10 rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest opacity-50">{t.community.contentLabel}</label>
                  <textarea 
                    required
                    value={newResource.description}
                    onChange={(e) => setNewResource(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-3 bg-ink/5 border border-ink/10 rounded-xl text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest opacity-50">Group</label>
                    <select 
                      value={newResource.groupId}
                      onChange={(e) => setNewResource(prev => ({ ...prev, groupId: e.target.value, categoryId: RESOURCE_GROUPS.find(g => g.id === e.target.value)?.categories[0].id || '' }))}
                      className="w-full p-3 bg-ink/5 border border-ink/10 rounded-xl text-xs"
                    >
                      {RESOURCE_GROUPS.map(g => <option key={g.id} value={g.id}>{g.name.split(':')[0]}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest opacity-50">Category</label>
                    <select 
                      value={newResource.categoryId}
                      onChange={(e) => setNewResource(prev => ({ ...prev, categoryId: e.target.value }))}
                      className="w-full p-3 bg-ink/5 border border-ink/10 rounded-xl text-xs"
                    >
                      {RESOURCE_GROUPS.find(g => g.id === newResource.groupId)?.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest opacity-50">File Type</label>
                    <select 
                      value={newResource.fileType}
                      onChange={(e) => setNewResource(prev => ({ ...prev, fileType: e.target.value as any }))}
                      className="w-full p-3 bg-ink/5 border border-ink/10 rounded-xl text-xs"
                    >
                      <option value="pdf">PDF</option>
                      <option value="mp3">MP3</option>
                      <option value="image">Image</option>
                      <option value="ppt">PPT / PowerPoint</option>
                      <option value="word">Word / Document</option>
                      <option value="text">Text / Content</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest opacity-50">Access</label>
                    <select 
                      value={newResource.accessLevel}
                      onChange={(e) => setNewResource(prev => ({ ...prev, accessLevel: e.target.value as any }))}
                      className="w-full p-3 bg-ink/5 border border-ink/10 rounded-xl text-xs"
                    >
                      <option value="public">Public</option>
                      <option value="member">Member</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest opacity-50">Author</label>
                    <input 
                      type="text"
                      value={newResource.author}
                      onChange={(e) => setNewResource(prev => ({ ...prev, author: e.target.value }))}
                      className="w-full p-3 bg-ink/5 border border-ink/10 rounded-xl text-sm"
                      placeholder="Dr. L.C.L"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest opacity-50">Card Color</label>
                    <div className="flex gap-2">
                      <input 
                        type="color"
                        value={newResource.color}
                        onChange={(e) => setNewResource(prev => ({ ...prev, color: e.target.value }))}
                        className="w-10 h-10 p-0 border-none bg-transparent cursor-pointer"
                      />
                      <input 
                        type="text"
                        value={newResource.color}
                        onChange={(e) => setNewResource(prev => ({ ...prev, color: e.target.value }))}
                        className="flex-grow p-3 bg-ink/5 border border-ink/10 rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest opacity-50">Tags (comma-separated)</label>
                  <input 
                    type="text"
                    value={newResource.tags}
                    onChange={(e) => setNewResource(prev => ({ ...prev, tags: e.target.value }))}
                    className="w-full p-3 bg-ink/5 border border-ink/10 rounded-xl text-sm"
                    placeholder="HSK, Vocabulary, PDF"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest opacity-50">Text Content (Optional for Text type)</label>
                  <textarea 
                    value={newResource.textContent}
                    onChange={(e) => setNewResource(prev => ({ ...prev, textContent: e.target.value }))}
                    className="w-full p-3 bg-ink/5 border border-ink/10 rounded-xl text-sm min-h-[100px]"
                    placeholder="Attach text content here..."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest opacity-50">File URL</label>
                    <input 
                      type="url"
                      value={newResource.fileUrl}
                      onChange={(e) => setNewResource(prev => ({ ...prev, fileUrl: e.target.value }))}
                      placeholder="https://..."
                      className="w-full p-3 bg-ink/5 border border-ink/10 rounded-xl text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest opacity-50">{language === 'ko' ? '파일 직접 업로드' : 'Upload File Directly'}</label>
                    <div 
                      className="relative"
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleFileUpload}
                    >
                      <input 
                        type="file" 
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="hidden"
                        id="file-upload"
                      />
                      <label 
                        htmlFor="file-upload"
                        className={`flex flex-col items-center justify-center gap-2 w-full p-6 bg-ink/5 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${isDragging ? 'border-gold bg-gold/5 scale-[1.02]' : 'border-ink/10 hover:border-gold/50'} ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {uploading ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                            <span className="text-[10px] font-bold text-gold">{Math.round(uploadProgress)}%</span>
                          </div>
                        ) : (
                          <>
                            <Upload size={24} className={isDragging ? 'text-gold' : 'opacity-40'} />
                            <div className="text-center">
                              <p className="text-xs font-medium">{language === 'ko' ? '클릭하거나 파일을 여기로 끌어다 놓으세요' : 'Click or drag file here'}</p>
                              <p className="text-[10px] opacity-40 mt-1">PDF, MP3, Image, PPT, Word</p>
                            </div>
                          </>
                        )}
                      </label>
                    </div>
                    {newResource.fileUrl && newResource.fileType === 'image' && (
                      <div className="mt-4 relative group">
                        <img src={newResource.fileUrl} alt="Preview" className="w-full h-32 object-cover rounded-xl border border-ink/10" referrerPolicy="no-referrer" />
                        <button 
                          type="button"
                          onClick={() => setNewResource(prev => ({ ...prev, fileUrl: '' }))}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <button type="submit" className="w-full py-4 bg-ink text-paper rounded-xl text-xs uppercase tracking-widest hover:bg-gold transition-colors">
                  {editingResource ? (language === 'ko' ? '수정 완료' : 'Update Resource') : t.admin.upload}
                </button>
              </form>
            </div>
          </div>

          {/* Resource List */}
          <div className="md:col-span-2 space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-serif">{t.admin.list}</h3>
              <button 
                onClick={seedResources}
                className="px-4 py-2 bg-gold/10 text-gold border border-gold/20 rounded-xl text-[10px] uppercase tracking-widest font-bold hover:bg-gold hover:text-ink transition-all"
              >
                {t.admin.seed}
              </button>
            </div>
            {resources.map(res => (
              <div key={res.id} className="p-6 border border-ink/10 rounded-3xl bg-white flex items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg"
                    style={{ backgroundColor: res.color || '#F27D26' }}
                  >
                    {res.fileType === 'pdf' && <FileText size={20} />}
                    {res.fileType === 'mp3' && <Music size={20} />}
                    {res.fileType === 'image' && <ImageIcon size={20} />}
                    {res.fileType === 'ppt' && <FileText size={20} />}
                    {res.fileType === 'word' && <FileText size={20} />}
                    {res.fileType === 'text' && <FileText size={20} />}
                  </div>
                  <div>
                    <h4 className="font-bold">{res.title}</h4>
                    <p className="text-[10px] uppercase tracking-widest opacity-50">
                      {RESOURCE_GROUPS.find(g => g.id === res.groupId)?.name.split(':')[0]} / {res.categoryId}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs font-bold">{res.downloadCount || 0}</p>
                    <p className="text-[8px] uppercase tracking-widest opacity-40">Downloads</p>
                  </div>
                  <button 
                    onClick={() => handleEditResource(res)}
                    className="p-2 text-ink/20 hover:text-gold transition-colors"
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={() => handleDeleteResource(res.id)}
                    className="p-2 text-ink/20 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'community' && (
        <div className="space-y-8">
          {communityPosts.map(post => (
            <div key={post.id} className="p-8 border border-ink/10 rounded-3xl bg-white space-y-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold",
                      post.type === 'request' ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                    )}>
                      {post.type}
                    </span>
                    {editingPost === post.id ? (
                      <input 
                        type="text"
                        value={editPostData.title}
                        onChange={(e) => setEditPostData(prev => ({ ...prev, title: e.target.value }))}
                        className="text-xl font-bold p-2 border border-ink/10 rounded-xl w-full"
                      />
                    ) : (
                      <h3 className="text-xl font-bold">{post.title}</h3>
                    )}
                  </div>
                  <p className="text-[10px] uppercase tracking-widest opacity-40">{post.userName} • {post.createdAt?.toDate().toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      if (editingPost === post.id) {
                        handleEditPost(post.id);
                      } else {
                        setEditingPost(post.id);
                        setEditPostData({ title: post.title, content: post.content });
                      }
                    }}
                    className="p-2 text-ink/20 hover:text-gold transition-colors"
                  >
                    {editingPost === post.id ? <Check size={18} /> : <Edit size={18} />}
                  </button>
                  {editingPost === post.id && (
                    <button 
                      onClick={() => setEditingPost(null)}
                      className="p-2 text-ink/20 hover:text-gold transition-colors"
                    >
                      <Plus className="rotate-45" size={18} />
                    </button>
                  )}
                  <button 
                    onClick={async () => {
                      if (confirm(language === 'ko' ? '정말 삭제하시겠습니까?' : 'Are you sure you want to delete this post?')) {
                        try {
                          await deleteDoc(doc(db, 'community', post.id));
                        } catch (error) {
                          handleFirestoreError(error, OperationType.DELETE, 'community');
                        }
                      }
                    }}
                    className="p-2 text-ink/20 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              {editingPost === post.id ? (
                <textarea 
                  value={editPostData.content}
                  onChange={(e) => setEditPostData(prev => ({ ...prev, content: e.target.value }))}
                  className="text-sm opacity-70 leading-relaxed w-full p-4 border border-ink/10 rounded-2xl h-32"
                />
              ) : (
                <p className="text-sm opacity-70 leading-relaxed">{post.content}</p>
              )}
              
              <div className="space-y-4 pt-6 border-t border-ink/5">
                <label className="text-[10px] uppercase tracking-widest opacity-50">답변 작성</label>
                <div className="flex gap-4">
                  <textarea 
                    value={replyText[post.id] !== undefined ? replyText[post.id] : (post.reply || '')}
                    onChange={(e) => setReplyText(prev => ({ ...prev, [post.id]: e.target.value }))}
                    placeholder="답변을 입력하세요..."
                    className="flex-grow p-4 border border-ink/10 rounded-2xl text-sm bg-paper/50 focus:border-gold outline-none transition-colors"
                    rows={2}
                  />
                  <button 
                    onClick={() => submitCommunityReply(post.id)}
                    className="px-6 py-4 bg-ink text-paper rounded-2xl text-[10px] uppercase tracking-widest hover:bg-gold transition-colors self-end"
                  >
                    {post.reply ? (language === 'ko' ? '수정' : 'Update') : t.admin.reply}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {users.map(u => (
              <div key={u.id} className="p-6 border border-ink/10 rounded-3xl bg-white flex items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-ink/5">
                    <img src={u.photoURL || "https://i.pravatar.cc/100"} alt="Profile" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <h4 className="font-bold">{u.displayName || u.email}</h4>
                    <p className="text-[10px] uppercase tracking-widest opacity-50">{u.email} • {u.uid}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <select 
                    value={u.role}
                    onChange={async (e) => {
                      const path = 'users';
                      try {
                        await updateDoc(doc(db, path, u.id), { role: e.target.value });
                        alert(language === 'ko' ? '권한이 변경되었습니다.' : 'Role updated.');
                      } catch (error) {
                        handleFirestoreError(error, OperationType.UPDATE, path);
                      }
                    }}
                    className="px-4 py-2 border border-ink/10 rounded-xl text-[10px] uppercase tracking-widest bg-paper font-bold"
                  >
                    <option value="student">Student</option>
                    <option value="member">Member</option>
                    <option value="premium">Premium</option>
                    <option value="admin">Admin</option>
                  </select>
                  <div className={cn(
                    "px-3 py-1 text-[8px] uppercase tracking-widest rounded-full font-bold",
                    u.role === 'admin' ? "bg-gold/20 text-gold" : "bg-ink/5 text-ink/40"
                  )}>
                    {u.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'inquiries' && (
        <div className="space-y-12">
          {editingInquiry ? (
            <div className="p-8 border border-ink/10 rounded-3xl bg-white space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-serif">Edit Inquiry</h3>
                <button onClick={() => setEditingInquiry(null)} className="text-xs text-gold underline">Cancel</button>
              </div>
              <form onSubmit={handleUpdateInquiry} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest opacity-50">Name</label>
                    <input 
                      value={inquiryForm.name || ''} 
                      onChange={e => setInquiryForm({...inquiryForm, name: e.target.value})}
                      className="w-full bg-ink/5 border border-ink/10 rounded-xl p-3 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest opacity-50">Contact</label>
                    <input 
                      value={inquiryForm.contact || ''} 
                      onChange={e => setInquiryForm({...inquiryForm, contact: e.target.value})}
                      className="w-full bg-ink/5 border border-ink/10 rounded-xl p-3 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest opacity-50">History</label>
                  <textarea 
                    value={inquiryForm.history || ''} 
                    onChange={e => setInquiryForm({...inquiryForm, history: e.target.value})}
                    className="w-full bg-ink/5 border border-ink/10 rounded-xl p-3 text-sm h-32"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest opacity-50">Concerns</label>
                  <textarea 
                    value={inquiryForm.concerns || ''} 
                    onChange={e => setInquiryForm({...inquiryForm, concerns: e.target.value})}
                    className="w-full bg-ink/5 border border-ink/10 rounded-xl p-3 text-sm h-32"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest opacity-50">Desired Class</label>
                    <input 
                      value={inquiryForm.desiredClass || ''} 
                      onChange={e => setInquiryForm({...inquiryForm, desiredClass: e.target.value})}
                      className="w-full bg-ink/5 border border-ink/10 rounded-xl p-3 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest opacity-50">Duration (Weeks)</label>
                    <input 
                      type="number"
                      value={inquiryForm.duration || ''} 
                      onChange={e => setInquiryForm({...inquiryForm, duration: e.target.value})}
                      className="w-full bg-ink/5 border border-ink/10 rounded-xl p-3 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest opacity-50">Hours (per Session)</label>
                    <input 
                      type="number"
                      step="0.5"
                      value={inquiryForm.desiredHours || ''} 
                      onChange={e => setInquiryForm({...inquiryForm, desiredHours: e.target.value})}
                      className="w-full bg-ink/5 border border-ink/10 rounded-xl p-3 text-sm"
                    />
                  </div>
                </div>
                <button type="submit" className="w-full py-4 bg-ink text-paper rounded-xl text-xs uppercase tracking-widest hover:bg-gold transition-colors">
                  Save Changes
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-12">
              {COURSES.concat([{ id: 'custom', title: '1:1 Custom / Other', category: 'Conversation', description: '', levels: [] }]).map(course => {
                const courseInquiries = inquiries.filter(inq => {
                  const desired = Array.isArray(inq.desiredClass) ? inq.desiredClass : [inq.desiredClass];
                  return desired.some((d: string) => d.toLowerCase().includes(course.id.toLowerCase()) || d.toLowerCase().includes(course.title.toLowerCase()));
                });
                if (courseInquiries.length === 0) return null;
                return (
                  <div key={course.id} className="space-y-6">
                    <div className="flex items-center gap-4 border-b border-ink/10 pb-4">
                      <h3 className="text-2xl font-serif">{course.title}</h3>
                      <span className="text-[10px] bg-ink/5 px-3 py-1 rounded-full opacity-50">{courseInquiries.length} Inquiries</span>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                      {courseInquiries.map(inq => (
                        <div key={inq.id} className="p-8 border border-ink/10 rounded-3xl bg-white space-y-6">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <h4 className="text-xl font-bold">{inq.name}</h4>
                              <p className="text-sm text-gold font-bold">{inq.contact}</p>
                              <p className="text-[10px] opacity-40 uppercase tracking-widest">
                                {inq.createdAt?.toDate ? inq.createdAt.toDate().toLocaleString() : 'Just now'}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <div className="px-3 py-1 bg-gold/10 text-gold rounded-full text-[10px] font-bold uppercase tracking-widest">
                                {inq.desiredWeeks}{t.pricing.weeks} / {inq.desiredHours || 1}{language === 'ko' ? '시간' : 'h'}
                              </div>
                              <div className="px-3 py-1 bg-ink/5 text-ink/40 rounded-full text-[10px] font-bold uppercase tracking-widest">
                                ₩{inq.priceInfo?.discountedPrice?.toLocaleString()}
                              </div>
                              <button 
                                onClick={() => handleEditInquiry(inq)}
                                className="p-2 text-ink/20 hover:text-gold transition-colors"
                              >
                                <Edit size={18} />
                              </button>
                              <button 
                                onClick={() => handleDeleteInquiry(inq.id)}
                                className="p-2 text-ink/20 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-ink/5">
                            <div className="space-y-2">
                              <p className="text-[10px] uppercase tracking-widest opacity-50">Learning History</p>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{inq.history}</p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] uppercase tracking-widest opacity-50">Level & Concerns</p>
                              <div className="flex flex-wrap gap-2">
                                {Array.isArray(inq.levelConcerns) ? inq.levelConcerns.map((item: string, idx: number) => (
                                  <span key={idx} className="px-3 py-1 bg-ink/5 rounded-full text-[10px]">{item}</span>
                                )) : <span className="px-3 py-1 bg-ink/5 rounded-full text-[10px]">{inq.concerns}</span>}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] uppercase tracking-widest opacity-50">Desired Class</p>
                              <div className="flex flex-wrap gap-2">
                                {Array.isArray(inq.desiredClass) ? inq.desiredClass.map((item: string, idx: number) => (
                                  <span key={idx} className="px-3 py-1 bg-gold/10 text-gold rounded-full text-[10px] font-bold">{item}</span>
                                )) : <span className="px-3 py-1 bg-gold/10 text-gold rounded-full text-[10px] font-bold">{inq.desiredClass}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {inquiries.filter(inq => {
                const desired = Array.isArray(inq.desiredClass) ? inq.desiredClass : [inq.desiredClass];
                return !desired.some((d: string) => COURSES.some(c => d.toLowerCase().includes(c.id.toLowerCase()) || d.toLowerCase().includes(c.title.toLowerCase())) || d.toLowerCase().includes('custom'));
              }).length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 border-b border-ink/10 pb-4">
                    <h3 className="text-2xl font-serif">Uncategorized Inquiries</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    {inquiries.filter(inq => {
                      const desired = Array.isArray(inq.desiredClass) ? inq.desiredClass : [inq.desiredClass];
                      return !desired.some((d: string) => COURSES.some(c => d.toLowerCase().includes(c.id.toLowerCase()) || d.toLowerCase().includes(c.title.toLowerCase())) || d.toLowerCase().includes('custom'));
                    }).map(inq => (
                      <div key={inq.id} className="p-8 border border-ink/10 rounded-3xl bg-white space-y-6">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <h4 className="text-xl font-bold">{inq.name}</h4>
                            <p className="text-sm text-gold font-bold">{inq.contact}</p>
                            <p className="text-[10px] opacity-40 uppercase tracking-widest">
                              {inq.createdAt?.toDate ? inq.createdAt.toDate().toLocaleString() : 'Just now'}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <div className="px-3 py-1 bg-gold/10 text-gold rounded-full text-[10px] font-bold uppercase tracking-widest">
                              {inq.desiredWeeks}{t.pricing.weeks} / {inq.desiredHours || 1}{language === 'ko' ? '시간' : 'h'}
                            </div>
                            <div className="px-3 py-1 bg-ink/5 text-ink/40 rounded-full text-[10px] font-bold uppercase tracking-widest">
                              ₩{inq.priceInfo?.discountedPrice?.toLocaleString()}
                            </div>
                            <button 
                              onClick={() => handleEditInquiry(inq)}
                              className="p-2 text-ink/20 hover:text-gold transition-colors"
                            >
                              <Edit size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteInquiry(inq.id)}
                              className="p-2 text-ink/20 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-ink/5">
                          <div className="space-y-2">
                            <p className="text-[10px] uppercase tracking-widest opacity-50">Learning History</p>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{inq.history}</p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] uppercase tracking-widest opacity-50">Level & Concerns</p>
                            <div className="flex flex-wrap gap-2">
                              {Array.isArray(inq.levelConcerns) ? inq.levelConcerns.map((item: string, idx: number) => (
                                <span key={idx} className="px-3 py-1 bg-ink/5 rounded-full text-[10px]">{item}</span>
                              )) : <span className="px-3 py-1 bg-ink/5 rounded-full text-[10px]">{inq.concerns}</span>}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] uppercase tracking-widest opacity-50">Desired Class</p>
                            <div className="flex flex-wrap gap-2">
                              {Array.isArray(inq.desiredClass) ? inq.desiredClass.map((item: string, idx: number) => (
                                <span key={idx} className="px-3 py-1 bg-gold/10 text-gold rounded-full text-[10px] font-bold">{item}</span>
                              )) : <span className="px-3 py-1 bg-gold/10 text-gold rounded-full text-[10px] font-bold">{inq.desiredClass}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {inquiries.length === 0 && (
                <div className="py-20 text-center opacity-30 italic">No inquiries found.</div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 border border-ink/10 rounded-3xl bg-white space-y-4">
            <BarChart3 className="text-gold" size={32} />
            <h4 className="text-[10px] uppercase tracking-widest opacity-50">{t.admin.totalDownloads}</h4>
            <p className="text-4xl font-serif">{downloads.length}</p>
          </div>
          <div className="p-8 border border-ink/10 rounded-3xl bg-white space-y-4">
            <Users className="text-gold" size={32} />
            <h4 className="text-[10px] uppercase tracking-widest opacity-50">{t.admin.activeStudents}</h4>
            <p className="text-4xl font-serif">{users.length}</p>
          </div>
          <div className="p-8 border border-ink/10 rounded-3xl bg-white space-y-4">
            <FileText className="text-gold" size={32} />
            <h4 className="text-[10px] uppercase tracking-widest opacity-50">{t.admin.totalResources}</h4>
            <p className="text-4xl font-serif">{resources.length}</p>
          </div>

          <div className="md:col-span-3 p-8 border border-ink/10 rounded-3xl bg-white space-y-8">
            <h3 className="text-xl font-serif">{t.admin.recentDownloads}</h3>
            <div className="space-y-4">
              {downloads.slice(0, 10).map(dl => {
                const user = users.find(u => u.uid === dl.userUid);
                const resource = resources.find(r => r.id === dl.resourceId);
                return (
                  <div key={dl.id} className="flex justify-between items-center py-3 border-b border-ink/5">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-ink/5">
                        <img src={user?.photoURL || "https://i.pravatar.cc/100"} alt="User" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{user?.displayName || user?.email}</p>
                        <p className="text-[10px] opacity-40">{dl.timestamp?.toDate().toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold">{resource?.title}</p>
                      <p className="text-[8px] uppercase tracking-widest opacity-40">{resource?.fileType}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

const MyPageView: FC = () => {
  const [reservations, setReservations] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const resPath = 'reservations';
    const qRes = query(
      collection(db, resPath), 
      where('studentUid', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubRes = onSnapshot(qRes, (snapshot) => {
      setReservations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, resPath);
    });

    const feedPath = 'feedback';
    const qFeed = query(
      collection(db, feedPath),
      where('studentUid', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubFeed = onSnapshot(qFeed, (snapshot) => {
      setFeedbacks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, feedPath);
    });

    return () => {
      unsubRes();
      unsubFeed();
    };
  }, []);

  const activeRes = reservations.find(r => r.status === 'pending' || r.status === 'confirmed');

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto px-6 py-20 space-y-20"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <span className="text-gold text-[10px] uppercase tracking-[0.4em]">Student Dashboard</span>
          <h2 className="text-5xl font-serif font-light">나의 학습 현황</h2>
        </div>
        <div className="flex items-center gap-4 p-4 bg-ink/5 rounded-2xl">
          <div className="w-12 h-12 rounded-full overflow-hidden">
            <img src={auth.currentUser?.photoURL || "https://i.pravatar.cc/100?img=12"} alt="Profile" referrerPolicy="no-referrer" />
          </div>
          <div>
            <p className="text-sm font-bold">{auth.currentUser?.displayName || auth.currentUser?.email}</p>
            <p className="text-[10px] uppercase tracking-widest opacity-50">Premium Student</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          {activeRes ? (
            <div className="p-8 border border-ink/10 rounded-3xl space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-serif">현재 수강 중인 과정</h3>
                <span className="px-3 py-1 bg-gold/20 text-gold text-[10px] uppercase tracking-widest rounded-full font-bold">
                  {activeRes.status.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-8">
                <div className="w-20 h-20 bg-ink text-paper rounded-2xl flex items-center justify-center font-serif text-3xl">
                  {activeRes.courseId.toUpperCase()}
                </div>
                <div className="space-y-2">
                  <h4 className="text-xl font-serif">{COURSES.find(c => c.id === activeRes.courseId)?.title} ({activeRes.level})</h4>
                  <p className="text-sm opacity-60">{activeRes.durationWeeks}주 패키지 / {activeRes.sessionsPerWeek}회 세션</p>
                  <div className="w-64 h-1 bg-ink/10 rounded-full overflow-hidden">
                    <div className="w-1/3 h-full bg-gold" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 border border-dashed border-ink/20 rounded-3xl text-center space-y-4">
              <p className="opacity-50 font-serif italic">현재 수강 중인 과정이 없습니다.</p>
              <button 
                onClick={() => window.location.href = '#curriculum'}
                className="text-xs uppercase tracking-widest text-gold font-bold"
              >
                Browse Courses
              </button>
            </div>
          )}

          <div className="space-y-6">
            <h3 className="text-2xl font-serif">박사님의 학습 피드백</h3>
            {feedbacks.length > 0 ? feedbacks.map((f, i) => (
              <div key={f.id} className="p-8 bg-ink/5 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest opacity-50">Feedback</span>
                  <span className="text-[10px] opacity-40">{f.createdAt?.toDate().toLocaleDateString()}</span>
                </div>
                <p className="text-sm leading-relaxed italic opacity-80">
                  "{f.content}"
                </p>
              </div>
            )) : (
              <p className="text-sm opacity-40 italic">아직 도착한 피드백이 없습니다.</p>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="p-8 bg-ink text-paper rounded-3xl space-y-8">
            <h3 className="text-2xl font-serif">수업 스케줄</h3>
            <div className="space-y-6">
              {activeRes ? (
                <div className="space-y-6">
                  {activeRes.preferredSlots && activeRes.preferredSlots.length > 0 && (
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase tracking-widest opacity-50">희망 시간대</label>
                      <div className="flex flex-wrap gap-2">
                        {activeRes.preferredSlots.map((s: string) => (
                          <span key={s} className="px-3 py-1 bg-paper/10 text-paper text-[10px] uppercase tracking-widest rounded-full border border-paper/20">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-4 pt-4 border-t border-paper/10">
                    <p className="text-sm opacity-70">박사님께서 곧 연락드려 상세 일정을 확정할 예정입니다.</p>
                    <div className="flex items-center gap-4 opacity-50">
                      <Clock size={16} />
                      <span className="text-xs uppercase tracking-widest">Waiting for confirmation</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm opacity-40 italic">예약된 수업이 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const ArchiveView: FC<{ initialFilter?: { groupId: string | null, categoryId: string | null }, onClearFilter?: () => void, language: LanguageCode, isAdmin: boolean }> = ({ initialFilter, onClearFilter, language, isAdmin }) => {
  const t = TRANSLATIONS[language];
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(initialFilter?.groupId || null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialFilter?.categoryId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResource, setSelectedResource] = useState<any | null>(null);

  // Admin Resource Form State
  const [isManaging, setIsManaging] = useState(false);
  const [editingResource, setEditingResource] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [newResource, setNewResource] = useState({
    title: '',
    description: '',
    groupId: RESOURCE_GROUPS[0].id,
    categoryId: RESOURCE_GROUPS[0].categories[0].id,
    fileUrl: '',
    textContent: '',
    fileType: 'pdf' as 'pdf' | 'mp3' | 'image' | 'ppt' | 'word' | 'text',
    accessLevel: 'member' as 'public' | 'member' | 'premium',
    author: '',
    tags: '',
    color: '#F27D26',
    fontFamily: 'serif',
    fontSize: 16,
    fontColor: '#000000',
    fontWeight: '400'
  });

  const [isFullScreen, setIsFullScreen] = useState(false);

  const applyStyle = (command: string, value?: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    if (command === 'fontName') {
      document.execCommand('fontName', false, value);
    } else if (command === 'fontSize') {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.style.fontSize = value + 'px';
      range.surroundContents(span);
    } else if (command === 'foreColor') {
      document.execCommand('foreColor', false, value);
    } else if (command === 'bold') {
      document.execCommand('bold', false);
    } else if (command === 'fontWeight') {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.style.fontWeight = value || 'normal';
      range.surroundContents(span);
    }
    
    // Update state from contentEditable
    const editor = document.getElementById('rich-text-editor');
    if (editor) {
      setNewResource(prev => ({ ...prev, textContent: editor.innerHTML }));
    }
  };

  useEffect(() => {
    if (initialFilter) {
      setSelectedGroup(initialFilter.groupId);
      setSelectedCategory(initialFilter.categoryId);
    }
  }, [initialFilter]);
  useEffect(() => {
    const path = 'resources';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Archive fetch error:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredResources = resources.filter(res => {
    const matchesGroup = !selectedGroup || res.groupId === selectedGroup;
    const matchesCategory = !selectedCategory || res.categoryId === selectedCategory;
    const matchesSearch = !searchQuery || res.title.toLowerCase().includes(searchQuery.toLowerCase()) || res.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGroup && matchesCategory && matchesSearch;
  });

  const handleDownloadFormat = async (resource: any, format: 'pdf' | 'docx' | 'png' | 'txt') => {
    if (!auth.currentUser) {
      alert(language === 'ko' ? '로그인이 필요한 서비스입니다.' : 'Login is required.');
      loginWithGoogle().catch(console.error);
      return;
    }

    const title = resource.title.replace(/\s+/g, '_');
    const content = resource.textContent || resource.description;

    try {
      if (format === 'txt') {
        const blob = new Blob([content], { type: 'text/plain' });
        saveAs(blob, `${title}.txt`);
      } else if (format === 'pdf') {
        const doc = new jsPDF();
        const splitText = doc.splitTextToSize(content, 180);
        doc.text(splitText, 10, 10);
        doc.save(`${title}.pdf`);
      } else if (format === 'docx') {
        const doc = new Document({
          sections: [{
            properties: {},
            children: [
              new Paragraph({
                children: [
                  new TextRun(content),
                ],
              }),
            ],
          }],
        });
        const blob = await Packer.toBlob(doc);
        saveAs(blob, `${title}.docx`);
      } else if (format === 'png') {
        const element = document.getElementById('resource-text-preview');
        if (element) {
          const canvas = await html2canvas(element);
          canvas.toBlob((blob) => {
            if (blob) saveAs(blob, `${title}.png`);
          });
        }
      }

      await updateDoc(doc(db, 'resources', resource.id), {
        downloadCount: (resource.downloadCount || 0) + 1
      });
    } catch (error) {
      console.error('Download error:', error);
      alert('Download failed.');
    }
  };

  const handleDownload = async (resource: any) => {
    if (!auth.currentUser) {
      alert(language === 'ko' ? '로그인이 필요한 서비스입니다.' : 'Login is required.');
      loginWithGoogle().catch(console.error);
      return;
    }
    
    const downloadPath = 'downloads';
    try {
      await updateDoc(doc(db, 'resources', resource.id), {
        downloadCount: (resource.downloadCount || 0) + 1
      });
      
      if (resource.fileUrl) {
        window.open(resource.fileUrl, '_blank');
      } else if (resource.textContent) {
        // Download text content as a file if no fileUrl exists
        const blob = new Blob([resource.textContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${resource.title.replace(/\s+/g, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert(language === 'ko' ? '다운로드할 수 있는 파일이 없습니다.' : 'No file available for download.');
      }
      
      await addDoc(collection(db, downloadPath), {
        resourceId: resource.id,
        userUid: auth.currentUser.uid,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, downloadPath);
    }
  };

  const handleCreateResource = async (e: FormEvent) => {
    e.preventDefault();
    const path = 'resources';
    const resourceData = {
      ...newResource,
      tags: newResource.tags.split(',').map(t => t.trim()).filter(Boolean),
      updatedAt: serverTimestamp()
    };
    try {
      if (editingResource) {
        await updateDoc(doc(db, path, editingResource.id), resourceData);
        setEditingResource(null);
      } else {
        await addDoc(collection(db, path), {
          ...resourceData,
          downloadCount: 0,
          createdAt: serverTimestamp()
        });
      }
      setNewResource({
        title: '',
        description: '',
        groupId: RESOURCE_GROUPS[0].id,
        categoryId: RESOURCE_GROUPS[0].categories[0].id,
        fileUrl: '',
        textContent: '',
        fileType: 'pdf',
        accessLevel: 'member',
        author: '',
        tags: '',
        color: '#F27D26',
        fontFamily: 'serif',
        fontSize: 16,
        fontColor: '#000000',
        fontWeight: '400'
      });
      setIsManaging(false);
      alert(language === 'ko' ? '처리가 완료되었습니다.' : 'Operation completed.');
    } catch (error) {
      handleFirestoreError(error, editingResource ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let file: File | null = null;
    if ('files' in e.target && (e.target as HTMLInputElement).files) {
      file = (e.target as HTMLInputElement).files![0];
    } else if ('dataTransfer' in e) {
      e.preventDefault();
      setIsDragging(false);
      file = (e as React.DragEvent).dataTransfer.files[0];
    }

    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    console.log('Starting upload for file (Archive):', file.name, 'Size:', file.size);
    
    try {
      if (!storage) {
        console.error('Firebase Storage is not initialized!');
        throw new Error('Storage not initialized');
      }

      const storageRef = ref(storage, `resources/${Date.now()}_${file.name}`);
      console.log('Storage reference created (Archive):', storageRef.fullPath);
      
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
          console.log(`Upload progress (Archive): ${Math.round(progress)}%`);
        }, 
        (error: any) => {
          console.error('Upload error details (Archive):', error);
          let message = language === 'ko' ? '파일 업로드 중 오류가 발생했습니다.' : 'Error uploading file.';
          if (error.code === 'storage/unauthorized') {
            message = language === 'ko' ? '업로드 권한이 없습니다. (관리자 권한 확인 필요)' : 'No permission to upload. (Check admin role)';
          }
          alert(`${message}\nCode: ${error.code}\nMessage: ${error.message}`);
          setUploading(false);
        }, 
        async () => {
          try {
            console.log('Upload completed (Archive). Getting download URL...');
            const url = await getDownloadURL(storageRef);
            console.log('Download URL obtained (Archive):', url);
            
            const extension = file.name.split('.').pop()?.toLowerCase();
            let fileType: 'pdf' | 'mp3' | 'image' | 'ppt' | 'word' | 'text' = 'pdf';
            if (extension === 'mp3') fileType = 'mp3';
            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) fileType = 'image';
            if (['ppt', 'pptx'].includes(extension || '')) fileType = 'ppt';
            if (['doc', 'docx'].includes(extension || '')) fileType = 'word';
            if (['txt', 'md', 'json', 'csv'].includes(extension || '')) fileType = 'text';
            
            let textContent = '';
            if (['txt', 'md', 'json', 'csv'].includes(extension || '')) {
              textContent = await file.text();
            }
            
            setNewResource(prev => ({ 
              ...prev, 
              fileUrl: url, 
              fileType,
              textContent: textContent || prev.textContent 
            }));
            alert(language === 'ko' ? '파일이 업로드되었습니다.' : 'File uploaded successfully.');
          } catch (err: any) {
            console.error('Error getting download URL (Archive):', err);
            alert(`${language === 'ko' ? '다운로드 URL을 가져오는 중 오류가 발생했습니다.' : 'Error getting download URL.'} (${err.message})`);
          } finally {
            setUploading(false);
          }
        }
      );
    } catch (error: any) {
      console.error('Upload catch error (Archive):', error);
      alert(`${language === 'ko' ? '파일 업로드 중 오류가 발생했습니다.' : 'Error uploading file.'} (${error.message})`);
      setUploading(false);
    }
  };

  const handleEditResource = (res: any) => {
    setEditingResource(res);
    setNewResource({
      title: res.title,
      description: res.description,
      groupId: res.groupId,
      categoryId: res.categoryId,
      fileUrl: res.fileUrl || '',
      textContent: res.textContent || '',
      fileType: res.fileType,
      accessLevel: res.accessLevel,
      author: res.author || '',
      tags: Array.isArray(res.tags) ? res.tags.join(', ') : '',
      color: res.color || '#F27D26',
      fontFamily: res.fontFamily || 'serif',
      fontSize: res.fontSize || 16,
      fontColor: res.fontColor || '#000000',
      fontWeight: res.fontWeight || '400'
    });
    setIsManaging(true);
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm(language === 'ko' ? '정말 삭제하시겠습니까?' : 'Are you sure you want to delete this?')) return;
    const path = 'resources';
    try {
      await deleteDoc(doc(db, path, id));
      if (selectedResource?.id === id) setSelectedResource(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const relatedResources = selectedResource 
    ? resources.filter(r => r.id !== selectedResource.id && r.categoryId === selectedResource.categoryId).slice(0, 3)
    : [];

  if (loading) return <div className="py-20 text-center font-serif italic opacity-50">Loading Archive...</div>;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto px-6 py-20 space-y-16"
    >
      <div className="text-center space-y-4">
        <span className="text-gold text-[10px] uppercase tracking-[0.4em]">L.C.L Archive</span>
        <h2 className="text-5xl font-serif font-light">{t.archive.title}</h2>
        <p className="max-w-3xl mx-auto opacity-60 font-serif italic leading-relaxed">
          {t.archive.subtitle}
        </p>
      </div>

      {/* Category Hub */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {RESOURCE_GROUPS.map((group) => (
          <motion.div 
            key={group.id}
            className={cn(
              "p-8 rounded-[40px] border transition-all space-y-8",
              selectedGroup === group.id 
                ? "bg-ink text-paper border-ink shadow-2xl scale-[1.02]" 
                : "bg-white border-ink/5 hover:border-gold/30"
            )}
          >
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center",
                  selectedGroup === group.id ? "bg-gold text-ink" : "bg-gold/10 text-gold"
                )}>
                  {group.id === 'group-a' && <BookOpen size={24} />}
                  {group.id === 'group-b' && <GraduationCap size={24} />}
                  {group.id === 'group-c' && <Globe size={24} />}
                </div>
                <button 
                  onClick={() => {
                    setSelectedGroup(selectedGroup === group.id ? null : group.id);
                    setSelectedCategory(null);
                  }}
                  className={cn(
                    "text-[10px] uppercase tracking-widest font-bold px-4 py-2 rounded-full border transition-all",
                    selectedGroup === group.id 
                      ? "border-paper/20 bg-paper/10 text-paper" 
                      : "border-ink/10 text-ink/40"
                  )}
                >
                  {selectedGroup === group.id ? 'Deselect' : 'Select Group'}
                </button>
              </div>
              <div>
                <h3 className="text-2xl font-serif">{group.name.split(':')[1]?.trim() || group.name}</h3>
                <p className={cn(
                  "text-[10px] uppercase tracking-widest font-bold",
                  selectedGroup === group.id ? "text-gold" : "text-gold/60"
                )}>{group.name.split(':')[0]}</p>
              </div>
              <p className="text-sm opacity-60 leading-relaxed">{group.description}</p>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {group.categories.map((cat) => (
                <button 
                  key={cat.id}
                  onClick={() => {
                    setSelectedGroup(group.id);
                    setSelectedCategory(selectedCategory === cat.id ? null : cat.id);
                  }}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl transition-all group/item",
                    selectedCategory === cat.id
                      ? "bg-gold text-ink"
                      : selectedGroup === group.id
                        ? "bg-paper/10 hover:bg-paper/20 text-paper"
                        : "bg-paper hover:bg-ink/5 text-ink"
                  )}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{cat.name}</span>
                    <ArrowRight size={14} className={cn(
                      "transition-all",
                      selectedCategory === cat.id ? "opacity-100" : "opacity-0 group-hover/item:opacity-100 -translate-x-2 group-hover/item:translate-x-0"
                    )} />
                  </div>
                  <p className={cn(
                    "text-[10px] mt-1",
                    selectedCategory === cat.id ? "text-ink/60" : "opacity-40"
                  )}>{cat.description}</p>
                </button>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search and Results */}
      <div className="space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 border-b border-ink/10 pb-8">
          <div className="space-y-1">
            <h3 className="text-2xl font-serif">{t.archive.title}</h3>
            <p className="text-xs opacity-50 uppercase tracking-widest">
              {filteredResources.length} {language === 'ko' ? '개의 자료를 찾았습니다' : 'Resources Found'}
              {(selectedGroup || selectedCategory || searchQuery) && (language === 'ko' ? " (필터 적용됨)" : " (Filtered)")}
            </p>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            {isAdmin && (
              <button 
                onClick={() => { setEditingResource(null); setIsManaging(true); }}
                className="flex items-center gap-2 px-6 py-4 bg-ink text-paper rounded-full text-xs uppercase tracking-widest hover:bg-ink/90 transition-all shadow-lg shadow-ink/10"
              >
                <Plus size={16} />
                {language === 'ko' ? '자료 추가' : 'Add Resource'}
              </button>
            )}
            <div className="relative flex-grow md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={18} />
              <input 
                type="text" 
                placeholder={t.archive.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-white border border-ink/10 rounded-full text-sm focus:outline-none focus:border-gold transition-all"
              />
            </div>
          </div>
        </div>

        {/* Resource Grid */}
        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.length > 0 ? filteredResources.map(res => (
            <motion.div 
              key={res.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => {
                if (!auth.currentUser) {
                  alert(language === 'ko' ? '로그인이 필요한 서비스입니다.' : 'Login is required.');
                  loginWithGoogle().catch(console.error);
                  return;
                }
                setSelectedResource(res);
              }}
              className="p-6 border border-ink/10 rounded-2xl bg-white space-y-4 flex flex-col hover:shadow-xl hover:shadow-ink/5 transition-all group cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
                  style={{ backgroundColor: res.color || '#F27D26' }}
                >
                  {res.fileType === 'pdf' && <FileText size={20} />}
                  {res.fileType === 'mp3' && <Music size={20} />}
                  {res.fileType === 'image' && <ImageIcon size={20} />}
                  {res.fileType === 'ppt' && <FileText size={20} />}
                  {res.fileType === 'word' && <FileText size={20} />}
                  {res.fileType === 'text' && <FileText size={20} />}
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEditResource(res); }}
                        className="p-2 hover:bg-ink/5 rounded-full text-ink/40 hover:text-ink transition-colors"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteResource(res.id); }}
                        className="p-2 hover:bg-red-50 rounded-full text-ink/40 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                  <span className={cn(
                    "text-[8px] uppercase tracking-widest px-2 py-1 rounded-full font-bold",
                    res.accessLevel === 'premium' ? "bg-gold/20 text-gold" : "bg-ink/5 text-ink/40"
                  )}>
                    {res.accessLevel === 'public' ? t.archive.access.public : res.accessLevel === 'member' ? t.archive.access.member : t.archive.access.premium}
                  </span>
                </div>
              </div>
              <div className="space-y-2 flex-grow">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg leading-tight">{res.title}</h3>
                  {res.author && <span className="text-[10px] opacity-40 font-serif italic">by {res.author}</span>}
                </div>
                <p className="text-xs opacity-50 line-clamp-2">{res.description}</p>
                {res.tags && res.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {res.tags.map((tag: string) => (
                      <span key={tag} className="text-[8px] px-1.5 py-0.5 bg-ink/5 rounded text-ink/40">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="pt-4 border-t border-ink/5 flex items-center justify-between">
                <div className="flex items-center gap-2 opacity-30 text-[10px]">
                  <Download size={12} />
                  <span>{res.downloadCount || 0}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold group-hover:text-gold transition-colors">
                  {language === 'ko' ? '상세보기' : 'View Details'} <ChevronRight size={12} />
                </div>
              </div>
            </motion.div>
          )) : (
            <div className="col-span-full py-20 text-center space-y-4 opacity-30">
              <FileText size={48} className="mx-auto" />
              <p className="font-serif italic">{language === 'ko' ? '해당 카테고리에 등록된 자료가 없습니다.' : 'No resources found in this category.'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Admin Resource Management Modal */}
      <AnimatePresence>
        {isManaging && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-ink/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-paper w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 md:p-12 space-y-8 overflow-y-auto flex-grow scrollbar-hide">
                <div className="flex justify-between items-center">
                  <h3 className="text-3xl font-serif italic">
                    {editingResource ? (language === 'ko' ? '자료 수정' : 'Edit Resource') : (language === 'ko' ? '새 자료 추가' : 'Add New Resource')}
                  </h3>
                  <button onClick={() => setIsManaging(false)} className="p-2 hover:bg-ink/5 rounded-full transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleCreateResource} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest opacity-50">Title</label>
                      <input 
                        type="text" required
                        value={newResource.title}
                        onChange={(e) => setNewResource(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full p-4 bg-ink/5 border border-ink/10 rounded-2xl text-sm focus:outline-none focus:border-gold transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest opacity-50">Description</label>
                      <textarea 
                        required
                        value={newResource.description}
                        onChange={(e) => setNewResource(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full p-4 bg-ink/5 border border-ink/10 rounded-2xl text-sm min-h-[100px] focus:outline-none focus:border-gold transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest opacity-50">Author</label>
                        <input 
                          type="text"
                          value={newResource.author}
                          onChange={(e) => setNewResource(prev => ({ ...prev, author: e.target.value }))}
                          className="w-full p-4 bg-ink/5 border border-ink/10 rounded-2xl text-sm focus:outline-none focus:border-gold transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest opacity-50">Tags</label>
                        <input 
                          type="text"
                          value={newResource.tags}
                          onChange={(e) => setNewResource(prev => ({ ...prev, tags: e.target.value }))}
                          className="w-full p-4 bg-ink/5 border border-ink/10 rounded-2xl text-sm focus:outline-none focus:border-gold transition-all"
                          placeholder="HSK, PDF, etc."
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest opacity-50">Group</label>
                        <select 
                          value={newResource.groupId}
                          onChange={(e) => {
                            const gid = e.target.value;
                            const group = RESOURCE_GROUPS.find(g => g.id === gid);
                            setNewResource(prev => ({ 
                              ...prev, 
                              groupId: gid, 
                              categoryId: group?.categories[0].id || '' 
                            }));
                          }}
                          className="w-full p-4 bg-ink/5 border border-ink/10 rounded-2xl text-sm focus:outline-none focus:border-gold transition-all"
                        >
                          {RESOURCE_GROUPS.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest opacity-50">Category</label>
                        <select 
                          value={newResource.categoryId}
                          onChange={(e) => setNewResource(prev => ({ ...prev, categoryId: e.target.value }))}
                          className="w-full p-4 bg-ink/5 border border-ink/10 rounded-2xl text-sm focus:outline-none focus:border-gold transition-all"
                        >
                          {RESOURCE_GROUPS.find(g => g.id === newResource.groupId)?.categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest opacity-50">File Type</label>
                        <select 
                          value={newResource.fileType}
                          onChange={(e) => setNewResource(prev => ({ ...prev, fileType: e.target.value as any }))}
                          className="w-full p-4 bg-ink/5 border border-ink/10 rounded-2xl text-sm focus:outline-none focus:border-gold transition-all"
                        >
                          <option value="pdf">PDF</option>
                          <option value="mp3">MP3</option>
                          <option value="image">Image</option>
                          <option value="ppt">PPT / PowerPoint</option>
                          <option value="word">Word / Document</option>
                          <option value="text">Text / Content</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest opacity-50">Access Level</label>
                        <select 
                          value={newResource.accessLevel}
                          onChange={(e) => setNewResource(prev => ({ ...prev, accessLevel: e.target.value as any }))}
                          className="w-full p-4 bg-ink/5 border border-ink/10 rounded-2xl text-sm focus:outline-none focus:border-gold transition-all"
                        >
                          <option value="public">Public</option>
                          <option value="member">Member</option>
                          <option value="premium">Premium</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest opacity-50">Color Theme</label>
                      <div className="flex gap-2">
                        <input 
                          type="color"
                          value={newResource.color}
                          onChange={(e) => setNewResource(prev => ({ ...prev, color: e.target.value }))}
                          className="w-12 h-12 p-1 bg-ink/5 border border-ink/10 rounded-xl cursor-pointer"
                        />
                        <input 
                          type="text"
                          value={newResource.color}
                          onChange={(e) => setNewResource(prev => ({ ...prev, color: e.target.value }))}
                          className="flex-grow p-4 bg-ink/5 border border-ink/10 rounded-2xl text-sm font-mono focus:outline-none focus:border-gold transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest opacity-50">Text Content (Rich Editor)</label>
                      <div className="bg-white border border-ink/10 rounded-2xl overflow-hidden">
                        <div className="flex flex-wrap gap-1 p-2 bg-ink/5 border-b border-ink/10">
                          <select 
                            onChange={(e) => applyStyle('fontName', e.target.value)}
                            className="p-1 text-[10px] bg-white border border-ink/10 rounded"
                          >
                            <option value="">Font</option>
                            <option value="serif">Serif</option>
                            <option value="sans-serif">Sans Serif</option>
                            <option value="monospace">Monospace</option>
                            <option value="Batang">Batang</option>
                            <option value="SimHei">SimHei</option>
                            <option value="SimSun">SimSun</option>
                          </select>
                          <select 
                            onChange={(e) => applyStyle('fontSize', e.target.value)}
                            className="p-1 text-[10px] bg-white border border-ink/10 rounded"
                          >
                            <option value="">Size</option>
                            {[10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72, 96].map(s => (
                              <option key={s} value={s}>{s}px</option>
                            ))}
                          </select>
                          <input 
                            type="color" 
                            onChange={(e) => applyStyle('foreColor', e.target.value)}
                            className="w-6 h-6 p-0 border-none bg-transparent cursor-pointer"
                            title="Text Color"
                          />
                          <button 
                            type="button"
                            onClick={() => applyStyle('bold')}
                            className="px-2 py-1 text-[10px] font-bold bg-white border border-ink/10 rounded hover:bg-gold/10"
                          >
                            B
                          </button>
                          <select 
                            onChange={(e) => applyStyle('fontWeight', e.target.value)}
                            className="p-1 text-[10px] bg-white border border-ink/10 rounded"
                          >
                            <option value="">Weight</option>
                            <option value="100">100</option>
                            <option value="400">400</option>
                            <option value="700">700</option>
                            <option value="900">900</option>
                          </select>
                        </div>
                        <div 
                          id="rich-text-editor"
                          contentEditable
                          onInput={(e) => setNewResource(prev => ({ ...prev, textContent: e.currentTarget.innerHTML }))}
                          className="w-full p-4 text-sm min-h-[200px] focus:outline-none bg-white"
                          dangerouslySetInnerHTML={{ __html: newResource.textContent }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest opacity-50">File URL / Drag & Drop Upload</label>
                      <div className="flex flex-col gap-3">
                        <input 
                          type="url"
                          value={newResource.fileUrl}
                          onChange={(e) => setNewResource(prev => ({ ...prev, fileUrl: e.target.value }))}
                          className="w-full p-4 bg-ink/5 border border-ink/10 rounded-2xl text-sm focus:outline-none focus:border-gold transition-all"
                          placeholder="https://..."
                        />
                        <div 
                          className="relative"
                          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={handleFileUpload}
                        >
                          <input 
                            type="file" 
                            onChange={handleFileUpload}
                            disabled={uploading}
                            className="hidden"
                            id="archive-file-upload"
                          />
                          <label 
                            htmlFor="archive-file-upload"
                            className={cn(
                              "w-full p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 transition-all cursor-pointer",
                              isDragging ? "border-gold bg-gold/5 scale-[1.01]" : "border-ink/10 bg-ink/5 hover:border-gold/50",
                              uploading && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            {uploading ? (
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                                <span className="text-xs font-bold text-gold">{Math.round(uploadProgress)}%</span>
                              </div>
                            ) : (
                              <>
                                <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center text-gold">
                                  <Upload size={24} />
                                </div>
                                <div className="text-center">
                                  <p className="text-sm font-medium">{language === 'ko' ? '파일을 여기로 끌어다 놓거나 클릭하세요' : 'Drag & drop file here or click'}</p>
                                  <p className="text-[10px] opacity-40 mt-1">PDF, MP3, Image, PPT, Word</p>
                                </div>
                              </>
                            )}
                          </label>
                        </div>
                        {newResource.fileUrl && newResource.fileType === 'image' && (
                          <div className="mt-4 relative group">
                            <img src={newResource.fileUrl} alt="Preview" className="w-full h-40 object-cover rounded-2xl border border-ink/10" referrerPolicy="no-referrer" />
                            <button 
                              type="button"
                              onClick={() => setNewResource(prev => ({ ...prev, fileUrl: '' }))}
                              className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-xl"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-4 bg-ink text-paper rounded-2xl font-bold uppercase tracking-widest hover:bg-ink/90 transition-all shadow-xl shadow-ink/10"
                  >
                    {editingResource ? (language === 'ko' ? '수정 완료' : 'Update Resource') : (language === 'ko' ? '자료 등록' : 'Create Resource')}
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resource Detail Modal */}
      <AnimatePresence>
        {selectedResource && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-ink/60 backdrop-blur-sm"
            onClick={() => setSelectedResource(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ 
                scale: 1, 
                opacity: 1, 
                y: 0,
                width: isFullScreen ? '100vw' : '95%',
                maxWidth: isFullScreen ? '100vw' : '64rem',
                height: isFullScreen ? '100vh' : 'auto',
                maxHeight: isFullScreen ? '100vh' : '85vh',
                borderRadius: isFullScreen ? '0px' : '32px'
              }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={cn(
                "bg-paper shadow-2xl overflow-hidden flex flex-col md:flex-row relative transition-all duration-500",
                isFullScreen ? "fixed inset-0 z-[110]" : ""
              )}
              onClick={e => e.stopPropagation()}
            >
              {/* Full Screen Toggle & External Link */}
              <div className="absolute top-6 right-20 z-20 flex gap-3">
                {selectedResource.fileUrl && (
                  <button 
                    onClick={() => window.open(selectedResource.fileUrl, '_blank')}
                    className="p-3 bg-white/90 backdrop-blur-sm border border-ink/10 rounded-full hover:border-gold hover:text-gold transition-all shadow-lg"
                    title={language === 'ko' ? '새 창에서 열기' : 'Open in New Window'}
                  >
                    <ExternalLink size={18} />
                  </button>
                )}
                <button 
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="p-3 bg-white/90 backdrop-blur-sm border border-ink/10 rounded-full hover:border-gold hover:text-gold transition-all shadow-lg"
                  title={isFullScreen ? "Minimize" : "Maximize"}
                >
                  {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
              </div>
              {/* Left: Preview/Info */}
              <div className="flex-grow p-8 md:p-12 space-y-8 overflow-y-auto">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gold text-ink flex items-center justify-center">
                        {selectedResource.fileType === 'pdf' && <FileText size={20} />}
                        {selectedResource.fileType === 'mp3' && <Music size={20} />}
                        {selectedResource.fileType === 'image' && <ImageIcon size={20} />}
                        {selectedResource.fileType === 'ppt' && <FileText size={20} />}
                        {selectedResource.fileType === 'word' && <FileText size={20} />}
                        {selectedResource.fileType === 'text' && <FileText size={20} />}
                      </div>
                      <span className="text-[10px] uppercase tracking-widest font-bold opacity-40">
                        {selectedResource.fileType} Resource
                      </span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-serif">{selectedResource.title}</h2>
                    {selectedResource.author && <p className="text-sm opacity-50 font-serif italic">by {selectedResource.author}</p>}
                    {selectedResource.tags && selectedResource.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {selectedResource.tags.map((tag: string) => (
                          <span key={tag} className="text-[10px] text-gold font-medium">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => setSelectedResource(null)}
                    className="p-2 hover:bg-ink/5 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Preview Section */}
                {selectedResource.fileUrl && selectedResource.fileType === 'image' && (
                  <div className="rounded-3xl overflow-hidden border border-ink/10 bg-ink/5">
                    <img 
                      src={selectedResource.fileUrl} 
                      alt={selectedResource.title} 
                      className="w-full h-auto max-h-[400px] object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="text-[10px] uppercase tracking-widest font-bold opacity-40">Description</h4>
                  <div className="text-lg font-serif italic opacity-70 leading-relaxed">
                    {selectedResource.description}
                  </div>
                </div>

                {selectedResource.textContent && (
                  <div className="space-y-4 p-6 bg-ink/5 rounded-3xl border border-ink/10 relative group/text">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] uppercase tracking-widest font-bold opacity-40">Text Content</h4>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(selectedResource.textContent);
                          alert(language === 'ko' ? '클립보드에 복사되었습니다.' : 'Copied to clipboard.');
                        }}
                        className="p-2 bg-white border border-ink/10 rounded-lg opacity-0 group-hover/text:opacity-100 transition-opacity hover:border-gold"
                        title="Copy Text"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                    <div 
                      id="resource-text-preview"
                      className={cn(
                        "text-sm whitespace-pre-wrap leading-relaxed overflow-y-auto custom-scrollbar pr-2 p-8 bg-white rounded-3xl shadow-inner transition-all duration-500",
                        isFullScreen ? "max-h-none min-h-[70vh]" : "max-h-[400px]"
                      )}
                      style={{ 
                        fontFamily: selectedResource.fontFamily || 'serif', 
                        fontSize: `${selectedResource.fontSize || 16}px`, 
                        color: selectedResource.fontColor || '#000000',
                        fontWeight: selectedResource.fontWeight || 'normal'
                      }}
                      dangerouslySetInnerHTML={{ __html: selectedResource.textContent }}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-8 border-y border-ink/5">
                  <div className="space-y-1">
                    <p className="text-[8px] uppercase tracking-widest opacity-40">Access</p>
                    <p className="text-xs font-bold uppercase">{selectedResource.accessLevel}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] uppercase tracking-widest opacity-40">Downloads</p>
                    <p className="text-xs font-bold">{selectedResource.downloadCount || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] uppercase tracking-widest opacity-40">Type</p>
                    <p className="text-xs font-bold uppercase">{selectedResource.fileType}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] uppercase tracking-widest opacity-40">Date</p>
                    <p className="text-xs font-bold">{selectedResource.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 pt-4">
                  <div className="w-full flex flex-wrap gap-2">
                    <button 
                      onClick={() => handleDownload(selectedResource)}
                      className="flex-grow md:flex-none px-6 py-4 bg-ink text-paper rounded-full text-[10px] uppercase tracking-widest font-bold hover:bg-gold hover:text-ink transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                      <Download size={14} /> {t.archive.download}
                    </button>
                    {selectedResource.textContent && (
                      <>
                        <button 
                          onClick={() => handleDownloadFormat(selectedResource, 'pdf')}
                          className="px-4 py-4 border border-ink/10 rounded-full text-[10px] uppercase tracking-widest font-bold hover:border-gold hover:text-gold transition-all"
                        >
                          PDF
                        </button>
                        <button 
                          onClick={() => handleDownloadFormat(selectedResource, 'docx')}
                          className="px-4 py-4 border border-ink/10 rounded-full text-[10px] uppercase tracking-widest font-bold hover:border-gold hover:text-gold transition-all"
                        >
                          Word / WPS
                        </button>
                        <button 
                          onClick={() => handleDownloadFormat(selectedResource, 'png')}
                          className="px-4 py-4 border border-ink/10 rounded-full text-[10px] uppercase tracking-widest font-bold hover:border-gold hover:text-gold transition-all"
                        >
                          PNG / Image
                        </button>
                      </>
                    )}
                  </div>
                  {selectedResource.fileUrl && (selectedResource.fileType === 'pdf' || selectedResource.fileType === 'ppt' || selectedResource.fileType === 'word') && (
                    <button 
                      onClick={() => {
                        if (selectedResource.fileType === 'pdf') {
                          window.open(selectedResource.fileUrl, '_blank');
                        } else {
                          // Use Google Docs Viewer for PPT and Word
                          window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(selectedResource.fileUrl)}&embedded=true`, '_blank');
                        }
                      }}
                      className="flex-grow md:flex-none px-10 py-4 border border-ink/10 rounded-full text-xs uppercase tracking-widest font-bold hover:border-ink transition-all flex items-center justify-center gap-3"
                    >
                      <ExternalLink size={16} /> {language === 'ko' ? '미리보기' : 'Preview'}
                    </button>
                  )}
                </div>
              </div>

              {/* Right: Related Content */}
              {!isFullScreen && (
                <div className="w-full md:w-80 bg-ink/5 p-8 md:p-12 space-y-8 border-l border-ink/5">
                  <h4 className="text-[10px] uppercase tracking-widest font-bold opacity-40">
                    {language === 'ko' ? '관련 자료' : 'Related Content'}
                  </h4>
                  <div className="space-y-6">
                    {relatedResources.length > 0 ? relatedResources.map(res => (
                      <button 
                        key={res.id}
                        onClick={() => setSelectedResource(res)}
                        className="w-full text-left space-y-2 group"
                      >
                        <div className="flex items-center gap-2 text-[8px] uppercase tracking-widest opacity-40 group-hover:text-gold transition-colors">
                          {res.fileType === 'pdf' && <FileText size={10} />}
                          {res.fileType === 'mp3' && <Music size={10} />}
                          {res.fileType === 'image' && <ImageIcon size={10} />}
                          {res.fileType}
                        </div>
                        <h5 className="font-bold text-sm leading-tight group-hover:text-gold transition-colors line-clamp-2">{res.title}</h5>
                      </button>
                    )) : (
                      <p className="text-xs opacity-40 italic">
                        {language === 'ko' ? '관련 자료가 없습니다.' : 'No related content found.'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const CurriculumView: FC<{ language: LanguageCode, onBook: (course: any) => void, isEditMode: boolean, siteContent: any }> = ({ language, onBook, isEditMode, siteContent }) => {
  const t = TRANSLATIONS[language];
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }}
      className="max-w-7xl mx-auto px-6 py-32"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
        <div className="space-y-4">
          <span className="text-gold text-[10px] uppercase tracking-[0.4em]">
            <EditableText contentKey="curriculum.badge" defaultValue={t.curriculum.badge} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </span>
          <h2 className="text-5xl font-serif font-light">
            <EditableText contentKey="curriculum.title" defaultValue={t.curriculum.title} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </h2>
        </div>
        <div className="max-w-xs text-sm opacity-60 font-serif italic">
          <EditableText contentKey="curriculum.subtitle" defaultValue={t.curriculum.subtitle} isEditMode={isEditMode} language={language} siteContent={siteContent} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-px bg-ink/10 border border-ink/10">
        {COURSES.map((course, idx) => (
          <motion.div 
            key={course.id}
            whileHover={{ backgroundColor: 'rgba(26, 26, 26, 0.02)' }}
            className="bg-paper p-8 space-y-8 flex flex-col h-full"
          >
            <div className="space-y-4 flex-grow">
              <div className="w-12 h-12 rounded-full border border-ink/10 flex items-center justify-center">
                {idx === 0 && <MessageSquare size={20} />}
                {idx === 1 && <GraduationCap size={20} />}
                {idx === 2 && <Star size={20} />}
                {idx === 3 && <Briefcase size={20} />}
                {idx === 4 && <Globe size={20} />}
              </div>
              <h3 className="text-2xl font-serif">{course.title}</h3>
              <p className="text-xs opacity-60 leading-relaxed">{course.description}</p>
              <div className="flex flex-wrap gap-2">
                {course.levels.map(level => (
                  <span key={level} className="text-[9px] uppercase tracking-widest px-2 py-1 bg-ink/5 rounded-sm">{level}</span>
                ))}
              </div>
            </div>
            <button 
              onClick={() => onBook(course)}
              className="group flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold hover:text-gold transition-colors"
            >
              {language === 'ko' ? '수강 신청' : t.curriculum.bookNow} <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

const PricingView: FC<{ language: LanguageCode, setView: (v: any) => void, isEditMode: boolean, siteContent: any, isEventPeriod: boolean }> = ({ language, setView, isEditMode, siteContent, isEventPeriod }) => {
  const t = TRANSLATIONS[language];
  const event = siteContent['event-discount'];
  const customRate = event?.discountRate;
  
  const weeksDiscounts = siteContent['weeks-discounts']?.rates || {};
  const levelPrices = siteContent['level-prices']?.prices || {};

  const [selectedCourse, setSelectedCourse] = useState(COURSES[0]);
  const [selectedLevel, setSelectedLevel] = useState(COURSES[0].levels[0]);
  const [selectedWeeks, setSelectedWeeks] = useState(12);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(1);
  const [selectedHours, setSelectedHours] = useState(1);

  // Update level when course changes
  useEffect(() => {
    setSelectedLevel(selectedCourse.levels[0]);
  }, [selectedCourse]);

  const priceInfo = calculatePrice(selectedLevel, selectedWeeks, sessionsPerWeek, selectedHours, isEventPeriod, customRate, weeksDiscounts, levelPrices);

  const handleUpdateDiscount = async (weeks: number, rate: number) => {
    const newRates = { ...weeksDiscounts, [weeks]: rate };
    await setDoc(doc(db, 'siteContent', 'weeks-discounts'), {
      key: 'weeks-discounts',
      rates: newRates,
      updatedAt: serverTimestamp()
    });
  };

  const handleUpdateLevelPrice = async (level: string, price: number) => {
    const newPrices = { ...levelPrices, [level]: price };
    await setDoc(doc(db, 'siteContent', 'level-prices'), {
      key: 'level-prices',
      prices: newPrices,
      updatedAt: serverTimestamp()
    });
  };

  const handleUpdateEventDiscount = async (rate: number) => {
    await setDoc(doc(db, 'siteContent', 'event-discount'), {
      key: 'event-discount',
      discountRate: rate,
      startDate: event?.startDate || new Date().toISOString().split('T')[0],
      endDate: event?.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      updatedAt: serverTimestamp()
    }, { merge: true });
  };

  const handleUpdateEventDates = async (start: string, end: string) => {
    await setDoc(doc(db, 'siteContent', 'event-discount'), {
      key: 'event-discount',
      startDate: start,
      endDate: end,
      updatedAt: serverTimestamp()
    }, { merge: true });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }}
      className="bg-ink text-paper py-32 px-6 min-h-screen"
    >
      <div className="max-w-7xl mx-auto w-full">
        <div className="text-center space-y-6 mb-20">
          <span className="text-gold text-[10px] uppercase tracking-[0.4em]">
            <EditableText contentKey="pricing.badge" defaultValue={t.pricing.badge} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </span>
          <h2 className="text-5xl font-serif font-light">
            <EditableText contentKey="pricing.title" defaultValue={t.pricing.title} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </h2>
          <div className="max-w-xl mx-auto opacity-60 font-serif italic">
            <EditableText contentKey="pricing.subtitle" defaultValue={t.pricing.subtitle} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </div>
          
          {isEventPeriod && event?.startDate && event?.endDate && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-block mt-8 px-8 py-4 border border-gold/30 rounded-3xl bg-gold/5 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gold/5 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              <p className="text-[10px] uppercase tracking-[0.3em] text-gold font-bold mb-2">
                {language === 'ko' ? '특별 할인 이벤트 기간' : 'Special Discount Event Period'}
              </p>
              <div className="flex items-center justify-center gap-3 text-lg font-serif italic text-gold">
                <span>{event.startDate}</span>
                <span className="opacity-30">/</span>
                <span>{event.endDate}</span>
              </div>
            </motion.div>
          )}
        </div>

        {isEditMode && (
          <div className="mb-20 p-8 border border-gold/20 rounded-3xl bg-gold/5 space-y-10">
            <div className="space-y-6">
              <h3 className="text-xs uppercase tracking-[0.3em] text-gold font-bold">Admin: Duration Discounts (%)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[4, 8, 10, 12].map(w => (
                  <div key={w} className="space-y-2">
                    <label className="text-[10px] opacity-50">{w} Weeks Discount</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        step="0.01"
                        value={weeksDiscounts[w] !== undefined ? weeksDiscounts[w] : (w === 4 ? 0 : w === 8 ? 0.10 : w === 10 ? 0.12 : 0.15)}
                        onChange={(e) => handleUpdateDiscount(w, parseFloat(e.target.value))}
                        className="w-full bg-ink/50 border border-gold/20 rounded-lg p-2 text-sm text-gold"
                      />
                      <span className="text-xs opacity-50">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xs uppercase tracking-[0.3em] text-gold font-bold">Admin: Level Base Prices (₩)</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.keys(LEVEL_PRICES).map(lvl => (
                  <div key={lvl} className="space-y-2">
                    <label className="text-[10px] opacity-50">{lvl}</label>
                    <input 
                      type="number" 
                      value={levelPrices[lvl] !== undefined ? levelPrices[lvl] : LEVEL_PRICES[lvl]}
                      onChange={(e) => handleUpdateLevelPrice(lvl, parseInt(e.target.value))}
                      className="w-full bg-ink/50 border border-gold/20 rounded-lg p-2 text-sm text-gold"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-gold/10">
              <h3 className="text-xs uppercase tracking-[0.3em] text-gold font-bold">Admin: Special Event Discount</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] opacity-50">Discount Rate (%)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      step="0.01"
                      value={customRate !== undefined ? customRate : 0.10}
                      onChange={(e) => handleUpdateEventDiscount(parseFloat(e.target.value))}
                      className="w-full bg-ink/50 border border-gold/20 rounded-lg p-2 text-sm text-gold"
                    />
                    <span className="text-xs opacity-50">%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] opacity-50">Start Date</label>
                  <input 
                    type="date" 
                    value={event?.startDate || ''}
                    onChange={(e) => handleUpdateEventDates(e.target.value, event?.endDate || '')}
                    className="w-full bg-ink/50 border border-gold/20 rounded-lg p-2 text-sm text-gold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] opacity-50">End Date</label>
                  <input 
                    type="date" 
                    value={event?.endDate || ''}
                    onChange={(e) => handleUpdateEventDates(event?.startDate || '', e.target.value)}
                    className="w-full bg-ink/50 border border-gold/20 rounded-lg p-2 text-sm text-gold"
                  />
                </div>
              </div>
              <p className="text-[10px] opacity-40 italic">* {language === 'ko' ? '이벤트 기간 내에만 할인이 적용됩니다.' : 'Discounts apply only during the event period.'}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Selection Panel */}
          <div className="lg:col-span-2 space-y-12">
            {/* Course Selection */}
            <div className="space-y-6">
              <h3 className="text-xs uppercase tracking-[0.3em] opacity-50">1. {language === 'ko' ? '과정 선택' : 'Select Course'}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {COURSES.slice(0, 3).map(course => (
                  <button
                    key={course.id}
                    onClick={() => setSelectedCourse(course)}
                    className={cn(
                      "p-6 rounded-2xl border transition-all text-left group",
                      selectedCourse.id === course.id ? "border-gold bg-gold/5" : "border-paper/10 hover:border-paper/30"
                    )}
                  >
                    <p className={cn("text-sm font-bold mb-1", selectedCourse.id === course.id ? "text-gold" : "opacity-80")}>{course.title}</p>
                    <p className="text-[10px] opacity-40 leading-relaxed">{course.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Level Selection */}
            <div className="space-y-6">
              <h3 className="text-xs uppercase tracking-[0.3em] opacity-50">2. {language === 'ko' ? '레벨 선택' : 'Select Level'}</h3>
              <div className="flex flex-wrap gap-3">
                {selectedCourse.levels.map(level => (
                  <button
                    key={level}
                    onClick={() => setSelectedLevel(level)}
                    className={cn(
                      "px-6 py-3 rounded-full border text-xs uppercase tracking-widest transition-all",
                      selectedLevel === level ? "bg-gold text-ink border-gold font-bold" : "border-paper/10 hover:border-paper/30"
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Duration Selection */}
              <div className="space-y-6">
                <h3 className="text-xs uppercase tracking-[0.3em] opacity-50">3. {language === 'ko' ? '기간 선택' : 'Select Duration'}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[4, 8, 10, 12].map(weeks => (
                    <button
                      key={weeks}
                      onClick={() => setSelectedWeeks(weeks)}
                      className={cn(
                        "py-4 rounded-xl border text-xs uppercase tracking-widest transition-all",
                        selectedWeeks === weeks ? "bg-gold text-ink border-gold font-bold" : "border-paper/10 hover:border-paper/30"
                      )}
                    >
                      {weeks} {t.pricing.weeks}
                      {weeksDiscounts[weeks] > 0 && (
                        <span className="block text-[8px] text-gold mt-1">-{Math.round(weeksDiscounts[weeks] * 100)}% OFF</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Frequency & Duration Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Frequency Selection */}
                <div className="space-y-6">
                  <h3 className="text-xs uppercase tracking-[0.3em] opacity-50">4. {language === 'ko' ? '수업 횟수' : 'Sessions per Week'}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2].map(num => (
                      <button
                        key={num}
                        onClick={() => setSessionsPerWeek(num)}
                        className={cn(
                          "py-4 rounded-xl border text-xs uppercase tracking-widest transition-all",
                          sessionsPerWeek === num ? "bg-gold text-ink border-gold font-bold" : "border-paper/10 hover:border-paper/30"
                        )}
                      >
                        {language === 'ko' ? `주 ${num}회` : `Weekly ${num}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Class Duration Selection */}
                <div className="space-y-6">
                  <h3 className="text-xs uppercase tracking-[0.3em] opacity-50">5. {language === 'ko' ? '수업 시간' : 'Class Duration'}</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 1.5, 2].map(h => (
                      <button
                        key={h}
                        onClick={() => setSelectedHours(h)}
                        className={cn(
                          "py-4 rounded-xl border text-xs uppercase tracking-widest transition-all",
                          selectedHours === h ? "bg-gold text-ink border-gold font-bold" : "border-paper/10 hover:border-paper/30"
                        )}
                      >
                        {h}{language === 'ko' ? '시간' : 'h'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Price Summary Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-32 p-10 border border-gold/30 rounded-3xl bg-paper/5 space-y-8">
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-[0.3em] opacity-40">{language === 'ko' ? '선택한 과정 합계' : 'Total for Selected Course'}</p>
                <h4 className="text-xl font-serif">{selectedCourse.title}</h4>
                <p className="text-xs opacity-60">{selectedLevel} / {selectedWeeks}{t.pricing.weeks} / {language === 'ko' ? `주 ${sessionsPerWeek}회` : `Weekly ${sessionsPerWeek}`} / {selectedHours}{language === 'ko' ? '시간' : 'h'}</p>
              </div>

              <div className="h-px bg-paper/10" />

              <div className="space-y-4">
                {priceInfo.isEventDiscount || priceInfo.weeksDiscountRate > 0 ? (
                  <>
                    <div className="flex justify-between items-end">
                      <span className="text-xs opacity-40">Original</span>
                      <span className="text-sm opacity-30 line-through">₩{priceInfo.originalPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-xs text-gold font-bold">Discounted</span>
                      <div className="flex items-center gap-2">
                        <span className="text-4xl font-serif text-gold">₩{priceInfo.discountedPrice.toLocaleString()}</span>
                        {isEditMode && (
                          <button 
                            onClick={() => {
                              const newPrice = prompt('Enter new base price for this level:', levelPrices[selectedLevel] || LEVEL_PRICES[selectedLevel]);
                              if (newPrice) handleUpdateLevelPrice(selectedLevel, parseInt(newPrice));
                            }}
                            className="p-1 bg-gold/10 rounded text-gold hover:bg-gold hover:text-ink transition-colors"
                          >
                            <Edit size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <span className="px-3 py-1 bg-gold/10 text-gold text-[10px] font-bold rounded-full">
                        {Math.round((1 - priceInfo.discountedPrice / priceInfo.originalPrice) * 100)}% TOTAL SAVINGS
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between items-end">
                    <span className="text-xs opacity-40">Total</span>
                    <div className="flex items-center gap-2">
                      <span className="text-4xl font-serif">₩{priceInfo.originalPrice.toLocaleString()}</span>
                      {isEditMode && (
                        <button 
                          onClick={() => {
                            const newPrice = prompt('Enter new base price for this level:', levelPrices[selectedLevel] || LEVEL_PRICES[selectedLevel]);
                            if (newPrice) handleUpdateLevelPrice(selectedLevel, parseInt(newPrice));
                          }}
                          className="p-1 bg-gold/10 rounded text-gold hover:bg-gold hover:text-ink transition-colors"
                        >
                          <Edit size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setView('inquiry')}
                className="w-full py-5 bg-gold text-ink rounded-full text-xs uppercase tracking-widest font-bold hover:scale-105 transition-transform"
              >
                {language === 'ko' ? '이 과정으로 상담 신청하기' : 'Inquire for this Course'}
              </button>

              <p className="text-[10px] opacity-30 text-center leading-relaxed">
                {language === 'ko' ? '* 최종 수강료는 상담을 통해 확정됩니다.' : '* Final tuition will be confirmed after consultation.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const InquiryView: FC<{ language: LanguageCode, onComplete: () => void, isEventPeriod: boolean, siteContent: any, isEditMode: boolean }> = ({ language, onComplete, isEventPeriod, siteContent, isEditMode }) => {
  const t = TRANSLATIONS[language];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const weeksDiscounts = siteContent['weeks-discounts']?.rates || {};
  const levelPrices = siteContent['level-prices']?.prices || {};

  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    history: '',
    levelConcerns: [] as string[],
    otherLevelConcern: '',
    goals: '',
    desiredClass: [] as string[],
    otherDesiredClass: '',
    desiredLevel: '입문',
    desiredWeeks: 12,
    desiredHours: 1,
    preferredSlots: [] as string[],
    requests: ''
  });

  const priceResult = useMemo(() => {
    const customRate = siteContent['event-discount']?.discountRate;
    return calculatePrice(formData.desiredLevel, formData.desiredWeeks, 1, formData.desiredHours, isEventPeriod, customRate, weeksDiscounts, levelPrices);
  }, [formData.desiredLevel, formData.desiredWeeks, formData.desiredHours, isEventPeriod, siteContent, weeksDiscounts, levelPrices]);

  const toggleSelection = (field: 'levelConcerns' | 'desiredClass' | 'preferredSlots', value: string) => {
    setFormData(prev => {
      const current = prev[field] as string[];
      if (field === 'desiredClass') {
        if (current.includes(value)) {
          return { ...prev, [field]: current.filter(v => v !== value) };
        }
        if (current.length >= 2) {
          alert(language === 'ko' ? '최대 2개까지 선택 가능합니다.' : 'You can select up to 2 options.');
          return prev;
        }
        return { ...prev, [field]: [...current, value] };
      }
      return {
        ...prev,
        [field]: current.includes(value) 
          ? current.filter(v => v !== value)
          : [...current, value]
      };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.contact) {
      alert(language === 'ko' ? '이름과 연락처는 필수입니다.' : 'Name and Contact are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Merge "Other" values into the arrays if they exist
      const finalLevelConcerns = [...formData.levelConcerns];
      if (formData.otherLevelConcern) {
        finalLevelConcerns.push(`Other: ${formData.otherLevelConcern}`);
      }

      const finalDesiredClass = [...formData.desiredClass];
      if (formData.otherDesiredClass && formData.desiredClass.includes('소수 그룹반')) {
        finalDesiredClass.push(`Other: ${formData.otherDesiredClass}`);
      }
      const finalDesiredLevel = formData.desiredLevel;

      await addDoc(collection(db, 'inquiries'), {
        name: formData.name,
        contact: formData.contact,
        history: formData.history,
        levelConcerns: finalLevelConcerns,
        goals: formData.goals,
        desiredClass: finalDesiredClass,
        otherDesiredClass: formData.otherDesiredClass,
        desiredLevel: finalDesiredLevel,
        desiredWeeks: formData.desiredWeeks,
        desiredHours: formData.desiredHours,
        preferredSlots: formData.preferredSlots,
        requests: formData.requests,
        priceInfo: priceResult,
        createdAt: serverTimestamp()
      });
      setIsSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'inquiries');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-8"
        >
          <Check size={40} />
        </motion.div>
        <h2 className="text-4xl font-serif mb-4">{t.inquiry.successTitle}</h2>
        <p className="text-lg opacity-60 max-w-md mx-auto">{t.inquiry.successMessage}</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto px-6 py-20"
    >
      <div className="text-center space-y-4 mb-16">
        <span className="text-gold text-[10px] uppercase tracking-[0.4em]">
          <EditableText contentKey="inquiry.badge" defaultValue={t.inquiry.badge} isEditMode={isEditMode} language={language} siteContent={siteContent} />
        </span>
        <h2 className="text-5xl font-serif font-light">
          <EditableText contentKey="inquiry.title" defaultValue={t.inquiry.title} isEditMode={isEditMode} language={language} siteContent={siteContent} />
        </h2>
        <p className="text-lg opacity-60 font-serif italic">
          <EditableText contentKey="inquiry.subtitle" defaultValue={t.inquiry.subtitle} isEditMode={isEditMode} language={language} siteContent={siteContent} />
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-12">
        {/* 1. Name */}
        <div className="space-y-4">
          <label className="text-xs uppercase tracking-widest font-bold flex items-center gap-2">
            <span className="w-6 h-6 bg-ink text-paper rounded-full flex items-center justify-center text-[10px]">1</span>
            <EditableText contentKey="inquiry.nameLabel" defaultValue={t.inquiry.nameLabel} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </label>
          <input 
            type="text"
            required
            placeholder={t.inquiry.namePlaceholder}
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full p-6 bg-ink/5 border border-ink/10 rounded-3xl focus:border-gold outline-none transition-colors text-lg"
          />
        </div>

        {/* 2. Contact */}
        <div className="space-y-4">
          <label className="text-xs uppercase tracking-widest font-bold flex items-center gap-2">
            <span className="w-6 h-6 bg-ink text-paper rounded-full flex items-center justify-center text-[10px]">2</span>
            <EditableText contentKey="inquiry.contactLabel" defaultValue={t.inquiry.contactLabel} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </label>
          <input 
            type="text"
            required
            placeholder={t.inquiry.contactPlaceholder}
            value={formData.contact}
            onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
            className="w-full p-6 bg-ink/5 border border-ink/10 rounded-3xl focus:border-gold outline-none transition-colors text-lg"
          />
        </div>

        {/* 3. History */}
        <div className="space-y-4">
          <label className="text-xs uppercase tracking-widest font-bold flex items-center gap-2">
            <span className="w-6 h-6 bg-ink text-paper rounded-full flex items-center justify-center text-[10px]">3</span>
            <EditableText contentKey="inquiry.historyLabel" defaultValue={t.inquiry.historyLabel} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </label>
          <textarea 
            placeholder={t.inquiry.historyPlaceholder}
            value={formData.history}
            onChange={(e) => setFormData(prev => ({ ...prev, history: e.target.value }))}
            className="w-full p-6 bg-ink/5 border border-ink/10 rounded-3xl focus:border-gold outline-none transition-colors text-lg min-h-[150px]"
          />
        </div>

        {/* 4. Level & Concerns */}
        <div className="space-y-6">
          <label className="text-xs uppercase tracking-widest font-bold flex items-center gap-2">
            <span className="w-6 h-6 bg-ink text-paper rounded-full flex items-center justify-center text-[10px]">4</span>
            <EditableText contentKey="inquiry.levelLabel" defaultValue={t.inquiry.levelLabel} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </label>
          <div className="grid grid-cols-1 gap-3">
            {t.inquiry.levelOptions.map((option: string) => (
              <div key={option} className="space-y-3">
                <button
                  type="button"
                  onClick={() => toggleSelection('levelConcerns', option)}
                  className={cn(
                    "w-full p-5 rounded-2xl border text-left transition-all flex items-center justify-between group",
                    formData.levelConcerns.includes(option) 
                      ? "bg-gold/10 border-gold text-gold font-bold" 
                      : "bg-paper border-ink/10 hover:border-gold/50"
                  )}
                >
                  <span className="text-sm">{option}</span>
                  <div className={cn(
                    "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                    formData.levelConcerns.includes(option) ? "bg-gold border-gold text-ink" : "border-ink/20 group-hover:border-gold"
                  )}>
                    {formData.levelConcerns.includes(option) && <Check size={12} />}
                  </div>
                </button>
                {option.includes('(') && formData.levelConcerns.includes(option) && (
                  <motion.input
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    type="text"
                    placeholder={language === 'ko' ? '직접 입력해 주세요.' : 'Please enter directly.'}
                    value={formData.otherLevelConcern}
                    onChange={(e) => setFormData(prev => ({ ...prev, otherLevelConcern: e.target.value }))}
                    className="w-full p-4 bg-white border border-gold/30 rounded-xl outline-none focus:border-gold text-sm"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 5. Goals */}
        <div className="space-y-4">
          <label className="text-xs uppercase tracking-widest font-bold flex items-center gap-2">
            <span className="w-6 h-6 bg-ink text-paper rounded-full flex items-center justify-center text-[10px]">5</span>
            <EditableText contentKey="inquiry.goalsLabel" defaultValue={t.inquiry.goalsLabel} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </label>
          <textarea 
            placeholder={t.inquiry.goalsPlaceholder}
            value={formData.goals || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, goals: e.target.value }))}
            className="w-full p-6 bg-ink/5 border border-ink/10 rounded-3xl focus:border-gold outline-none transition-colors text-lg min-h-[100px]"
          />
        </div>

        {/* 5. Desired Duration & Hours */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <label className="text-xs uppercase tracking-widest font-bold flex items-center gap-2">
              <span className="w-6 h-6 bg-ink text-paper rounded-full flex items-center justify-center text-[10px]">5</span>
              <EditableText contentKey="inquiry.durationLabel" defaultValue={language === 'ko' ? '희망 수강 기간' : 'Desired Duration'} isEditMode={isEditMode} language={language} siteContent={siteContent} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[4, 8, 10, 12].map(w => (
                <button 
                  key={w}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, desiredWeeks: w }))}
                  className={cn(
                    "py-4 border rounded-2xl text-sm transition-all",
                    formData.desiredWeeks === w ? "border-gold bg-gold/10 text-gold font-bold" : "border-ink/10 hover:border-gold/50"
                  )}
                >
                  {w}{t.pricing.weeks}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <label className="text-xs uppercase tracking-widest font-bold flex items-center gap-2">
              <span className="w-6 h-6 bg-ink text-paper rounded-full flex items-center justify-center text-[10px]">6</span>
              <EditableText contentKey="inquiry.hoursLabel" defaultValue={language === 'ko' ? '희망 수업 시간' : 'Desired Class Duration'} isEditMode={isEditMode} language={language} siteContent={siteContent} />
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[1, 1.5, 2].map(h => (
                <button 
                  key={h}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, desiredHours: h }))}
                  className={cn(
                    "py-4 border rounded-2xl text-sm transition-all",
                    formData.desiredHours === h ? "border-gold bg-gold/10 text-gold font-bold" : "border-ink/10 hover:border-gold/50"
                  )}
                >
                  {h}{language === 'ko' ? '시간' : 'h'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-8 bg-gold/5 border border-gold/20 rounded-[32px] space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-serif">{language === 'ko' ? '예상 수강료' : 'Estimated Tuition'}</h3>
            {isEventPeriod && (
              <span className="text-[10px] bg-gold text-ink px-3 py-1 rounded-full font-bold uppercase tracking-widest">
                {language === 'ko' ? '이벤트 할인 적용됨' : 'Event Discount Applied'}
              </span>
            )}
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center opacity-60">
              <span className="text-sm">{language === 'ko' ? '기본 수강료' : 'Base Tuition'}</span>
              <span className="line-through">₩{priceResult.originalPrice.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between items-center text-xs opacity-60 italic">
              <span>{formData.desiredWeeks}{t.pricing.weeks} / {formData.desiredHours}{language === 'ko' ? '시간' : 'h'}</span>
            </div>
            
            {priceResult.weeksDiscountRate > 0 && (
              <div className="flex justify-between items-center text-green-600">
                <span className="text-sm">{formData.desiredWeeks}{t.pricing.weeks} {language === 'ko' ? '장기 할인' : 'Duration Discount'}</span>
                <span>-{Math.round(priceResult.weeksDiscountRate * 100)}%</span>
              </div>
            )}

            {priceResult.isEventDiscount && (
              <div className="flex justify-between items-center text-gold">
                <span className="text-sm">{language === 'ko' ? '이벤트 추가 할인' : 'Event Extra Discount'}</span>
                <span>-{Math.round(priceResult.eventDiscountRate * 100)}%</span>
              </div>
            )}

            <div className="pt-4 border-t border-gold/10 flex justify-between items-center">
              <span className="text-lg font-serif">{language === 'ko' ? '최종 혜택가' : 'Final Price'}</span>
              <div className="text-right">
                <span className="text-3xl font-serif text-gold">₩{priceResult.discountedPrice.toLocaleString()}</span>
                <p className="text-[10px] opacity-40 mt-1 italic">
                  {language === 'ko' ? '* 주 1회, 1시간 기준 예상 금액입니다.' : '* Estimated for 1 session/week, 1 hour.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 6. Desired Course */}
        <div className="space-y-6">
          <label className="text-xs uppercase tracking-widest font-bold flex items-center gap-2">
            <span className="w-6 h-6 bg-ink text-paper rounded-full flex items-center justify-center text-[10px]">6</span>
            <EditableText contentKey="inquiry.classLabel" defaultValue={t.inquiry.classLabel} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {t.inquiry.classOptions.map((option: string) => (
              <div key={option} className="space-y-3">
                <button
                  type="button"
                  onClick={() => toggleSelection('desiredClass', option)}
                  className={cn(
                    "w-full p-5 rounded-2xl border text-left transition-all flex items-center justify-between group",
                    formData.desiredClass.includes(option) 
                      ? "bg-gold/10 border-gold text-gold font-bold" 
                      : "bg-paper border-ink/10 hover:border-gold/50"
                  )}
                >
                  <span className="text-sm">{option}</span>
                  <div className={cn(
                    "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                    formData.desiredClass.includes(option) ? "bg-gold border-gold text-ink" : "border-ink/20 group-hover:border-gold"
                  )}>
                    {formData.desiredClass.includes(option) && <Check size={12} />}
                  </div>
                </button>
              </div>
            ))}
          </div>

          {/* Level Selection (New) */}
          {formData.desiredClass.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4 pt-4"
            >
              <p className="text-[10px] uppercase tracking-widest opacity-50">{language === 'ko' ? '희망 레벨 선택' : 'Select Desired Level'}</p>
              <div className="flex flex-wrap gap-2">
                {(COURSES.find(c => formData.desiredClass.some(dc => dc.includes(c.title)))?.levels || ['입문', '초급', '중급', '고급', '초고급']).map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, desiredLevel: level }))}
                    className={cn(
                      "px-4 py-2 rounded-full border text-[10px] uppercase tracking-widest transition-all",
                      formData.desiredLevel === level ? "bg-gold text-ink border-gold font-bold" : "border-ink/10 hover:border-gold/50"
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {formData.desiredClass.some(c => c.includes('소수 그룹반')) && (
            <motion.input
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              type="text"
              placeholder={language === 'ko' ? '직접 입력해 주세요.' : 'Please enter directly.'}
              value={formData.otherDesiredClass}
              onChange={(e) => setFormData(prev => ({ ...prev, otherDesiredClass: e.target.value }))}
              className="w-full p-4 bg-white border border-gold/30 rounded-xl outline-none focus:border-gold text-sm"
            />
          )}
        </div>

        {/* 7. Preferred Schedule */}
        <div className="space-y-6">
          <label className="text-xs uppercase tracking-widest font-bold flex items-center gap-2">
            <span className="w-6 h-6 bg-ink text-paper rounded-full flex items-center justify-center text-[10px]">7</span>
            <EditableText contentKey="inquiry.scheduleLabel" defaultValue={t.inquiry.scheduleLabel} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['평일 오전', '평일 오후', '평일 저녁', '주말 오전', '주말 오후', '주말 저녁'].map(slot => (
              <button
                key={slot}
                type="button"
                onClick={() => toggleSelection('preferredSlots', slot)}
                className={cn(
                  "p-4 border rounded-2xl text-[10px] uppercase tracking-widest transition-all",
                  formData.preferredSlots.includes(slot) ? "border-gold bg-gold/10 text-gold font-bold" : "border-ink/10 hover:border-gold/50"
                )}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>

        {/* 8. Additional Requests */}
        <div className="space-y-4">
          <label className="text-xs uppercase tracking-widest font-bold flex items-center gap-2">
            <span className="w-6 h-6 bg-ink text-paper rounded-full flex items-center justify-center text-[10px]">8</span>
            <EditableText contentKey="inquiry.requestsLabel" defaultValue={t.inquiry.requestsLabel} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </label>
          <textarea 
            placeholder={t.inquiry.requestsPlaceholder}
            value={formData.requests || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, requests: e.target.value }))}
            className="w-full p-6 bg-ink/5 border border-ink/10 rounded-3xl focus:border-gold outline-none transition-colors text-lg min-h-[100px]"
          />
        </div>

        <div className="pt-12">
          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full py-6 bg-ink text-paper rounded-full text-sm uppercase tracking-[0.2em] font-bold hover:bg-gold hover:text-ink transition-all shadow-2xl disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : (language === 'ko' ? '수강 신청 및 진단 완료하기' : t.inquiry.submit)}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

const CommunityView: FC<{ language: LanguageCode }> = ({ language }) => {
  const t = TRANSLATIONS[language];
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', type: 'inquiry' as 'inquiry' | 'request' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const path = 'community';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Community fetch error:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLoginRequired = () => {
    loginWithGoogle().catch(console.error);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      alert(t.community.loginRequired);
      handleLoginRequired();
      return;
    }
    setIsSubmitting(true);
    const path = 'community';
    try {
      await addDoc(collection(db, path), {
        ...newPost,
        userUid: auth.currentUser.uid,
        userName: auth.currentUser.displayName || auth.currentUser.email,
        createdAt: serverTimestamp()
      });
      setNewPost({ title: '', content: '', type: 'inquiry' });
      setShowForm(false);
      alert(language === 'ko' ? '게시글이 등록되었습니다.' : 'Post has been registered.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="py-20 text-center font-serif italic opacity-50">{t.community.loading}</div>;

  if (!auth.currentUser) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
        className="max-w-4xl mx-auto px-6 py-32 text-center space-y-8"
      >
        <div className="w-20 h-20 bg-ink/5 rounded-full flex items-center justify-center mx-auto">
          <MessageSquare size={32} className="opacity-20" />
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-serif">{t.community.loginRequired}</h2>
          <p className="opacity-60 font-serif italic">{t.community.subtitle}</p>
        </div>
        <button 
          onClick={handleLoginRequired}
          className="px-10 py-4 bg-ink text-paper rounded-full text-xs uppercase tracking-widest hover:bg-gold hover:text-ink transition-all"
        >
          Login with Google
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto px-6 py-20 space-y-16"
    >
      <div className="flex justify-between items-end">
        <div className="space-y-4">
          <span className="text-gold text-[10px] uppercase tracking-[0.4em]">Community</span>
          <h2 className="text-5xl font-serif font-light">{t.community.title}</h2>
        </div>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="px-8 py-3 bg-ink text-paper rounded-full text-xs uppercase tracking-widest hover:bg-gold hover:text-ink transition-all flex items-center gap-2"
          >
            <Plus size={16} /> {t.community.newPost}
          </button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="p-8 border border-ink/10 rounded-3xl bg-ink/5 space-y-6 overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest opacity-50">Type</label>
                <select 
                  value={newPost.type}
                  onChange={(e) => setNewPost(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full p-3 bg-white border border-ink/10 rounded-xl text-sm outline-none focus:border-gold"
                >
                  <option value="inquiry">{t.community.inquiry}</option>
                  <option value="request">{t.community.request}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest opacity-50">Title</label>
                <input 
                  type="text" 
                  required
                  value={newPost.title}
                  onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                  placeholder={language === 'ko' ? "제목을 입력하세요" : "Enter title"}
                  className="w-full p-3 bg-white border border-ink/10 rounded-xl text-sm outline-none focus:border-gold"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest opacity-50">{t.community.contentLabel}</label>
              <textarea 
                required
                value={newPost.content}
                onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                placeholder={language === 'ko' ? "내용을 입력하세요" : "Enter content"}
                rows={4}
                className="w-full p-4 bg-white border border-ink/10 rounded-xl text-sm outline-none focus:border-gold"
              />
            </div>
            <div className="flex justify-end gap-4">
              <button 
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-3 text-xs uppercase tracking-widest opacity-50 hover:opacity-100"
              >
                {t.community.cancel}
              </button>
              <button 
                type="submit"
                disabled={isSubmitting}
                className="px-10 py-3 bg-ink text-paper rounded-full text-xs uppercase tracking-widest hover:bg-gold hover:text-ink transition-all disabled:opacity-50"
              >
                {isSubmitting ? '...' : t.community.submit}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        {posts.length > 0 ? posts.map(post => (
          <div key={post.id} className="p-8 border border-ink/10 rounded-3xl space-y-6 bg-white hover:shadow-lg hover:shadow-ink/5 transition-all">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold",
                    post.type === 'request' ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                  )}>
                    {post.type === 'request' ? t.community.request : t.community.inquiry}
                  </span>
                  <h3 className="text-xl font-bold">{post.title}</h3>
                </div>
                <div className="flex items-center gap-3 text-[10px] opacity-40">
                  <span>{post.userName}</span>
                  <span>•</span>
                  <span>{post.createdAt?.toDate().toLocaleDateString()}</span>
                </div>
              </div>
              {post.reply && (
                <div className="flex items-center gap-2 text-gold">
                  <Check size={14} />
                  <span className="text-[10px] uppercase tracking-widest font-bold">{t.community.answered}</span>
                </div>
              )}
            </div>
            <p className="text-sm opacity-70 leading-relaxed">{post.content}</p>
            
            {post.reply && (
              <div className="p-6 bg-ink/5 rounded-2xl space-y-3 border-l-4 border-gold">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-gold" />
                  <span className="text-[10px] uppercase tracking-widest font-bold">{t.community.replyTitle}</span>
                </div>
                <p className="text-sm italic opacity-80">"{post.reply}"</p>
              </div>
            )}
          </div>
        )) : (
          <div className="py-20 text-center opacity-30 font-serif italic">
            {t.community.noPosts}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const ImageGenView: FC<{ language: LanguageCode, userProfile: any, isAuthReady: boolean, setView: (v: any) => void, siteContent: any }> = ({ language, userProfile, isAuthReady, setView, siteContent }) => {
  const t = TRANSLATIONS[language];
  const [prompt, setPrompt] = useState('');
  const [level, setLevel] = useState('beginner');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [learningContent, setLearningContent] = useState<any | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [finalTime, setFinalTime] = useState<number | null>(null);
  const [error, setGenerationError] = useState<string | null>(null);
  const timerRef = useRef<any>(null);

  const accessSetting = siteContent['ai-studio-access']?.access || 'admin';
  const isAdmin = userProfile?.role === 'admin';
  const isPremium = userProfile?.role === 'premium';
  const isMember = !!userProfile;

  const hasAccess = isAdmin || 
                    (accessSetting === 'all') || 
                    (accessSetting === 'premium' && isPremium) || 
                    (accessSetting === 'member' && isMember);

  useEffect(() => {
    if (isGenerating) {
      const start = Date.now();
      setElapsedTime(0);
      setFinalTime(null);
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - start) / 100) / 10);
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isGenerating]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    // Double check permissions
    if (!hasAccess) {
      alert(language === 'ko' ? '이용 권한이 없습니다.' : 'You do not have permission to use this feature.');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedImage(null);
    setGeneratedAudio(null);
    setLearningContent(null);
    const startTime = Date.now();
    
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        throw new Error("GEMINI_API_KEY is not configured. Please set it in the Secrets panel.");
      }
      const ai = new GoogleGenAI({ apiKey });
      
      console.log("Starting AI generation for prompt:", prompt);
      
      const [imageResponse, textResponse] = await Promise.all([
        ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              {
                text: `Premium educational illustration for Chinese language learning: ${prompt}. High quality, elegant, clean background, educational style. No text, no letters, no characters, no words.`,
              },
            ],
          },
          config: {
            imageConfig: {
              aspectRatio: "1:1",
            }
          }
        }).catch(err => {
          console.error("Image generation failed:", err);
          return { candidates: [] };
        }),
        ai.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: `Generate a practical Chinese dialogue and vocabulary list based on this situation: "${prompt}". 
          Target learner level: ${level}.
          Interface language: ${language}.
          Return the result in strictly JSON format with the following structure:
          {
            "dialogue": [{"speaker": "...", "hanzi": "...", "pinyin": "...", "translation": "..."}],
            "vocabulary": [{"hanzi": "...", "pinyin": "...", "translation": "..."}],
            "culturalNote": "..."
          }`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                dialogue: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      speaker: { type: Type.STRING },
                      hanzi: { type: Type.STRING },
                      pinyin: { type: Type.STRING },
                      translation: { type: Type.STRING }
                    },
                    required: ["speaker", "hanzi", "pinyin", "translation"]
                  }
                },
                vocabulary: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      hanzi: { type: Type.STRING },
                      pinyin: { type: Type.STRING },
                      translation: { type: Type.STRING }
                    },
                    required: ["hanzi", "pinyin", "translation"]
                  }
                },
                culturalNote: { type: Type.STRING }
              },
              required: ["dialogue", "vocabulary"]
            }
          }
        })
      ]);

      console.log("AI Responses received");

      // Handle Image
      if (imageResponse.candidates?.[0]?.content?.parts) {
        for (const part of imageResponse.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64EncodeString = part.inlineData.data;
            setGeneratedImage(`data:image/png;base64,${base64EncodeString}`);
            break;
          }
        }
      }

      // Handle Text
      let data;
      try {
        data = JSON.parse(textResponse.text || "{}");
      } catch (e) {
        console.error("JSON parse error", e);
        data = { dialogue: [], vocabulary: [], culturalNote: "Failed to parse content." };
      }
      setLearningContent(data);
      
      // Generate Audio (TTS)
      if (data.dialogue && data.dialogue.length > 0) {
        setIsGeneratingAudio(true);
        try {
          const hanziOnly = data.dialogue.map((d: any) => d.hanzi).join(' ');
          const audioResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Read this Chinese dialogue naturally: ${hanziOnly}` }] }],
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
              },
            },
          });

          const base64Audio = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (base64Audio) {
            const audioUrl = pcmToWav(base64Audio, 24000);
            setGeneratedAudio(audioUrl);
          }
        } catch (audioErr) {
          console.error('Audio generation error:', audioErr);
        } finally {
          setIsGeneratingAudio(false);
        }
      }
      
      setFinalTime(Math.floor((Date.now() - startTime) / 100) / 10);
    } catch (error: any) {
      console.error('Generation error:', error);
      setGenerationError(error.message || t.aiStudio.error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isAuthReady && !hasAccess) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
        className="max-w-4xl mx-auto px-6 py-32 text-center space-y-8"
      >
        <div className="w-24 h-24 mx-auto bg-gold/10 rounded-full flex items-center justify-center text-gold">
          <ShieldCheck size={48} />
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-serif">{language === 'ko' ? '이용 권한이 제한된 기능' : 'Restricted Access Feature'}</h2>
          <p className="text-lg opacity-60 font-serif italic max-w-md mx-auto">
            {language === 'ko' 
              ? `이 기능은 현재 ${accessSetting === 'admin' ? '관리자' : accessSetting === 'premium' ? '프리미엄 회원 및 관리자' : accessSetting === 'member' ? '회원 및 관리자' : '모든 사용자'}만 이용 가능합니다.` 
              : `This feature is currently available only for ${accessSetting === 'admin' ? 'Admins' : accessSetting === 'premium' ? 'Premium members and Admins' : accessSetting === 'member' ? 'Members and Admins' : 'Everyone'}.`}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {accessSetting === 'premium' && (
            <button 
              onClick={() => { setView('pricing'); setTimeout(() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }), 100); }}
              className="px-10 py-4 bg-gold text-ink font-bold rounded-full text-xs uppercase tracking-widest hover:scale-105 transition-transform"
            >
              {language === 'ko' ? '프리미엄 플랜 보기' : 'View Premium Plans'}
            </button>
          )}
          <button 
            onClick={() => setView('landing')}
            className="px-10 py-4 border border-ink/10 rounded-full text-xs uppercase tracking-widest hover:bg-ink/5 transition-all"
          >
            {language === 'ko' ? '홈으로 돌아가기' : 'Back to Home'}
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto px-6 py-20 space-y-12"
    >
      <div className="text-center space-y-4">
        <div className="flex flex-col items-center gap-2">
          <span className="text-gold text-[10px] uppercase tracking-[0.4em]">AI Learning Assistant</span>
          {(isGenerating || finalTime !== null) && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-4 py-1 bg-gold/10 text-gold rounded-full text-[10px] font-mono tracking-widest"
            >
              {isGenerating ? `${t.aiStudio.timerGenerating}: ${elapsedTime.toFixed(1)}s` : `${t.aiStudio.timerCompleted}: ${finalTime?.toFixed(1)}s`}
            </motion.div>
          )}
        </div>
        <h2 className="text-5xl font-serif font-light">{t.aiStudio.title}</h2>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto p-4 bg-red-50 text-red-600 rounded-2xl text-xs flex items-center gap-3"
          >
            <AlertCircle size={16} className="shrink-0" />
            <p>{error}</p>
          </motion.div>
        )}
        <p className="max-w-xl mx-auto opacity-60 font-serif italic">
          {t.aiStudio.subtitle} <br />
          {t.aiStudio.example}
        </p>
      </div>

      <div className="space-y-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex flex-wrap justify-center gap-2">
            {Object.entries(t.aiStudio.levels).map(([key, label]: [string, any]) => (
              <button
                key={key}
                onClick={() => setLevel(key)}
                className={cn(
                  "px-4 py-2 rounded-full text-[10px] uppercase tracking-widest transition-all border",
                  level === key 
                    ? "bg-gold border-gold text-ink font-bold" 
                    : "border-ink/10 hover:border-gold/50 opacity-60 hover:opacity-100"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative">
            <input 
              type="text" 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder={t.aiStudio.placeholder}
              className="w-full p-6 bg-ink/5 border border-ink/10 rounded-2xl focus:outline-none focus:border-gold transition-colors pr-32"
            />
            <button 
              onClick={handleGenerate}
              disabled={!prompt || isGenerating}
              className="absolute right-2 top-2 bottom-2 px-6 bg-ink text-paper rounded-xl text-xs uppercase tracking-widest hover:bg-gold hover:text-ink transition-all disabled:opacity-50"
            >
              {isGenerating ? t.aiStudio.generating : t.aiStudio.generate}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Section */}
          <div className="space-y-4">
            <h3 className="text-xs uppercase tracking-widest opacity-50 flex items-center gap-2">
              <ImageIcon size={14} /> {t.aiStudio.visualContext}
            </h3>
            <div className="aspect-square w-full bg-ink/5 rounded-3xl overflow-hidden flex items-center justify-center border border-dashed border-ink/20 relative">
              {generatedImage ? (
                <img src={generatedImage} alt="Generated" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="text-center space-y-4 opacity-20">
                  {isGenerating ? (
                    <div className="animate-pulse flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-full border-2 border-ink border-t-transparent animate-spin" />
                      <p className="text-[10px] uppercase tracking-widest">Creating visual...</p>
                    </div>
                  ) : (
                    <>
                      <ImageIcon size={64} className="mx-auto" />
                      <p className="text-xs uppercase tracking-widest">Your AI visual will appear here</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Text Content Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-widest opacity-50 flex items-center gap-2">
                <FileText size={14} /> {t.aiStudio.learningContent}
              </h3>
              {generatedAudio && (
                <div className="flex items-center gap-2">
                  <span className="text-[8px] uppercase tracking-widest text-gold font-bold">{t.aiStudio.audioReady}</span>
                  <audio controls src={generatedAudio} className="h-8 w-48" />
                </div>
              )}
              {isGeneratingAudio && (
                <div className="flex items-center gap-2 text-gold animate-pulse">
                  <Music size={14} className="animate-bounce" />
                  <span className="text-[8px] uppercase tracking-widest font-bold">{t.aiStudio.generatingAudio}</span>
                </div>
              )}
            </div>
            <div className="min-h-[400px] h-full p-8 bg-ink/5 rounded-3xl border border-ink/10 overflow-y-auto">
              {learningContent ? (
                <div className="space-y-8">
                  <div className="space-y-6">
                    <h4 className="text-[10px] uppercase tracking-[0.3em] text-gold font-bold border-b border-gold/20 pb-2">Dialogue</h4>
                    {learningContent.dialogue.map((item: any, idx: number) => (
                      <div key={idx} className="space-y-1">
                        <div className="text-[10px] text-gold/60 font-mono tracking-wider">{item.pinyin}</div>
                        <div className="flex gap-3">
                          <span className="text-xs font-bold opacity-40 min-w-[3rem]">{item.speaker}</span>
                          <span className="text-lg font-serif">{item.hanzi}</span>
                        </div>
                        <div className="text-xs opacity-60 italic">{item.translation}</div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] uppercase tracking-[0.3em] text-gold font-bold border-b border-gold/20 pb-2">Vocabulary</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {learningContent.vocabulary.map((item: any, idx: number) => (
                        <div key={idx} className="p-3 bg-ink/5 rounded-xl border border-ink/5 flex items-center justify-between">
                          <div>
                            <div className="text-base font-serif">{item.hanzi}</div>
                            <div className="text-[10px] opacity-40 font-mono">{item.pinyin}</div>
                          </div>
                          <div className="text-xs font-medium text-gold">{item.translation}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {learningContent.culturalNote && (
                    <div className="p-4 bg-gold/5 rounded-2xl border border-gold/10">
                      <h4 className="text-[10px] uppercase tracking-[0.3em] text-gold font-bold mb-2">Cultural Note</h4>
                      <p className="text-xs opacity-80 leading-relaxed">{learningContent.culturalNote}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-center space-y-4 opacity-20">
                  {isGenerating ? (
                    <div className="animate-pulse flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-full border-2 border-ink border-t-transparent animate-spin" />
                      <p className="text-[10px] uppercase tracking-widest">Generating dialogue...</p>
                    </div>
                  ) : (
                    <>
                      <FileText size={64} className="mx-auto" />
                      <p className="text-xs uppercase tracking-widest">Dialogue and vocabulary will appear here</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
