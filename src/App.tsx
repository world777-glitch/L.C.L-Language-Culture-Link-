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
  ChevronLeft, 
  ClipboardCheck,
  ArrowUp, 
  ArrowDown, 
  ArrowRight,
  ArrowUpRight,
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
  PlusCircle,
  Check,
  ShieldCheck,
  Sun,
  Moon,
  Lock,
  Unlock,
  FileText,
  Music,
  Trash2,
  BarChart3,
  Users,
  Search,
  Mail,
  Download,
  Eye,
  EyeOff,
  MessageCircle,
  Send,
  Filter,
  MoreVertical,
  Upload,
  Edit,
  X,
  ExternalLink,
  Instagram,
  Facebook,
  Bookmark,
  Heart,
  Video,
  Youtube,
  Twitter,
  Linkedin,
  Copy,
  Minimize2,
  Maximize2,
  Palette,
  Type as TypeIcon,
  Square,
  Circle,
  Bold,
  Italic,
  Underline,
  Monitor,
  Tablet,
  Smartphone,
  Settings,
  Menu,
  TrendingUp,
  GripHorizontal
} from 'lucide-react';
import { motion, AnimatePresence, Reorder, useScroll, useSpring, useDragControls } from 'motion/react';
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { COURSES, calculatePrice, RESOURCE_GROUPS, LEVEL_PRICES, CourseCategory, Course } from './constants';
import { cn } from './lib/utils';
import { LANGUAGES, TRANSLATIONS, LanguageCode } from './translations';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, AreaChart, Area } from 'recharts';

import { auth, loginWithGoogle, logout as firebaseLogout, db, storage, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, setDoc, serverTimestamp, onSnapshot, query, where, orderBy, limit, doc, getDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
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

const FullMenuOverlay: FC<{
  isOpen: boolean,
  onClose: () => void,
  setView: (v: any) => void,
  language: LanguageCode,
  isEditMode: boolean,
  siteContent: Record<string, any>
}> = ({ isOpen, onClose, setView, language, isEditMode, siteContent }) => {
  const t = TRANSLATIONS[language];
  
  const menuData = [
    {
      title: language === 'ko' ? '학습 과정' : 'Programs',
      links: [
        { label: language === 'ko' ? '정규 커리큘럼' : 'Regular Curriculum', view: 'curriculum' },
        { label: language === 'ko' ? 'HSK 집중 코칭' : 'HSK Coaching', view: 'curriculum' },
        { label: language === 'ko' ? '비즈니스 중국어' : 'Business Chinese', view: 'curriculum' },
        { label: language === 'ko' ? '1:1 맞춤 클래스' : '1:1 Private Class', view: 'curriculum' },
      ]
    },
    {
      title: language === 'ko' ? '학습 자료' : 'Resources',
      links: [
        { label: language === 'ko' ? '지식 라이브러리' : 'Knowledge Library', view: 'archive' },
        { label: language === 'ko' ? '학습 아카이브' : 'Learning Archive', view: 'archive' },
        { label: language === 'ko' ? '최신 교육 뉴스' : 'Education News', view: 'archive' },
      ]
    },
    {
      title: language === 'ko' ? '커뮤니티' : 'Community',
      links: [
        { label: language === 'ko' ? '학습 게시판' : 'Forum', view: 'community' },
        { label: language === 'ko' ? '수강생 후기' : 'Reviews', view: 'community' },
        { label: language === 'ko' ? '질문과 답변' : 'Q&A', view: 'community' },
      ]
    },
    {
      title: language === 'ko' ? '고객 지원' : 'Support',
      links: [
        { label: language === 'ko' ? '1:1 상담 문의' : 'Inquiry', view: 'inquiry' },
        { label: language === 'ko' ? '무료 레벨 테스트' : 'Level Test', view: 'level-test' },
        { label: language === 'ko' ? '자주 묻는 질문' : 'FAQ', view: 'inquiry' },
      ]
    },
    {
      title: language === 'ko' ? '소셜 채널' : 'Social',
      links: [
        { 
          label: 'Instagram', 
          url: siteContent['quick.social_links.item_0']?.url || 'https://instagram.com',
          contentKey: 'quick.social_links.item_0'
        },
        { 
          label: language === 'ko' ? 'Naver Blog' : 'Naver Blog', 
          url: siteContent['quick.social_links.item_1']?.url || 'https://blog.naver.com',
          contentKey: 'quick.social_links.item_1'
        },
        { 
          label: language === 'ko' ? 'Open KakaoTalk' : 'Open KakaoTalk', 
          url: siteContent['quick.social_links.item_2']?.url || 'https://open.kakao.com',
          contentKey: 'quick.social_links.item_2'
        },
        { 
          label: 'YouTube', 
          url: siteContent['social.youtube']?.url || 'https://youtube.com',
          contentKey: 'social.youtube'
        },
      ]
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-ink/95 backdrop-blur-2xl overflow-y-auto custom-scrollbar"
        >
          <div className="max-w-[1600px] mx-auto px-6 py-20 min-h-screen flex flex-col">
            <div className="flex justify-between items-center mb-20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center text-ink font-serif font-bold text-2xl shadow-lg shadow-gold/20">L</div>
                <div className="flex flex-col">
                  <span className="text-xl font-serif font-bold tracking-widest text-paper">L.C.L</span>
                  <span className="text-[10px] uppercase tracking-[0.3em] text-gold/60">Language & Culture Link</span>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-14 h-14 rounded-full border border-paper/10 flex items-center justify-center text-paper hover:bg-paper hover:text-ink transition-all group"
              >
                <X size={24} className="group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 md:gap-16">
              {menuData.map((section, idx) => (
                <motion.div 
                  key={section.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="space-y-8"
                >
                  <h3 className="text-gold text-[10px] uppercase tracking-[0.4em] font-bold border-b border-gold/20 pb-4">
                    {section.title}
                  </h3>
                  <div className="flex flex-col gap-4">
                    {section.links.map((link) => (
                      <div key={link.label} className="flex items-center gap-2 group">
                        <span className="w-0 group-hover:w-4 h-px bg-gold transition-all" />
                        {link.contentKey && !link.view ? (
                          <EditableLink
                            contentKey={link.contentKey}
                            defaultText={link.label}
                            defaultUrl={link.url}
                            isEditMode={isEditMode}
                            language={language}
                            siteContent={siteContent}
                            className="text-left text-paper/60 hover:text-paper text-lg font-serif transition-colors"
                          />
                        ) : (
                          <button
                            onClick={() => {
                              if (link.view) setView(link.view);
                              else if (link.url) window.open(link.url, '_blank');
                              onClose();
                            }}
                            className="text-left text-paper/60 hover:text-paper text-lg font-serif transition-colors"
                          >
                            {link.label}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-auto pt-20 border-t border-paper/10 flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex gap-12 text-[10px] uppercase tracking-widest font-bold text-paper/30">
                <button className="hover:text-gold transition-colors">Privacy Policy</button>
                <button className="hover:text-gold transition-colors">Terms of Service</button>
                <button className="hover:text-gold transition-colors">Sitemap</button>
              </div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-gold/40">
                © 2026 L.C.L Language & Culture Link
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const QuickMenu: FC<{ 
  language: LanguageCode, 
  setView: (v: any) => void, 
  scrollToSection: (id: string) => void,
  isEditMode: boolean,
  siteContent: Record<string, any>,
  onOpenFullMenu: () => void
}> = ({ language, setView, scrollToSection, isEditMode, siteContent, onOpenFullMenu }) => {
  const [isOpen, setIsOpen] = useState(true);
  const t = TRANSLATIONS[language];

  const menuItems = [
    { id: 'curriculum', label: language === 'ko' ? '학습 과정' : 'Curriculum', icon: <GraduationCap size={20} />, action: () => setView('curriculum') },
    { id: 'level-test', label: language === 'ko' ? '레벨 테스트' : 'Level Test', icon: <ClipboardCheck size={20} />, action: () => setView('level-test') },
    { id: 'community', label: language === 'ko' ? '커뮤니티' : 'Community', icon: <MessageSquare size={20} />, action: () => setView('community') },
    { id: 'inquiry', label: language === 'ko' ? '상담 문의' : 'Inquiry', icon: <Mail size={20} />, action: () => setView('inquiry') },
    { id: 'mypage', label: language === 'ko' ? '마이페이지' : 'My Page', icon: <User size={20} />, action: () => setView('mypage') },
    { id: 'all', label: language === 'ko' ? '전체 보기' : 'View All', icon: <LayoutDashboard size={20} />, action: onOpenFullMenu },
  ];

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-[60] flex items-start">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className="bg-ink/90 backdrop-blur-xl border-y border-l border-paper/10 rounded-l-[24px] shadow-2xl overflow-hidden w-24 md:w-28"
          >
            <div className="bg-gold p-3 text-center">
              <div className="text-[8px] md:text-[9px] font-bold text-ink uppercase tracking-[0.2em] leading-tight">
                Quick<br/>Menu
              </div>
            </div>
            <div className="flex flex-col">
              {menuItems.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={item.action}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 text-paper/60 hover:text-gold hover:bg-paper/5 transition-all border-b border-paper/5 last:border-none group",
                  )}
                >
                  <div className="group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <span className="text-[9px] md:text-[10px] font-bold whitespace-nowrap">
                    <EditableText 
                      contentKey={`quickmenu.item_${idx}.label`} 
                      defaultValue={item.label} 
                      isEditMode={isEditMode} 
                      language={language} 
                      siteContent={siteContent} 
                    />
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gold text-ink p-1 rounded-l-md shadow-lg hover:pr-2 transition-all"
      >
        {isOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </div>
  );
};

const Footer: FC<{ language: LanguageCode, isEditMode: boolean, siteContent: Record<string, any>, setView: (v: any) => void }> = ({ language, isEditMode, siteContent, setView }) => {
  const t = TRANSLATIONS[language];
  return (
    <footer className="bg-ink text-paper py-20 px-6 border-t border-paper/10">
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold rounded-full flex items-center justify-center text-ink font-serif font-bold text-xl">L</div>
            <div className="flex flex-col">
              <span className="text-sm font-serif font-bold tracking-widest">L.C.L</span>
              <span className="text-[8px] uppercase tracking-[0.3em] opacity-40">Language & Culture Link</span>
            </div>
          </div>
          <p className="text-xs opacity-40 leading-relaxed font-serif italic max-w-xs">
            <EditableText contentKey="footer.description" defaultValue="Premium Chinese language learning platform led by a PhD in Linguistics. Bridging language and culture for global leaders." isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </p>
          <div className="flex gap-4">
            <Repeater 
              contentKey="footer.social"
              isEditMode={isEditMode}
              language={language}
              siteContent={siteContent}
              defaultCount={3}
              className="flex gap-4"
              renderItem={(i) => (
                <EditableLink 
                  contentKey={`footer.social.item_${i}`} 
                  defaultText={i === 0 ? "Instagram" : i === 1 ? "Blog" : "YouTube"} 
                  defaultUrl="#" 
                  isEditMode={isEditMode} 
                  language={language} 
                  siteContent={siteContent} 
                  className="w-8 h-8 rounded-full border border-paper/10 flex items-center justify-center hover:bg-gold hover:text-ink transition-all" 
                />
              )}
            />
          </div>
        </div>

        <div className="space-y-8">
          <h4 className="text-[10px] uppercase tracking-[0.4em] font-bold text-gold">Navigation</h4>
          <nav className="flex flex-col gap-4">
            {['landing', 'curriculum', 'pricing', 'archive', 'community'].map((v) => (
              <button 
                key={v} 
                onClick={() => setView(v)}
                className="text-left text-xs uppercase tracking-widest opacity-60 hover:opacity-100 hover:text-gold transition-all"
              >
                {t.nav[v as keyof typeof t.nav] || v}
              </button>
            ))}
          </nav>
        </div>

        <div className="space-y-8">
          <h4 className="text-[10px] uppercase tracking-[0.4em] font-bold text-gold">Contact</h4>
          <div className="space-y-4 text-xs opacity-60 leading-relaxed">
            <div className="flex items-center gap-3">
              <Mail size={14} className="text-gold" />
              <EditableText contentKey="footer.email" defaultValue="lhbin777@gmail.com" isEditMode={isEditMode} language={language} siteContent={siteContent} />
            </div>
            <div className="flex items-center gap-3">
              <MessageCircle size={14} className="text-gold" />
              <EditableText contentKey="footer.phone" defaultValue="+82 10-1234-5678" isEditMode={isEditMode} language={language} siteContent={siteContent} />
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <h4 className="text-[10px] uppercase tracking-[0.4em] font-bold text-gold">Newsletter</h4>
          <p className="text-xs opacity-40 leading-relaxed">
            <EditableText contentKey="footer.newsletter_text" defaultValue="Subscribe to receive cultural insights and language tips." isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </p>
          <div className="flex gap-2">
            <input type="email" placeholder="Email Address" className="bg-paper/5 border border-paper/10 rounded-full px-4 py-2 text-xs flex-grow outline-none focus:border-gold transition-colors" />
            <button className="bg-gold text-ink px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-transform">Join</button>
          </div>
        </div>
      </div>
      <div className="max-w-[1600px] mx-auto mt-20 pt-8 border-t border-paper/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[8px] uppercase tracking-[0.3em] opacity-30">
        <span>© 2026 L.C.L Language & Culture Link. All Rights Reserved.</span>
        <div className="flex gap-8">
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
        </div>
      </div>
    </footer>
  );
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [view, setView] = useState<'landing' | 'booking' | 'mypage' | 'admin' | 'image-gen' | 'archive' | 'community' | 'inquiry' | 'curriculum' | 'pricing' | 'level-test'>('landing');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [appMode, setAppMode] = useState<'learner' | 'admin'>('learner');
  const [deviceMode, setDeviceMode] = useState<'pc' | 'pad' | 'mobile'>('pc');
  const [isAnyTextEditing, setIsAnyTextEditing] = useState(false);
  const [isFullMenuOpen, setIsFullMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      // Only auto-detect if the user hasn't manually overridden it in this session?
      // For now, let's always auto-detect on mount and resize.
      if (window.innerWidth < 640) {
        setDeviceMode('mobile');
      } else if (window.innerWidth < 1024) {
        setDeviceMode('pad');
      } else {
        setDeviceMode('pc');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      const isEditing = document.activeElement?.getAttribute('contenteditable') === 'true';
      setIsAnyTextEditing(isEditing);
    };
    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleFocus);
    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleFocus);
    };
  }, []);
  const [selectedCourse, setSelectedCourse] = useState(COURSES[0]);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [initialArchiveFilter, setInitialArchiveFilter] = useState<{ groupId: string | null, categoryId: string | null }>({ groupId: null, categoryId: null });
  const [initialCommunityFilter, setInitialCommunityFilter] = useState<string>('all');
  const [language, setLanguage] = useState<LanguageCode>('ko');
  const [adminTab, setAdminTab] = useState<'reservations' | 'resources' | 'community' | 'users' | 'stats' | 'inquiries'>('reservations');
  const t = TRANSLATIONS[language];

  const [isEditMode, setIsEditMode] = useState(false);
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const [hoveredSubItem, setHoveredSubItem] = useState<string | null>(null);

  const navSubMenus: Record<string, { id: string, label: string, action: () => void, children?: { id: string, label: string, action: () => void }[] }[]> = {
    admin: [
      { id: 'admin-dashboard', label: t.nav.admin, action: () => setView('admin') },
      { id: 'ai-studio', label: t.nav.aiStudio, action: () => setView('image-gen') },
      { id: 'edit-mode', label: t.nav.edit, action: () => setIsEditMode(!isEditMode) }
    ],
    curriculum: COURSES.map(course => ({
      id: course.id,
      label: course.title,
      action: () => { 
        setView('landing'); 
        setTimeout(() => {
          const el = document.getElementById('curriculum');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      },
      children: course.levels.map(level => ({
        id: `${course.id}-${level}`,
        label: level,
        action: () => {
          setSelectedCourse(course);
          setSelectedLevel(level);
          setView('inquiry');
        }
      }))
    })),
    pricing: [4, 8, 10, 12].map(weeks => ({
      id: `pricing-${weeks}`,
      label: `${weeks}${t.pricing.weeks}`,
      action: () => { setView('pricing'); }
    })),
    'level-test': COURSES.map(course => ({
      id: `test-${course.id}`,
      label: course.title,
      action: () => { setView('level-test'); }
    })),
    archive: [
      { id: 'all', label: t.archive.all, action: () => { setView('archive'); setInitialArchiveFilter({ groupId: null, categoryId: null }); } },
      ...RESOURCE_GROUPS.map(group => ({
        id: group.id,
        label: group.name,
        action: () => { setView('archive'); setInitialArchiveFilter({ groupId: group.id, categoryId: null }); },
        children: group.categories.map(cat => ({
          id: cat.id,
          label: cat.name,
          action: () => { setView('archive'); setInitialArchiveFilter({ groupId: group.id, categoryId: cat.id }); }
        }))
      }))
    ],
    community: [
      { id: 'all', label: t.community.all, action: () => { setView('community'); setInitialCommunityFilter('all'); } },
      { id: 'trend', label: t.community.trend, action: () => { setView('community'); setInitialCommunityFilter('trend'); } },
      { id: 'clinic', label: t.community.clinic, action: () => { setView('community'); setInitialCommunityFilter('clinic'); } },
      { id: 'insight', label: t.community.insight, action: () => { setView('community'); setInitialCommunityFilter('insight'); } },
      { id: 'challenge', label: t.community.challenge, action: () => { setView('community'); setInitialCommunityFilter('challenge'); } },
      { id: 'consult', label: t.community.consult, action: () => { setView('community'); setInitialCommunityFilter('consult'); } },
    ]
  };

  const [siteContent, setSiteContent] = useState<Record<string, any>>({});
  const [likes, setLikes] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [allResources, setAllResources] = useState<any[]>([]);

  const navStyleL1 = useMemo(() => ({
    fontSize: siteContent['global.style.navL1FontSize']?.value ? `${siteContent['global.style.navL1FontSize'].value}px` : undefined,
    color: siteContent['global.style.navL1FontColor']?.value || undefined,
    fontWeight: siteContent['global.style.navL1FontWeight']?.value || undefined,
  }), [siteContent]);

  const navStyleL2 = useMemo(() => ({
    fontSize: siteContent['global.style.navL2FontSize']?.value ? `${siteContent['global.style.navL2FontSize'].value}px` : undefined,
    color: siteContent['global.style.navL2FontColor']?.value || undefined,
    fontWeight: siteContent['global.style.navL2FontWeight']?.value || undefined,
  }), [siteContent]);

  const navStyleL3 = useMemo(() => ({
    fontSize: siteContent['global.style.navL3FontSize']?.value ? `${siteContent['global.style.navL3FontSize'].value}px` : undefined,
    color: siteContent['global.style.navL3FontColor']?.value || undefined,
    fontWeight: siteContent['global.style.navL3FontWeight']?.value || undefined,
  }), [siteContent]);
  const isAdmin = userProfile?.role === 'admin';

  const toggleLike = async (postUid: string) => {
    if (!auth.currentUser) return;
    const existingLike = likes.find(l => l.postUid === postUid && l.userUid === auth.currentUser?.uid);
    if (existingLike) {
      try {
        await deleteDoc(doc(db, 'likes', existingLike.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'likes');
      }
    } else {
      try {
        await addDoc(collection(db, 'likes'), {
          postUid,
          userUid: auth.currentUser.uid,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'likes');
      }
    }
  };

  const toggleBookmark = async (resourceUid: string) => {
    if (!auth.currentUser) return;
    const existingBookmark = bookmarks.find(b => b.resourceUid === resourceUid && b.userUid === auth.currentUser?.uid);
    if (existingBookmark) {
      try {
        await deleteDoc(doc(db, 'bookmarks', existingBookmark.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'bookmarks');
      }
    } else {
      try {
        await addDoc(collection(db, 'bookmarks'), {
          resourceUid,
          userUid: auth.currentUser.uid,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'bookmarks');
      }
    }
  };

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
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'siteContent'));

    const unsubLikes = onSnapshot(collection(db, 'likes'), (snapshot) => {
      setLikes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'likes'));

    const unsubAllResources = onSnapshot(
      isAdmin 
        ? collection(db, 'resources') 
        : query(collection(db, 'resources'), where('status', '==', 'published')), 
      (snapshot) => {
        setAllResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, 
      (error) => handleFirestoreError(error, OperationType.LIST, 'resources')
    );

    return () => {
      unsubscribe();
      unsubLikes();
      unsubAllResources();
    };
  }, [language, isAdmin]);

  useEffect(() => {
    if (!user) {
      setBookmarks([]);
      return;
    }

    const q = query(collection(db, 'bookmarks'), where('userUid', '==', user.uid));
    const unsubBookmarks = onSnapshot(q, (snapshot) => {
      setBookmarks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'bookmarks'));

    return unsubBookmarks;
  }, [user]);

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
  const [showScrollBottom, setShowScrollBottom] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const fullHeight = document.documentElement.scrollHeight;
      
      setShowScrollTop(scrollY > 400);
      setShowScrollBottom(scrollY + windowHeight < fullHeight - 400);
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
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

  useEffect(() => {
    const trackVisit = async () => {
      const today = new Date().toISOString().split('T')[0];
      const lastVisit = localStorage.getItem('lastVisit');
      
      if (lastVisit !== today) {
        try {
          await addDoc(collection(db, 'visits'), {
            timestamp: serverTimestamp(),
            date: today,
            userAgent: navigator.userAgent,
            userUid: auth.currentUser?.uid || null
          });
          localStorage.setItem('lastVisit', today);
        } catch (error) {
          console.error('Failed to track visit:', error);
        }
      }
    };
    trackVisit();
  }, [auth.currentUser]);

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

  const styles = useMemo(() => ({
    paper: siteContent['global.style.paper']?.value || '#f5f2ed',
    ink: siteContent['global.style.ink']?.value || '#1a1a1a',
    gold: siteContent['global.style.gold']?.value || '#c5a059',
    fontSerif: siteContent['global.style.fontSerif']?.value || '"Cormorant Garamond", serif',
    fontSans: siteContent['global.style.fontSans']?.value || '"Montserrat", sans-serif',
    landingBg: siteContent['global.style.landingBg']?.value || '',
    landingOverlay: siteContent['global.style.landingOverlay']?.value || '0',
    allPagesBg: siteContent['global.style.allPagesBg']?.value || '',
  }), [siteContent]);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    damping: 30,
    stiffness: 100,
    restDelta: 0.001
  });

  return (
    <div className={cn("min-h-screen flex flex-col bg-paper text-ink font-sans selection:bg-gold selection:text-ink overflow-x-hidden transition-colors duration-300", isDarkMode && "dark")}>
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gold z-[1000] origin-left"
        style={{ scaleX }}
      />
      
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --color-paper: ${isDarkMode ? '#1a1a1a' : styles.paper};
          --color-ink: ${isDarkMode ? '#f5f2ed' : styles.ink};
          --color-gold: ${isDarkMode ? '#d4af37' : styles.gold};
          --font-serif: ${styles.fontSerif};
          --font-sans: ${styles.fontSans};
        }
        body {
          background-color: var(--color-paper);
          color: var(--color-ink);
          ${styles.allPagesBg ? `background-image: url("${styles.allPagesBg}"); background-size: cover; background-attachment: fixed;` : ''}
        }
        ${view === 'landing' && styles.landingBg ? `
          .landing-hero-bg {
            background-image: url("${styles.landingBg}");
            background-size: cover;
            background-position: center;
          }
          .landing-hero-overlay {
            background-color: rgba(0,0,0,${styles.landingOverlay});
          }
        ` : ''}
        
        /* Custom Scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: var(--color-paper);
        }
        ::-webkit-scrollbar-thumb {
          background: var(--color-gold);
          opacity: 0.5;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: var(--color-ink);
        }
      `}} />
      
      <GlobalStyleEditor isEditMode={isEditMode} siteContent={siteContent} language={language} />

      <FullMenuOverlay 
        isOpen={isFullMenuOpen} 
        onClose={() => setIsFullMenuOpen(false)} 
        setView={setView} 
        language={language} 
        isEditMode={isEditMode} 
        siteContent={siteContent} 
      />

      <QuickMenu 
        language={language} 
        setView={setView} 
        scrollToSection={scrollToSection} 
        isEditMode={isEditMode} 
        siteContent={siteContent} 
        onOpenFullMenu={() => setIsFullMenuOpen(true)}
      />

      {/* Scroll Controls */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-3">
        <AnimatePresence>
          {showScrollTop && (
            <motion.button 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="w-12 h-12 bg-ink text-paper rounded-full flex items-center justify-center shadow-2xl hover:bg-gold hover:text-ink transition-all group"
            >
              <ArrowUp size={24} className="group-hover:-translate-y-1 transition-transform" />
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showScrollBottom && (
            <motion.button 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })}
              className="w-12 h-12 bg-ink text-paper rounded-full flex items-center justify-center shadow-2xl hover:bg-gold hover:text-ink transition-all group"
            >
              <ArrowDown size={24} className="group-hover:translate-y-1 transition-transform" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav 
        className={cn(
          "sticky top-0 z-50 bg-paper/80 backdrop-blur-md border-b border-ink/10 transition-all duration-500 mx-auto",
          deviceMode === 'pc' ? "w-full" : 
          deviceMode === 'pad' ? "max-w-[768px] border-x border-ink/10" : 
          "max-w-[375px] border-x border-ink/10"
        )}
        onMouseLeave={() => {
          if (!isAnyTextEditing) setHoveredMenu(null);
        }}
      >
        <div className={cn(
          "max-w-[1600px] mx-auto h-20 flex items-center justify-between transition-all",
          deviceMode === 'mobile' ? "px-4" : "px-6 lg:px-12"
        )}>
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => setView('landing')}
            onMouseEnter={() => {
              if (!isAnyTextEditing) setHoveredMenu(null);
            }}
          >
            <div className="flex flex-col items-start justify-center leading-none">
              <span className={cn(
                "font-serif font-bold tracking-tighter group-hover:text-gold transition-all",
                deviceMode === 'mobile' ? "text-lg" : "text-2xl"
              )}>
                <EditableText contentKey="nav.logo.main" defaultValue="L.C.L" isEditMode={isEditMode} language={language} siteContent={siteContent} />
              </span>
              <div className="h-[1px] w-full bg-gold/20 my-1 group-hover:bg-gold/50 transition-colors" />
              <span className={cn(
                "uppercase tracking-[0.25em] opacity-60 font-bold transition-all",
                deviceMode === 'mobile' ? "text-[6px]" : "text-[8px]"
              )}>
                <EditableText contentKey="nav.logo.sub" defaultValue="Language & Culture Link" isEditMode={isEditMode} language={language} siteContent={siteContent} />
              </span>
            </div>
          </div>

          <div className={cn(
            "items-center transition-all",
            (deviceMode === 'mobile' || deviceMode === 'pad') ? "hidden" : "flex gap-2 lg:gap-4 xl:gap-6"
          )}>
            {/* Home */}
            <div className="relative group" onMouseEnter={() => !isAnyTextEditing && setHoveredMenu(null)}>
              <div 
                onClick={() => setView('landing')} 
                className={cn(
                  "text-[10px] lg:text-xs uppercase tracking-widest transition-colors whitespace-nowrap py-4 cursor-pointer",
                  view === 'landing' ? "text-gold font-bold underline underline-offset-4" : "hover:text-gold"
                )}
                style={navStyleL1}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setView('landing'); } }}
              >
                <EditableText contentKey="global.nav.home" defaultValue={language === 'ko' ? '홈' : 'Home'} isEditMode={isEditMode} language={language} siteContent={siteContent} />
              </div>
            </div>

            {/* Curriculum */}
            <div className="relative group" onMouseEnter={() => !isAnyTextEditing && setHoveredMenu('curriculum')} onMouseLeave={() => setHoveredMenu(null)}>
              <div 
                onClick={() => scrollToSection('curriculum')} 
                className={cn(
                  "text-[10px] lg:text-xs uppercase tracking-widest transition-colors whitespace-nowrap py-4 cursor-pointer",
                  view === 'curriculum' ? "text-gold font-bold underline underline-offset-4" : "hover:text-gold"
                )}
                style={navStyleL1}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scrollToSection('curriculum'); } }}
              >
                <EditableText contentKey="global.nav.curriculum" defaultValue={t.nav.curriculum} isEditMode={isEditMode} language={language} siteContent={siteContent} />
              </div>
              <AnimatePresence>
                {hoveredMenu === 'curriculum' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 bg-paper border border-ink/10 rounded-xl shadow-xl z-[60] py-2 min-w-[240px] max-w-[400px]">
                    {navSubMenus.curriculum.map(item => (
                      <div key={item.id} className="relative group/sub px-2">
                        <div 
                          onClick={() => { item.action(); setHoveredMenu(null); }} 
                          className="w-full text-left px-4 py-2 text-[10px] lg:text-xs uppercase tracking-widest hover:bg-ink/5 hover:text-gold transition-colors rounded-lg cursor-pointer"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.action(); setHoveredMenu(null); } }}
                        >
                          <EditableText contentKey={`menu.submenu.curriculum.${item.id}.label`} defaultValue={item.label} isEditMode={isEditMode} language={language} siteContent={siteContent} />
                        </div>
                        {item.children && (
                          <div className="pl-4 border-l border-ink/5 ml-4 my-1 flex flex-wrap gap-x-3 gap-y-1">
                            {item.children.map(child => (
                              <div 
                                key={child.id} 
                                onClick={() => { child.action(); setHoveredMenu(null); }} 
                                className="text-left py-1 text-[9px] lg:text-[10px] uppercase tracking-[0.2em] opacity-50 hover:opacity-100 hover:text-gold transition-all whitespace-nowrap cursor-pointer"
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); child.action(); setHoveredMenu(null); } }}
                              >
                                <EditableText contentKey={`menu.submenu.curriculum.${item.id}.child.${child.id}.label`} defaultValue={child.label} isEditMode={isEditMode} language={language} siteContent={siteContent} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Pricing */}
            <div className="relative group" onMouseEnter={() => !isAnyTextEditing && setHoveredMenu('pricing')} onMouseLeave={() => setHoveredMenu(null)}>
              <div 
                onClick={() => setView('pricing')} 
                className={cn(
                  "text-[10px] lg:text-xs uppercase tracking-widest transition-colors whitespace-nowrap py-4 cursor-pointer",
                  view === 'pricing' ? "text-gold font-bold underline underline-offset-4" : "hover:text-gold"
                )}
                style={navStyleL1}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setView('pricing'); } }}
              >
                <EditableText contentKey="global.nav.pricing" defaultValue={t.nav.pricing} isEditMode={isEditMode} language={language} siteContent={siteContent} />
              </div>
              <AnimatePresence>
                {hoveredMenu === 'pricing' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 bg-paper border border-ink/10 rounded-xl shadow-xl z-[60] py-2 min-w-[160px]">
                    {navSubMenus.pricing.map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => { item.action(); setHoveredMenu(null); }} 
                        className="w-full text-left px-6 py-2 text-[10px] lg:text-xs uppercase tracking-widest hover:bg-ink/5 hover:text-gold transition-colors cursor-pointer"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.action(); setHoveredMenu(null); } }}
                      >
                        <EditableText contentKey={`menu.submenu.pricing.${item.id}.label`} defaultValue={item.label} isEditMode={isEditMode} language={language} siteContent={siteContent} />
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Archive */}
            <div className="relative group" onMouseEnter={() => !isAnyTextEditing && setHoveredMenu('archive')} onMouseLeave={() => setHoveredMenu(null)}>
              <div 
                onClick={() => scrollToSection('library')} 
                className={cn(
                  "text-[10px] lg:text-xs uppercase tracking-widest transition-colors whitespace-nowrap py-4 cursor-pointer",
                  view === 'archive' ? "text-gold font-bold underline underline-offset-4" : "hover:text-gold"
                )}
                style={navStyleL1}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scrollToSection('library'); } }}
              >
                <EditableText contentKey="global.nav.archive" defaultValue={t.nav.archive} isEditMode={isEditMode} language={language} siteContent={siteContent} />
              </div>
              <AnimatePresence>
                {hoveredMenu === 'archive' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 bg-paper border border-ink/10 rounded-xl shadow-xl z-[60] py-2 min-w-[240px] max-w-[400px]">
                    {navSubMenus.archive.map(item => (
                      <div key={item.id} className="relative group/sub px-2">
                        <div 
                          onClick={() => { item.action(); setHoveredMenu(null); }} 
                          className="w-full text-left px-4 py-2 text-[10px] lg:text-xs uppercase tracking-widest hover:bg-ink/5 hover:text-gold transition-colors rounded-lg cursor-pointer"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.action(); setHoveredMenu(null); } }}
                        >
                          <EditableText contentKey={`menu.submenu.archive.${item.id}.label`} defaultValue={item.label} isEditMode={isEditMode} language={language} siteContent={siteContent} />
                        </div>
                        {item.children && (
                          <div className="pl-4 border-l border-ink/5 ml-4 my-1 flex flex-wrap gap-x-3 gap-y-1">
                            {item.children.map(child => (
                              <div 
                                key={child.id} 
                                onClick={() => { child.action(); setHoveredMenu(null); }} 
                                className="text-left py-1 text-[9px] lg:text-[10px] uppercase tracking-[0.2em] opacity-50 hover:opacity-100 hover:text-gold transition-all whitespace-nowrap cursor-pointer"
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); child.action(); setHoveredMenu(null); } }}
                              >
                                <EditableText contentKey={`menu.submenu.archive.${item.id}.child.${child.id}.label`} defaultValue={child.label} isEditMode={isEditMode} language={language} siteContent={siteContent} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Community */}
            <div className="relative group" onMouseEnter={() => !isAnyTextEditing && setHoveredMenu('community')} onMouseLeave={() => setHoveredMenu(null)}>
              <div 
                onClick={() => setView('community')} 
                className={cn(
                  "text-[10px] lg:text-xs uppercase tracking-widest transition-colors whitespace-nowrap py-4 cursor-pointer",
                  view === 'community' ? "text-gold font-bold underline underline-offset-4" : "hover:text-gold"
                )}
                style={navStyleL1}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setView('community'); } }}
              >
                <EditableText contentKey="global.nav.community" defaultValue={t.nav.community} isEditMode={isEditMode} language={language} siteContent={siteContent} />
              </div>
              <AnimatePresence>
                {hoveredMenu === 'community' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 bg-paper border border-ink/10 rounded-xl shadow-xl z-[60] py-2 min-w-[160px]">
                    {navSubMenus.community.map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => { item.action(); setHoveredMenu(null); }} 
                        className="w-full text-left px-6 py-2 text-[10px] lg:text-xs uppercase tracking-widest hover:bg-ink/5 hover:text-gold transition-colors cursor-pointer"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.action(); setHoveredMenu(null); } }}
                      >
                        <EditableText contentKey={`menu.submenu.community.${item.id}.label`} defaultValue={item.label} isEditMode={isEditMode} language={language} siteContent={siteContent} />
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Admin */}
            {appMode === 'admin' && (
              <div className="relative group" onMouseEnter={() => !isAnyTextEditing && setHoveredMenu('admin')} onMouseLeave={() => setHoveredMenu(null)}>
                <div 
                  onClick={() => setView('admin')}
                  className={cn(
                    "text-[10px] lg:text-xs uppercase tracking-widest transition-colors text-gold font-bold whitespace-nowrap py-4 cursor-pointer",
                    view === 'admin' ? "underline underline-offset-4" : "hover:opacity-80"
                  )}
                  style={navStyleL1}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setView('admin'); } }}
                >
                  <EditableText contentKey="global.nav.admin" defaultValue={t.nav.admin} isEditMode={isEditMode} language={language} siteContent={siteContent} />
                </div>
                <AnimatePresence>
                  {hoveredMenu === 'admin' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 bg-paper border border-ink/10 rounded-xl shadow-xl z-[60] py-2 min-w-[160px]">
                      {navSubMenus.admin.map(item => (
                        <div 
                          key={item.id} 
                          onClick={() => { item.action(); setHoveredMenu(null); }} 
                          className="w-full text-left px-6 py-2 text-[10px] lg:text-xs uppercase tracking-widest hover:bg-ink/5 hover:text-gold transition-colors cursor-pointer"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.action(); setHoveredMenu(null); } }}
                        >
                          <EditableText contentKey={`menu.submenu.admin.${item.id}.label`} defaultValue={item.label} isEditMode={isEditMode} language={language} siteContent={siteContent} />
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Inquiry */}
            <div className="relative group" onMouseEnter={() => !isAnyTextEditing && setHoveredMenu(null)}>
              <div 
                onClick={() => setView('inquiry')} 
                className={cn(
                  "text-[10px] lg:text-xs uppercase tracking-widest transition-colors font-bold whitespace-nowrap py-4 cursor-pointer",
                  view === 'inquiry' ? "text-gold underline underline-offset-4" : "text-gold hover:opacity-80"
                )}
                style={{ ...navStyleL1, color: siteContent['global.style.navL1FontColor']?.value || '#c5a059' }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setView('inquiry'); } }}
              >
                <EditableText contentKey="global.nav.inquiry" defaultValue={t.nav.inquiry} isEditMode={isEditMode} language={language} siteContent={siteContent} />
              </div>
            </div>

            {/* Level Test */}
            <div className="relative group" onMouseEnter={() => !isAnyTextEditing && setHoveredMenu('level-test')} onMouseLeave={() => setHoveredMenu(null)}>
              <div 
                onClick={() => setView('level-test')} 
                className={cn(
                  "text-[10px] lg:text-xs uppercase tracking-widest transition-all font-bold whitespace-nowrap py-4 cursor-pointer",
                  view === 'level-test' ? "text-gold underline underline-offset-4" : "text-gold hover:opacity-80"
                )}
                style={{ ...navStyleL1, color: siteContent['global.style.navL1FontColor']?.value || '#c5a059' }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setView('level-test'); } }}
              >
                <EditableText contentKey="global.nav.levelTest" defaultValue={t.nav.levelTest} isEditMode={isEditMode} language={language} siteContent={siteContent} />
              </div>
              <AnimatePresence>
                {hoveredMenu === 'level-test' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 bg-paper border border-ink/10 rounded-xl shadow-xl z-[60] py-2 min-w-[160px]">
                    {navSubMenus['level-test'].map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => { item.action(); setHoveredMenu(null); }} 
                        className="w-full text-left px-6 py-2 text-[10px] lg:text-xs uppercase tracking-widest hover:bg-ink/5 hover:text-gold transition-colors cursor-pointer"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.action(); setHoveredMenu(null); } }}
                      >
                        <EditableText contentKey={`menu.submenu.level-test.${item.id}.label`} defaultValue={item.label} isEditMode={isEditMode} language={language} siteContent={siteContent} />
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className={cn(
            "items-center gap-3 lg:gap-6 transition-all",
            deviceMode === 'mobile' ? "hidden" : "flex"
          )}>
            <div className="flex items-center gap-3 lg:gap-6">
              {/* Language Selector */}
              <div className="relative group" onMouseEnter={() => !isAnyTextEditing && setHoveredMenu('language')} onMouseLeave={() => setHoveredMenu(null)}>
                <button className="flex items-center gap-2 p-2 hover:bg-ink/5 rounded-full transition-colors text-ink/70 hover:text-ink">
                  <Globe size={18} />
                  <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">{LANGUAGES.find(l => l.code === language)?.name}</span>
                </button>
                <AnimatePresence>
                  {hoveredMenu === 'language' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: 10 }} 
                      className="absolute top-full right-0 bg-paper border border-ink/10 rounded-xl shadow-xl z-[60] py-2 min-w-[120px]"
                    >
                      {LANGUAGES.map(lang => (
                        <button 
                          key={lang.code}
                          onClick={() => { setLanguage(lang.code as LanguageCode); setHoveredMenu(null); }}
                          className={cn(
                            "w-full text-left px-6 py-2 text-[10px] uppercase tracking-widest transition-colors hover:bg-ink/5 hover:text-gold",
                            language === lang.code ? "text-gold font-bold" : "text-ink/70"
                          )}
                        >
                          {lang.name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="h-4 w-[1px] bg-ink/10" />

              {/* Device Mode Selector */}
              <div className="flex items-center gap-1 bg-ink/5 p-1 rounded-full border border-ink/10">
                <button 
                  onClick={() => setDeviceMode('pc')}
                  className={cn(
                    "p-1.5 rounded-full transition-all",
                    deviceMode === 'pc' ? "bg-paper text-gold shadow-sm" : "text-ink/40 hover:text-ink"
                  )}
                  title="PC Mode"
                >
                  <Monitor size={14} />
                </button>
                <button 
                  onClick={() => setDeviceMode('pad')}
                  className={cn(
                    "p-1.5 rounded-full transition-all",
                    deviceMode === 'pad' ? "bg-paper text-gold shadow-sm" : "text-ink/40 hover:text-ink"
                  )}
                  title="Pad Mode"
                >
                  <Tablet size={14} />
                </button>
                <button 
                  onClick={() => setDeviceMode('mobile')}
                  className={cn(
                    "p-1.5 rounded-full transition-all",
                    deviceMode === 'mobile' ? "bg-paper text-gold shadow-sm" : "text-ink/40 hover:text-ink"
                  )}
                  title="Mobile Mode"
                >
                  <Smartphone size={14} />
                </button>
              </div>

              <div className="h-4 w-[1px] bg-ink/10" />

              {/* Theme Toggle */}
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 hover:bg-ink/5 rounded-full transition-colors text-ink/70 hover:text-ink"
              title={isDarkMode ? "Light Mode" : "Dark Mode"}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="h-4 w-[1px] bg-ink/10" />

            {/* Mode Selector Pill */}
            {user && (
              <div className="flex items-center gap-1 bg-ink/5 p-1 rounded-full border border-ink/10">
                <div 
                  onClick={() => {
                    setAppMode('learner');
                    setIsEditMode(false);
                    if (view === 'admin' || view === 'image-gen') setView('landing');
                  }}
                  onMouseEnter={() => {
                    if (!isAnyTextEditing) setHoveredMenu(null);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] lg:text-xs uppercase tracking-widest font-bold transition-all cursor-pointer",
                    appMode === 'learner' ? "bg-paper text-ink shadow-sm" : "text-ink/50 hover:text-ink"
                  )}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAppMode('learner'); setIsEditMode(false); if (view === 'admin' || view === 'image-gen') setView('landing'); } }}
                >
                  <User size={14} />
                  <EditableText 
                    contentKey="global.nav.learnerMode"
                    defaultValue={t.nav.learnerMode}
                    isEditMode={isEditMode}
                    language={language}
                    siteContent={siteContent}
                  />
                </div>
                {(isAdmin || siteContent['ai-studio-access']?.access === 'all' || (siteContent['ai-studio-access']?.access === 'premium' && userProfile?.role === 'premium') || (siteContent['ai-studio-access']?.access === 'member' && userProfile)) && (
                  <div 
                    onClick={() => {
                      if (appMode === 'admin') {
                        setIsEditMode(!isEditMode);
                      } else {
                        setAppMode('admin');
                        if (isAdmin) setIsEditMode(true);
                      }
                    }}
                    onMouseEnter={() => {
                      if (!isAnyTextEditing) setHoveredMenu('admin');
                    }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] lg:text-xs uppercase tracking-widest font-bold transition-all cursor-pointer",
                      appMode === 'admin' ? "bg-paper text-ink shadow-sm" : "text-ink/50 hover:text-ink"
                    )}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { 
                      if (e.key === 'Enter' || e.key === ' ') { 
                        e.preventDefault(); 
                        if (appMode === 'admin') {
                          setIsEditMode(!isEditMode);
                        } else {
                          setAppMode('admin');
                          if (isAdmin) setIsEditMode(true);
                        }
                      } 
                    }}
                  >
                    {(appMode === 'admin' && isEditMode) ? <Unlock size={14} /> : <Lock size={14} />}
                    <EditableText 
                      contentKey="global.nav.adminMode"
                      defaultValue={t.nav.adminMode}
                      isEditMode={isEditMode}
                      language={language}
                      siteContent={siteContent}
                    />
                  </div>
                )}
              </div>
            )}

            {/* User Profile & Logout */}
            {user ? (
              <div className={cn(
                "flex items-center transition-all",
                deviceMode === 'mobile' ? "gap-2" : "gap-4"
              )}>
                <div 
                  onClick={() => setView('mypage')}
                  onMouseEnter={() => {
                    if (!isAnyTextEditing) setHoveredMenu(null);
                  }}
                  className={cn(
                    "flex items-center gap-1 uppercase tracking-widest transition-colors whitespace-nowrap cursor-pointer",
                    deviceMode === 'mobile' ? "text-[8px]" : "text-[10px] lg:text-xs",
                    view === 'mypage' ? "text-gold font-bold underline underline-offset-4" : "hover:text-gold"
                  )}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setView('mypage'); } }}
                >
                  <User size={deviceMode === 'mobile' ? 12 : 14} /> 
                  <EditableText 
                    contentKey="global.nav.myPage"
                    defaultValue={t.nav.myPage}
                    isEditMode={isEditMode}
                    language={language}
                    siteContent={siteContent}
                  />
                </div>
                <button onClick={handleLogout} className="text-ink/50 hover:text-ink transition-colors">
                  <LogOut size={deviceMode === 'mobile' ? 16 : 18} />
                </button>
              </div>
            ) : (
              <div 
                role="button"
                tabIndex={0}
                onClick={handleLogin}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleLogin();
                  }
                }}
                onMouseEnter={() => {
                  if (!isAnyTextEditing) setHoveredMenu(null);
                }}
                className={cn(
                  "border border-ink rounded-full uppercase tracking-widest hover:bg-ink hover:text-paper transition-all whitespace-nowrap font-bold cursor-pointer",
                  deviceMode === 'mobile' ? "px-3 py-1.5 text-[8px]" : "px-6 py-2 text-[10px] lg:text-xs"
                )}
              >
                <EditableText 
                  contentKey="global.nav.login"
                  defaultValue={t.nav.login}
                  isEditMode={isEditMode}
                  language={language}
                  siteContent={siteContent}
                />
              </div>
            )}
          </div>
        </div>

          {/* Mobile Menu Button */}
          {(deviceMode === 'mobile' || deviceMode === 'pad') && (
            <div className="flex items-center gap-2 pr-4">
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 hover:bg-ink/5 rounded-full transition-colors text-ink/70 hover:text-ink"
              >
                {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button 
                onClick={() => setHoveredMenu(hoveredMenu === 'mobile' ? null : 'mobile')}
                className="p-2 hover:bg-ink/5 rounded-full transition-colors text-ink/70 hover:text-ink"
              >
                <Menu size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {deviceMode === 'mobile' && hoveredMenu === 'mobile' && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-paper border-t border-ink/10 overflow-hidden shadow-2xl"
            >
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] uppercase tracking-[0.3em] opacity-40 font-bold">Menu</span>
                  <button 
                    onClick={() => setHoveredMenu(null)}
                    className="p-2 hover:bg-ink/5 rounded-full transition-colors text-ink/70"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => { setView('landing'); setHoveredMenu(null); }} className="flex flex-col items-start p-4 bg-ink/5 rounded-2xl">
                    <span className="text-[10px] uppercase tracking-widest opacity-50 mb-1">Start</span>
                    <span className="text-xs font-bold">Home</span>
                  </button>
                  <button onClick={() => { scrollToSection('curriculum'); setHoveredMenu(null); }} className="flex flex-col items-start p-4 bg-ink/5 rounded-2xl">
                    <span className="text-[10px] uppercase tracking-widest opacity-50 mb-1">Learn</span>
                    <span className="text-xs font-bold">Curriculum</span>
                  </button>
                  <button onClick={() => { setView('pricing'); setHoveredMenu(null); }} className="flex flex-col items-start p-4 bg-ink/5 rounded-2xl">
                    <span className="text-[10px] uppercase tracking-widest opacity-50 mb-1">Plans</span>
                    <span className="text-xs font-bold">Pricing</span>
                  </button>
                  <button onClick={() => { scrollToSection('library'); setHoveredMenu(null); }} className="flex flex-col items-start p-4 bg-ink/5 rounded-2xl">
                    <span className="text-[10px] uppercase tracking-widest opacity-50 mb-1">Resources</span>
                    <span className="text-xs font-bold">Archive</span>
                  </button>
                  <button onClick={() => { setView('community'); setHoveredMenu(null); }} className="flex flex-col items-start p-4 bg-ink/5 rounded-2xl">
                    <span className="text-[10px] uppercase tracking-widest opacity-50 mb-1">Social</span>
                    <span className="text-xs font-bold">Community</span>
                  </button>
                  <button onClick={() => { setView('inquiry'); setHoveredMenu(null); }} className="flex flex-col items-start p-4 bg-gold/10 rounded-2xl border border-gold/20">
                    <span className="text-[10px] uppercase tracking-widest text-gold mb-1">Contact</span>
                    <span className="text-xs font-bold text-gold">Inquiry</span>
                  </button>
                </div>

                <div className="pt-6 border-t border-ink/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-ink/5 flex items-center justify-center">
                      <Globe size={14} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] uppercase tracking-widest opacity-50">Language</span>
                      <div className="flex gap-2">
                        {LANGUAGES.map(lang => (
                          <button 
                            key={lang.code}
                            onClick={() => setLanguage(lang.code as LanguageCode)}
                            className={cn(
                              "text-[10px] font-bold uppercase tracking-widest",
                              language === lang.code ? "text-gold" : "opacity-40"
                            )}
                          >
                            {lang.code}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {user ? (
                    <div className="flex items-center gap-3">
                      <button onClick={() => { setView('mypage'); setHoveredMenu(null); }} className="flex items-center gap-2 px-4 py-2 bg-ink text-paper rounded-full text-[10px] uppercase tracking-widest font-bold">
                        <User size={12} /> My Page
                      </button>
                      <button onClick={handleLogout} className="p-2 text-ink/40"><LogOut size={16} /></button>
                    </div>
                  ) : (
                    <button onClick={handleLogin} className="px-6 py-2 border border-ink rounded-full text-[10px] uppercase tracking-widest font-bold">Login</button>
                  )}
                </div>

                {/* Device Mode Selector in Mobile Menu */}
                <div className="pt-6 border-t border-ink/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] uppercase tracking-widest opacity-50 font-bold">View Mode</span>
                    <div className="flex bg-ink/5 p-1 rounded-full">
                      {(['pc', 'pad', 'mobile'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => { setDeviceMode(mode); setHoveredMenu(null); }}
                          className={cn(
                            "px-3 py-1 rounded-full text-[8px] uppercase tracking-widest font-bold transition-all",
                            deviceMode === mode ? "bg-white text-ink shadow-sm" : "text-ink/40 hover:text-ink"
                          )}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <div 
        className={cn(
          "flex-grow transition-all duration-500 mx-auto bg-paper shadow-2xl relative overflow-hidden flex flex-col",
          deviceMode === 'pc' ? "w-full" : 
          deviceMode === 'pad' ? "max-w-[768px] border-x border-ink/10" : 
          "max-w-[375px] border-x border-ink/10"
        )}
        style={{ minHeight: 'calc(100vh - 80px)' }}
      >
        <main className="flex-grow">
        <AnimatePresence mode="wait">
          {view === 'landing' && <LandingView key="landing" setView={setView} onBook={(course) => { setSelectedCourse(course); setView('inquiry'); }} setInitialArchiveFilter={setInitialArchiveFilter} language={language} isEditMode={isEditMode} isAdmin={isAdmin} siteContent={siteContent} isEventPeriod={isEventPeriod} deviceMode={deviceMode} />}
          {view === 'curriculum' && <CurriculumView key="curriculum" language={language} onBook={(course) => { setSelectedCourse(course); setView('inquiry'); }} isEditMode={isEditMode} isAdmin={isAdmin} siteContent={siteContent} deviceMode={deviceMode} />}
          {view === 'pricing' && <PricingView key="pricing" language={language} setView={setView} isEditMode={isEditMode} isAdmin={isAdmin} siteContent={siteContent} isEventPeriod={isEventPeriod} deviceMode={deviceMode} />}
          {view === 'booking' && <BookingView key="booking" course={selectedCourse} onComplete={() => setView('mypage')} isEventPeriod={isEventPeriod} siteContent={siteContent} deviceMode={deviceMode} />}
          {view === 'mypage' && <MyPageView key="mypage" deviceMode={deviceMode} setView={setView} setInitialArchiveFilter={setInitialArchiveFilter} bookmarks={bookmarks} toggleBookmark={toggleBookmark} language={language} allResources={allResources} isAdmin={isAdmin} />}
          {view === 'admin' && <AdminView key="admin" language={language} siteContent={siteContent} initialTab={adminTab} deviceMode={deviceMode} />}
          {view === 'image-gen' && <ImageGenView key="image-gen" language={language} userProfile={userProfile} isAuthReady={isAuthReady} setView={setView} siteContent={siteContent} deviceMode={deviceMode} />}
          {view === 'archive' && <ArchiveView key="archive" initialFilter={initialArchiveFilter} onClearFilter={() => setInitialArchiveFilter({ groupId: null, categoryId: null })} language={language} isAdmin={isAdmin} isEditMode={isEditMode} siteContent={siteContent} deviceMode={deviceMode} bookmarks={bookmarks} toggleBookmark={toggleBookmark} />}
          {view === 'community' && <CommunityView key="community" language={language} initialFilter={initialCommunityFilter} onClearFilter={() => setInitialCommunityFilter('all')} deviceMode={deviceMode} likes={likes} toggleLike={toggleLike} isAdmin={isAdmin} />}
          {view === 'level-test' && <LevelTestView key="level-test" language={language} isAdmin={isAdmin} isEditMode={isEditMode} siteContent={siteContent} deviceMode={deviceMode} />}
          {view === 'inquiry' && <InquiryView key="inquiry" language={language} onComplete={() => setView('landing')} isEventPeriod={isEventPeriod} siteContent={siteContent} isEditMode={isEditMode} isAdmin={isAdmin} initialCourse={selectedCourse} initialLevel={selectedLevel || undefined} deviceMode={deviceMode} />}
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
        
        <Footer language={language} isEditMode={isEditMode} siteContent={siteContent} setView={setView} />
      </main>

      <AnimatePresence>
        {isPostModalOpen && (
          <QuickPostModal 
            isOpen={isPostModalOpen}
            onClose={() => setIsPostModalOpen(false)}
            language={language}
            isAdmin={isAdmin}
            user={user}
            setView={setView}
            setIsEditMode={setIsEditMode}
            setAdminTab={setAdminTab}
            t={t}
          />
        )}
      </AnimatePresence>

      <footer className="bg-ink text-paper py-20 px-6">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
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
            <div className="text-xs uppercase tracking-widest mb-6 opacity-50">
              <EditableText contentKey="footer.contact_label" defaultValue={t.footer.contact} isEditMode={isEditMode} language={language} siteContent={siteContent} as="h4" />
            </div>
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
            <div className="text-xs uppercase tracking-widest mb-6 opacity-50">
              <EditableText contentKey="footer.social_label" defaultValue={t.footer.social} isEditMode={isEditMode} language={language} siteContent={siteContent} as="h4" />
            </div>
            <div className="flex flex-col gap-3">
              <Repeater 
                contentKey="footer.social_links"
                isEditMode={isEditMode}
                language={language}
                siteContent={siteContent}
                itemsPerPage={10}
                defaultCount={2}
                className="flex flex-wrap gap-4"
                addButtonLabel={language === 'ko' ? '소셜 링크 추가' : 'Add Social Link'}
                renderItem={(i) => (
                  <EditableLink 
                    contentKey={`footer.social_links.item_${i}`} 
                    defaultText={i === 0 ? "Instagram" : i === 1 ? "Blog" : "Link"} 
                    defaultUrl="#" 
                    isEditMode={isEditMode} 
                    language={language} 
                    siteContent={siteContent} 
                    className="text-sm hover:text-gold transition-colors flex items-center gap-1" 
                  />
                )}
              />
            </div>
          </div>
        </div>
        <div className={cn(
          "max-w-[1600px] mx-auto mt-20 pt-8 border-t border-paper/10 flex justify-between items-center transition-all",
          deviceMode === 'mobile' ? "flex-col gap-4 text-center" : "flex-row"
        )}>
          <p className="text-[10px] uppercase tracking-widest opacity-40">{t.footer.rights}</p>
          <div className="text-[10px] uppercase tracking-widest opacity-40">
            <EditableText contentKey="footer.tagline" defaultValue={t.footer.tagline} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </div>
        </div>
      </footer>
    </div>
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
  const [fontWeight, setFontWeight] = useState(content.fontWeight || "");
  const editorRef = useRef<any>(null);
  const dragControls = useDragControls();

  const displayValue = value || (isEditMode ? `[+ ${contentKey}]` : "");

  useEffect(() => {
    if (!isEditing) {
      if (content.value !== undefined) {
        setValue(content.value);
      } else {
        setValue(defaultValue);
      }
    }
    setFontFamily(content.fontFamily || "");
    setFontSize(content.fontSize || "");
    setColor(content.color || "");
    setFontWeight(content.fontWeight || "");
  }, [content.value, content.fontFamily, content.fontSize, content.color, content.fontWeight, defaultValue, isEditing]);

  useEffect(() => {
    if (isEditing && editorRef.current) {
      const currentHTML = editorRef.current.innerHTML;
      const targetHTML = value || defaultValue;
      if (currentHTML !== targetHTML && (!currentHTML || currentHTML === defaultValue)) {
        editorRef.current.innerHTML = targetHTML;
      }
    }
  }, [isEditing, value, defaultValue]);

  const handleSave = async () => {
    const finalValue = editorRef.current ? editorRef.current.innerHTML : value;
    const docId = `${language}_${contentKey.replace(/\./g, '_')}`;
    try {
      await setDoc(doc(db, 'siteContent', docId), {
        key: contentKey,
        language,
        value: finalValue,
        fontFamily,
        fontSize,
        color,
        fontWeight,
        updatedAt: serverTimestamp()
      });
      setValue(finalValue);
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'siteContent');
    }
  };

  const applyCommand = (cmd: string, val?: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand('styleWithCSS', false, "true");
    document.execCommand(cmd, false, val);
  };

  const currentStyles = {
    fontFamily: fontFamily || undefined,
    fontSize: fontSize || undefined,
    color: color || undefined,
    fontWeight: fontWeight || undefined
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
    return <span dangerouslySetInnerHTML={{ __html: displayValue }} />;
  };

  if (!isEditMode && !value) return null;

  if (isEditMode) {
    return (
      <div 
        className={cn("relative group inline-block", className, isEditing && "z-[400]")}
        onClick={(e) => e.stopPropagation()}
      >
        <Component
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onFocus={() => setIsEditing(true)}
          onKeyDown={(e: React.KeyboardEvent) => {
            e.stopPropagation();
            if (e.key === 'Enter' && e.shiftKey) {
              e.preventDefault();
              document.execCommand('insertLineBreak');
            } else if (e.key === 'Enter') {
              // Default behavior for Enter in contentEditable is fine, 
              // but we can prevent it if we want single-line only.
              // For now, let's allow multi-line.
            }
            // Ensure propagation for Shift and other selection keys
          }}
          onKeyUp={(e: React.KeyboardEvent) => {
            e.stopPropagation();
          }}
          onBlur={() => {
            // We don't set setIsEditing(false) here because we want the toolbar 
            // to stay visible until Save or Cancel is clicked.
            // But we can ensure focus remains if needed.
          }}
          className={cn(
            "outline-none focus:ring-2 focus:ring-gold/30 rounded px-1 transition-all min-w-[1ch] inline-block",
            !value && "opacity-30 italic",
            isEditing && "bg-gold/10"
          )}
          style={currentStyles}
          dangerouslySetInnerHTML={!isEditing ? { __html: value || defaultValue } : undefined}
        />
        
        {isEditing && (
          <motion.div 
            drag
            dragControls={dragControls}
            dragListener={false}
            dragMomentum={false}
            className={cn(
              "fixed top-1/4 left-1/2 -ml-[170px] p-6 bg-card border-2 border-gold shadow-[0_30px_60px_rgba(0,0,0,0.4)] rounded-[32px] z-[1000] flex flex-col gap-5 min-w-[340px] max-w-[95vw]",
              "animate-in fade-in zoom-in duration-300"
            )}
          >
            <div 
              onPointerDown={(e) => dragControls.start(e)}
              className="flex items-center justify-between border-b border-ink/10 pb-4 cursor-move active:cursor-grabbing group/drag"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-gold/10 rounded-lg">
                  <GripHorizontal size={18} className="text-gold" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ink/40 leading-none mb-1">Editor</span>
                  <span className="text-xs font-bold text-ink leading-none">Text Content</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyCommand('bold')} title="Bold" className="p-2.5 hover:bg-gold/20 rounded-xl border border-ink/5 transition-colors"><Bold size={16} /></button>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyCommand('italic')} title="Italic" className="p-2.5 hover:bg-gold/20 rounded-xl border border-ink/5 transition-colors"><Italic size={16} /></button>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyCommand('underline')} title="Underline" className="p-2.5 hover:bg-gold/20 rounded-xl border border-ink/5 transition-colors"><Underline size={16} /></button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-tighter opacity-40 font-bold">Font Family</label>
                <select 
                  value={fontFamily} 
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full text-xs p-2 border border-ink/10 rounded-xl bg-paper focus:ring-1 focus:ring-gold outline-none"
                >
                  <option value="">Default</option>
                  {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-tighter opacity-40 font-bold">Font Size</label>
                <select 
                  value={fontSize} 
                  onChange={(e) => setFontSize(e.target.value)}
                  className="w-full text-xs p-2 border border-ink/10 rounded-xl bg-paper focus:ring-1 focus:ring-gold outline-none"
                >
                  <option value="">Default</option>
                  {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-tighter opacity-40 font-bold">Font Weight</label>
                <select 
                  value={fontWeight} 
                  onChange={(e) => setFontWeight(e.target.value)}
                  className="w-full text-xs p-2 border border-ink/10 rounded-xl bg-paper focus:ring-1 focus:ring-gold outline-none"
                >
                  <option value="">Default</option>
                  {['100', '200', '300', '400', '500', '600', '700', '800', '900'].map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-tighter opacity-40 font-bold">Current Color</label>
                <div className="flex items-center gap-3 p-2 border border-ink/10 rounded-xl bg-paper">
                  <div className="w-4 h-4 rounded-full border border-ink/10 shadow-inner" style={{ backgroundColor: color || '#000000' }} />
                  <span className="text-[10px] font-mono uppercase font-bold text-ink/60">{color || 'Default'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] uppercase tracking-tighter opacity-40 font-bold">Color Palette</label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 border border-ink/5 rounded-xl bg-paper/50">
                {COLORS.map(c => (
                  <button 
                    key={c} 
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      const selection = window.getSelection();
                      if (selection && selection.toString().length > 0) {
                        applyCommand('foreColor', c);
                      } else {
                        setColor(c);
                      }
                    }}
                    className={cn(
                      "w-5 h-5 rounded-full border border-ink/10 hover:scale-125 transition-all shadow-sm", 
                      color === c && "ring-2 ring-gold ring-offset-1"
                    )}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-ink/10">
              <button 
                onClick={() => {
                  setIsEditing(false);
                  if (editorRef.current) editorRef.current.innerHTML = value;
                }} 
                className="px-5 py-2 text-xs uppercase tracking-widest font-bold text-ink/40 hover:text-ink transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave} 
                className="px-6 py-2 bg-gold text-ink rounded-full text-xs uppercase tracking-widest font-black hover:scale-105 active:scale-95 transition-all shadow-[0_10px_20px_rgba(197,160,89,0.3)]"
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  return <Component className={className} style={currentStyles}>{renderContent()}</Component>;
};

const Repeater: FC<{
  contentKey: string,
  isEditMode: boolean,
  language: string,
  siteContent: Record<string, any>,
  renderItem: (index: number) => React.ReactNode,
  className?: string,
  containerClassName?: string,
  addButtonLabel?: string,
  defaultCount?: number,
  itemsPerPage?: number
}> = ({ contentKey, isEditMode, language, siteContent, renderItem, className, containerClassName, addButtonLabel, defaultCount = 0, itemsPerPage = 5 }) => {
  const countKey = `${contentKey}.count`;
  const count = siteContent[countKey]?.value !== undefined ? Number(siteContent[countKey].value) : defaultCount;
  const [currentPage, setCurrentPage] = useState(0);

  const totalPages = Math.ceil(count / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, count);
  
  // Stable IDs for smooth reordering
  const [items, setItems] = useState<{id: string, idx: number}[]>([]);

  useEffect(() => {
    const indices = Array.from({ length: count }).map((_, i) => i);
    const pageIndices = indices.slice(startIndex, endIndex);
    
    setItems(prev => {
      // Preserve IDs for existing indices to prevent flickering
      return pageIndices.map(idx => {
        const existing = prev.find(p => p.idx === idx);
        return existing || { id: Math.random().toString(36).substring(2, 9), idx };
      });
    });
  }, [count, startIndex, endIndex]);

  const handleAdd = async () => {
    const docId = `${language}_${countKey.replace(/\./g, '_')}`;
    try {
      await setDoc(doc(db, 'siteContent', docId), {
        key: countKey,
        language,
        value: count + 1,
        updatedAt: serverTimestamp()
      });
      if (count > 0 && count % itemsPerPage === 0) {
        setCurrentPage(totalPages);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'siteContent');
    }
  };

  const handleRemove = async (index: number) => {
    const docId = `${language}_${countKey.replace(/\./g, '_')}`;
    try {
      // When removing, we should also shift data to fill the gap
      const batch = writeBatch(db);
      const allKeys = Object.keys(siteContent);
      
      // Shift all items after the removed one
      for (let i = index + 1; i < count; i++) {
        const oldPrefix = `${contentKey}.item_${i}.`;
        const newPrefix = `${contentKey}.item_${i - 1}.`;
        const itemKeys = allKeys.filter(k => k.startsWith(oldPrefix));
        
        for (const key of itemKeys) {
          const suffix = key.replace(oldPrefix, '');
          const newKey = `${newPrefix}${suffix}`;
          batch.set(doc(db, 'siteContent', `${language}_${newKey.replace(/\./g, '_')}`), {
            key: newKey, language, value: siteContent[key].value, updatedAt: serverTimestamp()
          });
        }
      }

      // Update count
      batch.set(doc(db, 'siteContent', docId), {
        key: countKey,
        language,
        value: count - 1,
        updatedAt: serverTimestamp()
      });

      await batch.commit();

      if (currentPage >= Math.ceil((count - 1) / itemsPerPage) && currentPage > 0) {
        setCurrentPage(currentPage - 1);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'siteContent');
    }
  };

  const reindexFirestore = async (newOrder: number[]) => {
    const batch = writeBatch(db);
    const allKeys = Object.keys(siteContent);
    
    // Store all current data in memory
    const dataMap: Record<number, Record<string, any>> = {};
    for (const originalIdx of newOrder) {
      const prefix = `${contentKey}.item_${originalIdx}.`;
      const itemKeys = allKeys.filter(k => k.startsWith(prefix));
      dataMap[originalIdx] = {};
      for (const key of itemKeys) {
        const suffix = key.replace(prefix, '');
        dataMap[originalIdx][suffix] = siteContent[key].value;
      }
    }
    
    // Write back to Firestore with new indices
    for (let i = 0; i < newOrder.length; i++) {
      const originalIdx = newOrder[i];
      const targetIdx = startIndex + i;
      const data = dataMap[originalIdx];
      
      const targetPrefix = `${contentKey}.item_${targetIdx}.`;
      for (const [suffix, value] of Object.entries(data)) {
        const targetKey = `${targetPrefix}${suffix}`;
        batch.set(doc(db, 'siteContent', `${language}_${targetKey.replace(/\./g, '_')}`), {
          key: targetKey, language, value, updatedAt: serverTimestamp()
        });
      }
    }
    await batch.commit();
  };

  const handleMove = async (originalIdx: number, direction: 'up' | 'down') => {
    const visualIdx = items.findIndex(item => item.idx === originalIdx);
    const targetVisualIdx = direction === 'up' ? visualIdx - 1 : visualIdx + 1;
    
    if (targetVisualIdx < 0 || targetVisualIdx >= items.length) return;

    const newItems = [...items];
    [newItems[visualIdx], newItems[targetVisualIdx]] = [newItems[targetVisualIdx], newItems[visualIdx]];
    
    setItems(newItems);
    await reindexFirestore(newItems.map(item => item.idx));
  };

  const handleReorder = async (newItems: typeof items) => {
    setItems(newItems);
    await reindexFirestore(newItems.map(item => item.idx));
  };

  return (
    <div className={containerClassName}>
      {isEditMode ? (
        <Reorder.Group 
          axis={className?.includes('flex') && !className?.includes('flex-col') ? "x" : "y"} 
          values={items} 
          onReorder={handleReorder}
          className={className}
        >
          {items.map((item) => (
            <Reorder.Item key={item.id} value={item} className="relative group/repeater-item">
              <div className="cursor-grab active:cursor-grabbing">
                {renderItem(item.idx)}
              </div>
              <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover/repeater-item:opacity-100 transition-opacity z-20">
                <button 
                  onClick={() => handleMove(item.idx, 'up')}
                  disabled={items.indexOf(item) === 0 && currentPage === 0}
                  className="w-6 h-6 bg-gold text-ink rounded-full flex items-center justify-center shadow-lg hover:scale-110 disabled:opacity-20"
                >
                  <ArrowUp size={12} />
                </button>
                <button 
                  onClick={() => handleMove(item.idx, 'down')}
                  disabled={items.indexOf(item) === items.length - 1 && currentPage === totalPages - 1}
                  className="w-6 h-6 bg-gold text-ink rounded-full flex items-center justify-center shadow-lg hover:scale-110 disabled:opacity-20"
                >
                  <ArrowDown size={12} />
                </button>
                <button 
                  onClick={() => handleRemove(item.idx)}
                  className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110"
                >
                  <X size={12} />
                </button>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      ) : (
        <div className={className}>
          {items.map((item) => (
            <div key={item.id} className="relative group/repeater-item">
              {renderItem(item.idx)}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-12 flex items-center justify-center gap-4">
          <button 
            disabled={currentPage === 0}
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="p-2 rounded-full border border-ink/10 disabled:opacity-20 hover:bg-gold/10 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  currentPage === i ? "bg-gold w-6" : "bg-ink/10 hover:bg-gold/30"
                )}
              />
            ))}
          </div>
          <button 
            disabled={currentPage === totalPages - 1}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="p-2 rounded-full border border-ink/10 disabled:opacity-20 hover:bg-gold/10 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {isEditMode && (
        <button 
          onClick={handleAdd}
          className="mt-12 flex items-center gap-2 px-6 py-3 bg-gold/10 text-gold border border-gold/20 rounded-full text-[10px] uppercase tracking-widest font-bold hover:bg-gold hover:text-ink transition-all mx-auto group"
        >
          <Plus size={16} className="group-hover:rotate-90 transition-transform" /> {addButtonLabel || 'Add Item'}
        </button>
      )}
    </div>
  );
};
const QuickPostModal: FC<{
  isOpen: boolean,
  onClose: () => void,
  language: string,
  isAdmin: boolean,
  user: any,
  setView: (view: any) => void,
  setIsEditMode: (mode: boolean) => void,
  setAdminTab: (tab: any) => void,
  t: any
}> = ({ isOpen, onClose, language, isAdmin, user, setView, setIsEditMode, setAdminTab, t }) => {
  if (!isOpen) return null;

  const options = [
    {
      id: 'community',
      title: language === 'ko' ? '커뮤니티 게시글' : 'Community Post',
      desc: language === 'ko' ? '질문이나 자료 요청을 남겨보세요.' : 'Leave questions or resource requests.',
      icon: <MessageSquare size={24} />,
      action: () => { setView('community'); onClose(); },
      show: !!user
    },
    {
      id: 'resource',
      title: language === 'ko' ? '자료실 업로드' : 'Upload Resource',
      desc: language === 'ko' ? '새로운 학습 자료를 등록합니다.' : 'Register new learning materials.',
      icon: <Upload size={24} />,
      action: () => { 
        setAdminTab('resources');
        setView('admin'); 
        onClose(); 
      },
      show: isAdmin
    },
    {
      id: 'landing',
      title: language === 'ko' ? '홈페이지 섹션 추가' : 'Add Landing Section',
      desc: language === 'ko' ? '홈페이지에 새로운 콘텐츠 블록을 추가합니다.' : 'Add a new content block to the homepage.',
      icon: <PlusCircle size={24} />,
      action: () => { 
        setView('landing'); 
        setIsEditMode(true); 
        onClose();
        setTimeout(() => {
          const element = document.getElementById('landing-dynamic-area');
          if (element) element.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      },
      show: isAdmin
    }
  ].filter(opt => opt.show);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg bg-paper rounded-[40px] shadow-2xl overflow-hidden p-10 space-y-8"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-3xl font-serif">{language === 'ko' ? '무엇을 추가할까요?' : 'What would you like to add?'}</h2>
            <p className="text-xs opacity-50 uppercase tracking-widest">{language === 'ko' ? '원하는 게시 유형을 선택하세요' : 'Select the type of content to post'}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-ink/5 flex items-center justify-center hover:bg-ink/10 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {options.length > 0 ? options.map(opt => (
            <div 
              key={opt.id}
              onClick={opt.action}
              className="flex items-center gap-6 p-6 rounded-[32px] border border-ink/5 hover:border-gold hover:bg-gold/5 transition-all group text-left cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  opt.action();
                }
              }}
            >
              <div className="w-14 h-14 rounded-2xl bg-ink/5 flex items-center justify-center group-hover:bg-gold group-hover:text-ink transition-colors">
                {opt.icon}
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-serif">{opt.title}</h3>
                <p className="text-xs opacity-60 leading-relaxed">{opt.desc}</p>
              </div>
              <ChevronRight size={20} className="ml-auto opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
          )) : (
            <div className="p-12 text-center space-y-4 bg-ink/5 rounded-[32px]">
              <AlertCircle size={40} className="mx-auto opacity-20" />
              <p className="text-sm opacity-60">{language === 'ko' ? '게시 권한이 없거나 로그인이 필요합니다.' : 'No posting permissions or login required.'}</p>
              {!user && (
                <button onClick={() => { onClose(); }} className="px-8 py-3 bg-ink text-paper rounded-full text-[10px] uppercase tracking-widest font-bold">
                  {t.nav.login}
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const DynamicContentArea: FC<{
  contentKey: string,
  isEditMode: boolean,
  isAdmin?: boolean,
  language: string,
  siteContent: Record<string, any>,
  itemsPerPage?: number
}> = ({ contentKey, isEditMode, isAdmin, language, siteContent, itemsPerPage = 5 }) => {
  const countKey = `${contentKey}.count`;
  const count = siteContent[countKey]?.value !== undefined ? Number(siteContent[countKey].value) : 0;
  const [currentPage, setCurrentPage] = useState(0);
  const dragControls = useDragControls();

  const totalPages = Math.ceil(count / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, count);
  const visibleIndices = Array.from({ length: count }).map((_, i) => i).slice(startIndex, endIndex);

  const handleAdd = async (type: string) => {
    const countDocId = `${language}_${countKey.replace(/\./g, '_')}`;
    const typeKey = `${contentKey}.item_${count}.type`;
    const typeDocId = `${language}_${typeKey.replace(/\./g, '_')}`;
    
    try {
      await setDoc(doc(db, 'siteContent', typeDocId), {
        key: typeKey,
        language,
        value: type,
        updatedAt: serverTimestamp()
      });
      
      await setDoc(doc(db, 'siteContent', countDocId), {
        key: countKey,
        language,
        value: count + 1,
        updatedAt: serverTimestamp()
      });

      if (count > 0 && count % itemsPerPage === 0) {
        setCurrentPage(totalPages);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'siteContent');
    }
  };

  const handleRemove = async (index: number) => {
    if (count <= 0) return;
    const countDocId = `${language}_${countKey.replace(/\./g, '_')}`;
    try {
      await setDoc(doc(db, 'siteContent', countDocId), {
        key: countKey,
        language,
        value: count - 1,
        updatedAt: serverTimestamp()
      });
      if (currentPage >= Math.ceil((count - 1) / itemsPerPage) && currentPage > 0) {
        setCurrentPage(currentPage - 1);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'siteContent');
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= count) return;

    const itemIKeys = Object.keys(siteContent).filter(k => k.startsWith(`${contentKey}.item_${index}.`));
    const itemJKeys = Object.keys(siteContent).filter(k => k.startsWith(`${contentKey}.item_${targetIndex}.`));

    try {
      // Swap type first
      const typeKeyI = `${contentKey}.item_${index}.type`;
      const typeKeyJ = `${contentKey}.item_${targetIndex}.type`;
      const valTypeI = siteContent[typeKeyI]?.value;
      const valTypeJ = siteContent[typeKeyJ]?.value;

      await setDoc(doc(db, 'siteContent', `${language}_${typeKeyI.replace(/\./g, '_')}`), {
        key: typeKeyI, language, value: valTypeJ, updatedAt: serverTimestamp()
      });
      await setDoc(doc(db, 'siteContent', `${language}_${typeKeyJ.replace(/\./g, '_')}`), {
        key: typeKeyJ, language, value: valTypeI, updatedAt: serverTimestamp()
      });

      // Swap other properties
      for (const key of itemIKeys) {
        if (key === typeKeyI) continue;
        const suffix = key.replace(`${contentKey}.item_${index}.`, '');
        const targetKey = `${contentKey}.item_${targetIndex}.${suffix}`;
        const valI = siteContent[key].value;
        const valJ = siteContent[targetKey]?.value;

        await setDoc(doc(db, 'siteContent', `${language}_${key.replace(/\./g, '_')}`), {
          key, language, value: valJ, updatedAt: serverTimestamp()
        });
        await setDoc(doc(db, 'siteContent', `${language}_${targetKey.replace(/\./g, '_')}`), {
          key: targetKey, language, value: valI, updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'siteContent');
    }
  };

  const updateBlockSetting = async (index: number, key: string, value: any) => {
    const settingKey = `${contentKey}.item_${index}.${key}`;
    const docId = `${language}_${settingKey.replace(/\./g, '_')}`;
    try {
      await setDoc(doc(db, 'siteContent', docId), {
        key: settingKey,
        language,
        value,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'siteContent');
    }
  };

  if (count === 0 && !isEditMode) return null;

  return (
    <div className="space-y-20">
      <div className="space-y-20">
        {visibleIndices.map((i) => {
          const typeKey = `${contentKey}.item_${i}.type`;
          const type = siteContent[typeKey]?.value || 'text';
          
          const aspect = siteContent[`${contentKey}.item_${i}.aspect`]?.value || 'aspect-video';
          const fit = siteContent[`${contentKey}.item_${i}.fit`]?.value || 'object-cover';
          const width = siteContent[`${contentKey}.item_${i}.width`]?.value || 'max-w-5xl';
          const hasOverlay = siteContent[`${contentKey}.item_${i}.hasOverlay`]?.value === 'true';
          const overlayPos = siteContent[`${contentKey}.item_${i}.overlayPos`]?.value || 'center';
          
          return (
            <div key={i} className="relative group/dynamic-block">
              {type === 'text' && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="max-w-3xl mx-auto text-center space-y-8"
                >
                  <div className="text-4xl md:text-5xl font-serif font-light">
                    <EditableText contentKey={`${contentKey}.item_${i}.title`} defaultValue="New Section Title" isEditMode={isEditMode} language={language} siteContent={siteContent} as="div" />
                  </div>
                  <div className="text-lg opacity-70 font-serif leading-relaxed">
                    <EditableText contentKey={`${contentKey}.item_${i}.content`} defaultValue="Add your content here. This is a dynamic text section that you can edit directly." isEditMode={isEditMode} language={language} siteContent={siteContent} as="div" />
                  </div>
                </motion.div>
              )}
              {type === 'image' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className={cn("mx-auto rounded-[40px] overflow-hidden shadow-2xl relative", width, aspect === 'aspect-auto' ? 'h-auto' : aspect)}
                >
                  <EditableImage 
                    contentKey={`${contentKey}.item_${i}.image`}
                    defaultUrl={`https://picsum.photos/seed/dynamic-${i}/1200/800`}
                    alt="Dynamic Image"
                    isEditMode={isEditMode}
                    isAdmin={isAdmin}
                    language={language}
                    siteContent={siteContent}
                    rounded="rounded-[40px]"
                    className={cn("w-full h-full", fit)}
                  >
                    {hasOverlay && (
                      <div className={cn(
                        "absolute inset-0 flex flex-col p-12 z-10",
                        overlayPos === 'top' ? 'justify-start items-center text-center' :
                        overlayPos === 'bottom' ? 'justify-end items-center text-center' :
                        'justify-center items-center text-center'
                      )}>
                        <div className="absolute inset-0 bg-ink/20 pointer-events-none" />
                        <div className="relative z-10 space-y-4 max-w-2xl">
                          <div className="text-4xl md:text-6xl font-serif font-light text-white drop-shadow-2xl">
                            <EditableText contentKey={`${contentKey}.item_${i}.overlayTitle`} defaultValue="Image Title" isEditMode={isEditMode} language={language} siteContent={siteContent} as="div" />
                          </div>
                          <div className="text-lg md:text-xl font-serif text-white/90 drop-shadow-xl">
                            <EditableText contentKey={`${contentKey}.item_${i}.overlaySubtitle`} defaultValue="Image Subtitle or Description" isEditMode={isEditMode} language={language} siteContent={siteContent} as="div" />
                          </div>
                        </div>
                      </div>
                    )}
                  </EditableImage>
                </motion.div>
              )}
              {type === 'media' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className={cn("mx-auto rounded-[40px] overflow-hidden shadow-2xl relative", width, aspect === 'aspect-auto' ? 'h-auto' : aspect)}
                >
                  <EditableMedia 
                    contentKey={`${contentKey}.item_${i}.media`}
                    defaultUrls={[`https://picsum.photos/seed/dynamic-${i}-1/1200/800`]}
                    isEditMode={isEditMode}
                    isAdmin={isAdmin}
                    language={language}
                    siteContent={siteContent}
                    rounded="rounded-[40px]"
                    aspectRatio={aspect === 'aspect-auto' ? 'aspect-video' : aspect}
                    className={cn("w-full h-full", fit)}
                  />
                </motion.div>
              )}
              {type === 'quote' && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="max-w-4xl mx-auto p-12 bg-gold/5 border-l-4 border-gold rounded-r-[40px] space-y-6"
                >
                  <div className="text-3xl font-serif italic opacity-80">
                    <EditableText contentKey={`${contentKey}.item_${i}.quote`} defaultValue="A meaningful quote or highlight that stands out." isEditMode={isEditMode} language={language} siteContent={siteContent} />
                  </div>
                  <div className="text-xs uppercase tracking-widest font-bold text-gold">
                    <EditableText contentKey={`${contentKey}.item_${i}.author`} defaultValue="Author Name" isEditMode={isEditMode} language={language} siteContent={siteContent} />
                  </div>
                </motion.div>
              )}
              
              {isEditMode && (
                <div className="absolute -top-4 -right-4 flex flex-col gap-2 opacity-0 group-hover/dynamic-block:opacity-100 transition-opacity z-20">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleMove(i, 'up')}
                      disabled={i === 0}
                      className="w-8 h-8 bg-gold text-ink rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform disabled:opacity-20"
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button 
                      onClick={() => handleMove(i, 'down')}
                      disabled={i === count - 1}
                      className="w-8 h-8 bg-gold text-ink rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform disabled:opacity-20"
                    >
                      <ArrowDown size={16} />
                    </button>
                    <button 
                      onClick={() => handleRemove(i)}
                      className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
                      title="Remove block"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  
                  {(type === 'image' || type === 'media') && (
                    <motion.div 
                      drag
                      dragControls={dragControls}
                      dragListener={false}
                      dragMomentum={false}
                      className="bg-white/95 backdrop-blur-xl p-4 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-gold/20 flex flex-col gap-4 min-w-[200px]"
                    >
                      <div 
                        onPointerDown={(e) => dragControls.start(e)}
                        className="flex items-center gap-2 border-b border-ink/5 pb-2 mb-1 cursor-move active:cursor-grabbing group/drag"
                      >
                        <GripHorizontal size={14} className="text-gold opacity-40 group-hover/drag:opacity-100 transition-opacity" />
                        <span className="text-[9px] uppercase tracking-widest font-bold text-ink/60 select-none">Block Settings</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] uppercase tracking-widest opacity-50 font-bold">Text Overlay</span>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => updateBlockSetting(i, 'hasOverlay', hasOverlay ? 'false' : 'true')}
                            className={cn(
                              "px-2 py-1 text-[8px] rounded-md border transition-all",
                              hasOverlay ? "bg-gold text-ink border-gold" : "bg-ink/5 border-transparent hover:border-gold/30"
                            )}
                          >
                            {hasOverlay ? 'Enabled' : 'Disabled'}
                          </button>
                          {hasOverlay && (
                            <div className="flex gap-1">
                              {[
                                { label: 'Top', val: 'top' },
                                { label: 'Center', val: 'center' },
                                { label: 'Bottom', val: 'bottom' }
                              ].map(opt => (
                                <button 
                                  key={opt.val}
                                  onClick={() => updateBlockSetting(i, 'overlayPos', opt.val)}
                                  className={cn(
                                    "px-2 py-1 text-[8px] rounded-md border transition-all",
                                    overlayPos === opt.val ? "bg-gold text-ink border-gold" : "bg-ink/5 border-transparent hover:border-gold/30"
                                  )}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] uppercase tracking-widest opacity-50 font-bold">Aspect Ratio</span>
                        <div className="flex gap-1">
                          {[
                            { label: '16:9', val: 'aspect-video' },
                            { label: '1:1', val: 'aspect-square' },
                            { label: '4:3', val: 'aspect-[4/3]' },
                            { label: 'Auto', val: 'aspect-auto' }
                          ].map(opt => (
                            <button 
                              key={opt.val}
                              onClick={() => updateBlockSetting(i, 'aspect', opt.val)}
                              className={cn(
                                "px-2 py-1 text-[8px] rounded-md border transition-all",
                                aspect === opt.val ? "bg-gold text-ink border-gold" : "bg-ink/5 border-transparent hover:border-gold/30"
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] uppercase tracking-widest opacity-50 font-bold">Fit</span>
                        <div className="flex gap-1">
                          {[
                            { label: 'Cover', val: 'object-cover' },
                            { label: 'Contain', val: 'object-contain' }
                          ].map(opt => (
                            <button 
                              key={opt.val}
                              onClick={() => updateBlockSetting(i, 'fit', opt.val)}
                              className={cn(
                                "px-2 py-1 text-[8px] rounded-md border transition-all",
                                fit === opt.val ? "bg-gold text-ink border-gold" : "bg-ink/5 border-transparent hover:border-gold/30"
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] uppercase tracking-widest opacity-50 font-bold">Width</span>
                        <div className="flex gap-1">
                          {[
                            { label: 'Narrow', val: 'max-w-3xl' },
                            { label: 'Medium', val: 'max-w-5xl' },
                            { label: 'Wide', val: 'max-w-[1600px]' }
                          ].map(opt => (
                            <button 
                              key={opt.val}
                              onClick={() => updateBlockSetting(i, 'width', opt.val)}
                              className={cn(
                                "px-2 py-1 text-[8px] rounded-md border transition-all",
                                width === opt.val ? "bg-gold text-ink border-gold" : "bg-ink/5 border-transparent hover:border-gold/30"
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button 
            disabled={currentPage === 0}
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="p-2 rounded-full border border-ink/10 disabled:opacity-20 hover:bg-gold/10 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  currentPage === i ? "bg-gold w-6" : "bg-ink/10 hover:bg-gold/30"
                )}
              />
            ))}
          </div>
          <button 
            disabled={currentPage === totalPages - 1}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="p-2 rounded-full border border-ink/10 disabled:opacity-20 hover:bg-gold/10 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {isEditMode && (
        <div className="max-w-4xl mx-auto py-20 border-2 border-dashed border-gold/20 rounded-[40px] bg-gold/5 flex flex-col items-center gap-8">
          <div className="text-center space-y-2">
            <h4 className="text-xs uppercase tracking-[0.4em] font-bold text-gold">Add New Section</h4>
            <p className="text-[10px] opacity-50 uppercase tracking-widest">Choose a block type to add to the page</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            <button onClick={() => handleAdd('text')} className="px-8 py-4 bg-ink text-paper rounded-full text-[10px] uppercase tracking-widest font-bold hover:bg-gold hover:text-ink transition-all flex items-center gap-2 shadow-lg">
              <FileText size={14} /> Text Block
            </button>
            <button onClick={() => handleAdd('image')} className="px-8 py-4 bg-ink text-paper rounded-full text-[10px] uppercase tracking-widest font-bold hover:bg-gold hover:text-ink transition-all flex items-center gap-2 shadow-lg">
              <ImageIcon size={14} /> Single Image Block
            </button>
            <button onClick={() => handleAdd('media')} className="px-8 py-4 bg-ink text-paper rounded-full text-[10px] uppercase tracking-widest font-bold hover:bg-gold hover:text-ink transition-all flex items-center gap-2 shadow-lg">
              <Upload size={14} /> Multi-Media Gallery Block
            </button>
            <button onClick={() => handleAdd('quote')} className="px-8 py-4 bg-ink text-paper rounded-full text-[10px] uppercase tracking-widest font-bold hover:bg-gold hover:text-ink transition-all flex items-center gap-2 shadow-lg">
              <MessageSquare size={14} /> Quote Block
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const EditableMedia: FC<{ 
  contentKey: string, 
  defaultUrls: string[], 
  isEditMode: boolean, 
  isAdmin?: boolean,
  language: string,
  siteContent: Record<string, any>,
  className?: string,
  aspectRatio?: string,
  rounded?: string
}> = ({ contentKey, defaultUrls, isEditMode, isAdmin, language, siteContent, className, aspectRatio = "aspect-[3/4]", rounded = "rounded-2xl" }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const dragControls = useDragControls();
  
  const currentAspect = siteContent[`${contentKey}.aspect`]?.value || aspectRatio;
  const currentFit = siteContent[`${contentKey}.fit`]?.value || 'object-cover';

  const updateSetting = async (key: string, value: any) => {
    const settingKey = `${contentKey}.${key}`;
    const docId = `${language}_${settingKey.replace(/\./g, '_')}`;
    try {
      await setDoc(doc(db, 'siteContent', docId), {
        key: settingKey,
        language,
        value,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'siteContent');
    }
  };

  const content = siteContent[contentKey] || {};
  const mediaItems = content.value ? (Array.isArray(content.value) ? content.value : [content.value]) : defaultUrls;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  const showControls = isEditMode || isAdmin;

  const resetAutoPlay = () => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    if (!isAutoPlay || isEditMode || mediaItems.length <= 1) return;
    
    autoPlayRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % mediaItems.length);
    }, 5000); // Increased to 5s for better viewing
  };

  useEffect(() => {
    resetAutoPlay();
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isAutoPlay, isEditMode, mediaItems.length]);

  const handleManualChange = (newIndex: number) => {
    setCurrentIndex(newIndex);
    resetAutoPlay(); // Reset timer on manual interaction
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 20 files total
    const currentCount = mediaItems.length;
    const remainingSlots = 20 - currentCount;
    if (remainingSlots <= 0) {
      alert(language === 'ko' ? '최대 20개까지만 업로드 가능합니다.' : 'Maximum 20 items allowed.');
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);
    setUploadProgress({ current: 0, total: filesToUpload.length });
    setIsUploading(true);
    
    try {
      // Handle legacy string values or existing arrays
      const existingValue = content.value;
      const newMediaItems = [...(Array.isArray(existingValue) 
        ? existingValue 
        : (existingValue ? [{ url: existingValue, type: 'image' }] : []))];
      
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        setUploadProgress(prev => ({ ...prev, current: i + 1 }));

        // Size check (max 50MB for videos, 10MB for images)
        const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size > maxSize) {
          alert(language === 'ko' ? `${file.name}: 파일이 너무 큽니다 (최대 ${maxSize / (1024 * 1024)}MB).` : `${file.name}: File too large (max ${maxSize / (1024 * 1024)}MB).`);
          continue;
        }

        // Check video duration if it's a video
        if (file.type.startsWith('video/')) {
          const video = document.createElement('video');
          video.preload = 'metadata';
          const duration = await new Promise<number>((resolve, reject) => {
            const timeout = setTimeout(() => reject('Video metadata timeout'), 5000);
            video.onloadedmetadata = () => {
              clearTimeout(timeout);
              window.URL.revokeObjectURL(video.src);
              resolve(video.duration);
            };
            video.onerror = () => {
              clearTimeout(timeout);
              reject('Video load error');
            };
            video.src = URL.createObjectURL(file);
          });
          
          if (duration > 16) { // 15s + 1s buffer
            alert(language === 'ko' ? `${file.name}: 동영상은 15초 이내여야 합니다.` : `${file.name}: Videos must be under 15 seconds.`);
            continue;
          }
        }

        // Sanitize filename for storage
        const safeFileName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        const storageRef = ref(storage, `siteContent/${language}/${contentKey.replace(/\./g, '_')}_${Date.now()}_${i}_${safeFileName}`);
        
        // Use uploadBytesResumable for better reliability
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              // Optional: track individual file progress
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              console.log(`Upload is ${progress}% done`);
            }, 
            (error) => reject(error), 
            () => resolve(null)
          );
        });

        const downloadUrl = await getDownloadURL(storageRef);
        newMediaItems.push({
          url: downloadUrl,
          type: file.type.startsWith('video/') ? 'video' : 'image'
        });
      }

      const docId = `${language}_${contentKey.replace(/\./g, '_')}`;
      await setDoc(doc(db, 'siteContent', docId), {
        key: contentKey,
        language,
        value: newMediaItems.slice(-20), // Keep last 20
        updatedAt: serverTimestamp()
      });
      
      // Move to the last uploaded item
      setCurrentIndex(newMediaItems.length - 1);
    } catch (error) {
      console.error('Upload failed', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(language === 'ko' ? `업로드 실패: ${errorMessage}` : `Upload failed: ${errorMessage}`);
    } finally {
      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0 });
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeItem = async (idx: number) => {
    const newMediaItems = mediaItems.filter((_: any, i: number) => i !== idx);
    const docId = `${language}_${contentKey.replace(/\./g, '_')}`;
    try {
      await setDoc(doc(db, 'siteContent', docId), {
        key: contentKey,
        language,
        value: newMediaItems,
        updatedAt: serverTimestamp()
      });
      if (currentIndex >= newMediaItems.length) {
        setCurrentIndex(Math.max(0, newMediaItems.length - 1));
      }
      resetAutoPlay();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'siteContent');
    }
  };

  const currentMedia = mediaItems[currentIndex] || { url: defaultUrls[0], type: 'image' };
  const url = typeof currentMedia === 'string' ? currentMedia : currentMedia.url;
  const type = typeof currentMedia === 'string' ? 'image' : currentMedia.type;

  return (
    <div className={cn("relative group overflow-hidden", currentAspect, rounded, className)}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="absolute inset-0"
        >
          {type === 'video' ? (
            <video 
              src={url} 
              autoPlay 
              muted 
              loop 
              playsInline 
              className={cn("w-full h-full", currentFit)}
            />
          ) : (
            <img src={url} className={cn("w-full h-full", currentFit)} referrerPolicy="no-referrer" />
          )}
        </motion.div>
      </AnimatePresence>

      {mediaItems.length > 1 && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-ink/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {mediaItems.map((_: any, i: number) => (
              <button
                key={i}
                onClick={() => handleManualChange(i)}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all",
                  currentIndex === i ? "bg-gold w-4" : "bg-white/50 hover:bg-white"
                )}
              />
            ))}
          </div>
          <button 
            onClick={() => handleManualChange((currentIndex - 1 + mediaItems.length) % mediaItems.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/40"
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            onClick={() => handleManualChange((currentIndex + 1) % mediaItems.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/40"
          >
            <ChevronRight size={16} />
          </button>
        </>
      )}

      {showControls && (
        <div className="absolute top-2 left-2 right-2 flex flex-col gap-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex justify-between items-start">
            <div className="flex gap-1">
              <button 
                onClick={() => setIsAutoPlay(!isAutoPlay)}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all",
                  isAutoPlay ? "bg-gold text-ink" : "bg-white/20 text-white backdrop-blur-md"
                )}
                title={language === 'ko' ? "자동 재생" : "Auto Play"}
              >
                <Clock size={14} />
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-8 h-8 bg-white text-ink rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform relative"
                title={language === 'ko' ? "미디어 추가" : "Add Media"}
              >
                {isUploading ? (
                  <div className="relative flex items-center justify-center">
                    <Clock size={14} className="animate-spin" />
                    <span className="absolute -bottom-6 bg-ink text-white text-[8px] px-1 rounded whitespace-nowrap">
                      {uploadProgress.current}/{uploadProgress.total}
                    </span>
                  </div>
                ) : <Plus size={14} />}
              </button>
            </div>
            {mediaItems.length > 0 && (
              <button 
                onClick={() => removeItem(currentIndex)}
                className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                title={language === 'ko' ? "현재 항목 삭제" : "Remove Current"}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          <motion.div 
            drag
            dragControls={dragControls}
            dragListener={false}
            dragMomentum={false}
            className="fixed top-1/4 left-1/2 -ml-[150px] bg-white/95 backdrop-blur-xl p-5 rounded-[32px] shadow-[0_30px_60px_rgba(0,0,0,0.3)] border-2 border-gold flex flex-col gap-4 min-w-[300px] z-[1000] cursor-default"
          >
            <div 
              onPointerDown={(e) => dragControls.start(e)}
              className="flex items-center gap-3 border-b border-ink/5 pb-3 mb-1 cursor-move active:cursor-grabbing group/drag"
            >
              <div className="p-1.5 bg-gold/10 rounded-lg">
                <GripHorizontal size={16} className="text-gold" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-widest opacity-40 font-bold leading-none mb-1">Editor</span>
                <span className="text-[11px] font-bold text-ink leading-none">Media Settings</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[8px] uppercase tracking-widest opacity-50 font-bold">Aspect Ratio</span>
              <div className="flex gap-1">
                {[
                  { label: '16:9', val: 'aspect-video' },
                  { label: '1:1', val: 'aspect-square' },
                  { label: '4:3', val: 'aspect-[4/3]' },
                  { label: '4:5', val: 'aspect-[4/5]' },
                  { label: 'Auto', val: 'aspect-auto' }
                ].map(opt => (
                  <button 
                    key={opt.val}
                    onClick={() => updateSetting('aspect', opt.val)}
                    className={cn(
                      "px-2 py-1 text-[8px] rounded-md border transition-all",
                      currentAspect === opt.val ? "bg-gold text-ink border-gold" : "bg-ink/5 border-transparent hover:border-gold/30"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[8px] uppercase tracking-widest opacity-50 font-bold">Fit</span>
              <div className="flex gap-1">
                {[
                  { label: 'Cover', val: 'object-cover' },
                  { label: 'Contain', val: 'object-contain' }
                ].map(opt => (
                  <button 
                    key={opt.val}
                    onClick={() => updateSetting('fit', opt.val)}
                    className={cn(
                      "px-2 py-1 text-[8px] rounded-md border transition-all",
                      currentFit === opt.val ? "bg-gold text-ink border-gold" : "bg-ink/5 border-transparent hover:border-gold/30"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleUpload} 
            className="hidden" 
            multiple
            accept="image/png,image/jpeg,image/webp,image/gif,video/*"
          />
        </div>
      )}
    </div>
  );
};

const EditableImage: FC<{ 
  contentKey: string, 
  defaultUrl: string, 
  isEditMode: boolean, 
  isAdmin?: boolean,
  language: string,
  siteContent: Record<string, any>,
  className?: string,
  alt?: string,
  rounded?: string,
  children?: React.ReactNode
}> = ({ contentKey, defaultUrl, isEditMode, isAdmin, language, siteContent, className, alt, rounded = "rounded-lg", children }) => {
  const [isUploading, setIsUploading] = useState(false);
  const content = siteContent[contentKey] || {};
  const url = content.value || defaultUrl;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showControls = isEditMode || isAdmin;

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
      handleFirestoreError(error, OperationType.UPDATE, 'siteContent');
    } finally {
      setIsUploading(false);
    }
  };

  // Filter out image-specific classes from the container
  const containerClasses = className?.split(' ').filter(c => !['object-cover', 'object-contain', 'opacity-80', 'opacity-70'].includes(c)).join(' ');
  const imgClasses = className?.split(' ').filter(c => ['object-cover', 'object-contain', 'opacity-80', 'opacity-70'].includes(c)).join(' ');

  if (showControls) {
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
              {isUploading ? (language === 'ko' ? '업로드 중...' : 'Uploading...') : (language === 'ko' ? '이미지 변경' : 'Change Image')}
            </div>
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleUpload} 
            className="hidden" 
            accept="image/png,image/jpeg,image/webp,image/gif"
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
  const dragControls = useDragControls();
  const content = siteContent[contentKey] || {};
  const [text, setText] = useState(content.value !== undefined ? content.value : defaultText);
  const [url, setUrl] = useState(content.url !== undefined ? content.url : defaultUrl);

  const getIcon = (url: string) => {
    const lower = url.toLowerCase();
    if (lower.includes('instagram')) return <Instagram size={14} />;
    if (lower.includes('facebook')) return <Facebook size={14} />;
    if (lower.includes('youtube')) return <Youtube size={14} />;
    if (lower.includes('twitter') || lower.includes('x.com')) return <Twitter size={14} />;
    if (lower.includes('linkedin')) return <Linkedin size={14} />;
    if (lower.includes('blog') || lower.includes('naver')) return <BookOpen size={14} />;
    if (lower.includes('chat') || lower.includes('kakao') || lower.includes('open.kakao')) return <MessageCircle size={14} />;
    return <ExternalLink size={14} />;
  };

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
          <motion.div 
            drag
            dragControls={dragControls}
            dragListener={false}
            dragMomentum={false}
            className="fixed top-1/4 left-1/2 -ml-[150px] flex flex-col gap-4 w-full min-w-[300px] bg-white/95 backdrop-blur-xl p-6 rounded-[32px] border-2 border-gold shadow-[0_30px_60px_rgba(0,0,0,0.3)] z-[1000]"
          >
            <div 
              onPointerDown={(e) => dragControls.start(e)}
              className="flex items-center gap-3 border-b border-ink/5 pb-4 mb-1 cursor-move active:cursor-grabbing group/drag"
            >
              <div className="p-1.5 bg-gold/10 rounded-lg">
                <GripHorizontal size={16} className="text-gold" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-widest opacity-40 font-bold leading-none mb-1">Editor</span>
                <span className="text-[11px] font-bold text-ink leading-none">Link & URL</span>
              </div>
            </div>
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
          </motion.div>
        ) : (
          <div 
            className="relative cursor-pointer group/item"
            onClick={() => setIsEditing(true)}
          >
            <div className="absolute -inset-1 border border-dashed border-gold/0 group-hover/item:border-gold/40 rounded transition-colors -z-10" />
            <div className="flex items-center gap-1">
              {getIcon(url)}
              <span className={cn(className, !text && "opacity-30 italic")}>{displayValue}</span>
            </div>
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

  const formatUrl = (url: string) => {
    if (!url || url.trim() === '') return '#';
    let trimmed = url.trim();
    
    // Remove leading # if it's followed by http to fix common copy-paste errors
    if (trimmed.startsWith('#') && trimmed.toLowerCase().includes('http')) {
      trimmed = trimmed.substring(1).trim();
    }
    
    if (trimmed === '#' || trimmed === '') return '#';
    
    if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  const finalUrl = formatUrl(url);
  const isLinkActive = finalUrl !== '#';

  return (
    <a 
      href={finalUrl} 
      target={isLinkActive ? "_blank" : undefined} 
      rel="noopener noreferrer"
      referrerPolicy="no-referrer"
      className={cn(className, !isLinkActive && "cursor-default")}
      onClick={(e) => {
        if (!isLinkActive) {
          e.preventDefault();
        }
      }}
    >
      {getIcon(url)}
      {text}
    </a>
  );
};

const GlobalStyleEditor: FC<{
  isEditMode: boolean,
  siteContent: Record<string, any>,
  language: string
}> = ({ isEditMode, siteContent, language }) => {
  const [isOpen, setIsOpen] = useState(false);

  const updateStyle = async (key: string, value: string) => {
    const docId = `${language}_global_style_${key}`;
    try {
      await setDoc(doc(db, 'siteContent', docId), {
        key: `global.style.${key}`,
        language,
        value,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'siteContent');
    }
  };

  if (!isEditMode) return null;

  const styles = {
    paper: siteContent['global.style.paper']?.value || '#f5f2ed',
    ink: siteContent['global.style.ink']?.value || '#1a1a1a',
    gold: siteContent['global.style.gold']?.value || '#c5a059',
    fontSerif: siteContent['global.style.fontSerif']?.value || '"Cormorant Garamond", serif',
    fontSans: siteContent['global.style.fontSans']?.value || '"Montserrat", sans-serif',
    navL1FontSize: siteContent['global.style.navL1FontSize']?.value || '12',
    navL1FontColor: siteContent['global.style.navL1FontColor']?.value || '#1a1a1a',
    navL1FontWeight: siteContent['global.style.navL1FontWeight']?.value || '500',
    navL2FontSize: siteContent['global.style.navL2FontSize']?.value || '12',
    navL2FontColor: siteContent['global.style.navL2FontColor']?.value || '#1a1a1a',
    navL2FontWeight: siteContent['global.style.navL2FontWeight']?.value || '500',
    navL3FontSize: siteContent['global.style.navL3FontSize']?.value || '10',
    navL3FontColor: siteContent['global.style.navL3FontColor']?.value || '#1a1a1a',
    navL3FontWeight: siteContent['global.style.navL3FontWeight']?.value || '400',
    landingBg: siteContent['global.style.landingBg']?.value || '',
    landingOverlay: siteContent['global.style.landingOverlay']?.value || '0',
    allPagesBg: siteContent['global.style.allPagesBg']?.value || '',
  };

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 left-8 w-14 h-14 bg-gold text-ink rounded-full flex items-center justify-center shadow-2xl z-50 hover:scale-110 transition-transform group"
      >
        <Palette size={24} className="group-hover:rotate-12 transition-transform" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-end p-6 pointer-events-none">
            <motion.div 
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              className="w-80 bg-paper border border-ink/10 rounded-[40px] shadow-2xl p-8 space-y-8 pointer-events-auto max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-serif font-bold">{t.globalStyle.title}</h3>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-ink/5 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">{t.globalStyle.colors}</label>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <input 
                        type="color" 
                        value={styles.paper} 
                        onChange={(e) => updateStyle('paper', e.target.value)}
                        className="w-full h-10 rounded-xl cursor-pointer border-none bg-transparent"
                      />
                      <p className="text-[8px] text-center uppercase opacity-40">{t.globalStyle.paper}</p>
                    </div>
                    <div className="space-y-2">
                      <input 
                        type="color" 
                        value={styles.ink} 
                        onChange={(e) => updateStyle('ink', e.target.value)}
                        className="w-full h-10 rounded-xl cursor-pointer border-none bg-transparent"
                      />
                      <p className="text-[8px] text-center uppercase opacity-40">{t.globalStyle.ink}</p>
                    </div>
                    <div className="space-y-2">
                      <input 
                        type="color" 
                        value={styles.gold} 
                        onChange={(e) => updateStyle('gold', e.target.value)}
                        className="w-full h-10 rounded-xl cursor-pointer border-none bg-transparent"
                      />
                      <p className="text-[8px] text-center uppercase opacity-40">{t.globalStyle.gold}</p>
                    </div>
                  </div>
                </div>

                {/* Level 1 Navigation */}
                <div className="p-4 bg-ink/5 rounded-2xl space-y-4">
                  <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">Level 1 Navigation</p>
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">{t.globalStyle.navL1FontSize} ({styles.navL1FontSize}px)</label>
                    <input 
                      type="range" 
                      min="8" max="32" step="1"
                      value={styles.navL1FontSize} 
                      onChange={(e) => updateStyle('navL1FontSize', e.target.value)}
                      className="w-full accent-gold"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">{t.globalStyle.navL1FontColor}</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="color" 
                        value={styles.navL1FontColor} 
                        onChange={(e) => updateStyle('navL1FontColor', e.target.value)}
                        className="w-12 h-10 rounded-xl cursor-pointer border-none bg-transparent"
                      />
                      <span className="text-xs font-mono opacity-50">{styles.navL1FontColor}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">{t.globalStyle.navL1FontWeight}</label>
                    <select 
                      value={styles.navL1FontWeight} 
                      onChange={(e) => updateStyle('navL1FontWeight', e.target.value)}
                      className="w-full p-2 text-xs bg-ink/5 border border-ink/10 rounded-lg"
                    >
                      <option value="300">Light (300)</option>
                      <option value="400">Regular (400)</option>
                      <option value="500">Medium (500)</option>
                      <option value="600">Semi-Bold (600)</option>
                      <option value="700">Bold (700)</option>
                      <option value="800">Extra-Bold (800)</option>
                    </select>
                  </div>
                </div>

                {/* Level 2 Navigation */}
                <div className="p-4 bg-ink/5 rounded-2xl space-y-4">
                  <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">Level 2 Navigation</p>
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">{t.globalStyle.navL2FontSize} ({styles.navL2FontSize}px)</label>
                    <input 
                      type="range" 
                      min="8" max="32" step="1"
                      value={styles.navL2FontSize} 
                      onChange={(e) => updateStyle('navL2FontSize', e.target.value)}
                      className="w-full accent-gold"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">{t.globalStyle.navL2FontColor}</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="color" 
                        value={styles.navL2FontColor} 
                        onChange={(e) => updateStyle('navL2FontColor', e.target.value)}
                        className="w-12 h-10 rounded-xl cursor-pointer border-none bg-transparent"
                      />
                      <span className="text-xs font-mono opacity-50">{styles.navL2FontColor}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">{t.globalStyle.navL2FontWeight}</label>
                    <select 
                      value={styles.navL2FontWeight} 
                      onChange={(e) => updateStyle('navL2FontWeight', e.target.value)}
                      className="w-full p-2 text-xs bg-ink/5 border border-ink/10 rounded-lg"
                    >
                      <option value="300">Light (300)</option>
                      <option value="400">Regular (400)</option>
                      <option value="500">Medium (500)</option>
                      <option value="600">Semi-Bold (600)</option>
                      <option value="700">Bold (700)</option>
                      <option value="800">Extra-Bold (800)</option>
                    </select>
                  </div>
                </div>

                {/* Level 3 Navigation */}
                <div className="p-4 bg-ink/5 rounded-2xl space-y-4">
                  <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">Level 3 Navigation</p>
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">{t.globalStyle.navL3FontSize} ({styles.navL3FontSize}px)</label>
                    <input 
                      type="range" 
                      min="8" max="32" step="1"
                      value={styles.navL3FontSize} 
                      onChange={(e) => updateStyle('navL3FontSize', e.target.value)}
                      className="w-full accent-gold"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">{t.globalStyle.navL3FontColor}</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="color" 
                        value={styles.navL3FontColor} 
                        onChange={(e) => updateStyle('navL3FontColor', e.target.value)}
                        className="w-12 h-10 rounded-xl cursor-pointer border-none bg-transparent"
                      />
                      <span className="text-xs font-mono opacity-50">{styles.navL3FontColor}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">{t.globalStyle.navL3FontWeight}</label>
                    <select 
                      value={styles.navL3FontWeight} 
                      onChange={(e) => updateStyle('navL3FontWeight', e.target.value)}
                      className="w-full p-2 text-xs bg-ink/5 border border-ink/10 rounded-lg"
                    >
                      <option value="300">Light (300)</option>
                      <option value="400">Regular (400)</option>
                      <option value="500">Medium (500)</option>
                      <option value="600">Semi-Bold (600)</option>
                      <option value="700">Bold (700)</option>
                      <option value="800">Extra-Bold (800)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">{t.globalStyle.backgrounds}</label>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-[10px] opacity-60">{t.globalStyle.landingBg}</p>
                      <input 
                        type="text" 
                        value={styles.landingBg} 
                        onChange={(e) => updateStyle('landingBg', e.target.value)}
                        placeholder="https://..."
                        className="w-full p-2 text-xs bg-ink/5 border border-ink/10 rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] opacity-60">{t.globalStyle.landingOverlay} ({styles.landingOverlay})</p>
                      <input 
                        type="range" 
                        min="0" max="1" step="0.1"
                        value={styles.landingOverlay} 
                        onChange={(e) => updateStyle('landingOverlay', e.target.value)}
                        className="w-full accent-gold"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] opacity-60">{t.globalStyle.allPagesBg}</p>
                      <input 
                        type="text" 
                        value={styles.allPagesBg} 
                        onChange={(e) => updateStyle('allPagesBg', e.target.value)}
                        placeholder="https://..."
                        className="w-full p-2 text-xs bg-ink/5 border border-ink/10 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">{t.globalStyle.serifFont}</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { name: 'Cormorant', value: '"Cormorant Garamond", serif' },
                      { name: 'Playfair', value: '"Playfair Display", serif' },
                      { name: 'Lora', value: '"Lora", serif' },
                      { name: 'Merriweather', value: '"Merriweather", serif' }
                    ].map(f => (
                      <button 
                        key={f.name}
                        onClick={() => updateStyle('fontSerif', f.value)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-sm font-serif border transition-all text-left",
                          styles.fontSerif === f.value ? "bg-gold text-ink border-gold" : "bg-ink/5 border-transparent hover:border-gold/30"
                        )}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">{t.globalStyle.sansFont}</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { name: 'Montserrat', value: '"Montserrat", sans-serif' },
                      { name: 'Inter', value: '"Inter", sans-serif' },
                      { name: 'Outfit', value: '"Outfit", sans-serif' },
                      { name: 'Space Grotesk', value: '"Space Grotesk", sans-serif' }
                    ].map(f => (
                      <button 
                        key={f.name}
                        onClick={() => updateStyle('fontSans', f.value)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-sm font-sans border transition-all text-left",
                          styles.fontSans === f.value ? "bg-gold text-ink border-gold" : "bg-ink/5 border-transparent hover:border-gold/30"
                        )}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-ink/5">
                  <button 
                    onClick={() => {
                      updateStyle('paper', '#f5f2ed');
                      updateStyle('ink', '#1a1a1a');
                      updateStyle('gold', '#c5a059');
                      updateStyle('fontSerif', '"Cormorant Garamond", serif');
                      updateStyle('fontSans', '"Montserrat", sans-serif');
                      updateStyle('navL1FontSize', '12');
                      updateStyle('navL1FontColor', '#1a1a1a');
                      updateStyle('navL1FontWeight', '500');
                      updateStyle('navL2FontSize', '12');
                      updateStyle('navL2FontColor', '#1a1a1a');
                      updateStyle('navL2FontWeight', '500');
                      updateStyle('navL3FontSize', '10');
                      updateStyle('navL3FontColor', '#1a1a1a');
                      updateStyle('navL3FontWeight', '400');
                      updateStyle('landingBg', '');
                      updateStyle('landingOverlay', '0');
                      updateStyle('allPagesBg', '');
                    }}
                    className="w-full py-3 bg-ink/5 text-[10px] uppercase tracking-widest font-bold rounded-xl hover:bg-red-500 hover:text-white transition-all"
                  >
                    {t.globalStyle.reset}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

const ProgramCarousel: FC<{
  isEditMode: boolean;
  language: LanguageCode;
  siteContent: Record<string, any>;
  deviceMode: 'pc' | 'pad' | 'mobile';
  t: any;
}> = ({ isEditMode, language, siteContent, deviceMode, t }) => {
  const [index, setIndex] = useState(0);
  const items = t.programs?.items || [];

  const next = () => setIndex((prev) => (prev + 1) % items.length);
  const prev = () => setIndex((prev) => (prev - 1 + items.length) % items.length);

  if (items.length === 0) return null;

  return (
    <div className="relative overflow-hidden bg-ink/5 rounded-[40px] p-8 md:p-16 border border-ink/5">
      <div className="flex items-center justify-between mb-12">
        <div className="space-y-2">
          <div className="text-gold text-[10px] uppercase tracking-[0.4em]">
            <EditableText contentKey="programs.badge" defaultValue="Programs" isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </div>
          <EditableText contentKey="programs.title" defaultValue={t.programs.title} isEditMode={isEditMode} language={language} siteContent={siteContent} as="h3" className="text-3xl md:text-4xl font-serif" />
        </div>
        <div className="flex gap-3">
          <button onClick={prev} className="w-12 h-12 rounded-full border border-ink/10 flex items-center justify-center hover:bg-ink hover:text-paper transition-all">
            <ChevronLeft size={20} />
          </button>
          <button onClick={next} className="w-12 h-12 rounded-full border border-ink/10 flex items-center justify-center hover:bg-ink hover:text-paper transition-all">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="relative min-h-[350px] md:min-h-[250px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <EditableText contentKey={`programs.item_${index}.title`} defaultValue={items[index].title} isEditMode={isEditMode} language={language} siteContent={siteContent} as="h4" className="text-2xl md:text-3xl font-serif text-gold" />
              <div className="w-12 h-1 bg-gold/30 rounded-full" />
            </div>
            <div className="text-lg md:text-xl opacity-70 leading-relaxed whitespace-pre-line font-serif italic">
              <EditableText contentKey={`programs.item_${index}.content`} defaultValue={items[index].content} isEditMode={isEditMode} language={language} siteContent={siteContent} as="div" />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex gap-3 mt-12">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-500",
              index === i ? "w-12 bg-gold" : "w-3 bg-ink/10"
            )}
          />
        ))}
      </div>
    </div>
  );
};

const ProfileSection: FC<{
  isEditMode: boolean;
  language: LanguageCode;
  siteContent: Record<string, any>;
  t: any;
  isAdmin?: boolean;
  setView: (v: any) => void;
  todayVisits: number;
}> = ({ isEditMode, language, siteContent, t, isAdmin, setView, todayVisits }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
      <div className="space-y-10">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="text-gold text-[10px] uppercase tracking-[0.4em]">
              <EditableText contentKey="profile.badge" defaultValue="Profile" isEditMode={isEditMode} language={language} siteContent={siteContent} />
            </div>
            
            {/* Compact Activity Indicators */}
            <div className="flex items-center gap-4">
              {todayVisits > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 bg-gold/5 border border-gold/20 rounded-full">
                  <div className="w-1 h-1 bg-gold rounded-full animate-pulse" />
                  <span className="text-[8px] uppercase tracking-widest font-bold text-gold/80">
                    {todayVisits} {language === 'ko' ? '오늘 방문' : 'Visits Today'}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Repeater 
                  contentKey="hero.avatars"
                  isEditMode={isEditMode}
                  language={language}
                  siteContent={siteContent}
                  defaultCount={3}
                  className="flex -space-x-1.5"
                  renderItem={(i) => (
                    <div className="w-5 h-5 rounded-full border border-paper bg-ink/10 overflow-hidden relative">
                      <EditableImage 
                        contentKey={`hero.avatar_${i}`}
                        defaultUrl={`https://i.pravatar.cc/100?img=${i + 10}`}
                        alt="Student"
                        className="w-full h-full object-cover"
                        isEditMode={isEditMode}
                        isAdmin={isAdmin}
                        language={language}
                        siteContent={siteContent}
                        rounded="rounded-full"
                      />
                    </div>
                  )}
                />
                <span className="text-[8px] uppercase tracking-widest font-bold opacity-40">
                  <EditableText contentKey="hero.students_count" defaultValue={language === 'ko' ? '500+ 참여' : '500+ Joined'} isEditMode={isEditMode} language={language} siteContent={siteContent} />
                </span>
              </div>
            </div>
          </div>
          <EditableText contentKey="profile.title" defaultValue={t.profile.title} isEditMode={isEditMode} language={language} siteContent={siteContent} as="h3" className="text-4xl md:text-5xl font-serif leading-tight" />
        </div>
        <div className="space-y-6 text-lg md:text-xl font-serif opacity-80 leading-relaxed">
          <div className="flex items-start gap-4">
            <div className="w-1.5 h-1.5 rounded-full bg-gold mt-3 shrink-0" />
            <EditableText contentKey="profile.education" defaultValue={t.profile.education} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </div>
          <div className="flex items-start gap-4">
            <div className="w-1.5 h-1.5 rounded-full bg-gold mt-3 shrink-0" />
            <EditableText contentKey="profile.experience" defaultValue={t.profile.experience} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </div>
          <div className="flex items-start gap-4">
            <div className="w-1.5 h-1.5 rounded-full bg-gold mt-3 shrink-0" />
            <EditableText contentKey="profile.data" defaultValue={t.profile.data} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </div>
          <div className="p-6 bg-gold/5 border-l-4 border-gold rounded-r-2xl italic">
            <EditableText contentKey="profile.specialty" defaultValue={t.profile.specialty} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </div>

          {/* Compact Quick Actions - 2x2 Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 max-w-xl">
            {/* Consultation */}
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setView('inquiry')}
              className="flex items-center gap-3 px-5 py-3 bg-gold text-ink rounded-full shadow-sm hover:shadow-md transition-all group w-full"
            >
              <MessageCircle size={18} />
              <div className="text-left">
                <div className="text-[7px] uppercase tracking-widest font-bold opacity-60 leading-none mb-0.5">Consultation</div>
                <div className="text-[11px] font-bold leading-none">
                  <EditableText contentKey="quick.consultation.label" defaultValue={language === 'ko' ? '무료 상담 신청' : 'Free Consultation'} isEditMode={isEditMode} language={language} siteContent={siteContent} />
                </div>
              </div>
              <ArrowUpRight size={12} className="ml-auto opacity-40 group-hover:opacity-100 transition-opacity" />
            </motion.button>

            {/* Contact */}
            <motion.a 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              href={`mailto:${siteContent['quick.contact.email']?.value || 'lhbin777@gmail.com'}`}
              className="flex items-center gap-3 px-5 py-3 bg-ink text-paper rounded-full shadow-sm hover:bg-ink/90 transition-all cursor-pointer w-full"
            >
              <Mail size={18} className="text-gold" />
              <div className="text-left">
                <div className="text-[7px] uppercase tracking-widest font-bold opacity-40 leading-none mb-0.5">Contact</div>
                <div className="text-[11px] font-serif leading-none">
                  <EditableText contentKey="quick.contact.email" defaultValue="lhbin777@gmail.com" isEditMode={isEditMode} language={language} siteContent={siteContent} />
                </div>
              </div>
            </motion.a>

            {/* Social */}
            <div className="flex flex-col gap-2 px-6 py-3.5 bg-ink text-paper rounded-[32px] shadow-lg w-full border border-paper/5">
              <div className="text-[7px] uppercase tracking-[0.3em] font-bold text-gold/60 leading-none">
                <EditableText contentKey="quick.social.label" defaultValue="소셜" isEditMode={isEditMode} language={language} siteContent={siteContent} />
              </div>
              <div className="flex gap-4 overflow-x-auto no-scrollbar">
                <Repeater 
                  contentKey="quick.social_links"
                  isEditMode={isEditMode}
                  language={language}
                  siteContent={siteContent}
                  defaultCount={3}
                  className="flex gap-4"
                  renderItem={(i) => (
                    <EditableLink 
                      contentKey={`quick.social_links.item_${i}`} 
                      defaultText={i === 0 ? "Instagram" : i === 1 ? "Blog" : "1:1 오픈 채팅방"} 
                      defaultUrl={i === 2 ? "https://open.kakao.com" : "#"} 
                      isEditMode={isEditMode} 
                      language={language} 
                      siteContent={siteContent} 
                      className="text-[10px] font-bold hover:text-gold transition-colors whitespace-nowrap opacity-90" 
                    />
                  )}
                />
              </div>
            </div>

            {/* Course Explore Badge */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                const el = document.getElementById('course-list');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                } else {
                  setView('landing');
                  setTimeout(() => {
                    document.getElementById('course-list')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }
              }}
              className="flex items-center gap-3 px-5 py-3 bg-paper border border-ink/10 rounded-full hover:bg-gold/5 transition-all w-full group shadow-sm"
            >
              <div className="w-8 h-8 rounded-full bg-ink/5 flex items-center justify-center text-ink/40 group-hover:bg-gold/20 group-hover:text-gold transition-colors">
                <Search size={14} />
              </div>
              <div className="text-left">
                <div className="text-[7px] uppercase tracking-widest font-bold opacity-40 leading-none mb-0.5">Explore</div>
                <div className="text-[11px] font-bold leading-none">
                  <EditableText contentKey="quick.explore.label" defaultValue={language === 'ko' ? '과정 탐색하기' : 'Explore Courses'} isEditMode={isEditMode} language={language} siteContent={siteContent} />
                </div>
              </div>
              <ArrowDown size={12} className="ml-auto opacity-20 group-hover:opacity-100 group-hover:translate-y-0.5 transition-all" />
            </motion.button>
          </div>
        </div>
      </div>
      <div className="relative aspect-[4/5] rounded-[80px] overflow-hidden bg-ink/5 border border-ink/10 shadow-2xl">
        <EditableImage 
          contentKey="profile.image"
          defaultUrl="https://picsum.photos/seed/doctor-profile/800/1000"
          alt="Profile"
          className="w-full h-full object-cover"
          isEditMode={isEditMode}
          isAdmin={isAdmin}
          language={language}
          siteContent={siteContent}
          rounded="rounded-[80px]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/40 to-transparent pointer-events-none" />
      </div>
    </div>
  );
};

const LandingView: FC<{ setView: (v: any) => void, onBook: (course: any) => void, setInitialArchiveFilter: (f: any) => void, language: LanguageCode, isEditMode: boolean, isAdmin?: boolean, siteContent: Record<string, any>, isEventPeriod: boolean, deviceMode: 'pc' | 'pad' | 'mobile' }> = ({ setView, onBook, setInitialArchiveFilter, language, isEditMode, isAdmin, siteContent, isEventPeriod, deviceMode }) => {
  const t = TRANSLATIONS[language];
  const [todayVisits, setTodayVisits] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (!isAdmin) {
      setTodayVisits(0);
      setRecentActivity([]);
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const qVisits = query(collection(db, 'visits'), where('date', '==', today));
    const unsubVisits = onSnapshot(qVisits, (snapshot) => {
      setTodayVisits(snapshot.size);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'visits'));

    const qActivity = query(collection(db, 'community'), orderBy('createdAt', 'desc'), limit(5));
    const unsubActivity = onSnapshot(qActivity, (snapshot) => {
      setRecentActivity(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'post' })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'community'));

    return () => {
      unsubVisits();
      unsubActivity();
    };
  }, [isAdmin]);
  
  return (
    <motion.div 
      id="hero"
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="space-y-20"
    >
      <div className="relative">
        <DynamicContentArea contentKey="landing.top" isEditMode={isEditMode} isAdmin={isAdmin} language={language} siteContent={siteContent} />
        
        {/* Scroll Down Hint */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 1, repeat: Infinity, repeatType: 'reverse' }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none z-10"
        >
          <span className="text-[8px] uppercase tracking-[0.4em] font-bold text-white/40">Scroll</span>
          <ArrowDown size={16} className="text-white/60" />
        </motion.div>
      </div>

      {/* Live Activity Ticker */}
      <div className="bg-ink text-paper py-2 overflow-hidden whitespace-nowrap relative">
        <motion.div 
          animate={{ x: [0, -1000] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="flex gap-20 items-center"
        >
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 text-[10px] uppercase tracking-[0.2em] font-bold">
              <span className="text-gold">●</span>
              <span>{language === 'ko' ? '실시간 학습 커뮤니티 활성화 중' : 'Live Learning Community Active'}</span>
              <span className="opacity-40">/</span>
              <span>{todayVisits} {language === 'ko' ? '명의 학습자가 오늘 방문했습니다' : 'Learners Visited Today'}</span>
              <span className="opacity-40">/</span>
              <span>{language === 'ko' ? '프리미엄 중국어 교육의 새로운 기준' : 'New Standard for Premium Chinese Education'}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Curriculum Section */}
      <motion.section 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        id="curriculum" 
        className="max-w-[1600px] mx-auto px-0 py-16"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
          <div className="space-y-4">
            <div className="text-gold text-[10px] uppercase tracking-[0.4em]">
              <EditableText contentKey="curriculum.badge" defaultValue={t.curriculum.badge} isEditMode={isEditMode} language={language} siteContent={siteContent} />
            </div>
            <div className="text-5xl font-serif font-light">
              <EditableText contentKey="curriculum.title" defaultValue={t.curriculum.title} isEditMode={isEditMode} language={language} siteContent={siteContent} as="div" />
            </div>
          </div>
          <div className="max-w-xs text-sm opacity-60 font-serif italic">
            <EditableText contentKey="curriculum.subtitle" defaultValue={t.curriculum.subtitle} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </div>
        </div>

        <div className="space-y-32">
          {/* Profile Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <ProfileSection isEditMode={isEditMode} language={language} siteContent={siteContent} t={t} isAdmin={isAdmin} setView={setView} todayVisits={todayVisits} />
          </motion.div>

          {/* Programs Carousel */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <ProgramCarousel isEditMode={isEditMode} language={language} siteContent={siteContent} deviceMode={deviceMode} t={t} />
          </motion.div>

          {/* Differentiation Section */}
          <div className="space-y-16">
            <div className="text-center space-y-4">
              <div className="text-gold text-[10px] uppercase tracking-[0.4em]">
                <EditableText contentKey="differentiation.badge" defaultValue="Differentiation" isEditMode={isEditMode} language={language} siteContent={siteContent} />
              </div>
              <EditableText contentKey="differentiation.title" defaultValue={t.differentiation.title} isEditMode={isEditMode} language={language} siteContent={siteContent} as="h3" className="text-4xl font-serif" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {(t.differentiation?.items || []).map((item: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="p-8 bg-ink/5 rounded-[32px] border border-ink/5 space-y-4 hover:bg-gold/5 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center text-gold group-hover:scale-110 transition-transform">
                    {i === 0 && <ShieldCheck size={20} />}
                    {i === 1 && <BarChart3 size={20} />}
                    {i === 2 && <CheckCircle2 size={20} />}
                    {i === 3 && <Heart size={20} />}
                  </div>
                  <EditableText contentKey={`differentiation.item_${i}.title`} defaultValue={item.title} isEditMode={isEditMode} language={language} siteContent={siteContent} as="h4" className="text-xl font-serif" />
                  <div className="text-sm opacity-60 leading-relaxed">
                    <EditableText contentKey={`differentiation.item_${i}.content`} defaultValue={item.content} isEditMode={isEditMode} language={language} siteContent={siteContent} />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Consultation Section */}
          <div className="bg-ink text-paper rounded-[60px] p-12 md:p-20 space-y-12 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gold/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16">
              <div className="space-y-8">
                <EditableText contentKey="consultation.title" defaultValue={t.consultation.title} isEditMode={isEditMode} language={language} siteContent={siteContent} as="h3" className="text-4xl font-serif" />
                <div className="space-y-6">
                  {(t.consultation?.items || []).map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-6 border-b border-paper/10 pb-4">
                      <span className="text-[10px] uppercase tracking-widest opacity-40 min-w-[100px]">{item.label}</span>
                      <span className="text-lg font-serif">
                        <EditableText contentKey={`consultation.item_${i}.value`} defaultValue={item.value} isEditMode={isEditMode} language={language} siteContent={siteContent} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col justify-center space-y-8">
                <div className="text-xl font-serif italic opacity-80 leading-relaxed">
                  <EditableText contentKey="consultation.footer" defaultValue={t.consultation.footer} isEditMode={isEditMode} language={language} siteContent={siteContent} />
                </div>
                <button 
                  onClick={() => setView('inquiry')}
                  className="w-full md:w-auto px-12 py-5 bg-gold text-ink font-bold rounded-full uppercase tracking-widest hover:scale-105 transition-all text-sm"
                >
                  {t.nav.inquiry}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div id="course-list" className="mt-32">
          <Repeater 
            contentKey="landing.curriculum"
          isEditMode={isEditMode}
          language={language}
          siteContent={siteContent}
          defaultCount={COURSES.length}
          className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-px bg-ink/10 border border-ink/10"
          addButtonLabel={language === 'ko' ? '과정 추가' : 'Add Course'}
          renderItem={(idx) => {
            const course = COURSES[idx] || { id: `custom_${idx}`, title: 'New Course', description: 'Course description...', levels: ['Basic'] };
            return (
              <motion.div 
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
                    {idx >= 5 && <BookOpen size={20} />}
                  </div>
                  <div className="text-2xl font-serif">
                    <EditableText contentKey={`curriculum.item_${idx}.title`} defaultValue={course.title} isEditMode={isEditMode} language={language} siteContent={siteContent} as="span" />
                  </div>
                  <div className="text-xs opacity-60 leading-relaxed">
                    <EditableText contentKey={`curriculum.item_${idx}.desc`} defaultValue={course.description} isEditMode={isEditMode} language={language} siteContent={siteContent} as="span" />
                  </div>
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
            );
          }}
        />
        </div>
      </motion.section>

      {/* Dynamic Gallery Section */}
      <motion.section 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        className="max-w-[1600px] mx-auto px-0 py-16"
      >
        <div className="text-center space-y-4 mb-20">
          <div className="text-gold text-[10px] uppercase tracking-[0.4em]">
            <EditableText contentKey="gallery.badge" defaultValue="Gallery & Highlights" isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </div>
          <div className="text-5xl font-serif font-light">
            <EditableText contentKey="gallery.title" defaultValue={language === 'ko' ? '우리의 특별한 순간들' : 'Our Special Moments'} isEditMode={isEditMode} language={language} siteContent={siteContent} as="div" />
          </div>
        </div>

        <Repeater 
          contentKey="landing.gallery"
          isEditMode={isEditMode}
          language={language}
          siteContent={siteContent}
          defaultCount={3}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          addButtonLabel={language === 'ko' ? '갤러리 아이템 추가' : 'Add Gallery Item'}
          renderItem={(i) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-6 group/gallery-item"
            >
              <div className="aspect-[4/5] bg-ink/5 rounded-[40px] overflow-hidden relative">
                <EditableMedia 
                  contentKey={`gallery.item_${i}.media`}
                  defaultUrls={[`https://picsum.photos/seed/gallery-${i}/600/800`]}
                  isEditMode={isEditMode}
                  isAdmin={isAdmin}
                  language={language}
                  siteContent={siteContent}
                  className="w-full h-full"
                  rounded="rounded-[40px]"
                  aspectRatio="aspect-full"
                />
              </div>
              <div className="space-y-2 px-4">
                <div className="text-lg font-serif">
                  <EditableText contentKey={`gallery.item_${i}.title`} defaultValue={language === 'ko' ? `하이라이트 ${i + 1}` : `Highlight ${i + 1}`} isEditMode={isEditMode} language={language} siteContent={siteContent} as="div" />
                </div>
                <div className="text-xs opacity-60 leading-relaxed">
                  <EditableText contentKey={`gallery.item_${i}.desc`} defaultValue={language === 'ko' ? '특별한 학습 경험과 문화적 통찰력을 공유합니다.' : 'Sharing special learning experiences and cultural insights.'} isEditMode={isEditMode} language={language} siteContent={siteContent} as="p" />
                </div>
              </div>
            </motion.div>
          )}
        />
      </motion.section>

      {/* Recent Activity Section */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="max-w-[1600px] mx-auto px-6 py-16"
      >
        <div className="bg-ink/5 rounded-[60px] p-12 md:p-20 space-y-12">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8">
            <div className="space-y-4">
              <div className="text-gold text-[10px] uppercase tracking-[0.4em]">
                <EditableText contentKey="activity.badge" defaultValue="Live Updates" isEditMode={isEditMode} language={language} siteContent={siteContent} />
              </div>
              <div className="text-4xl font-serif font-light">
                <EditableText contentKey="activity.title" defaultValue={language === 'ko' ? '최근 커뮤니티 소식' : 'Recent Community Activity'} isEditMode={isEditMode} language={language} siteContent={siteContent} as="div" />
              </div>
            </div>
            <button 
              onClick={() => setView('community')}
              className="px-8 py-3 border border-ink/20 rounded-full text-[10px] uppercase tracking-widest font-bold hover:bg-ink hover:text-paper transition-all"
            >
              {language === 'ko' ? '전체 보기' : 'View All'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentActivity.map((activity, idx) => (
              <motion.div 
                key={activity.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-8 bg-paper rounded-[32px] border border-ink/5 space-y-4 hover:shadow-xl transition-all cursor-pointer"
                onClick={() => setView('community')}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase tracking-widest px-2 py-1 bg-ink/5 rounded-full font-bold opacity-60">{activity.type}</span>
                  <span className="text-[9px] opacity-30">{activity.createdAt?.toDate().toLocaleDateString()}</span>
                </div>
                <h4 className="font-serif text-lg line-clamp-1">{activity.title}</h4>
                <p className="text-xs opacity-50 line-clamp-2 leading-relaxed">{activity.content}</p>
                <div className="flex items-center gap-2 pt-2">
                  <div className="w-5 h-5 rounded-full bg-ink/10" />
                  <span className="text-[10px] font-bold opacity-40">{activity.userName}</span>
                </div>
              </motion.div>
            ))}
            {recentActivity.length === 0 && (
              <div className="col-span-full py-12 text-center opacity-30 italic font-serif">
                {language === 'ko' ? '최근 활동이 없습니다.' : 'No recent activity.'}
              </div>
            )}
          </div>
        </div>
      </motion.section>

      {/* Dynamic Content Sections */}
      {(isEditMode || Number(siteContent['landing.dynamic.count']?.value || 0) > 0) && (
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          id="landing-dynamic-area" 
          className="max-w-[1600px] mx-auto px-0 py-16"
        >
          <DynamicContentArea 
            contentKey="landing.dynamic"
            isEditMode={isEditMode}
            isAdmin={isAdmin}
            language={language}
            siteContent={siteContent}
          />
        </motion.section>
      )}

      <motion.section 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        className={cn(
          "max-w-4xl mx-auto text-center space-y-12 transition-all",
          deviceMode === 'mobile' ? "px-4 py-12" : "px-6 py-20"
        )}
      >
        <div className="w-12 h-12 mx-auto border border-ink/10 rounded-full flex items-center justify-center opacity-20">"</div>
        <div className={cn(
          "font-serif font-light italic leading-tight transition-all",
          deviceMode === 'mobile' ? "text-2xl" : "text-4xl md:text-5xl"
        )}>
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
      </motion.section>

      <motion.section 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        id="library" 
        className={cn(
          "bg-paper border-y border-ink/5 transition-all",
          deviceMode === 'mobile' ? "py-12 px-4" : "py-20 px-6"
        )}
      >
        <div className="max-w-[1600px] mx-auto space-y-20">
          <div className={cn(
            "grid items-center transition-all",
            deviceMode === 'mobile' ? "grid-cols-1 gap-10" : "grid-cols-1 md:grid-cols-2 gap-20"
          )}>
            <div className="space-y-8">
              <div className="text-gold text-[10px] uppercase tracking-[0.4em]">
                <EditableText contentKey="library.badge" defaultValue="Knowledge Library" isEditMode={isEditMode} language={language} siteContent={siteContent} />
              </div>
              <div className={cn(
                "font-serif font-light leading-tight transition-all",
                deviceMode === 'mobile' ? "text-3xl" : "text-5xl md:text-6xl"
              )}>
                <EditableText contentKey="library.title" defaultValue={language === 'ko' ? '"언어는 고립된 기호가 아니라, 역사가 숨 쉬는 생명체입니다."' : '"Language is not an isolated symbol, but a living organism where history breathes."'} isEditMode={isEditMode} language={language} siteContent={siteContent} as="div" />
              </div>
              <div className={cn(
                "opacity-70 font-serif leading-relaxed transition-all",
                deviceMode === 'mobile' ? "text-sm" : "text-lg"
              )}>
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
                  isAdmin={isAdmin}
                  language={language}
                  siteContent={siteContent}
                  rounded="rounded-[40px]"
                />
              </div>
            </div>
          </div>

          <div className={cn(
            "grid gap-8 transition-all",
            deviceMode === 'mobile' ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3"
          )}>
            {RESOURCE_GROUPS.map((group) => (
              <motion.div 
                key={group.id}
                whileHover={{ y: -5 }}
                className="group p-8 bg-card border border-ink/5 rounded-[32px] shadow-sm hover:shadow-xl hover:border-gold/30 transition-all space-y-8"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-gold/10 text-gold flex items-center justify-center group-hover:bg-gold group-hover:text-ink transition-colors">
                    {group.id === 'group-a' && <BookOpen size={24} />}
                    {group.id === 'group-b' && <GraduationCap size={24} />}
                    {group.id === 'group-c' && <Globe size={24} />}
                  </div>
                  <div>
                    <div className="text-2xl font-serif">
                      <EditableText 
                        contentKey={`library.group.${group.id}.title`} 
                        defaultValue={group.name.split(':')[1]?.trim() || group.name} 
                        isEditMode={isEditMode} 
                        language={language} 
                        siteContent={siteContent} 
                        as="span" 
                      />
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-gold font-bold">
                      <EditableText 
                        contentKey={`library.group.${group.id}.badge`} 
                        defaultValue={group.name.split(':')[0]} 
                        isEditMode={isEditMode} 
                        language={language} 
                        siteContent={siteContent} 
                        as="span" 
                      />
                    </div>
                  </div>
                  <div className="text-sm opacity-60 leading-relaxed">
                    <EditableText 
                      contentKey={`library.group.${group.id}.description`} 
                      defaultValue={group.description} 
                      isEditMode={isEditMode} 
                      language={language} 
                      siteContent={siteContent} 
                      as="p" 
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {group.categories.map((cat) => (
                    <div 
                      key={cat.id}
                      onClick={() => {
                        setInitialArchiveFilter({ groupId: group.id, categoryId: cat.id });
                        setView('archive');
                      }}
                      className="w-full text-left p-4 rounded-2xl hover:bg-paper border border-transparent hover:border-ink/5 transition-all group/item cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setInitialArchiveFilter({ groupId: group.id, categoryId: cat.id });
                          setView('archive');
                        }
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div className="text-sm font-medium">
                          <EditableText 
                            contentKey={`library.group.${group.id}.category.${cat.id}.name`} 
                            defaultValue={cat.name} 
                            isEditMode={isEditMode} 
                            language={language} 
                            siteContent={siteContent} 
                            as="span" 
                          />
                        </div>
                        <ArrowRight size={14} className="opacity-0 group-hover/item:opacity-100 -translate-x-2 group-hover/item:translate-x-0 transition-all" />
                      </div>
                      <div className="text-[10px] opacity-40 mt-1">
                        <EditableText 
                          contentKey={`library.group.${group.id}.category.${cat.id}.description`} 
                          defaultValue={cat.description} 
                          isEditMode={isEditMode} 
                          language={language} 
                          siteContent={siteContent} 
                          as="div" 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center pt-8">
            <div 
              role="button"
              tabIndex={0}
              onClick={() => setView('archive')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setView('archive');
                }
              }}
              className="inline-block px-12 py-5 bg-ink text-paper rounded-full text-xs uppercase tracking-widest hover:bg-gold hover:text-ink transition-all shadow-lg hover:shadow-gold/20 cursor-pointer"
            >
              <EditableText contentKey="library.explore_btn" defaultValue={language === 'ko' ? '전체 라이브러리 탐색하기' : 'Explore Full Library'} isEditMode={isEditMode} language={language} siteContent={siteContent} />
            </div>
          </div>
        </div>
      </motion.section>
      <DynamicContentArea contentKey="landing.bottom" isEditMode={isEditMode} isAdmin={isAdmin} language={language} siteContent={siteContent} />
    </motion.div>
  );
};

const BookingView: FC<{ course: any, onComplete: () => void, isEventPeriod: boolean, siteContent: any, deviceMode: 'pc' | 'pad' | 'mobile' }> = ({ course, onComplete, isEventPeriod, siteContent, deviceMode }) => {
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
      className={cn(
        "max-w-4xl mx-auto transition-all",
        deviceMode === 'mobile' ? "px-4 py-12" : "px-6 py-20"
      )}
    >
      <div className="flex items-center gap-4 mb-12">
        <button onClick={() => window.history.back()} className="text-xs uppercase tracking-widest opacity-50 hover:opacity-100">Back</button>
        <div className="h-px flex-grow bg-ink/10" />
        <span className="text-[10px] uppercase tracking-widest opacity-50">Step {step} of 3</span>
      </div>

      <div className={cn(
        "grid gap-12 transition-all",
        deviceMode === 'mobile' ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3"
      )}>
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

const AdminView: FC<{ language: LanguageCode, siteContent: any, initialTab?: 'reservations' | 'resources' | 'community' | 'users' | 'stats' | 'inquiries' | 'visitors', deviceMode: 'pc' | 'pad' | 'mobile' }> = ({ language, siteContent, initialTab = 'reservations', deviceMode }) => {
  const t = TRANSLATIONS[language];
  const [reservations, setReservations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [downloads, setDownloads] = useState<any[]>([]);
  const [communityPosts, setCommunityPosts] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'reservations' | 'resources' | 'community' | 'users' | 'stats' | 'inquiries' | 'visitors'>(initialTab as any);
  
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  
  const [feedbackText, setFeedbackText] = useState<{ [key: string]: string }>({});
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [editingResource, setEditingResource] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [editPostData, setEditPostData] = useState({ title: '', content: '' });
  const [isDragging, setIsDragging] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Resource Form State
  const [newResource, setNewResource] = useState({
    title: '',
    description: '',
    groupId: RESOURCE_GROUPS[0].id,
    categoryId: RESOURCE_GROUPS[0].categories[0].id,
    fileUrl: '',
    fileUrls: [] as string[],
    textContent: '',
    fileType: 'pdf' as 'pdf' | 'mp3' | 'image' | 'ppt' | 'word' | 'text' | 'video',
    accessLevel: 'member' as 'public' | 'member' | 'premium',
    status: 'published' as 'published' | 'hidden',
    author: '',
    tags: '',
    color: '#F27D26',
    fontFamily: 'serif',
    fontSize: 16,
    fontColor: '#000000',
    fontWeight: '400',
    hasOverlay: false,
    overlayPos: 'center' as 'top' | 'center' | 'bottom'
  });

  const statsData = useMemo(() => {
    const counts: Record<string, number> = {};
    downloads.forEach(dl => {
      const res = resources.find(r => r.id === dl.resourceId);
      const catName = res?.categoryId || 'Unknown';
      counts[catName] = (counts[catName] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [downloads, resources]);

  const visitorStats = useMemo(() => {
    const dailyCounts: Record<string, number> = {};
    const deviceCounts: Record<string, number> = { 'Mobile': 0, 'Tablet': 0, 'Desktop': 0, 'Other': 0 };

    visits.forEach(v => {
      const date = v.date || 'Unknown';
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;

      const ua = v.userAgent?.toLowerCase() || '';
      if (ua.includes('mobi')) {
        if (ua.includes('tablet') || ua.includes('ipad')) deviceCounts['Tablet']++;
        else deviceCounts['Mobile']++;
      } else if (ua.includes('tablet') || ua.includes('ipad')) {
        deviceCounts['Tablet']++;
      } else if (ua.includes('windows') || ua.includes('macintosh') || ua.includes('linux')) {
        deviceCounts['Desktop']++;
      } else {
        deviceCounts['Other']++;
      }
    });

    const daily = Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);

    const devices = Object.entries(deviceCounts)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));

    return { daily, devices };
  }, [visits]);

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

    const unsubVisits = onSnapshot(query(collection(db, 'visits'), orderBy('timestamp', 'desc')), (snapshot) => {
      setVisits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'visits'));

    setLoading(false);

    return () => {
      unsubRes();
      unsubUsers();
      unsubResources();
      unsubDownloads();
      unsubCommunity();
      unsubFeedbacks();
      unsubInquiries();
      unsubVisits();
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
      fileUrls: newResource.fileUrls || (newResource.fileUrl ? [newResource.fileUrl] : []),
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
        fileUrls: [] as string[],
        textContent: '',
        fileType: 'pdf',
        accessLevel: 'member',
        status: 'published',
        author: '',
        tags: '',
        color: '#F27D26',
        fontFamily: 'serif',
        fontSize: 16,
        fontColor: '#000000',
        fontWeight: '400',
        hasOverlay: false,
        overlayPos: 'center'
      });
      alert(language === 'ko' ? '처리가 완료되었습니다.' : 'Operation completed.');
    } catch (error) {
      handleFirestoreError(error, editingResource ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const handleFileUpload = async (input: React.ChangeEvent<HTMLInputElement> | React.DragEvent | File | FileList | File[]) => {
    let files: File[] = [];
    if (input instanceof File) {
      files = [input];
    } else if (input instanceof FileList) {
      files = Array.from(input);
    } else if (Array.isArray(input)) {
      files = input;
    } else if (input && typeof input === 'object' && 'dataTransfer' in input) {
      const e = input as React.DragEvent;
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      files = Array.from(e.dataTransfer.files);
    } else if (input && typeof input === 'object' && 'target' in input) {
      const e = input as React.ChangeEvent<HTMLInputElement>;
      if (e.target.files) {
        files = Array.from(e.target.files);
      }
    }

    if (files.length === 0) return;
    
    if (files.length > 20) {
      alert(language === 'ko' ? '최대 20개까지 업로드 가능합니다.' : 'Maximum 20 files can be uploaded.');
      return;
    }

    if (!auth.currentUser) {
      alert(language === 'ko' ? '로그인이 필요합니다.' : 'Login required.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    
    const uploadedUrls: string[] = [];
    let detectedFileType: any = null;
    let combinedTextContent = '';

    try {
      if (!storage) {
        throw new Error('Firebase Storage is not initialized');
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const maxSize = 100 * 1024 * 1024; // 100MB limit
        if (file.size > maxSize) {
          alert(`${file.name}: ${language === 'ko' ? '파일 크기가 너무 큽니다 (최대 100MB).' : 'File is too large (max 100MB).'}`);
          continue;
        }

        const safeFileName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        const storagePath = `resources/${Date.now()}_${safeFileName}`;
        const storageRef = ref(storage, storagePath);
        
        const extension = file.name.split('.').pop()?.toLowerCase();
        const mimeType = file.type;
        let fileType: 'pdf' | 'mp3' | 'image' | 'ppt' | 'word' | 'text' | 'video' = 'pdf';
        
        if (extension === 'mp3' || mimeType.startsWith('audio/')) fileType = 'mp3';
        else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '') || mimeType.startsWith('image/')) fileType = 'image';
        else if (['mp4', 'webm', 'ogg', 'mov'].includes(extension || '') || mimeType.startsWith('video/')) fileType = 'video';
        else if (['ppt', 'pptx'].includes(extension || '') || mimeType.includes('presentation') || mimeType.includes('powerpoint')) fileType = 'ppt';
        else if (['doc', 'docx'].includes(extension || '') || mimeType.includes('word') || mimeType.includes('officedocument.wordprocessingml')) fileType = 'word';
        else if (['txt', 'md', 'json', 'csv'].includes(extension || '') || mimeType.startsWith('text/')) fileType = 'text';
        else if (mimeType === 'application/pdf') fileType = 'pdf';

        // Video duration check
        if (fileType === 'video') {
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.src = URL.createObjectURL(file);
          const isValid = await new Promise<boolean>((resolve) => {
            video.onloadedmetadata = () => {
              window.URL.revokeObjectURL(video.src);
              if (video.duration > 11) { // 10s + buffer
                alert(`${file.name}: ${language === 'ko' ? '영상은 최대 10초까지 가능합니다.' : 'Video must be max 10 seconds.'}`);
                resolve(false);
              } else {
                resolve(true);
              }
            };
            video.onerror = () => resolve(true);
          });
          if (!isValid) continue;
        }

        console.log(`Uploading ${file.name}...`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        uploadedUrls.push(url);
        
        if (!detectedFileType) detectedFileType = fileType;
        
        if (fileType === 'text') {
          const text = await file.text();
          combinedTextContent += (combinedTextContent ? '\n\n' : '') + text;
        }

        setUploadProgress(((i + 1) / files.length) * 100);
      }

      if (uploadedUrls.length > 0) {
        setNewResource(prev => ({ 
          ...prev, 
          fileUrl: uploadedUrls[0],
          fileUrls: [...(prev.fileUrls || []), ...uploadedUrls],
          fileType: detectedFileType || prev.fileType,
          textContent: combinedTextContent || prev.textContent 
        }));

        if (combinedTextContent && editorRef.current) {
          editorRef.current.innerHTML = combinedTextContent;
        }

        alert(language === 'ko' ? '파일이 업로드되었습니다.' : 'Files uploaded successfully.');
      }
      setUploading(false);
    } catch (error: any) {
      console.error('Upload catch error (Admin):', error);
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
      fileUrls: res.fileUrls || (res.fileUrl ? [res.fileUrl] : []),
      textContent: res.textContent || '',
      fileType: res.fileType,
      accessLevel: res.accessLevel,
      status: res.status || 'published',
      author: res.author || '',
      tags: Array.isArray(res.tags) ? res.tags.join(', ') : '',
      color: res.color || '#F27D26',
      fontFamily: res.fontFamily || 'serif',
      fontSize: res.fontSize || 16,
      fontColor: res.fontColor || '#000000',
      fontWeight: res.fontWeight || '400',
      hasOverlay: res.hasOverlay || false,
      overlayPos: res.overlayPos || 'center'
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

  const COLOR_PALETTE = [
    '#000000', '#444444', '#666666', '#999999', '#cccccc', '#eeeeee', '#f3f3f3', '#ffffff',
    '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#9900ff', '#ff00ff',
    '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#cfe2f3', '#d9d2e9', '#ead1dc',
    '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#9fc5e8', '#b4a7d6', '#d5a6bd',
    '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6fa8dc', '#8e7cc3', '#c27ba0',
    '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3d85c6', '#674ea7', '#a64d79',
    '#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#0b5394', '#351c75', '#741b47',
    '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#073763', '#20124d', '#4c1130'
  ];

  const applyStyle = (command: string, value?: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    if (command === 'fontName') {
      document.execCommand('fontName', false, value);
    } else if (command === 'fontSize') {
      const selectedText = selection.toString();
      if (selectedText) {
        document.execCommand('insertHTML', false, `<span style="font-size: ${value}px">${selectedText}</span>`);
      }
    } else if (command === 'foreColor') {
      document.execCommand('foreColor', false, value);
    } else if (command === 'bold') {
      document.execCommand('bold', false);
    } else if (command === 'fontWeight') {
      const selectedText = selection.toString();
      if (selectedText) {
        document.execCommand('insertHTML', false, `<span style="font-weight: ${value || 'normal'}">${selectedText}</span>`);
      }
    }
    
    // Update state from contentEditable
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setNewResource(prev => ({ ...prev, textContent: html }));
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleFileUpload(file as any);
        }
      }
    }
  };

  // Sync editor content when editing starts
  useEffect(() => {
    if (activeTab === 'resources' && editorRef.current) {
      editorRef.current.innerHTML = newResource.textContent;
    }
  }, [activeTab, editingResource]);

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
      className={cn(
        "max-w-[1600px] mx-auto transition-all",
        (deviceMode === 'mobile' || deviceMode === 'pad') ? "px-4 py-12 space-y-8" : "px-6 py-20 space-y-12"
      )}
    >
      <div className={cn(
        "flex justify-between transition-all",
        (deviceMode === 'mobile' || deviceMode === 'pad') ? "flex-col items-start gap-6" : "flex-row items-end gap-8"
      )}>
        <div className="space-y-4">
          <span className="text-gold text-[10px] uppercase tracking-[0.4em]">{t.admin.title}</span>
          <h2 className={cn(
            "font-serif font-light transition-all",
            (deviceMode === 'mobile' || deviceMode === 'pad') ? "text-3xl" : "text-5xl"
          )}>{t.nav.systemName}</h2>
        </div>
        <div className={cn(
          "flex bg-ink/5 p-1 rounded-2xl transition-all overflow-x-auto no-scrollbar",
          (deviceMode === 'mobile' || deviceMode === 'pad') ? "w-full" : ""
        )}>
          {(['reservations', 'resources', 'community', 'inquiries', 'users', 'stats', 'visitors'] as const).map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-2 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all whitespace-nowrap",
                activeTab === tab ? "bg-ink text-paper shadow-lg" : "opacity-40 hover:opacity-100"
              )}
            >
              {tab === 'inquiries' ? (language === 'ko' ? '수강 문의' : 'Inquiries') : (t.admin[tab] || tab)}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className={cn(
        "flex flex-wrap p-6 bg-gold/5 border border-gold/10 rounded-3xl transition-all",
        (deviceMode === 'mobile' || deviceMode === 'pad') ? "gap-3 p-4 justify-center" : "gap-4"
      )}>
        <button 
          onClick={() => { setActiveTab('resources'); setEditingResource(null); setNewResource({ title: '', description: '', groupId: RESOURCE_GROUPS[0].id, categoryId: RESOURCE_GROUPS[0].categories[0].id, fileUrl: '', fileUrls: [], textContent: '', fileType: 'pdf', accessLevel: 'member', status: 'published', author: '', tags: '', color: '#F27D26', fontFamily: 'serif', fontSize: 16, fontColor: '#000000', fontWeight: '400', hasOverlay: false, overlayPos: 'center' }); }}
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
        <div className="flex-grow hidden lg:block" />
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
                      <div key={res.id} className="p-8 border border-ink/10 rounded-3xl bg-card space-y-6 hover:shadow-lg transition-all">
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
        <div className={cn(
          "grid gap-12 transition-all",
          deviceMode === 'mobile' ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3"
        )}>
          {/* Upload Form */}
          <div className={cn(
            "space-y-8 transition-all",
            deviceMode === 'mobile' ? "order-2" : "md:col-span-1 order-1"
          )}>
            <div className={cn(
              "p-8 border border-ink/10 rounded-3xl bg-white space-y-6 transition-all pr-2",
              deviceMode !== 'mobile' && "sticky top-32 max-h-[80vh] overflow-y-auto"
            )}>
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
                      fileUrls: [],
                      textContent: '',
                      fileType: 'pdf',
                      accessLevel: 'member',
                      status: 'published',
                      author: '',
                      tags: '',
                      color: '#F27D26',
                      fontFamily: 'serif',
                      fontSize: 16,
                      fontColor: '#000000',
                      fontWeight: '400',
                      hasOverlay: false,
                      overlayPos: 'center'
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
                      <option value="video">Video (Max 10s)</option>
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
                      <div className="relative group">
                        <button 
                          type="button"
                          className="p-1 text-[10px] bg-white border border-ink/10 rounded hover:bg-gold/10 flex items-center gap-1"
                        >
                          <div className="w-3 h-3 rounded-full border border-ink/10" style={{ backgroundColor: newResource.color || '#000000' }} />
                          Color
                        </button>
                        <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-ink/10 rounded-xl shadow-2xl z-50 hidden group-hover:grid grid-cols-8 gap-1 w-48">
                          {COLOR_PALETTE.map(color => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => applyStyle('foreColor', color)}
                              className="w-4 h-4 rounded-sm border border-ink/5 hover:scale-110 transition-transform"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                          <input 
                            type="color" 
                            onChange={(e) => applyStyle('foreColor', e.target.value)}
                            className="col-span-8 w-full h-4 p-0 border-none bg-transparent cursor-pointer mt-1"
                          />
                        </div>
                      </div>
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
                        <option value="200">200</option>
                        <option value="300">300</option>
                        <option value="400">400</option>
                        <option value="500">500</option>
                        <option value="600">600</option>
                        <option value="700">700</option>
                        <option value="800">800</option>
                        <option value="900">900</option>
                      </select>
                    </div>
                    <div 
                      ref={editorRef}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={(e) => {
                        const html = e.currentTarget.innerHTML;
                        setNewResource(prev => ({ ...prev, textContent: html }));
                      }}
                      onPaste={handlePaste}
                      className="w-full p-4 text-sm min-h-[200px] focus:outline-none bg-white"
                    />
                  </div>
                </div>
                {newResource.fileType === 'image' && (
                  <div className="space-y-2 p-4 bg-gold/5 border border-gold/20 rounded-2xl">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gold">Image Text Overlay</label>
                    <div className="flex items-center gap-4">
                      <button 
                        type="button"
                        onClick={() => setNewResource(prev => ({ ...prev, hasOverlay: !prev.hasOverlay }))}
                        className={cn(
                          "px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all",
                          newResource.hasOverlay ? "bg-gold text-ink" : "bg-ink/5 text-ink/40"
                        )}
                      >
                        {newResource.hasOverlay ? 'Overlay Enabled' : 'Overlay Disabled'}
                      </button>
                      {newResource.hasOverlay && (
                        <div className="flex gap-2">
                          {['top', 'center', 'bottom'].map(pos => (
                            <button
                              key={pos}
                              type="button"
                              onClick={() => setNewResource(prev => ({ ...prev, overlayPos: pos as any }))}
                              className={cn(
                                "px-3 py-1 rounded-lg text-[10px] uppercase tracking-widest transition-all",
                                newResource.overlayPos === pos ? "bg-gold/20 text-gold border border-gold/30" : "bg-ink/5 text-ink/40 border border-transparent"
                              )}
                            >
                              {pos}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-[8px] opacity-40 mt-1 italic">* When enabled, the "Text Content" above will be overlaid on the image.</p>
                  </div>
                )}
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
                        multiple
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
              <div key={res.id} className="p-6 border border-ink/10 rounded-3xl bg-card flex items-center justify-between gap-6">
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
            <div key={post.id} className="p-8 border border-ink/10 rounded-3xl bg-card space-y-6">
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
              <div key={u.id} className="p-6 border border-ink/10 rounded-3xl bg-card flex items-center justify-between gap-6">
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
            <div className="p-8 border border-ink/10 rounded-3xl bg-card space-y-6">
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
                        <div key={inq.id} className="p-8 border border-ink/10 rounded-3xl bg-card space-y-6">
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

                          <div className={cn(
                            "grid gap-8 pt-6 border-t border-ink/5 transition-all",
                            deviceMode === 'mobile' ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3"
                          )}>
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
                      <div key={inq.id} className="p-8 border border-ink/10 rounded-3xl bg-card space-y-6">
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

      {activeTab === 'visitors' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 border border-ink/10 rounded-3xl bg-card space-y-4">
              <Users className="text-gold" size={32} />
              <h4 className="text-[10px] uppercase tracking-widest opacity-50">{t.admin.totalVisitors}</h4>
              <p className="text-4xl font-serif">{visits.length}</p>
            </div>
            <div className="p-8 border border-ink/10 rounded-3xl bg-card space-y-4">
              <Calendar className="text-gold" size={32} />
              <h4 className="text-[10px] uppercase tracking-widest opacity-50">{language === 'ko' ? '오늘 방문자' : 'Today Visitors'}</h4>
              <p className="text-4xl font-serif">
                {visits.filter(v => v.date === new Date().toISOString().split('T')[0]).length}
              </p>
            </div>
            <div className="p-8 border border-ink/10 rounded-3xl bg-card space-y-4">
              <TrendingUp className="text-gold" size={32} />
              <h4 className="text-[10px] uppercase tracking-widest opacity-50">{language === 'ko' ? '평균 일일 방문' : 'Avg Daily Visits'}</h4>
              <p className="text-4xl font-serif">
                {visitorStats.daily.length > 0 
                  ? Math.round(visitorStats.daily.reduce((acc, curr) => acc + curr.count, 0) / visitorStats.daily.length) 
                  : 0}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="p-8 border border-ink/10 rounded-3xl bg-card space-y-8">
              <h3 className="text-xl font-serif">{t.admin.dailyVisitors}</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={visitorStats.daily}>
                    <defs>
                      <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c5a059" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#c5a059" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.4)' }}
                      tickFormatter={(str) => str.split('-').slice(1).join('/')}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.4)' }} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                        fontSize: '12px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#c5a059" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorVisits)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-8 border border-ink/10 rounded-3xl bg-card space-y-8">
              <h3 className="text-xl font-serif">{language === 'ko' ? '기기별 접속 분포' : 'Device Distribution'}</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={visitorStats.devices} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.4)' }}
                      width={80}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                      {visitorStats.devices.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#c5a059', '#1a1a1a', '#F27D26', '#888888'][index % 4]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="p-8 border border-ink/10 rounded-3xl bg-card space-y-8">
            <h3 className="text-xl font-serif">{language === 'ko' ? '최근 방문 기록' : 'Recent Visit Logs'}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink/10">
                    <th className="py-4 font-serif opacity-50">Time</th>
                    <th className="py-4 font-serif opacity-50">User</th>
                    <th className="py-4 font-serif opacity-50">Device/Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.slice(0, 20).map(v => {
                    const user = users.find(u => u.uid === v.userUid);
                    return (
                      <tr key={v.id} className="border-b border-ink/5 hover:bg-ink/[0.02] transition-colors">
                        <td className="py-4 opacity-70">
                          {v.timestamp?.toDate ? v.timestamp.toDate().toLocaleString() : 'Just now'}
                        </td>
                        <td className="py-4">
                          {user ? (
                            <div className="flex items-center gap-2">
                              <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                              <span>{user.displayName}</span>
                            </div>
                          ) : (
                            <span className="opacity-40 italic">Guest</span>
                          )}
                        </td>
                        <td className="py-4 opacity-40 text-xs truncate max-w-[300px]">
                          {v.userAgent}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 border border-ink/10 rounded-3xl bg-card space-y-4">
              <BarChart3 className="text-gold" size={32} />
              <h4 className="text-[10px] uppercase tracking-widest opacity-50">{t.admin.totalDownloads}</h4>
              <p className="text-4xl font-serif">{downloads.length}</p>
            </div>
            <div className="p-8 border border-ink/10 rounded-3xl bg-card space-y-4">
              <Users className="text-gold" size={32} />
              <h4 className="text-[10px] uppercase tracking-widest opacity-50">{t.admin.activeStudents}</h4>
              <p className="text-4xl font-serif">{users.length}</p>
            </div>
            <div className="p-8 border border-ink/10 rounded-3xl bg-card space-y-4">
              <FileText className="text-gold" size={32} />
              <h4 className="text-[10px] uppercase tracking-widest opacity-50">{t.admin.totalResources}</h4>
              <p className="text-4xl font-serif">{resources.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="p-8 border border-ink/10 rounded-3xl bg-card space-y-8">
              <h3 className="text-xl font-serif">카테고리별 다운로드 현황</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statsData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.4)' }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.4)' }} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                      {statsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#c5a059' : '#1a1a1a'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-8 border border-ink/10 rounded-3xl bg-card space-y-8">
              <h3 className="text-xl font-serif">{t.admin.recentDownloads}</h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
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
        </div>
      )}
    </motion.div>
  );
};

const MyPageView: FC<{ deviceMode: 'pc' | 'pad' | 'mobile', setView: (v: any) => void, setInitialArchiveFilter: (f: any) => void, bookmarks: any[], toggleBookmark: (id: string) => void, language: LanguageCode, allResources: any[], isAdmin: boolean }> = ({ deviceMode, setView, setInitialArchiveFilter, bookmarks, toggleBookmark, language, allResources, isAdmin }) => {
  const [reservations, setReservations] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
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

    const resourcesPath = 'resources';
    const qResources = isAdmin 
      ? query(collection(db, resourcesPath), orderBy('createdAt', 'desc'), limit(4))
      : query(collection(db, resourcesPath), where('status', '==', 'published'), orderBy('createdAt', 'desc'), limit(4));
      
    const unsubResources = onSnapshot(qResources, (snapshot) => {
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, resourcesPath);
    });

    return () => {
      unsubRes();
      unsubFeed();
      unsubResources();
    };
  }, [isAdmin]);

  const activeRes = reservations.find(r => r.status === 'pending' || r.status === 'confirmed');
  const progress = useMemo(() => {
    if (!activeRes?.createdAt || !activeRes?.durationWeeks) return 0;
    // Handle both Firestore Timestamp and regular Date
    const start = activeRes.createdAt.toDate ? activeRes.createdAt.toDate() : new Date(activeRes.createdAt);
    const end = new Date(start);
    end.setDate(end.getDate() + (activeRes.durationWeeks * 7));
    const now = new Date();
    const total = end.getTime() - start.getTime();
    const current = now.getTime() - start.getTime();
    return Math.min(100, Math.max(0, Math.round((current / total) * 100)));
  }, [activeRes]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className={cn(
        "max-w-[1600px] mx-auto transition-all",
        deviceMode === 'mobile' ? "px-4 py-12 space-y-12" : "px-6 py-20 space-y-20"
      )}
    >
      <div className={cn(
        "flex flex-col justify-between transition-all",
        deviceMode === 'mobile' ? "gap-6" : "md:flex-row md:items-end gap-8"
      )}>
        <div className="space-y-4">
          <span className="text-gold text-[10px] uppercase tracking-[0.4em]">Student Dashboard</span>
          <h2 className={cn(
            "font-serif font-light transition-all",
            deviceMode === 'mobile' ? "text-3xl" : "text-5xl"
          )}>나의 학습 현황</h2>
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
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="h-full bg-gold" 
                    />
                  </div>
                  <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold">{progress}% Completed</p>
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

          <div className="space-y-12">
            <div className="space-y-6">
              <h3 className="text-2xl font-serif">최근 학습 자료</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {resources.map(res => (
                  <div 
                    key={res.id} 
                    onClick={() => { setView('archive'); setInitialArchiveFilter({ groupId: res.groupId, categoryId: res.categoryId }); }}
                    className="p-6 border border-ink/10 rounded-2xl bg-card hover:border-gold transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: res.color || '#F27D26' }}>
                        {res.fileType === 'pdf' && <FileText size={18} />}
                        {res.fileType === 'mp3' && <Music size={18} />}
                        {res.fileType === 'image' && <ImageIcon size={18} />}
                        {res.fileType === 'video' && <Video size={18} />}
                        {res.fileType === 'text' && <FileText size={18} />}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold group-hover:text-gold transition-colors">{res.title}</h4>
                        <p className="text-[10px] opacity-40 uppercase tracking-widest">{res.fileType}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {resources.length === 0 && (
                  <p className="text-sm opacity-40 italic col-span-2">아직 등록된 자료가 없습니다.</p>
                )}
              </div>
            </div>

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

      {/* Bookmarked Resources */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gold/10 rounded-2xl flex items-center justify-center">
                <Bookmark className="text-gold" size={20} />
              </div>
              <h3 className="text-2xl font-serif">{language === 'ko' ? '내가 찜한 자료' : 'My Bookmarks'}</h3>
            </div>
          </div>

          {bookmarks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allResources.filter(r => bookmarks.some(b => b.resourceUid === r.id && b.userUid === auth.currentUser?.uid)).map(resource => (
                <motion.div 
                  key={resource.id}
                  whileHover={{ y: -5 }}
                  className="p-6 border border-ink/10 rounded-[32px] bg-card space-y-4 relative group"
                >
                  <button 
                    onClick={() => toggleBookmark(resource.id)}
                    className="absolute top-6 right-6 p-2 bg-paper rounded-full shadow-sm text-gold"
                  >
                    <Bookmark size={16} fill="currentColor" />
                  </button>
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg")} style={{ backgroundColor: resource.color || '#F27D26' }}>
                    {resource.fileType === 'pdf' && <FileText size={24} />}
                    {resource.fileType === 'mp3' && <Music size={24} />}
                    {resource.fileType === 'image' && <ImageIcon size={24} />}
                    {resource.fileType === 'video' && <Video size={24} />}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-serif text-lg">{resource.title}</h4>
                    <p className="text-xs opacity-50 line-clamp-2">{resource.description}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setInitialArchiveFilter({ groupId: resource.groupId, categoryId: resource.categoryId });
                      setView('archive');
                    }}
                    className="w-full py-3 bg-ink/5 hover:bg-ink hover:text-paper rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all"
                  >
                    View in Archive
                  </button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="p-12 border border-dashed border-ink/10 rounded-[40px] text-center space-y-4">
              <p className="opacity-40 font-serif italic">{language === 'ko' ? '찜한 자료가 없습니다.' : 'No bookmarked resources yet.'}</p>
              <button 
                onClick={() => setView('archive')}
                className="text-gold text-xs uppercase tracking-widest font-bold hover:underline"
              >
                Go to Archive
              </button>
            </div>
          )}
        </section>
      </div>
    </motion.div>
  );
}

const Skeleton: FC<{ className?: string }> = ({ className }) => (
  <div className={cn("animate-pulse bg-ink/5 rounded-xl", className)} />
);

const ArchiveView: FC<{ 
  initialFilter?: { groupId: string | null, categoryId: string | null }, 
  onClearFilter?: () => void, 
  language: LanguageCode, 
  isAdmin: boolean,
  isEditMode: boolean,
  siteContent: any,
  deviceMode: 'pc' | 'pad' | 'mobile',
  bookmarks: any[],
  toggleBookmark: (id: string) => void
}> = ({ initialFilter, onClearFilter, language, isAdmin, isEditMode, siteContent, deviceMode, bookmarks, toggleBookmark }) => {
  const t = TRANSLATIONS[language];
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(initialFilter?.groupId || null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialFilter?.categoryId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'title' | 'downloads'>('newest');
  const [selectedResource, setSelectedResource] = useState<any | null>(null);

  // Admin Resource Form State
  const [isManaging, setIsManaging] = useState(false);
  const [editingResource, setEditingResource] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const [newResource, setNewResource] = useState({
    title: '',
    description: '',
    groupId: RESOURCE_GROUPS[0].id,
    categoryId: RESOURCE_GROUPS[0].categories[0].id,
    fileUrl: '',
    fileUrls: [] as string[],
    textContent: '',
    fileType: 'pdf' as 'pdf' | 'mp3' | 'image' | 'ppt' | 'word' | 'text' | 'video',
    accessLevel: 'member' as 'public' | 'member' | 'premium',
    status: 'published' as 'published' | 'hidden',
    author: '',
    tags: '',
    color: '#F27D26',
    fontFamily: 'serif',
    fontSize: 16,
    fontColor: '#000000',
    fontWeight: '400',
    hasOverlay: false,
    overlayPos: 'center' as 'top' | 'center' | 'bottom'
  });

  const [isFullScreen, setIsFullScreen] = useState(false);

  const COLOR_PALETTE = [
    '#000000', '#444444', '#666666', '#999999', '#cccccc', '#eeeeee', '#f3f3f3', '#ffffff',
    '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#9900ff', '#ff00ff',
    '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#cfe2f3', '#d9d2e9', '#ead1dc',
    '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#9fc5e8', '#b4a7d6', '#d5a6bd',
    '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6fa8dc', '#8e7cc3', '#c27ba0',
    '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3d85c6', '#674ea7', '#a64d79',
    '#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#0b5394', '#351c75', '#741b47',
    '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#073763', '#20124d', '#4c1130'
  ];

  const applyStyle = (command: string, value?: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    if (command === 'fontName') {
      document.execCommand('fontName', false, value);
    } else if (command === 'fontSize') {
      // Use insertHTML for more robust font size wrapping
      const selectedText = selection.toString();
      if (selectedText) {
        document.execCommand('insertHTML', false, `<span style="font-size: ${value}px">${selectedText}</span>`);
      }
    } else if (command === 'foreColor') {
      document.execCommand('foreColor', false, value);
    } else if (command === 'bold') {
      document.execCommand('bold', false);
    } else if (command === 'fontWeight') {
      const selectedText = selection.toString();
      if (selectedText) {
        document.execCommand('insertHTML', false, `<span style="font-weight: ${value || 'normal'}">${selectedText}</span>`);
      }
    }
    
    // Update state from contentEditable
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setNewResource(prev => ({ ...prev, textContent: html }));
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleFileUpload(file as any);
        }
      }
    }
  };

  // Sync editor content when editing starts
  useEffect(() => {
    if (isManaging && editorRef.current) {
      editorRef.current.innerHTML = newResource.textContent;
    }
  }, [isManaging, editingResource]);

  useEffect(() => {
    if (initialFilter) {
      setSelectedGroup(initialFilter.groupId);
      setSelectedCategory(initialFilter.categoryId);
    }
  }, [initialFilter]);
  useEffect(() => {
    const path = 'resources';
    const q = isAdmin 
      ? query(collection(db, path), orderBy('createdAt', 'desc'))
      : query(collection(db, path), where('status', '==', 'published'), orderBy('createdAt', 'desc'));
      
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'resources'));
    return () => unsubscribe();
  }, [isAdmin]);

  const filteredResources = resources.filter(res => {
    const isVisible = isAdmin || res.status !== 'hidden';
    const matchesGroup = !selectedGroup || res.groupId === selectedGroup;
    const matchesCategory = !selectedCategory || res.categoryId === selectedCategory;
    const matchesSearch = !searchQuery || res.title.toLowerCase().includes(searchQuery.toLowerCase()) || res.description.toLowerCase().includes(searchQuery.toLowerCase());
    return isVisible && matchesGroup && matchesCategory && matchesSearch;
  });

  const sortedResources = useMemo(() => {
    return [...filteredResources].sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'downloads') return (b.downloadCount || 0) - (a.downloadCount || 0);
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || 0);
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || 0);
      return (timeB as number) - (timeA as number);
    });
  }, [filteredResources, sortBy]);

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
      handleFirestoreError(error, OperationType.UPDATE, 'resources');
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
      fileUrls: newResource.fileUrls || (newResource.fileUrl ? [newResource.fileUrl] : []),
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
        fileUrls: [] as string[],
        textContent: '',
        fileType: 'pdf',
        accessLevel: 'member',
        status: 'published',
        author: '',
        tags: '',
        color: '#F27D26',
        fontFamily: 'serif',
        fontSize: 16,
        fontColor: '#000000',
        fontWeight: '400',
        hasOverlay: false,
        overlayPos: 'center'
      });
      setIsManaging(false);
      alert(language === 'ko' ? '처리가 완료되었습니다.' : 'Operation completed.');
    } catch (error) {
      handleFirestoreError(error, editingResource ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const handleFileUpload = async (input: React.ChangeEvent<HTMLInputElement> | React.DragEvent | File | FileList | File[]) => {
    let files: File[] = [];
    if (input instanceof File) {
      files = [input];
    } else if (input instanceof FileList) {
      files = Array.from(input);
    } else if (Array.isArray(input)) {
      files = input;
    } else if (input && typeof input === 'object' && 'dataTransfer' in input) {
      const e = input as React.DragEvent;
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      files = Array.from(e.dataTransfer.files);
    } else if (input && typeof input === 'object' && 'target' in input) {
      const e = input as React.ChangeEvent<HTMLInputElement>;
      if (e.target.files) {
        files = Array.from(e.target.files);
      }
    }

    if (files.length === 0) return;
    
    if (files.length > 20) {
      alert(language === 'ko' ? '최대 20개까지 업로드 가능합니다.' : 'Maximum 20 files can be uploaded.');
      return;
    }

    if (!auth.currentUser) {
      alert(language === 'ko' ? '로그인이 필요합니다.' : 'Login required.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    
    const uploadedUrls: string[] = [];
    let detectedFileType: any = null;
    let combinedTextContent = '';

    try {
      if (!storage) {
        throw new Error('Firebase Storage is not initialized');
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const maxSize = 100 * 1024 * 1024; // 100MB limit
        if (file.size > maxSize) {
          alert(`${file.name}: ${language === 'ko' ? '파일 크기가 너무 큽니다 (최대 100MB).' : 'File is too large (max 100MB).'}`);
          continue;
        }

        const safeFileName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        const storagePath = `resources/${Date.now()}_${safeFileName}`;
        const storageRef = ref(storage, storagePath);
        
        const extension = file.name.split('.').pop()?.toLowerCase();
        const mimeType = file.type;
        let fileType: 'pdf' | 'mp3' | 'image' | 'ppt' | 'word' | 'text' | 'video' = 'pdf';
        
        if (extension === 'mp3' || mimeType.startsWith('audio/')) fileType = 'mp3';
        else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '') || mimeType.startsWith('image/')) fileType = 'image';
        else if (['mp4', 'webm', 'ogg', 'mov'].includes(extension || '') || mimeType.startsWith('video/')) fileType = 'video';
        else if (['ppt', 'pptx'].includes(extension || '') || mimeType.includes('presentation') || mimeType.includes('powerpoint')) fileType = 'ppt';
        else if (['doc', 'docx'].includes(extension || '') || mimeType.includes('word') || mimeType.includes('officedocument.wordprocessingml')) fileType = 'word';
        else if (['txt', 'md', 'json', 'csv'].includes(extension || '') || mimeType.startsWith('text/')) fileType = 'text';
        else if (mimeType === 'application/pdf') fileType = 'pdf';

        // Video duration check
        if (fileType === 'video') {
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.src = URL.createObjectURL(file);
          const isValid = await new Promise<boolean>((resolve) => {
            video.onloadedmetadata = () => {
              window.URL.revokeObjectURL(video.src);
              if (video.duration > 11) { // 10s + buffer
                alert(`${file.name}: ${language === 'ko' ? '영상은 최대 10초까지 가능합니다.' : 'Video must be max 10 seconds.'}`);
                resolve(false);
              } else {
                resolve(true);
              }
            };
            video.onerror = () => resolve(true);
          });
          if (!isValid) continue;
        }

        console.log(`Uploading ${file.name}...`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        uploadedUrls.push(url);
        
        if (!detectedFileType) detectedFileType = fileType;
        
        if (fileType === 'text') {
          const text = await file.text();
          combinedTextContent += (combinedTextContent ? '\n\n' : '') + text;
        }

        setUploadProgress(((i + 1) / files.length) * 100);
      }

      if (uploadedUrls.length > 0) {
        setNewResource(prev => ({ 
          ...prev, 
          fileUrl: uploadedUrls[0],
          fileUrls: [...(prev.fileUrls || []), ...uploadedUrls],
          fileType: detectedFileType || prev.fileType,
          textContent: combinedTextContent || prev.textContent 
        }));

        if (combinedTextContent && editorRef.current) {
          editorRef.current.innerHTML = combinedTextContent;
        }

        alert(language === 'ko' ? '파일이 업로드되었습니다.' : 'Files uploaded successfully.');
      }
      setUploading(false);
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
      fileUrls: res.fileUrls || (res.fileUrl ? [res.fileUrl] : []),
      textContent: res.textContent || '',
      fileType: res.fileType,
      accessLevel: res.accessLevel,
      status: res.status || 'published',
      author: res.author || '',
      tags: Array.isArray(res.tags) ? res.tags.join(', ') : '',
      color: res.color || '#F27D26',
      fontFamily: res.fontFamily || 'serif',
      fontSize: res.fontSize || 16,
      fontColor: res.fontColor || '#000000',
      fontWeight: res.fontWeight || '400',
      hasOverlay: res.hasOverlay || false,
      overlayPos: res.overlayPos || 'center'
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
      className={cn(
        "max-w-[1600px] mx-auto transition-all",
        deviceMode === 'mobile' ? "px-4 py-12 space-y-8" : "px-6 py-20 space-y-16"
      )}
    >
      <div className="text-center space-y-4">
        <span className="text-gold text-[10px] uppercase tracking-[0.4em]">
          <EditableText contentKey="archive.badge" defaultValue="L.C.L Archive" isEditMode={isEditMode} language={language} siteContent={siteContent} as="span" />
        </span>
        <h2 className={cn(
          "font-serif font-light transition-all",
          deviceMode === 'mobile' ? "text-3xl" : "text-5xl"
        )}>
          <EditableText contentKey="archive.title" defaultValue={t.archive.title} isEditMode={isEditMode} language={language} siteContent={siteContent} as="span" />
        </h2>
        <div className={cn(
          "max-w-3xl mx-auto opacity-60 font-serif italic leading-relaxed transition-all",
          deviceMode === 'mobile' ? "text-xs" : "text-sm"
        )}>
          <EditableText contentKey="archive.subtitle" defaultValue={t.archive.subtitle} isEditMode={isEditMode} language={language} siteContent={siteContent} as="div" />
        </div>
      </div>

      {/* Category Hub */}
      <div className={cn(
        "grid gap-8 transition-all",
        deviceMode === 'mobile' ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3"
      )}>
        {(t.resourceGroups || RESOURCE_GROUPS).map((group: any) => (
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
                <h3 className="text-2xl font-serif">
                  <EditableText 
                    contentKey={`library.group.${group.id}.title`} 
                    defaultValue={group.name.split(':')[1]?.trim() || group.name} 
                    isEditMode={isEditMode} 
                    language={language} 
                    siteContent={siteContent} 
                    as="span" 
                  />
                </h3>
                <div className="text-[10px] uppercase tracking-widest text-gold font-bold">
                  <EditableText 
                    contentKey={`library.group.${group.id}.badge`} 
                    defaultValue={group.name.split(':')[0]} 
                    isEditMode={isEditMode} 
                    language={language} 
                    siteContent={siteContent} 
                    as="span" 
                  />
                </div>
              </div>
              <div className="text-sm opacity-60 leading-relaxed">
                <EditableText 
                  contentKey={`library.group.${group.id}.description`} 
                  defaultValue={group.description} 
                  isEditMode={isEditMode} 
                  language={language} 
                  siteContent={siteContent} 
                  as="p" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {group.categories.map((cat: any) => (
                <div 
                  key={cat.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedGroup(group.id);
                    setSelectedCategory(selectedCategory === cat.id ? null : cat.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedGroup(group.id);
                      setSelectedCategory(selectedCategory === cat.id ? null : cat.id);
                    }
                  }}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl transition-all group/item cursor-pointer",
                    selectedCategory === cat.id
                      ? "bg-gold text-ink"
                      : selectedGroup === group.id
                        ? "bg-paper/10 hover:bg-paper/20 text-paper"
                        : "bg-paper hover:bg-ink/5 text-ink"
                  )}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      <EditableText 
                        contentKey={`library.group.${group.id}.category.${cat.id}.name`} 
                        defaultValue={cat.name} 
                        isEditMode={isEditMode} 
                        language={language} 
                        siteContent={siteContent} 
                        as="span" 
                      />
                    </span>
                    <ArrowRight size={14} className={cn(
                      "transition-all",
                      selectedCategory === cat.id ? "opacity-100" : "opacity-0 group-hover/item:opacity-100 -translate-x-2 group-hover/item:translate-x-0"
                    )} />
                  </div>
                  <div className={cn(
                    "text-[10px] mt-1",
                    selectedCategory === cat.id ? "text-ink/60" : "opacity-40"
                  )}>
                    <EditableText 
                      contentKey={`library.group.${group.id}.category.${cat.id}.description`} 
                      defaultValue={cat.description} 
                      isEditMode={isEditMode} 
                      language={language} 
                      siteContent={siteContent} 
                      as="div" 
                    />
                  </div>
                </div>
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
            <div className="flex items-center gap-4 flex-grow md:w-auto">
              <div className="relative flex-grow md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                <input 
                  type="text" 
                  placeholder={t.archive.search}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-card border border-ink/10 rounded-full text-sm focus:outline-none focus:border-gold transition-all"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-6 py-4 bg-card border border-ink/10 rounded-full text-xs font-bold outline-none focus:border-gold transition-all appearance-none cursor-pointer"
              >
                <option value="newest">{language === 'ko' ? '최신순' : 'Newest'}</option>
                <option value="title">{language === 'ko' ? '제목순' : 'Title'}</option>
                <option value="downloads">{language === 'ko' ? '인기순' : 'Popular'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Resource Grid */}
        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-6 border border-ink/10 rounded-2xl bg-card space-y-4">
                <div className="flex justify-between items-start">
                  <Skeleton className="w-10 h-10" />
                  <Skeleton className="w-16 h-4" />
                </div>
                <Skeleton className="w-3/4 h-6" />
                <Skeleton className="w-full h-4" />
                <div className="flex justify-between pt-4">
                  <Skeleton className="w-20 h-4" />
                  <Skeleton className="w-20 h-4" />
                </div>
              </div>
            ))
          ) : sortedResources.length > 0 ? sortedResources.map(res => (
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
              className="p-6 border border-ink/10 rounded-2xl bg-card space-y-4 flex flex-col hover:shadow-2xl hover:shadow-gold/10 hover:-translate-y-1 transition-all group cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
                  style={{ backgroundColor: res.color || '#F27D26' }}
                >
                  {res.fileType === 'pdf' && <FileText size={20} />}
                  {res.fileType === 'mp3' && <Music size={20} />}
                  {res.fileType === 'image' && <ImageIcon size={20} />}
                  {res.fileType === 'video' && <Video size={20} />}
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
                  {isAdmin && res.status === 'hidden' && (
                    <span className="text-[8px] uppercase tracking-widest px-2 py-1 rounded-full font-bold bg-ink text-paper">
                      {language === 'ko' ? '비공개' : 'Hidden'}
                    </span>
                  )}
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if (!auth.currentUser) {
                        alert(language === 'ko' ? '로그인이 필요한 서비스입니다.' : 'Login is required.');
                        loginWithGoogle().catch(console.error);
                        return;
                      }
                      toggleBookmark(res.id); 
                    }}
                    className={cn(
                      "p-2 rounded-full transition-all",
                      bookmarks.some(b => b.resourceUid === res.id && b.userUid === auth.currentUser?.uid)
                        ? "bg-gold/10 text-gold"
                        : "hover:bg-ink/5 text-ink/20 hover:text-ink/40"
                    )}
                  >
                    <Bookmark size={14} fill={bookmarks.some(b => b.resourceUid === res.id && b.userUid === auth.currentUser?.uid) ? "currentColor" : "none"} />
                  </button>
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
                          <option value="video">Video (Max 10s)</option>
                          <option value="ppt">PPT / PowerPoint</option>
                          <option value="word">Word / Document</option>
                          <option value="text">Text / Content</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest opacity-50">Visibility</label>
                        <select 
                          value={newResource.status}
                          onChange={(e) => setNewResource(prev => ({ ...prev, status: e.target.value as any }))}
                          className="w-full p-4 bg-ink/5 border border-ink/10 rounded-2xl text-sm focus:outline-none focus:border-gold transition-all"
                        >
                          <option value="published">{language === 'ko' ? '공개' : 'Published'}</option>
                          <option value="hidden">{language === 'ko' ? '비공개' : 'Hidden'}</option>
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
                    {newResource.fileType === 'image' && (
                      <div className="space-y-2 p-4 bg-gold/5 border border-gold/20 rounded-2xl">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-gold">Image Text Overlay</label>
                        <div className="flex items-center gap-4">
                          <button 
                            type="button"
                            onClick={() => setNewResource(prev => ({ ...prev, hasOverlay: !prev.hasOverlay }))}
                            className={cn(
                              "px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all",
                              newResource.hasOverlay ? "bg-gold text-ink" : "bg-ink/5 text-ink/40"
                            )}
                          >
                            {newResource.hasOverlay ? 'Overlay Enabled' : 'Overlay Disabled'}
                          </button>
                          {newResource.hasOverlay && (
                            <div className="flex gap-2">
                              {['top', 'center', 'bottom'].map(pos => (
                                <button
                                  key={pos}
                                  type="button"
                                  onClick={() => setNewResource(prev => ({ ...prev, overlayPos: pos as any }))}
                                  className={cn(
                                    "px-3 py-1 rounded-lg text-[10px] uppercase tracking-widest transition-all",
                                    newResource.overlayPos === pos ? "bg-gold/20 text-gold border border-gold/30" : "bg-ink/5 text-ink/40 border border-transparent"
                                  )}
                                >
                                  {pos}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="text-[8px] opacity-40 mt-1 italic">* When enabled, the "Text Content" below will be overlaid on the image.</p>
                      </div>
                    )}
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
                          <div className="relative group">
                            <button 
                              type="button"
                              className="p-1 text-[10px] bg-white border border-ink/10 rounded hover:bg-gold/10 flex items-center gap-1"
                            >
                              <div className="w-3 h-3 rounded-full border border-ink/10" style={{ backgroundColor: newResource.color || '#000000' }} />
                              Color
                            </button>
                            <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-ink/10 rounded-xl shadow-2xl z-50 hidden group-hover:grid grid-cols-8 gap-1 w-48">
                              {COLOR_PALETTE.map(color => (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() => applyStyle('foreColor', color)}
                                  className="w-4 h-4 rounded-sm border border-ink/5 hover:scale-110 transition-transform"
                                  style={{ backgroundColor: color }}
                                  title={color}
                                />
                              ))}
                              <input 
                                type="color" 
                                onChange={(e) => applyStyle('foreColor', e.target.value)}
                                className="col-span-8 w-full h-4 p-0 border-none bg-transparent cursor-pointer mt-1"
                              />
                            </div>
                          </div>
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
                          ref={editorRef}
                          contentEditable
                          suppressContentEditableWarning
                          onInput={(e) => {
                            const html = e.currentTarget.innerHTML;
                            setNewResource(prev => ({ ...prev, textContent: html }));
                          }}
                          onPaste={handlePaste}
                          className="w-full p-4 text-sm min-h-[200px] focus:outline-none bg-white"
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
                            multiple
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
                    disabled={uploading}
                    className={cn(
                      "w-full py-4 bg-ink text-paper rounded-2xl font-bold uppercase tracking-widest transition-all shadow-xl shadow-ink/10",
                      uploading ? "opacity-50 cursor-not-allowed" : "hover:bg-ink/90"
                    )}
                  >
                    {uploading ? (language === 'ko' ? '업로드 중...' : 'Uploading...') : (editingResource ? (language === 'ko' ? '수정 완료' : 'Update Resource') : (language === 'ko' ? '자료 등록' : 'Create Resource'))}
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
                        {selectedResource.fileType === 'video' && <Video size={20} />}
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
                {selectedResource.fileUrls && selectedResource.fileUrls.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedResource.fileUrls.map((url: string, idx: number) => (
                      <div key={idx} className="rounded-3xl overflow-hidden border border-ink/10 bg-ink/5 relative group/img">
                        {selectedResource.fileType === 'image' ? (
                          <div className="relative w-full h-full">
                            <img 
                              src={url} 
                              alt={`${selectedResource.title} ${idx + 1}`} 
                              className="w-full h-auto max-h-[400px] object-contain cursor-pointer hover:scale-[1.02] transition-transform"
                              referrerPolicy="no-referrer"
                              onClick={() => window.open(url, '_blank')}
                            />
                            {selectedResource.hasOverlay && selectedResource.textContent && (
                              <div className={cn(
                                "absolute inset-0 flex flex-col p-6 pointer-events-none z-10",
                                selectedResource.overlayPos === 'top' ? 'justify-start items-center text-center' :
                                selectedResource.overlayPos === 'bottom' ? 'justify-end items-center text-center' :
                                'justify-center items-center text-center'
                              )}>
                                <div className="absolute inset-0 bg-ink/20" />
                                <div 
                                  className="relative z-10 w-full drop-shadow-2xl text-white"
                                  style={{ 
                                    fontFamily: selectedResource.fontFamily === 'serif' ? 'Playfair Display, serif' : 'Inter, sans-serif',
                                    fontSize: `${selectedResource.fontSize || 16}px`,
                                    color: 'white', // Force white for overlay readability
                                    fontWeight: selectedResource.fontWeight || '400'
                                  }}
                                  dangerouslySetInnerHTML={{ __html: selectedResource.textContent }}
                                />
                              </div>
                            )}
                          </div>
                        ) : selectedResource.fileType === 'video' ? (
                          <video 
                            src={url} 
                            controls 
                            className="w-full h-auto max-h-[400px] object-contain"
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : selectedResource.fileUrl && (
                  <div className="rounded-3xl overflow-hidden border border-ink/10 bg-ink/5 relative">
                    {selectedResource.fileType === 'image' ? (
                      <div className="relative w-full h-full">
                        <img 
                          src={selectedResource.fileUrl} 
                          alt={selectedResource.title} 
                          className="w-full h-auto max-h-[400px] object-contain"
                          referrerPolicy="no-referrer"
                        />
                        {selectedResource.hasOverlay && selectedResource.textContent && (
                          <div className={cn(
                            "absolute inset-0 flex flex-col p-8 pointer-events-none z-10",
                            selectedResource.overlayPos === 'top' ? 'justify-start items-center text-center' :
                            selectedResource.overlayPos === 'bottom' ? 'justify-end items-center text-center' :
                            'justify-center items-center text-center'
                          )}>
                            <div className="absolute inset-0 bg-ink/20" />
                            <div 
                              className="relative z-10 w-full drop-shadow-2xl text-white"
                              style={{ 
                                fontFamily: selectedResource.fontFamily === 'serif' ? 'Playfair Display, serif' : 'Inter, sans-serif',
                                fontSize: `${selectedResource.fontSize || 16}px`,
                                color: 'white',
                                fontWeight: selectedResource.fontWeight || '400'
                              }}
                              dangerouslySetInnerHTML={{ __html: selectedResource.textContent }}
                            />
                          </div>
                        )}
                      </div>
                    ) : selectedResource.fileType === 'video' ? (
                      <video 
                        src={selectedResource.fileUrl} 
                        controls 
                        className="w-full h-auto max-h-[400px] object-contain"
                      />
                    ) : null}
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
                        "text-sm whitespace-pre-wrap leading-relaxed overflow-y-auto custom-scrollbar pr-2 p-8 bg-card rounded-3xl shadow-inner transition-all duration-500",
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

const CurriculumView: FC<{ language: LanguageCode, onBook: (course: any) => void, isEditMode: boolean, isAdmin?: boolean, siteContent: any, deviceMode: 'pc' | 'pad' | 'mobile' }> = ({ language, onBook, isEditMode, isAdmin, siteContent, deviceMode }) => {
  const t = TRANSLATIONS[language];
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 5;
  const courses = t.courses || COURSES;
  const totalPages = Math.ceil(courses.length / itemsPerPage);
  
  const currentCourses = courses.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  const nextPage = () => {
    if (currentPage < totalPages - 1) setCurrentPage(prev => prev + 1);
  };

  const prevPage = () => {
    if (currentPage > 0) setCurrentPage(prev => prev - 1);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        "max-w-[1600px] mx-auto transition-all",
        deviceMode === 'mobile' ? "px-4 py-12" : "px-6 md:px-20 py-32"
      )}
    >
      <div className={cn(
        "flex justify-between transition-all mb-10",
        deviceMode === 'mobile' ? "flex-col gap-4" : "flex-row items-end gap-8 mb-20"
      )}>
        <div className="space-y-4">
          <div className="text-gold text-[10px] uppercase tracking-[0.4em]">
            <EditableText contentKey="curriculum.badge" defaultValue={t.curriculum.badge} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </div>
            <EditableText contentKey="curriculum.title" defaultValue={t.curriculum.title} isEditMode={isEditMode} language={language} siteContent={siteContent} as="h2" className={cn(
              "font-serif font-light transition-all",
              deviceMode === 'mobile' ? "text-3xl" : "text-5xl"
            )} />
        </div>
        <div className={cn(
          "opacity-60 font-serif italic transition-all",
          deviceMode === 'mobile' ? "text-xs max-w-full" : "text-sm max-w-xs"
        )}>
          <EditableText contentKey="curriculum.subtitle" defaultValue={t.curriculum.subtitle} isEditMode={isEditMode} language={language} siteContent={siteContent} />
        </div>
      </div>

      <div className="relative group/carousel">
        {/* Navigation Arrows */}
        <button 
          onClick={prevPage}
          disabled={currentPage === 0}
          className={cn(
            "absolute -left-4 md:-left-16 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-16 md:h-16 bg-paper border border-ink/10 rounded-full flex items-center justify-center shadow-2xl transition-all group/arrow",
            currentPage === 0 ? "opacity-20 cursor-not-allowed" : "opacity-100 hover:bg-gold hover:text-ink hover:border-gold"
          )}
        >
          <ChevronLeft size={28} className={cn("transition-transform", currentPage !== 0 && "group-hover/arrow:-translate-x-1")} />
        </button>
        
        <button 
          onClick={nextPage}
          disabled={currentPage >= totalPages - 1}
          className={cn(
            "absolute -right-4 md:-right-16 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-16 md:h-16 bg-paper border border-ink/10 rounded-full flex items-center justify-center shadow-2xl transition-all group/arrow",
            currentPage >= totalPages - 1 ? "opacity-20 cursor-not-allowed" : "opacity-100 hover:bg-gold hover:text-ink hover:border-gold"
          )}
        >
          <ChevronRight size={28} className={cn("transition-transform", currentPage < totalPages - 1 && "group-hover/arrow:translate-x-1")} />
        </button>

        <div className="overflow-visible">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentPage}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className={cn(
                "grid gap-px bg-ink/10 border border-ink/10 transition-all",
                deviceMode === 'mobile' ? "grid-cols-1" : "md:grid-cols-3 lg:grid-cols-5"
              )}
            >
              {currentCourses.map((course: any) => (
                <motion.div 
                  key={course.id}
                  whileHover={{ backgroundColor: 'rgba(26, 26, 26, 0.02)' }}
                  className="bg-paper p-8 space-y-8 flex flex-col h-full min-h-[500px]"
                >
                  <div className="space-y-4 flex-grow">
                    <div className="w-12 h-12 rounded-full border border-ink/10 flex items-center justify-center">
                      {course.id === 'conv' && <MessageSquare size={20} />}
                      {course.id === 'hsk' && <GraduationCap size={20} />}
                      {course.id === 'acad' && <BookOpen size={20} />}
                      {course.id === 'disc' && <Star size={20} />}
                      {course.id === 'biz' && <Briefcase size={20} />}
                      {course.id === 'cult' && <Globe size={20} />}
                    </div>
                    <h3 className="text-2xl font-serif">{course.title}</h3>
                    <p className="text-xs opacity-60 leading-relaxed line-clamp-3">{course.description}</p>
                    <div className="space-y-3 pt-2">
                      {course.levels.map((level: string, lIdx: number) => (
                        <div key={level} className="space-y-1">
                          <span className="inline-block text-[9px] uppercase tracking-widest px-2 py-1 bg-ink/5 rounded-sm font-bold">{level}</span>
                          {course.levelDescriptions && course.levelDescriptions[lIdx] && (
                            <p className="text-[10px] opacity-50 leading-tight pl-1">{course.levelDescriptions[lIdx]}</p>
                          )}
                        </div>
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
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Pagination Info */}
        <div className="mt-12 flex flex-col items-center gap-4">
          <div className="flex gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  currentPage === i ? "bg-gold w-8" : "bg-ink/10 hover:bg-ink/30"
                )}
              />
            ))}
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] opacity-40 font-bold">
            {language === 'ko' 
              ? `${currentPage + 1}페이지 ${currentPage * itemsPerPage + 1}-${Math.min((currentPage + 1) * itemsPerPage, courses.length)}개`
              : `Page ${currentPage + 1}: ${currentPage * itemsPerPage + 1}-${Math.min((currentPage + 1) * itemsPerPage, courses.length)} items`}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

const PricingView: FC<{ language: LanguageCode, setView: (v: any) => void, isEditMode: boolean, isAdmin?: boolean, siteContent: any, isEventPeriod: boolean, deviceMode: 'pc' | 'pad' | 'mobile' }> = ({ language, setView, isEditMode, isAdmin, siteContent, isEventPeriod, deviceMode }) => {
  const t = TRANSLATIONS[language];
  const event = siteContent['event-discount'];
  const customRate = event?.discountRate;
  
  const weeksDiscounts = siteContent['weeks-discounts']?.rates || {};
  const levelPrices = siteContent['level-prices']?.prices || {};

  const [selectedCourse, setSelectedCourse] = useState((t.courses || COURSES)[0]);
  const [selectedLevel, setSelectedLevel] = useState((t.courses || COURSES)[0].levels[0]);
  const [selectedWeeks, setSelectedWeeks] = useState(12);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(1);
  const [selectedHours, setSelectedHours] = useState(1);

  // Update level when course changes
  useEffect(() => {
    setSelectedLevel(selectedCourse.levels[0]);
  }, [selectedCourse]);

  const originalCourse = COURSES.find(c => c.id === selectedCourse.id);
  const levelIdx = selectedCourse.levels.indexOf(selectedLevel);
  const originalLevel = originalCourse?.levels[levelIdx] || selectedLevel;

  const priceInfo = calculatePrice(originalLevel, selectedWeeks, sessionsPerWeek, selectedHours, isEventPeriod, customRate, weeksDiscounts, levelPrices);

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
      className={cn(
        "bg-ink text-paper transition-all min-h-screen",
        deviceMode === 'mobile' ? "py-12 px-4" : "py-32 px-6"
      )}
    >
      <div className="max-w-[1600px] mx-auto w-full">
        <div className={cn(
          "text-center space-y-6 transition-all",
          deviceMode === 'mobile' ? "mb-10" : "mb-20"
        )}>
          <div className="text-gold text-[10px] uppercase tracking-[0.4em]">
            <EditableText contentKey="pricing.badge" defaultValue={t.pricing.badge} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </div>
            <EditableText contentKey="pricing.title" defaultValue={t.pricing.title} isEditMode={isEditMode} language={language} siteContent={siteContent} as="h2" className={cn(
              "font-serif font-light transition-all",
              deviceMode === 'mobile' ? "text-3xl" : "text-5xl"
            )} />
          <div className={cn(
            "max-w-xl mx-auto opacity-60 font-serif italic transition-all",
            deviceMode === 'mobile' ? "text-xs" : "text-sm"
          )}>
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

        <div className={cn(
          "grid gap-12 transition-all",
          deviceMode === 'mobile' ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3"
        )}>
          {/* Selection Panel */}
          <div className="lg:col-span-2 space-y-12">
            {/* Course Selection */}
            <div className="space-y-6">
              <h3 className="text-xs uppercase tracking-[0.3em] opacity-50">1. {language === 'ko' ? '과정 선택' : 'Select Course'}</h3>
              <div className={cn(
                "grid gap-4 transition-all",
                deviceMode === 'mobile' ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-3"
              )}>
                {COURSES.map(course => (
                  <button
                    key={course.id}
                    onClick={() => setSelectedCourse(course)}
                    className={cn(
                      "p-6 rounded-2xl border transition-all text-left group",
                      selectedCourse.id === course.id ? "border-gold bg-gold/5" : "border-paper/10 hover:border-paper/30"
                    )}
                  >
                    <p className={cn("text-sm font-bold mb-1", selectedCourse.id === course.id ? "text-gold" : "opacity-80")}>{course.title}</p>
                    <p className="text-[10px] opacity-40 leading-relaxed line-clamp-2">{course.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Level Selection */}
            <div className="space-y-6">
              <h3 className="text-xs uppercase tracking-[0.3em] opacity-50">2. {language === 'ko' ? '레벨 선택' : 'Select Level'}</h3>
              <div className="flex flex-wrap gap-3">
                {selectedCourse.levels.map((level, lIdx) => (
                  <div key={level} className="flex flex-col gap-2">
                    <button
                      onClick={() => setSelectedLevel(level)}
                      className={cn(
                        "px-6 py-3 rounded-full border text-xs uppercase tracking-widest transition-all",
                        selectedLevel === level ? "bg-gold text-ink border-gold font-bold" : "border-paper/10 hover:border-paper/30"
                      )}
                    >
                      {level}
                    </button>
                    {selectedLevel === level && selectedCourse.levelDescriptions && selectedCourse.levelDescriptions[lIdx] && (
                      <motion.p 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[10px] opacity-50 italic max-w-[200px] leading-tight"
                      >
                        * {selectedCourse.levelDescriptions[lIdx]}
                      </motion.p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className={cn(
              "grid gap-12 transition-all",
              deviceMode === 'mobile' ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
            )}>
              {/* Duration Selection */}
              <div className="space-y-6">
                <h3 className="text-xs uppercase tracking-[0.3em] opacity-50">3. {language === 'ko' ? '기간 선택' : 'Select Duration'}</h3>
                <div className={cn(
                  "grid gap-3 transition-all",
                  deviceMode === 'mobile' ? "grid-cols-1" : "grid-cols-2"
                )}>
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
              <div className={cn(
                "grid gap-12 transition-all",
                deviceMode === 'mobile' ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
              )}>
                {/* Frequency Selection */}
                <div className="space-y-6">
                  <h3 className="text-xs uppercase tracking-[0.3em] opacity-50">4. {language === 'ko' ? '수업 횟수' : 'Sessions per Week'}</h3>
                  <div className={cn(
                    "grid gap-3 transition-all",
                    deviceMode === 'mobile' ? "grid-cols-1" : "grid-cols-2"
                  )}>
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
                  <div className={cn(
                    "grid gap-3 transition-all",
                    deviceMode === 'mobile' ? "grid-cols-1" : "grid-cols-3"
                  )}>
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
            <div className={cn(
              "p-10 border border-gold/30 rounded-3xl bg-paper/5 space-y-8 transition-all",
              deviceMode === 'mobile' ? "relative top-0" : "sticky top-32"
            )}>
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

const InquiryView: FC<{ 
  language: LanguageCode, 
  onComplete: () => void, 
  isEventPeriod: boolean, 
  siteContent: any, 
  isEditMode: boolean, 
  isAdmin?: boolean,
  initialCourse?: Course,
  initialLevel?: string,
  deviceMode: 'pc' | 'pad' | 'mobile'
}> = ({ language, onComplete, isEventPeriod, siteContent, isEditMode, isAdmin, initialCourse, initialLevel, deviceMode }) => {
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
    desiredClass: initialCourse ? [initialCourse.title] : [] as string[],
    otherDesiredClass: '',
    desiredLevel: initialLevel || (initialCourse ? initialCourse.levels[0] : '입문'),
    desiredWeeks: 12,
    desiredHours: 1,
    preferredSlots: [] as string[],
    requests: ''
  });

  // Update level when course changes
  useEffect(() => {
    if (formData.desiredClass.length > 0) {
      const firstSelectedCourse = COURSES.find(c => formData.desiredClass.some(dc => dc.includes(c.title)));
      if (firstSelectedCourse && !firstSelectedCourse.levels.includes(formData.desiredLevel)) {
        setFormData(prev => ({ ...prev, desiredLevel: firstSelectedCourse.levels[0] }));
      }
    }
  }, [formData.desiredClass, language]);

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
        <h2 className={cn(
          "font-serif mb-4 transition-all",
          deviceMode === 'mobile' ? "text-2xl" : "text-4xl"
        )}>
          {t.inquiry.successTitle}
        </h2>
        <p className="text-lg opacity-60 max-w-md mx-auto">{t.inquiry.successMessage}</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "max-w-3xl mx-auto transition-all",
        deviceMode === 'mobile' ? "px-4 py-12" : "px-6 py-20"
      )}
    >
      <div className={cn(
        "text-center space-y-4 transition-all",
        deviceMode === 'mobile' ? "mb-10" : "mb-16"
      )}>
        <div className="text-gold text-[10px] uppercase tracking-[0.4em]">
          <EditableText contentKey="inquiry.badge" defaultValue={t.inquiry.badge} isEditMode={isEditMode} language={language} siteContent={siteContent} />
        </div>
        <div className={cn(
          "font-serif font-light transition-all",
          deviceMode === 'mobile' ? "text-3xl" : "text-5xl"
        )}>
          <EditableText contentKey="inquiry.title" defaultValue={t.inquiry.title} isEditMode={isEditMode} language={language} siteContent={siteContent} as="div" />
        </div>
        <div className={cn(
          "opacity-60 font-serif italic transition-all",
          deviceMode === 'mobile' ? "text-sm" : "text-lg"
        )}>
          <EditableText contentKey="inquiry.subtitle" defaultValue={t.inquiry.subtitle} isEditMode={isEditMode} language={language} siteContent={siteContent} as="div" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-12">
        {/* 1. Name */}
        <div className="space-y-4">
          <div className="text-xs uppercase tracking-widest font-bold flex items-center gap-2">
            <span className="w-6 h-6 bg-ink text-paper rounded-full flex items-center justify-center text-[10px]">1</span>
            <EditableText contentKey="inquiry.nameLabel" defaultValue={t.inquiry.nameLabel} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </div>
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
          <div className="text-xs uppercase tracking-widest font-bold flex items-center gap-2">
            <span className="w-6 h-6 bg-ink text-paper rounded-full flex items-center justify-center text-[10px]">2</span>
            <EditableText contentKey="inquiry.contactLabel" defaultValue={t.inquiry.contactLabel} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </div>
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
          <div className="text-xs uppercase tracking-widest font-bold flex items-center gap-2">
            <span className="w-6 h-6 bg-ink text-paper rounded-full flex items-center justify-center text-[10px]">3</span>
            <EditableText contentKey="inquiry.historyLabel" defaultValue={t.inquiry.historyLabel} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </div>
          <textarea 
            placeholder={t.inquiry.historyPlaceholder}
            value={formData.history}
            onChange={(e) => setFormData(prev => ({ ...prev, history: e.target.value }))}
            className="w-full p-6 bg-ink/5 border border-ink/10 rounded-3xl focus:border-gold outline-none transition-colors text-lg min-h-[150px]"
          />
        </div>

        {/* 4. Level & Concerns */}
        <div className="space-y-6">
          <div className="text-xs uppercase tracking-widest font-bold flex items-center gap-2">
            <span className="w-6 h-6 bg-ink text-paper rounded-full flex items-center justify-center text-[10px]">4</span>
            <EditableText contentKey="inquiry.levelLabel" defaultValue={t.inquiry.levelLabel} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </div>
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
                    className="w-full p-4 bg-card border border-gold/30 rounded-xl outline-none focus:border-gold text-sm"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 5. Desired Duration */}
        <div className="space-y-6">
          <div className="text-xs uppercase tracking-widest font-bold flex items-center gap-2">
            <span className="w-6 h-6 bg-ink text-paper rounded-full flex items-center justify-center text-[10px]">5</span>
            <EditableText contentKey="inquiry.durationLabel" defaultValue={t.inquiry.durationLabel} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {t.inquiry.durationOptions.map((option: string, idx: number) => {
              const weekValues = [4, 8, 10, 12];
              const w = weekValues[idx];
              return (
                <button 
                  key={option}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, desiredWeeks: w }))}
                  className={cn(
                    "py-5 border rounded-2xl text-sm transition-all",
                    formData.desiredWeeks === w ? "border-gold bg-gold/10 text-gold font-bold" : "bg-paper border-ink/10 hover:border-gold/50"
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        {/* 6. Desired Class Hours */}
        <div className="space-y-6">
          <div className="text-xs uppercase tracking-widest font-bold flex items-center gap-2">
            <span className="w-6 h-6 bg-ink text-paper rounded-full flex items-center justify-center text-[10px]">6</span>
            <EditableText contentKey="inquiry.hoursLabel" defaultValue={t.inquiry.hoursLabel} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {t.inquiry.hoursOptions.map((option: string, idx: number) => {
              const hourValues = [1, 1.5, 2];
              const h = hourValues[idx];
              return (
                <button 
                  key={option}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, desiredHours: h }))}
                  className={cn(
                    "py-5 border rounded-2xl text-sm transition-all",
                    formData.desiredHours === h ? "border-gold bg-gold/10 text-gold font-bold" : "bg-paper border-ink/10 hover:border-gold/50"
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        {/* 7. Desired Course */}
        <div className="space-y-6">
          <div className="text-xs uppercase tracking-widest font-bold flex items-center gap-2">
            <span className="w-6 h-6 bg-ink text-paper rounded-full flex items-center justify-center text-[10px]">7</span>
            <EditableText contentKey="inquiry.classLabel" defaultValue={t.inquiry.classLabel} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </div>
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
              className="w-full p-4 bg-card border border-gold/30 rounded-xl outline-none focus:border-gold text-sm"
            />
          )}
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

        {/* 8. Goals */}
        <div className="space-y-4">
          <div className="text-xs uppercase tracking-widest font-bold flex items-center gap-2">
            <span className="w-6 h-6 bg-ink text-paper rounded-full flex items-center justify-center text-[10px]">8</span>
            <EditableText contentKey="inquiry.goalsLabel" defaultValue={t.inquiry.goalsLabel} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </div>
          <textarea 
            placeholder={t.inquiry.goalsPlaceholder}
            value={formData.goals || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, goals: e.target.value }))}
            className="w-full p-6 bg-ink/5 border border-ink/10 rounded-3xl focus:border-gold outline-none transition-colors text-lg min-h-[100px]"
          />
        </div>

        {/* 9. Preferred Schedule */}
        <div className="space-y-6">
          <div className="text-xs uppercase tracking-widest font-bold flex items-center gap-2">
            <span className="w-6 h-6 bg-ink text-paper rounded-full flex items-center justify-center text-[10px]">9</span>
            <EditableText contentKey="inquiry.scheduleLabel" defaultValue={t.inquiry.scheduleLabel} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </div>
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

        {/* 10. Additional Requests */}
        <div className="space-y-4">
          <div className="text-xs uppercase tracking-widest font-bold flex items-center gap-2">
            <span className="w-6 h-6 bg-ink text-paper rounded-full flex items-center justify-center text-[10px]">10</span>
            <EditableText contentKey="inquiry.requestsLabel" defaultValue={t.inquiry.requestsLabel} isEditMode={isEditMode} language={language} siteContent={siteContent} />
          </div>
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

const LevelTestView: FC<{ language: LanguageCode, isAdmin: boolean, isEditMode: boolean, siteContent: any, deviceMode: 'pc' | 'pad' | 'mobile' }> = ({ language, isAdmin, isEditMode, siteContent, deviceMode }) => {
  const t = TRANSLATIONS[language];
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<CourseCategory>(COURSES[0].category);
  const [newLevel, setNewLevel] = useState<string>(COURSES[0].levels[0]);
  const [filterCategory, setFilterCategory] = useState<CourseCategory | 'All'>('All');
  const [filterLevel, setFilterLevel] = useState<string>('All');
  const [editingCategory, setEditingCategory] = useState<CourseCategory>(COURSES[0].category);
  const [editingLevel, setEditingLevel] = useState<string>(COURSES[0].levels[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'levelTests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'levelTests'));
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (!isAdmin || !window.confirm(language === 'ko' ? '삭제하시겠습니까?' : 'Are you sure you want to delete?')) return;
    try {
      await deleteDoc(doc(db, 'levelTests', id));
    } catch (error) {
      console.error("Error deleting test:", error);
    }
  };

  const handleUpdateName = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await updateDoc(doc(db, 'levelTests', id), {
        name: editName.trim(),
        category: editingCategory,
        level: editingLevel
      });
      setEditingTestId(null);
    } catch (error) {
      console.error("Error updating test:", error);
    }
  };

  const handleAddTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file || !newName.trim() || !isAdmin) {
      if (!file) alert(language === 'ko' ? '파일을 선택해 주세요.' : 'Please select a file.');
      return;
    }

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `levelTests/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed', 
        null,
        (error) => {
          console.error("Upload failed", error);
          setIsUploading(false);
          alert(language === 'ko' ? '업로드에 실패했습니다.' : 'Upload failed.');
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          await addDoc(collection(db, 'levelTests'), {
            name: newName.trim(),
            category: newCategory,
            level: newLevel,
            url: downloadURL,
            type: file.type,
            size: file.size,
            createdAt: serverTimestamp()
          });
          setIsUploading(false);
          setShowAddForm(false);
          setNewName('');
          setNewCategory(COURSES[0].category);
          setNewLevel(COURSES[0].levels[0]);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      );
    } catch (error) {
      console.error("Error uploading file:", error);
      setIsUploading(false);
    }
  };

  const filteredTests = useMemo(() => {
    return tests.filter(test => {
      const matchCategory = filterCategory === 'All' || test.category === filterCategory;
      const matchLevel = filterLevel === 'All' || test.level === filterLevel;
      return matchCategory && matchLevel;
    });
  }, [tests, filterCategory, filterLevel]);

  return (
    <div className={cn(
      "max-w-4xl mx-auto transition-all",
      deviceMode === 'mobile' ? "px-4 py-12" : "px-6 py-20"
    )}>
      <div className={cn(
        "text-center space-y-4 transition-all",
        deviceMode === 'mobile' ? "mb-10" : "mb-16"
      )}>
        <h2 className={cn(
          "font-serif font-light transition-all",
          deviceMode === 'mobile' ? "text-3xl" : "text-5xl"
        )}>{t.nav.levelTest}</h2>
        <p className="text-lg opacity-60 font-serif italic">
          {language === 'ko' ? '박사가 직접 설계한 레벨테스트로 실력을 진단해 보세요.' : 'Diagnose your skills with level tests designed by the PhD.'}
        </p>
      </div>

      {isAdmin && (
        <div className="mb-12">
          {!showAddForm ? (
            <button 
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-8 py-4 bg-gold text-ink rounded-full text-sm uppercase tracking-widest font-bold hover:scale-105 transition-transform mx-auto shadow-lg shadow-gold/20"
            >
              <Plus size={18} />
              {language === 'ko' ? '새 레벨테스트 추가' : 'Add New Level Test'}
            </button>
          ) : (
            <div className="p-8 bg-gold/5 border border-gold/20 rounded-3xl">
              <form onSubmit={handleAddTest} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest opacity-40 font-bold">
                      {language === 'ko' ? '카테고리' : 'Category'}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {COURSES.map(course => (
                        <button
                          key={course.id}
                          type="button"
                          onClick={() => {
                            setNewCategory(course.category);
                            const firstLevel = course.levels[0];
                            setNewLevel(firstLevel);
                            setNewName(`${course.title.split(' (')[0]} ${firstLevel} ${t.nav.levelTest}`);
                          }}
                          className={cn(
                            "px-4 py-2 rounded-full text-xs font-bold transition-all border",
                            newCategory === course.category 
                              ? "bg-gold text-ink border-gold" 
                              : "bg-card text-ink/60 border-ink/10 hover:border-gold/50"
                          )}
                        >
                          {course.title.split(' (')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest opacity-40 font-bold">
                      {language === 'ko' ? '레벨' : 'Level'}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {COURSES.find(c => c.category === newCategory)?.levels.map(lvl => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => {
                            setNewLevel(lvl);
                            const catTitle = COURSES.find(c => c.category === newCategory)?.title.split(' (')[0] || newCategory;
                            setNewName(`${catTitle} ${lvl} ${t.nav.levelTest}`);
                          }}
                          className={cn(
                            "px-4 py-2 rounded-full text-xs font-bold transition-all border",
                            newLevel === lvl 
                              ? "bg-ink text-paper border-ink" 
                              : "bg-card text-ink/60 border-ink/10 hover:border-gold/50"
                          )}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest opacity-40 font-bold">
                    {language === 'ko' ? '테스트 이름' : 'Test Name'}
                  </label>
                  <input 
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={language === 'ko' ? '예: 초급 레벨테스트' : 'e.g., Beginner Level Test'}
                    className="w-full p-4 bg-card border border-ink/10 rounded-xl outline-none focus:border-gold transition-colors"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest opacity-40 font-bold">
                    {language === 'ko' ? '파일 선택' : 'Select File'}
                  </label>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="w-full p-4 bg-card border border-ink/10 rounded-xl outline-none focus:border-gold transition-colors"
                    required
                  />
                </div>
                <div className="flex items-center justify-center gap-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-8 py-3 border border-ink/10 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-ink/5 transition-colors"
                  >
                    {language === 'ko' ? '취소' : 'Cancel'}
                  </button>
                  <button 
                    type="submit"
                    disabled={isUploading}
                    className="px-8 py-3 bg-gold text-ink rounded-full text-xs uppercase tracking-widest font-bold hover:scale-105 transition-transform disabled:opacity-50"
                  >
                    {isUploading ? (language === 'ko' ? '업로드 중...' : 'Uploading...') : (language === 'ko' ? '추가하기' : 'Add Test')}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className={cn(
        "mb-8 p-6 bg-ink/5 rounded-2xl flex transition-all",
        deviceMode === 'mobile' ? "flex-col gap-4" : "flex-col md:flex-row gap-6 items-start md:items-center"
      )}>
        <div className="space-y-2 flex-grow">
          <label className="text-[10px] uppercase tracking-widest opacity-40 font-bold">
            {language === 'ko' ? '카테고리 필터' : 'Category Filter'}
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setFilterCategory('All');
                setFilterLevel('All');
              }}
              className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border",
                filterCategory === 'All' 
                  ? "bg-ink text-paper border-ink" 
                  : "bg-card text-ink/60 border-ink/10 hover:border-gold/50"
              )}
            >
              {language === 'ko' ? '전체' : 'All'}
            </button>
            {COURSES.map(course => (
              <button
                key={course.id}
                onClick={() => {
                  setFilterCategory(course.category);
                  setFilterLevel('All');
                }}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border",
                  filterCategory === course.category 
                    ? "bg-gold text-ink border-gold" 
                    : "bg-card text-ink/60 border-ink/10 hover:border-gold/50"
                )}
              >
                {course.title.split(' (')[0]}
              </button>
            ))}
          </div>
        </div>
        {filterCategory !== 'All' && (
          <div className="space-y-2 flex-grow">
            <label className="text-[10px] uppercase tracking-widest opacity-40 font-bold">
              {language === 'ko' ? '레벨 필터' : 'Level Filter'}
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterLevel('All')}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border",
                  filterLevel === 'All' 
                    ? "bg-ink text-paper border-ink" 
                    : "bg-card text-ink/60 border-ink/10 hover:border-gold/50"
                )}
              >
                {language === 'ko' ? '전체' : 'All'}
              </button>
              {COURSES.find(c => c.category === filterCategory)?.levels.map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setFilterLevel(lvl)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border",
                    filterLevel === lvl 
                      ? "bg-ink text-paper border-ink" 
                      : "bg-card text-ink/60 border-ink/10 hover:border-gold/50"
                  )}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-20 opacity-40 uppercase tracking-widest text-xs">{t.community.loading}</div>
        ) : filteredTests.length === 0 ? (
          <div className="text-center py-20 opacity-40 uppercase tracking-widest text-xs">
            {language === 'ko' ? '등록된 레벨테스트가 없습니다.' : 'No level tests registered.'}
          </div>
        ) : (
          filteredTests.map(test => (
            <div key={test.id} className={cn(
              "group p-6 bg-paper border border-ink/10 rounded-2xl flex transition-all hover:border-gold/50",
              deviceMode === 'mobile' ? "flex-col items-start gap-4" : "flex-row items-center justify-between"
            )}>
              <div className={cn(
                "flex gap-4",
                deviceMode === 'mobile' ? "w-full" : "items-center"
              )}>
                <div className="w-12 h-12 bg-ink/5 rounded-xl flex-shrink-0 flex items-center justify-center text-gold">
                  <FileText size={24} />
                </div>
                <div className="flex-grow min-w-0">
                  {editingTestId === test.id ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[8px] uppercase tracking-widest opacity-40 font-bold">Category</label>
                          <select 
                            value={editingCategory}
                            onChange={(e) => {
                              const cat = e.target.value as CourseCategory;
                              setEditingCategory(cat);
                              const firstLevel = COURSES.find(c => c.category === cat)?.levels[0] || '';
                              setEditingLevel(firstLevel);
                              const catTitle = COURSES.find(c => c.category === cat)?.title.split(' (')[0] || cat;
                              setEditName(`${catTitle} ${firstLevel} ${t.nav.levelTest}`);
                            }}
                            className="w-full p-2 bg-white border border-gold rounded-lg text-xs outline-none"
                          >
                            {COURSES.map(c => <option key={c.id} value={c.category}>{c.title.split(' (')[0]}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] uppercase tracking-widest opacity-40 font-bold">Level</label>
                          <select 
                            value={editingLevel}
                            onChange={(e) => {
                            const lvl = e.target.value;
                            setEditingLevel(lvl);
                            const catTitle = COURSES.find(c => c.category === editingCategory)?.title.split(' (')[0] || editingCategory;
                            setEditName(`${catTitle} ${lvl} ${t.nav.levelTest}`);
                          }}
                            className="w-full p-2 bg-white border border-gold rounded-lg text-xs outline-none"
                          >
                            {COURSES.find(c => c.category === editingCategory)?.levels.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-grow p-2 bg-card border border-gold rounded-lg text-sm outline-none"
                        />
                        <button 
                          onClick={() => handleUpdateName(test.id)}
                          className="p-2 bg-gold text-ink rounded-lg hover:opacity-80 transition-opacity"
                        >
                          <Check size={16} />
                        </button>
                        <button 
                          onClick={() => setEditingTestId(null)}
                          className="p-2 bg-ink/5 text-ink rounded-lg hover:bg-ink/10 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-gold/20 text-gold rounded text-[8px] font-bold uppercase tracking-widest">
                          {test.category}
                        </span>
                        <span className="px-2 py-0.5 bg-ink/5 text-ink/60 rounded text-[8px] font-bold uppercase tracking-widest">
                          {test.level}
                        </span>
                      </div>
                      <h3 className={cn(
                        "font-serif font-medium transition-all",
                        deviceMode === 'mobile' ? "text-base" : "text-lg"
                      )}>{test.name}</h3>
                      <p className="text-[10px] uppercase tracking-widest opacity-40">
                        {test.createdAt?.toDate ? new Date(test.createdAt.toDate()).toLocaleDateString() : ''} • {(test.size / 1024 / 1024).toFixed(2)}MB
                      </p>
                    </>
                  )}
                </div>
              </div>
              <div className={cn(
                "flex items-center gap-2",
                deviceMode === 'mobile' ? "w-full justify-between pt-4 border-t border-ink/5" : ""
              )}>
                <a 
                  href={test.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={cn(
                    "bg-ink text-paper rounded-full text-[10px] uppercase tracking-widest font-bold hover:bg-gold hover:text-ink transition-all",
                    deviceMode === 'mobile' ? "px-4 py-2" : "px-6 py-2"
                  )}
                >
                  {t.archive.download}
                </a>
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => {
                        setEditingTestId(test.id);
                        setEditName(test.name);
                        setEditingCategory(test.category || COURSES[0].category);
                        setEditingLevel(test.level || COURSES[0].levels[0]);
                      }}
                      className="p-2 text-gold hover:bg-gold/10 rounded-full transition-colors"
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(test.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const CommunityView: FC<{ language: LanguageCode, initialFilter?: string, onClearFilter?: () => void, deviceMode: 'pc' | 'pad' | 'mobile', likes: any[], toggleLike: (id: string) => void, isAdmin: boolean }> = ({ language, initialFilter, onClearFilter, deviceMode, likes, toggleLike, isAdmin }) => {
  const t = TRANSLATIONS[language];
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState(initialFilter || 'all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (initialFilter) setFilter(initialFilter);
  }, [initialFilter]);
  const [newPost, setNewPost] = useState({ title: '', content: '', type: 'trend', imageUrl: '', status: 'published' as 'published' | 'hidden' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    { id: 'trend', label: t.community.trend, color: 'bg-orange-100 text-orange-700' },
    { id: 'clinic', label: t.community.clinic, color: 'bg-emerald-100 text-emerald-700' },
    { id: 'insight', label: t.community.insight, color: 'bg-blue-100 text-blue-700' },
    { id: 'challenge', label: t.community.challenge, color: 'bg-purple-100 text-purple-700' },
    { id: 'consult', label: t.community.consult, color: 'bg-amber-100 text-amber-700' },
  ];

  useEffect(() => {
    const path = 'community';
    const q = isAdmin 
      ? query(collection(db, path), orderBy('createdAt', 'desc'))
      : query(collection(db, path), where('status', '==', 'published'), orderBy('createdAt', 'desc'));
      
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  const handleLoginRequired = () => {
    loginWithGoogle().catch(console.error);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const storageRef = ref(storage, `community/${Date.now()}_${file.name}`);
    try {
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setNewPost(prev => ({ ...prev, imageUrl: url }));
    } catch (error) {
      console.error("Upload error:", error);
      alert("Image upload failed.");
    } finally {
      setIsUploading(false);
    }
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
        status: newPost.status || 'published',
        userUid: auth.currentUser.uid,
        userName: auth.currentUser.displayName || auth.currentUser.email,
        createdAt: serverTimestamp()
      });
      setNewPost({ title: '', content: '', type: 'trend', imageUrl: '', status: 'published' });
      setShowForm(false);
      alert(language === 'ko' ? '게시글이 등록되었습니다.' : 'Post has been registered.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleVisibility = async (postId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'hidden' ? 'published' : 'hidden';
    try {
      await updateDoc(doc(db, 'community', postId), { status: newStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'community');
    }
  };

  const filteredPosts = posts.filter(p => {
    const isVisible = isAdmin || p.status !== 'hidden' || p.userUid === auth.currentUser?.uid;
    const matchesFilter = filter === 'all' || p.type === filter;
    const matchesSearch = !searchQuery || 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 space-y-12">
        <div className="space-y-4">
          <Skeleton className="w-20 h-4" />
          <Skeleton className="w-64 h-12" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="w-20 h-8 rounded-full" />
          ))}
        </div>
        <div className="space-y-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-8 border border-ink/10 rounded-[40px] bg-card space-y-6">
              <div className="flex justify-between">
                <div className="space-y-3">
                  <Skeleton className="w-24 h-6 rounded-full" />
                  <Skeleton className="w-64 h-8" />
                  <Skeleton className="w-32 h-4" />
                </div>
              </div>
              <Skeleton className="w-full h-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

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
      className={cn(
        "max-w-4xl mx-auto transition-all",
        deviceMode === 'mobile' ? "px-4 py-12 space-y-8" : "px-6 py-20 space-y-12"
      )}
    >
      <div className={cn(
        "flex flex-col justify-between transition-all",
        deviceMode === 'mobile' ? "gap-6" : "md:flex-row md:items-end gap-6"
      )}>
        <div className="space-y-4">
          <span className="text-gold text-[10px] uppercase tracking-[0.4em] font-bold">Community</span>
          <h2 className={cn(
            "font-serif font-light tracking-tight transition-all",
            deviceMode === 'mobile' ? "text-3xl" : "text-5xl"
          )}>{t.community.title}</h2>
        </div>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="px-8 py-3 bg-ink text-paper rounded-full text-xs uppercase tracking-widest hover:bg-gold hover:text-ink transition-all flex items-center gap-2 shadow-xl"
          >
            <Plus size={16} /> {t.community.newPost}
          </button>
        )}
      </div>

      {/* Filter Tabs & Search */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className={cn(
            "flex pb-2 transition-all w-full md:w-auto",
            deviceMode === 'mobile' ? "overflow-x-auto gap-2 no-scrollbar" : "flex-wrap gap-2"
          )}>
            <button
              onClick={() => setFilter('all')}
              className={cn(
                "px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                filter === 'all' ? "bg-ink text-paper" : "bg-ink/5 hover:bg-ink/10"
              )}
            >
              {t.community.all}
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id)}
                className={cn(
                  "px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                  filter === cat.id ? cat.color : "bg-ink/5 hover:bg-ink/10"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={16} />
            <input 
              type="text"
              placeholder={language === 'ko' ? '검색...' : 'Search...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-ink/5 border border-transparent rounded-full text-xs outline-none focus:bg-white focus:border-gold transition-all"
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onSubmit={handleSubmit}
            className="p-8 border border-ink/10 rounded-[40px] bg-card shadow-2xl space-y-8 overflow-hidden relative"
          >
            <div className="space-y-4">
              <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Select Category</label>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setNewPost(prev => ({ ...prev, type: cat.id }))}
                    className={cn(
                      "px-4 py-2 rounded-full text-[10px] font-bold transition-all border",
                      newPost.type === cat.id ? `${cat.color} border-current` : "bg-transparent border-ink/10 opacity-50 hover:opacity-100"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">{t.community.titleLabel}</label>
                <input 
                  type="text" 
                  required
                  value={newPost.title}
                  onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                  placeholder={t.community.placeholders[newPost.type as keyof typeof t.community.placeholders]?.title || "Enter title"}
                  className="w-full p-4 bg-ink/5 border border-transparent rounded-2xl text-sm outline-none focus:bg-white focus:border-gold transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">{t.community.contentLabel}</label>
                <div className="relative">
                  <textarea 
                    required
                    value={newPost.content}
                    onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                    placeholder={t.community.placeholders[newPost.type as keyof typeof t.community.placeholders]?.content || "Enter content"}
                    rows={6}
                    className="w-full p-4 bg-ink/5 border border-transparent rounded-2xl text-sm outline-none focus:bg-white focus:border-gold transition-all"
                  />
                  <div className="absolute bottom-4 right-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-10 h-10 bg-white shadow-md rounded-full flex items-center justify-center text-ink hover:text-gold transition-colors"
                      title="Upload Image"
                    >
                      {isUploading ? <Clock size={18} className="animate-spin" /> : <Upload size={18} />}
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleImageUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                  </div>
                </div>
                {newPost.imageUrl && (
                  <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-ink/10 group">
                    <img src={newPost.imageUrl} className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => setNewPost(prev => ({ ...prev, imageUrl: '' }))}
                      className="absolute inset-0 bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <button 
                type="button"
                onClick={() => setShowForm(false)}
                className="px-8 py-3 text-xs uppercase tracking-widest opacity-50 hover:opacity-100 font-bold"
              >
                {t.community.cancel}
              </button>
              <button 
                type="submit"
                disabled={isSubmitting || isUploading}
                className="px-12 py-3 bg-[#4a3728] text-paper rounded-full text-xs uppercase tracking-widest hover:bg-gold hover:text-ink transition-all disabled:opacity-50 shadow-lg font-bold"
              >
                {isSubmitting ? '...' : t.community.submit}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="space-y-8">
        {filteredPosts.length > 0 ? filteredPosts.map(post => {
          const cat = categories.find(c => c.id === post.type) || categories[0];
          return (
            <motion.div 
              layout
              key={post.id} 
              className={cn(
                "border border-ink/10 rounded-[40px] bg-card hover:shadow-2xl hover:shadow-ink/5 transition-all group",
                deviceMode === 'mobile' ? "p-6 space-y-4" : "p-8 space-y-6"
              )}
            >
              <div className={cn(
                "flex justify-between transition-all",
                deviceMode === 'mobile' ? "flex-col gap-4" : "flex-row items-start"
              )}>
                <div className="space-y-3">
                  <div className={cn(
                    "flex transition-all",
                    deviceMode === 'mobile' ? "flex-col items-start gap-2" : "flex-row items-center gap-3"
                  )}>
                    <span className={cn(
                      "text-[8px] uppercase tracking-widest px-3 py-1 rounded-full font-bold",
                      cat.color
                    )}>
                      {cat.label}
                    </span>
                    {isAdmin && post.status === 'hidden' && (
                      <span className="text-[8px] uppercase tracking-widest px-3 py-1 rounded-full font-bold bg-ink text-paper">
                        {language === 'ko' ? '비공개' : 'Hidden'}
                      </span>
                    )}
                    <h3 className={cn(
                      "font-serif font-medium tracking-tight transition-all",
                      deviceMode === 'mobile' ? "text-xl" : "text-2xl"
                    )}>{post.title}</h3>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] opacity-40 font-bold uppercase tracking-widest">
                    <span>{post.userName}</span>
                    <span>•</span>
                    <span>{post.createdAt?.toDate().toLocaleDateString()}</span>
                  </div>
                </div>
                {post.reply && (
                  <div className="flex items-center gap-2 text-gold bg-gold/5 px-3 py-1 rounded-full self-start">
                    <Check size={14} />
                    <span className="text-[10px] uppercase tracking-widest font-bold">{t.community.answered}</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <p className="text-base opacity-70 leading-relaxed font-serif">{post.content}</p>
                {post.imageUrl && (
                  <div className="max-w-lg rounded-2xl overflow-hidden border border-ink/5">
                    <img src={post.imageUrl} className="w-full h-auto" referrerPolicy="no-referrer" />
                  </div>
                )}
              </div>
              
              {post.reply && (
                <div className="p-8 bg-ink/5 rounded-[32px] space-y-4 border-l-4 border-gold">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-gold" />
                    <span className="text-[10px] uppercase tracking-widest font-bold">{t.community.replyTitle}</span>
                  </div>
                  <p className="text-base italic opacity-80 font-serif">"{post.reply}"</p>
                </div>
              )}

              <div className="pt-6 border-t border-ink/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => toggleLike(post.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
                      likes.some(l => l.postUid === post.id && l.userUid === auth.currentUser?.uid)
                        ? "bg-gold/10 text-gold"
                        : "bg-ink/5 text-ink/40 hover:bg-ink/10 hover:text-ink"
                    )}
                  >
                    <Heart size={16} fill={likes.some(l => l.postUid === post.id && l.userUid === auth.currentUser?.uid) ? "currentColor" : "none"} />
                    <span className="text-xs font-bold">{likes.filter(l => l.postUid === post.id).length}</span>
                  </button>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleVisibility(post.id, post.status)}
                      className={cn(
                        "p-2 rounded-full transition-all",
                        post.status === 'hidden' ? "bg-ink text-paper" : "hover:bg-ink/5 text-ink/40 hover:text-ink"
                      )}
                      title={post.status === 'hidden' ? "Show" : "Hide"}
                    >
                      {post.status === 'hidden' ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button className="p-2 hover:bg-ink/5 rounded-full text-ink/40 hover:text-ink transition-colors">
                      <Edit size={16} />
                    </button>
                    <button className="p-2 hover:bg-red-50 rounded-full text-ink/40 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        }) : (
          <div className="py-32 text-center opacity-30 font-serif italic text-xl">
            {t.community.noPosts}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const ImageGenView: FC<{ language: LanguageCode, userProfile: any, isAuthReady: boolean, setView: (v: any) => void, siteContent: any, deviceMode: 'pc' | 'pad' | 'mobile' }> = ({ language, userProfile, isAuthReady, setView, siteContent, deviceMode }) => {
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
      className={cn(
        "max-w-6xl mx-auto transition-all",
        deviceMode === 'mobile' ? "px-4 py-12 space-y-8" : "px-6 py-20 space-y-12"
      )}
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
        <h2 className={cn(
          "font-serif font-light transition-all",
          deviceMode === 'mobile' ? "text-3xl" : "text-5xl"
        )}>{t.aiStudio.title}</h2>
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
              className={cn(
                "w-full bg-ink/5 border border-ink/10 rounded-2xl focus:outline-none focus:border-gold transition-all",
                deviceMode === 'mobile' ? "p-4 pr-24 text-sm" : "p-6 pr-32"
              )}
            />
            <button 
              onClick={handleGenerate}
              disabled={!prompt || isGenerating}
              className={cn(
                "absolute bg-ink text-paper rounded-xl uppercase tracking-widest hover:bg-gold hover:text-ink transition-all disabled:opacity-50",
                deviceMode === 'mobile' ? "right-1.5 top-1.5 bottom-1.5 px-4 text-[10px]" : "right-2 top-2 bottom-2 px-6 text-xs"
              )}
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
