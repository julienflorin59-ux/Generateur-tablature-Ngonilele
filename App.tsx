import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Play, Square, FileText, Music, Info, Download, Code, Video, Grid3X3, Settings, Share2, Star, Edit3, Headphones, Plus, Menu, X, Box, ChevronDown, Minus, ChevronsLeft, Activity, Save, FolderOpen, Palette, FileDown, Pause, SkipBack, Trash2, Clock, Ban, RotateCcw, Edit, Timer, Gauge, Undo2, ArrowDownToLine, MousePointerClick, MessageSquarePlus, Wand2, Hand, Zap, MoveRight, BookOpen, Mic, MicOff, Film, FileType, CheckCircle2, MousePointer, ThumbsUp, Copy, Clipboard, Repeat, LayoutGrid, Lock, User, UserCheck, Users, Shield, ShieldAlert, KeyRound, Loader2, PenLine, Mail, Bug, HelpCircle, Send, MousePointer2, Smartphone, Piano, ExternalLink, ChevronUp, LifeBuoy, FilePlus } from 'lucide-react';
import { PRESETS, NOTE_COLORS, SCALES_PRESETS, ASSETS_BASE_URL, STRING_CONFIGS, BASE_TUNING, ALL_CHROMATIC_NOTES, AVAILABLE_SAMPLES, HEADER_SILENCE } from './constants';
import { parseTablature } from './utils/parser';
import { audioEngine } from './utils/audio';
import { generatePDF } from './utils/pdf';
import Visualizer, { VisualizerHandle } from './components/Visualizer';
import StringPad from './components/StringPad';
import { Tuning, ParsedNote, TICKS_QUARTER, PlaybackState, SongPreset, TICKS_COUNT_IN } from './types';

// --- CONFIGURATION DES LICENCES ---
const VALID_ACCESS_CODES = [
  'julo59',           // Administrateur Principal
  'DAVID-L-2025',     // David Lesage
  'JEREMY-N-2025',    // Jeremy Nattagh
  'VINCIANNE-G-2025', // Vincianne Gruchala
  'JULIE-D-2025'      // Julie Denudt
]; 

// CONSTANTE IMAGE MENU (Pour préchargement)
const MENU_BG_URL = "https://raw.githubusercontent.com/julienflorin59-ux/Generateur-tablature-Ngonilele/main/mandalamenu.png";

// BACKGROUND IMAGES MAP
const BG_IMAGES = {
    TUNING: "https://raw.githubusercontent.com/julienflorin59-ux/Generateur-tablature-Ngonilele/main/mandala1.png",
    EDITOR: "https://raw.githubusercontent.com/julienflorin59-ux/Generateur-tablature-Ngonilele/main/mandala2.png",
    MEDIA: "https://raw.githubusercontent.com/julienflorin59-ux/Generateur-tablature-Ngonilele/main/mandala3.png"
};

// Helper to get color for a specific note
const getNoteColor = (note: string) => {
  if (!note) return '#ccc';
  const base = note.charAt(0).toUpperCase();
  return NOTE_COLORS[base] || '#ccc';
};

// --- DYNAMIC BACKGROUND COMPONENT ---
// OPTIMISATION : Les images sont préchargées dans App.tsx. 
// Ici, on gère l'affichage en couches superposées avec transition d'opacité.
interface DynamicBackgroundProps {
    activeTab: 'tuning' | 'editor' | 'media';
}
const DynamicBackground: React.FC<DynamicBackgroundProps> = ({ activeTab }) => {
    return (
        <>
            {Object.entries(BG_IMAGES).map(([key, url]) => {
                let isActive = false;
                if (activeTab === 'tuning' && key === 'TUNING') isActive = true;
                if (activeTab === 'editor' && key === 'EDITOR') isActive = true;
                if (activeTab === 'media' && key === 'MEDIA') isActive = true;

                return (
                    <div 
                        key={key}
                        className="absolute inset-0 pointer-events-none transition-opacity duration-300 ease-in-out z-[-1]"
                        style={{
                            backgroundImage: `url('${url}')`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            backgroundSize: 'cover',
                            // MODIF: Opacité augmentée (0.25) pour compenser la texture froissée en overlay
                            opacity: isActive ? 0.25 : 0, 
                            mixBlendMode: 'multiply',
                            filter: 'sepia(0.6) contrast(1.1) brightness(0.9) saturate(0.8)', // Effet photo vieillie
                            willChange: 'opacity' // Optimisation GPU
                        }}
                    />
                );
            })}
        </>
    );
};

// Helper component for String Selector
interface StringSelectorProps {
  stringId: string;
  currentNote: string;
  onNoteChange: (stringId: string, newNote: string) => void;
  hand: 'G' | 'D'; // Hand prop for symmetry
}

const StringSelector: React.FC<StringSelectorProps> = ({ stringId, currentNote, onNoteChange, hand }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const color = getNoteColor(currentNote);
  const baseNote = BASE_TUNING[stringId];
  const baseIndex = ALL_CHROMATIC_NOTES.indexOf(baseNote);
  
  let availableOptions: string[] = [];
  if (baseIndex !== -1) {
      const minIndex = Math.max(0, baseIndex - 3);
      const maxIndex = Math.min(ALL_CHROMATIC_NOTES.length - 1, baseIndex + 2);
      availableOptions = ALL_CHROMATIC_NOTES.slice(minIndex, maxIndex + 1);
      availableOptions = availableOptions.filter(note => AVAILABLE_SAMPLES.includes(note));
  } else {
      availableOptions = [currentNote];
  }

  const isLeft = hand === 'G';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
      <div className={`flex items-center gap-2 relative ${!isLeft ? 'flex-row-reverse' : ''}`} data-tooltip={`Accorder la corde ${stringId}`} ref={dropdownRef}>
          <span className={`w-6 text-xs font-black text-[#5d4037] shrink-0 ${isLeft ? 'text-right' : 'text-left'}`}>
              {stringId}
          </span>
          
          <div className="relative flex-1">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full relative h-8 flex items-center justify-center transition-all duration-200 shadow-sm rounded-xl outline-none border
                  ${isOpen ? 'ring-2 ring-[#A67C52] scale-[1.02]' : 'hover:brightness-110 hover:shadow-md hover:scale-[1.02]'}
                `}
                style={{ 
                    borderColor: color,
                    background: `linear-gradient(to ${isLeft ? 'right' : 'left'}, ${color}CC, transparent)`
                }}
            >
                <span className="font-bold text-[#5d4037] text-xs z-10">{currentNote}</span>
                <div className={`absolute inset-y-0 ${isLeft ? 'right-2' : 'left-2'} flex items-center pointer-events-none opacity-50`}>
                    <ChevronDown size={12} className={`text-[#5d4037] transition-transform ${isOpen ? 'rotate-180' : ''}`}/>
                </div>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 w-full z-[100] mt-1 max-h-48 overflow-y-auto custom-scrollbar rounded-xl border-2 border-[#cbb094] bg-[#fdf6e3] shadow-xl animate-in fade-in zoom-in-95 duration-100">
                    <div className="py-1 flex flex-col gap-0.5 p-1">
                        {availableOptions.map(note => {
                            const noteColor = getNoteColor(note);
                            const isSelected = note === currentNote;
                            return (
                                <button
                                    key={note}
                                    onClick={() => { onNoteChange(stringId, note); setIsOpen(false); }}
                                    className={`w-full text-center py-1.5 rounded-lg text-xs font-bold text-[#5d4037] transition-all relative overflow-hidden flex items-center justify-center gap-2
                                        ${isSelected ? 'brightness-110 font-black' : 'hover:brightness-110 hover:scale-[1.02]'}
                                    `}
                                    style={{
                                        background: `linear-gradient(to right, ${noteColor}99, ${noteColor}33)`,
                                        border: isSelected ? `2px solid ${noteColor}` : '2px solid transparent'
                                    }}
                                >
                                    {note}
                                    {isSelected && <CheckCircle2 size={10} className="opacity-60"/>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
          </div>
      </div>
  );
};

// --- LOGIN SCREEN COMPONENT ---
interface LoginScreenProps {
    onLogin: () => void;
    onGuest: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onGuest }) => {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const saved = localStorage.getItem('ngonilele_license_code');
        if (saved && VALID_ACCESS_CODES.includes(saved)) {
            onLogin();
        }
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const trimmedCode = code.trim();

        if (!trimmedCode) {
            setError("Veuillez entrer une clé de licence.");
            return;
        }

        if (VALID_ACCESS_CODES.includes(trimmedCode)) {
            localStorage.setItem('ngonilele_license_code', trimmedCode);
            onLogin();
        } else {
            setError("Clé de licence invalide.");
        }
    };

    return (
        <div className="min-h-screen w-full bg-transparent flex flex-col items-center justify-center p-4 text-[#5d4037]">
            <div className="w-full max-w-md bg-[#dcc0a3]/90 border-2 border-[#cbb094] rounded-2xl shadow-2xl p-8 flex flex-col gap-6 animate-in zoom-in-95 duration-300 backdrop-blur-sm relative z-10">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 bg-[#A67C52] text-white rounded-full flex items-center justify-center shadow-lg mb-2">
                        <Lock size={32} />
                    </div>
                    <h1 className="text-2xl font-black text-[#800020]">Ngonilélé Tab</h1>
                    <p className="text-sm font-bold opacity-70">Activation du logiciel</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider mb-1 block pl-1">
                            Clé de Licence
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8d6e63]">
                                <KeyRound size={18} />
                            </div>
                            <input 
                                type="text"
                                className={`w-full pl-10 pr-4 py-3 bg-[#e5c4a1] border-2 rounded-lg outline-none font-bold text-[#5d4037] placeholder-[#8d6e63]/50 focus:ring-2 focus:ring-[#A67C52]/50 transition-all ${error ? 'border-red-500' : 'border-[#cbb094] focus:border-[#A67C52]'}`}
                                placeholder="Entrez votre code..."
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                autoFocus
                            />
                        </div>
                        {error && <p className="text-xs text-red-600 font-bold mt-1 ml-1 animate-in slide-in-from-left-2">{error}</p>}
                    </div>
                    
                    <button 
                        type="submit" 
                        className="w-full py-3 bg-[#A67C52] hover:bg-[#8d6e63] text-white font-bold rounded-lg shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2 mt-2"
                    >
                        <span>Valider la licence</span>
                        <ArrowDownToLine className="rotate-[-90deg]" size={18}/>
                    </button>

                    <a 
                        href="mailto:julienflorin59@gmail.com?subject=Demande%20de%20licence%20Ngonilélé&body=Bonjour%2C%20je%20souhaite%20acquérir%20une%20licence%20pour%20le%20Générateur%20de%20Tablature%20Ngonilélé."
                        className="text-xs font-bold text-[#8d6e63] hover:text-[#5d4037] text-center hover:underline transition-colors mt-1 flex items-center justify-center gap-1"
                    >
                        <MessageSquarePlus size={12}/> Pas de licence ? En demander une
                    </a>
                </form>

                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-[#8d6e63]/20"></div>
                    <span className="flex-shrink mx-4 text-[#8d6e63] text-xs font-bold">OU</span>
                    <div className="flex-grow border-t border-[#8d6e63]/20"></div>
                </div>

                <button 
                    onClick={onGuest}
                    className="w-full py-3 bg-[#cbb094] hover:bg-[#bfa085] text-[#5d4037] font-bold rounded-lg border border-[#bfa085] shadow-sm transition-colors flex items-center justify-center gap-2 group"
                >
                    <Users size={18} />
                    <span>Mode Invité</span>
                    <span className="text-[10px] bg-[#e5c4a1] px-2 py-0.5 rounded-full opacity-60 group-hover:opacity-100 transition-opacity">Lecture seule</span>
                </button>
            </div>
            <div className="mt-8 text-xs font-bold text-[#8d6e63]/60 relative z-10">
                v1.0.3 • Ngonilélé Generator
            </div>
        </div>
    );
};

interface EditModalState { visible: boolean; note: ParsedNote | null; x: number; y: number; }
interface InsertMenuState { visible: boolean; x: number; y: number; tick: number; stringId?: string; }
interface SelectionMenuState { visible: boolean; x: number; y: number; selectedIds: string[]; }
interface TooltipState { visible: boolean; title: string; subtitle?: string; x: number; y: number; }
interface SavedBlock { id: string; name: string; notes: ParsedNote[]; }

type UserRole = 'none' | 'admin' | 'guest';

// Mots phonétiquement proches des cordes
const NUMBER_MAPPING: Record<string, string> = {
    "UN": "1", "UNE": "1", "L'UN": "1", "L'UNE": "1", "A": "1",
    "DEUX": "2",
    "TROIS": "3",
    "QUATRE": "4",
    "CINQ": "5",
    "SIX": "6", "CI": "6", "SIE": "6"
};

export default function App() {
  const [userRole, setUserRole] = useState<UserRole>('none');
  
  const [mainTab, setMainTab] = useState<'tuning' | 'editor' | 'media'>('tuning');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true); 
  const [bankTab, setBankTab] = useState<'song' | 'exercise' | 'user'>('song');
  const [selectedPresetName, setSelectedPresetName] = useState<string>('');
  const [tabTitle, setTabTitle] = useState<string>("Ma Composition"); 
  const [code, setCode] = useState(HEADER_SILENCE);
  const [codeHistory, setCodeHistory] = useState<string[]>([]); 
  const [bpm, setBpm] = useState(100);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0); 
  const [isMetronomeOn, setIsMetronomeOn] = useState(false);
  const [rhythmMode, setRhythmMode] = useState<'binary' | 'ternary'>('binary'); 
  const [fingeringMode, setFingeringMode] = useState<'auto' | 'manual'>('auto');
  const [playbackState, setPlaybackState] = useState<PlaybackState>(PlaybackState.STOPPED);
  const [playingSource, setPlayingSource] = useState<'editor' | 'scale'>('editor'); 
  const [isRecording, setIsRecording] = useState(false);
  const [isExporting, setIsExporting] = useState(false); 
  const [currentTick, setCurrentTick] = useState(TICKS_COUNT_IN);
  const currentTickRef = useRef(TICKS_COUNT_IN);
  const cursorTickRef = useRef(TICKS_COUNT_IN); 

  const [playbackFeedback, setPlaybackFeedback] = useState<Record<string, number>>({});
  const playbackIndexRef = useRef(0);

  const [exportPlaybackSpeed, setExportPlaybackSpeed] = useState(1.0);

  const [isListening, setIsListening] = useState(false);
  const [voiceLog, setVoiceLog] = useState("");
  const recognitionRef = useRef<any>(null);
  const isVoiceActiveRef = useRef(false);
  const [activeVoiceStringId, setActiveVoiceStringId] = useState<string | null>(null);
  
  const voiceBufferRef = useRef<{ stringId: string, timestamp: number } | null>(null);
  const voicePartialRef = useRef<{ value: string, type: 'number'|'hand' } | null>(null); 

  const [isMidiEnabled, setIsMidiEnabled] = useState(false);
  
  const [isInIframe, setIsInIframe] = useState(false);
  const [canOpenInNewTab, setCanOpenInNewTab] = useState(false);

  const isExportingRef = useRef(false);
  const recordedMimeTypeRef = useRef<string>('video/webm');
  
  const [videoFormat, setVideoFormat] = useState<'webm' | 'mp4'>('webm');

  const [editModal, setEditModal] = useState<EditModalState>({ visible: false, note: null, x: 0, y: 0 });
  const [insertMenu, setInsertMenu] = useState<InsertMenuState>({ visible: false, x: 0, y: 0, tick: 0 });
  const [selectionMenu, setSelectionMenu] = useState<SelectionMenuState>({ visible: false, x: 0, y: 0, selectedIds: [] });
  const [noteTooltip, setNoteTooltip] = useState<TooltipState | null>(null);
  const [globalTooltip, setGlobalTooltip] = useState<{visible: boolean, text: string, x: number, y: number} | null>(null);
  const [textInputModal, setTextInputModal] = useState<{visible: boolean, text: string, targetTick?: number}>({ visible: false, text: '' });
  const [legendModalOpen, setLegendModalOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [userPresets, setUserPresets] = useState<SongPreset[]>([]);
  
  // NEW STATE: Confirmation Modal for New Project
  const [confirmNewProjectModal, setConfirmNewProjectModal] = useState(false);

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [savedBlocks, setSavedBlocks] = useState<SavedBlock[]>([]);
  const [blockNameModal, setBlockNameModal] = useState<{ visible: boolean; defaultName?: string }>({ visible: false });
  const [blockNameInput, setBlockNameInput] = useState("");
  const [myBlocksModalOpen, setMyBlocksModalOpen] = useState(false);
  const [selectedBlockIdsForDeletion, setSelectedBlockIdsForDeletion] = useState<string[]>([]);

  const [selectedScaleName, setSelectedScaleName] = useState(SCALES_PRESETS[0].name);
  const [currentTuning, setCurrentTuning] = useState<Tuning>(SCALES_PRESETS[0].tuning);

  const currentTuningRef = useRef(currentTuning);
  
  const visualizerRef = useRef<VisualizerHandle>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const loadProjectInputRef = useRef<HTMLInputElement>(null);

  // ... (PRELOAD IMAGES EFFECT & Other useEffects remain unchanged) ...
  useEffect(() => {
      // PRELOAD DE TOUTES LES IMAGES Y COMPRIS LE MENU
      const imagesToPreload = [...Object.values(BG_IMAGES), MENU_BG_URL];
      imagesToPreload.forEach(url => {
          const img = new Image();
          img.src = url;
      });
  }, []);

  useEffect(() => { 
      currentTickRef.current = currentTick; 
      cursorTickRef.current = currentTick;
  }, [currentTick]);
  
  useEffect(() => { audioEngine.setMetronome(isMetronomeOn); }, [isMetronomeOn]);
  useEffect(() => { audioEngine.setRhythmMode(rhythmMode); }, [rhythmMode]);
  useEffect(() => { currentTuningRef.current = currentTuning; }, [currentTuning]);

  useEffect(() => {
    try {
        if (window.self !== window.top) {
            setIsInIframe(true);
            const protocol = window.location.protocol;
            if (protocol.startsWith('http')) {
                setCanOpenInNewTab(true);
            } else {
                setCanOpenInNewTab(false);
            }
        }
    } catch (e) {
        setIsInIframe(true);
        setCanOpenInNewTab(false);
    }

    const handleMouseMove = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const tooltipElement = target.closest('[data-tooltip]');
        if (tooltipElement) {
            const text = tooltipElement.getAttribute('data-tooltip');
            if (text) {
                setGlobalTooltip({ visible: true, text: text, x: e.clientX + 10, y: e.clientY + 10 });
                return;
            }
        }
        setGlobalTooltip(null);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    if (myBlocksModalOpen) {
      setSelectedBlockIdsForDeletion([]);
    }
  }, [myBlocksModalOpen]);

  useEffect(() => {
    const saved = localStorage.getItem('ngonilele_user_presets');
    if (saved) { try { setUserPresets(JSON.parse(saved)); } catch (e) { console.error("Failed to load user presets", e); } }
    
    const savedBlks = localStorage.getItem('ngonilele_saved_blocks');
    if (savedBlks) { 
        try { 
            let loaded = JSON.parse(savedBlks);
            if (Array.isArray(loaded)) {
                let needsSave = false;
                loaded = loaded.map((b: any, idx: number) => {
                    if (!b.id || typeof b.id !== 'string') {
                        needsSave = true;
                        const safeId = b.id ? String(b.id) : `restored-${Date.now()}-${idx}`;
                        return { ...b, id: safeId };
                    }
                    return b;
                });
                setSavedBlocks(loaded);
                if (needsSave) {
                     localStorage.setItem('ngonilele_saved_blocks', JSON.stringify(loaded));
                }
            }
        } catch(e) { console.error(e); } 
    }
    
    return () => {
        isVoiceActiveRef.current = false;
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch(e) {}
        }
    };
  }, []);

  const parsedData = useMemo(() => parseTablature(code), [code]);

  const scaleData = useMemo(() => {
    const notes = Object.entries(currentTuning).map(([stringId, note]) => ({ stringId, note: note as string }));
    notes.sort((a, b) => ALL_CHROMATIC_NOTES.indexOf(a.note) - ALL_CHROMATIC_NOTES.indexOf(b.note));
    return notes.map((n, i) => ({ id: `scale-${i}`, tick: i * TICKS_QUARTER, duration: TICKS_QUARTER, stringId: n.stringId, doigt: 'P' } as ParsedNote));
  }, [currentTuning]);

  const activeData = playingSource === 'scale' ? scaleData : parsedData;

  useEffect(() => {
      if (playbackState === PlaybackState.STOPPED) {
          setPlaybackFeedback({});
          playbackIndexRef.current = 0;
      }
      if (playbackState === PlaybackState.PLAYING) {
        const startTick = currentTickRef.current;
        const newIndex = parsedData.findIndex(n => n.tick >= startTick);
        playbackIndexRef.current = newIndex !== -1 ? newIndex : parsedData.length;
    }
  }, [playbackState, parsedData]);

  useEffect(() => {
      if (playbackState !== PlaybackState.PLAYING) return;

      let localFeedbackUpdate = { ...playbackFeedback };
      let didUpdate = false;
      
      while (playbackIndexRef.current < parsedData.length) {
          const note = parsedData[playbackIndexRef.current];
          
          if (currentTick >= note.tick) { 
              let effectiveDuration = 12; 
              
              for(let i = playbackIndexRef.current + 1; i < parsedData.length; i++) {
                  if (parsedData[i].tick > note.tick) {
                      effectiveDuration = parsedData[i].tick - note.tick;
                      break;
                  }
              }

              localFeedbackUpdate[note.stringId] = effectiveDuration;
              didUpdate = true;
              playbackIndexRef.current++;

              setTimeout(() => {
                  setPlaybackFeedback(prev => {
                      const next = { ...prev };
                      delete next[note.stringId];
                      return next;
                  });
              }, 250); 
          } else {
              break; 
          }
      }

      if (didUpdate) {
          setPlaybackFeedback(localFeedbackUpdate);
      }
  }, [currentTick, parsedData, playbackState]);

  const filteredPresets = useMemo(() => {
      if (bankTab === 'user') return userPresets;
      return PRESETS.filter(p => { if (p.category === 'common') return true; return p.category === bankTab; });
  }, [bankTab, userPresets]);

  useEffect(() => {
      if (selectedPresetName && filteredPresets.length > 0 && !filteredPresets.find(p => p.name === selectedPresetName)) {
          setSelectedPresetName(filteredPresets[0].name);
      } else if (filteredPresets.length === 0) { setSelectedPresetName(''); }
  }, [bankTab, filteredPresets, selectedPresetName]);

  useEffect(() => { 
      audioEngine.setOnEnded(() => { 
          if (isExportingRef.current) {
              stopRecording();
          }
          setPlaybackState(PlaybackState.STOPPED); 
          if (!isExportingRef.current) {
              setCurrentTick(TICKS_COUNT_IN);
          }
      }); 
  }, []);

  useEffect(() => {
    if (playbackState === PlaybackState.PLAYING) {
      if (!isExporting && !audioEngine.isAudioPlaying) {
          audioEngine.setNotes(activeData);
          audioEngine.setBpm(bpm);
          audioEngine.setPlaybackSpeed(playbackSpeed);
          audioEngine.setOnTick((tick) => setCurrentTick(tick));
          audioEngine.play(currentTick).catch(err => { setPlaybackState(PlaybackState.STOPPED); setIsRecording(false); });
      } else if (isExporting) {
          audioEngine.setOnTick((tick) => setCurrentTick(tick));
      }
    } else if (playbackState === PlaybackState.PAUSED) {
        audioEngine.stop();
    } else {
      audioEngine.stop();
    }
  }, [playbackState, activeData, bpm, playbackSpeed, isExporting]); 
  
  const handleNoteAdd = (stringId: string, finger?: string, tick?: number, advanceTicks: number = 0) => {
      let insertionTick = tick !== undefined ? tick : cursorTickRef.current;
      
      if (insertionTick < TICKS_COUNT_IN) {
          return; 
      }

      const newNote: ParsedNote = { id: 'temp-new', tick: insertionTick, duration: 0, stringId: stringId, doigt: finger, lineIndex: -1 };
      const allNotes = [...parsedData, newNote];
      regenerateCodeFromAbsolutePositions(allNotes);
      
      if (playbackState === PlaybackState.STOPPED) {
           if (advanceTicks > 0) { 
               const newTick = insertionTick + advanceTicks;
               cursorTickRef.current = newTick; 
               setCurrentTick(newTick); 
           } else {
               cursorTickRef.current = insertionTick;
               if (tick !== undefined && tick !== currentTick) {
                   setCurrentTick(tick);
               }
           }
      }
      
      audioEngine.previewString(stringId);
  };
  
  const handleNoteAddRef = useRef(handleNoteAdd);
  useEffect(() => { handleNoteAddRef.current = handleNoteAdd; });

  // --- MIDI INPUT LOGIC ---
  useEffect(() => {
      if (!isMidiEnabled) return;

      audioEngine.init();
      if (audioEngine.ctx?.state === 'suspended') {
          audioEngine.ctx.resume().catch(() => {});
      }

      let midiAccess: any = null;

      const onMIDIMessage = (event: any) => {
          const [status, note, velocity] = event.data;
          const command = status & 0xF0;
          if (command === 0x90 && velocity > 0) {
              const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
              const octave = Math.floor((note - 12) / 12);
              const noteName = noteNames[note % 12];
              const scientificPitch = `${noteName}${octave}`;
              
              const tuning = currentTuningRef.current;
              const entry = Object.entries(tuning).find(([key, val]) => val === scientificPitch);
              
              if (entry) {
                  const stringId = entry[0];
                  handleNoteAddRef.current(stringId, 'P', undefined, 12);
                  setActiveVoiceStringId(stringId);
                  setTimeout(() => setActiveVoiceStringId(null), 400);
              }
          }
      };

      const setupMidi = async () => {
           if (!(navigator as any).requestMIDIAccess) {
               alert("MIDI non supporté par ce navigateur.");
               setIsMidiEnabled(false);
               return;
           }

           try {
               midiAccess = await (navigator as any).requestMIDIAccess();
               for (const input of midiAccess.inputs.values()) {
                   input.onmidimessage = onMIDIMessage;
               }
               
               midiAccess.onstatechange = (e: any) => {
                   if (e.port.type === 'input' && e.port.state === 'connected') {
                       e.port.onmidimessage = onMIDIMessage;
                   }
               };

           } catch (err) {
               console.error("MIDI Access Error", err);
               alert("Erreur d'accès MIDI (Permission refusée ou non supporté).");
               setIsMidiEnabled(false);
           }
      };

      setupMidi();

      return () => {
          if (midiAccess) {
              for (const input of midiAccess.inputs.values()) {
                  input.onmidimessage = null;
              }
              midiAccess.onstatechange = null;
          }
      };
  }, [isMidiEnabled]);

  const checkAdminPermission = () => {
      if (userRole !== 'admin') {
          alert("🔒 Action restreinte aux licences valides.\n\nEn mode Invité, vous ne pouvez pas modifier la banque de données ou supprimer des éléments.");
          return false;
      }
      return true;
  };

  const handleScaleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const scaleName = e.target.value;
    const preset = SCALES_PRESETS.find(s => s.name === scaleName);
    if (preset) { setSelectedScaleName(scaleName); setCurrentTuning(preset.tuning); audioEngine.setTuning(preset.tuning); }
  };

  const handleNoteChange = (stringId: string, newNote: string) => {
    const newTuning = { ...currentTuning, [stringId]: newNote };
    setCurrentTuning(newTuning); audioEngine.setTuning(newTuning); setSelectedScaleName("Personnalisée"); 
  };

  const startPlayback = () => { 
      if (playbackState === PlaybackState.PAUSED) {
          setPlayingSource('editor');
          setPlaybackState(PlaybackState.PLAYING); 
      } else {
          setCurrentTick(0);
          setPlayingSource('editor');
          setPlaybackState(PlaybackState.PLAYING);
      }
  };

  const pausePlayback = () => { setPlaybackState(PlaybackState.PAUSED); };
  
  const stopPlayback = () => { 
      setPlaybackState(PlaybackState.STOPPED); 
      setCurrentTick(TICKS_COUNT_IN); 
  };
  
  const rewindPlayback = () => { 
      if (playbackState === PlaybackState.PLAYING) { 
          audioEngine.play(0); 
      } else { 
          setCurrentTick(0); 
      }
      playbackIndexRef.current = 0;
      setPlaybackFeedback({});
  };

  const handleSeek = (tick: number) => {
      setCurrentTick(tick); setNoteTooltip(null);
      if (playbackState === PlaybackState.PLAYING) { audioEngine.play(tick); }
      
      const newIndex = parsedData.findIndex(n => n.tick >= tick);
      playbackIndexRef.current = newIndex !== -1 ? newIndex : parsedData.length;
      setPlaybackFeedback({});
  };

  const updateCode = (newCode: string) => {
      setCodeHistory(prev => [...prev.slice(-20), code]); 
      setCode(newCode);
  };

  const handleUndo = () => {
      if (codeHistory.length > 0) {
          const previousCode = codeHistory[codeHistory.length - 1];
          setCode(previousCode);
          setCodeHistory(prev => prev.slice(0, -1));
      }
  };

  const handleLoadSelectedPreset = () => {
    let preset: SongPreset | undefined;
    if (bankTab === 'user') { preset = userPresets.find(p => p.name === selectedPresetName); } else { preset = PRESETS.find(p => p.name === selectedPresetName); }

    if (preset) {
      updateCode(preset.code); setSelectedNoteId(null); setSelectedNoteIds([]);
      setTabTitle(preset.name); 
      if (preset.scaleName) {
          const scalePreset = SCALES_PRESETS.find(s => s.name === preset.scaleName);
          if (scalePreset) { setSelectedScaleName(scalePreset.name); setCurrentTuning(scalePreset.tuning); audioEngine.setTuning(scalePreset.tuning); }
      }
      setPlaybackState(PlaybackState.STOPPED); 
      setCurrentTick(TICKS_COUNT_IN); 
      setPlayingSource('editor');
      if (mainTab !== 'editor') setMainTab('editor');
      setIsSidebarOpen(false);
    }
  };

  const handleSaveToLibrary = () => {
      if (!checkAdminPermission()) return;
      if (!saveName.trim()) return;
      const newPreset: SongPreset = { name: saveName, code: code, category: 'common', scaleName: selectedScaleName };
      const existingIndex = userPresets.findIndex(p => p.name === saveName);
      let newPresets = [...userPresets];
      if (existingIndex >= 0) {
          if (window.confirm("Une tablature porte déjà ce nom. Écraser ?")) { newPresets[existingIndex] = newPreset; } else { return; }
      } else { newPresets.push(newPreset); }
      setUserPresets(newPresets);
      localStorage.setItem('ngonilele_user_presets', JSON.stringify(newPresets));
      setSaveModalOpen(false); setSaveName(""); setBankTab('user'); setSelectedPresetName(newPreset.name); 
      setTabTitle(saveName); 
      alert("Tablature enregistrée !");
  };

  const handleDeleteUserPreset = () => {
      if (!checkAdminPermission()) return;
      if (bankTab !== 'user' || !selectedPresetName) return;
      if (window.confirm(`Supprimer "${selectedPresetName}" ?`)) {
          const newPresets = userPresets.filter(p => p.name !== selectedPresetName);
          setUserPresets(newPresets);
          localStorage.setItem('ngonilele_user_presets', JSON.stringify(newPresets));
          if (newPresets.length > 0) setSelectedPresetName(newPresets[0].name); else setSelectedPresetName('');
      }
  };

  const handleShareUserPreset = () => {
      const preset = userPresets.find(p => p.name === selectedPresetName);
      if (!preset) return;

      const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeFilename = preset.name.trim().replace(/[^a-z0-9\-_]/gi, '_');
      a.download = `${safeFilename}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setTimeout(() => {
          const subject = encodeURIComponent(`Partage Tablature Ngonilélé : ${preset.name}`);
          const body = encodeURIComponent(`Bonjour,\n\nVoici une tablature que j'ai créée : "${preset.name}".\n\n(Veuillez joindre le fichier .json qui vient d'être téléchargé sur votre appareil)\n\nCordialement.`);
          window.location.href = `mailto:?subject=${subject}&body=${body}`;
      }, 500);
  };

  // --- NEW: SHARE CURRENT PROJECT FEATURE ---
  const handleShareCurrentProject = () => {
      const project = { title: tabTitle, version: '1.0', timestamp: new Date().toISOString(), code, tuning: currentTuning, scaleName: selectedScaleName, bpm, rhythmMode };
      const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = tabTitle.trim().replace(/[^a-z0-9\-_]/gi, '_') || 'projet_ngonilele';
      a.download = `${safeName}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setTimeout(() => {
          const subject = encodeURIComponent(`Partage Projet Ngonilélé : ${tabTitle}`);
          const body = encodeURIComponent(`Bonjour,\n\nVoici un projet Ngonilélé que je souhaite partager : "${tabTitle}".\n\n(Veuillez joindre le fichier .json qui vient d'être téléchargé sur votre appareil)\n\nCordialement.`);
          window.location.href = `mailto:?subject=${subject}&body=${body}`;
      }, 500);
  };

  const handleInsertText = () => { setTextInputModal({ visible: true, text: '', targetTick: currentTick }); };
  
  const handleConfirmTextInsert = () => {
      const text = textInputModal.text; const tick = textInputModal.targetTick ?? currentTick;
      if (!text.trim()) { setTextInputModal({ visible: false, text: '' }); return; }
      
      if (tick < TICKS_COUNT_IN) {
          alert("Impossible d'insérer du texte dans la zone de décompte.");
          return;
      }

      const newEvent: ParsedNote = { id: 'temp-txt', tick: tick, duration: 0, stringId: 'TEXTE', message: text, lineIndex: -1 };
      const allNotes = [...parsedData, newEvent].sort((a, b) => a.tick - b.tick);
      regenerateCodeFromAbsolutePositions(allNotes);
      setTextInputModal({ visible: false, text: '' }); setInsertMenu({ ...insertMenu, visible: false }); 
  };

  const deleteLastLine = () => {
    const lines = code.trim().split('\n');
    if (lines.length > 0) { lines.pop(); updateCode(lines.join('\n')); }
  };

  const regenerateCodeFromAbsolutePositions = (notes: ParsedNote[]) => {
      const validNotes = notes.filter(n => n.stringId);
      validNotes.sort((a, b) => { if (a.tick !== b.tick) return a.tick - b.tick; return a.stringId.localeCompare(b.stringId); });
      let lastTick = 0; let lines: string[] = [];
      validNotes.forEach((note) => {
          if (note.stringId === 'TEXTE') {
              const delta = Math.max(0, note.tick - lastTick);
              const symbol = delta === 0 ? '+' : delta.toString();
              lines.push(`${symbol}   TXT   ${note.message}`);
              lastTick = note.tick;
              return;
          }
          if (note.stringId === 'PAGE_BREAK') { lines.push(`+   PAGE`); return; }
          const delta = Math.max(0, note.tick - lastTick);
          let symbol = ''; if (delta === 0) { symbol = '='; } else { symbol = delta.toString(); }
          
          const fingerStr = note.doigt ? `   ${note.doigt}` : '';
          lines.push(`${symbol}   ${note.stringId}${fingerStr}`);
          
          lastTick = note.tick;
      });
      updateCode(lines.join('\n'));
  };

  const handleNoteClick = (note: ParsedNote, x: number, y: number) => { 
      setSelectedNoteId(note.id); setSelectedNoteIds([]); 
      setSelectionMenu({...selectionMenu, visible: false});
      setEditModal({ ...editModal, visible: false });
      setInsertMenu({ ...insertMenu, visible: false });
  };
  
  const handleNoteContextMenu = (note: ParsedNote, x: number, y: number) => {
      setNoteTooltip(null);
      setSelectedNoteId(note.id); setSelectedNoteIds([]);
      setSelectionMenu({ ...selectionMenu, visible: false });
      setInsertMenu({ ...insertMenu, visible: false });
      
      setEditModal({ visible: true, note, x: Math.min(x + 10, window.innerWidth - 180), y: Math.min(y + 10, window.innerHeight - 200) });
  };

  const handleMultiSelectionFinished = (ids: string[], x: number, y: number) => {
      setSelectedNoteIds(ids); setSelectedNoteId(null);
      setEditModal({ ...editModal, visible: false });
      setInsertMenu({ ...insertMenu, visible: false });
      
      setSelectionMenu({ 
          visible: true, 
          selectedIds: ids, 
          x: Math.min(x + 10, window.innerWidth - 180), 
          y: Math.min(y + 10, window.innerHeight - 150) 
      });
  };

  const handleDuplicateSelection = () => {
      const ids = selectionMenu.selectedIds;
      if(ids.length === 0) return;
      const selectedNotes = parsedData.filter(n => ids.includes(n.id));
      if(selectedNotes.length === 0) return;
      selectedNotes.sort((a,b) => a.tick - b.tick);
      const firstTick = selectedNotes[0].tick;
      const lastTick = selectedNotes[selectedNotes.length - 1].tick;
      let gap = 12;
      if (selectedNotes.length > 1) {
          gap = Math.max(1.5, selectedNotes[selectedNotes.length - 1].tick - selectedNotes[selectedNotes.length - 2].tick);
          if (gap === 0) gap = 12;
      }
      const insertionStart = lastTick + gap;
      const newNotes: ParsedNote[] = selectedNotes.map((n, i) => ({
          ...n, id: `dup-${Date.now()}-${i}`, tick: insertionStart + (n.tick - firstTick), lineIndex: -1
      }));
      const allNotes = [...parsedData, ...newNotes];
      regenerateCodeFromAbsolutePositions(allNotes);
      setSelectionMenu({ ...selectionMenu, visible: false });
      setSelectedNoteIds([]);
  };

  const handleOpenBlockNameModal = () => {
      if (!checkAdminPermission()) return;
      setBlockNameInput(`Bloc ${savedBlocks.length + 1}`);
      setBlockNameModal({ visible: true });
  };

  const handleSaveBlock = () => {
      if (!checkAdminPermission()) return;
      const ids = selectionMenu.selectedIds;
      if (ids.length === 0) return;
      const notes = parsedData.filter(n => ids.includes(n.id));
      notes.sort((a,b) => a.tick - b.tick);
      if (notes.length > 0) {
          const startTick = notes[0].tick;
          const normalizedNotes = notes.map(n => ({...n, tick: n.tick - startTick}));
          const newBlock: SavedBlock = {
              id: `blk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              name: blockNameInput.trim() || `Bloc ${savedBlocks.length + 1}`,
              notes: normalizedNotes
          };
          const newBlocks = [...savedBlocks, newBlock];
          setSavedBlocks(newBlocks);
          localStorage.setItem('ngonilele_saved_blocks', JSON.stringify(newBlocks));
          alert("Bloc sauvegardé !");
      }
      setBlockNameModal({ visible: false });
      setSelectionMenu({ ...selectionMenu, visible: false });
      setSelectedNoteIds([]);
  };
  
  const toggleBlockSelection = (id: string) => {
    const strId = String(id).trim();
    setSelectedBlockIdsForDeletion(prev => {
        if (prev.includes(strId)) return prev.filter(i => i !== strId);
        return [...prev, strId];
    });
  };

  const handleDeleteSelectedBlocks = () => {
    if (!checkAdminPermission()) return;
    const idsToDelete = new Set(selectedBlockIdsForDeletion.map(id => String(id).trim()));
    if (idsToDelete.size === 0) return;
    const newBlocks = savedBlocks.filter(b => !idsToDelete.has(String(b.id).trim()));
    setSavedBlocks(newBlocks);
    localStorage.setItem('ngonilele_saved_blocks', JSON.stringify(newBlocks));
    setSelectedBlockIdsForDeletion([]); 
  };

  const handlePasteBlock = (block: SavedBlock) => {
      const insertionTick = Math.max(TICKS_COUNT_IN, currentTick);
      const newNotes = block.notes.map((n, i) => ({
          ...n,
          id: `paste-block-${Date.now()}-${i}`,
          tick: insertionTick + n.tick,
          lineIndex: -1
      }));
      const allNotes = [...parsedData, ...newNotes];
      regenerateCodeFromAbsolutePositions(allNotes);
      setMyBlocksModalOpen(false);
  };

  const handleDeleteSelection = () => {
      const ids = selectionMenu.selectedIds;
      const keptNotes = parsedData.filter(n => !ids.includes(n.id));
      regenerateCodeFromAbsolutePositions(keptNotes);
      setSelectionMenu({ ...selectionMenu, visible: false });
      setSelectedNoteIds([]);
  };

  const handleNoteHover = (note: ParsedNote | null, x: number, y: number) => {
      if (editModal.visible || insertMenu.visible || selectionMenu.visible) { setNoteTooltip(null); return; }
      if (!note) { setNoteTooltip(null); return; }
      const noteName = currentTuning[note.stringId] || '';
      setNoteTooltip({ visible: true, title: noteName, x: x + 20, y: y });
  };

  const handleDeleteNote = (note: ParsedNote) => {
      if (note.lineIndex === undefined) return;
      const lines = code.split('\n'); lines.splice(note.lineIndex, 1); updateCode(lines.join('\n'));
      if (selectedNoteId === note.id) setSelectedNoteId(null);
  };
  
  const handleUpdateFinger = (note: ParsedNote, finger: string) => {
      if (note.lineIndex === undefined) return;
      const lines = code.split('\n');
      const parts = lines[note.lineIndex].split(/\s+/);
      if (parts.length >= 2) {
          let newLine = `${parts[0]}   ${parts[1]}   ${finger}`;
          lines[note.lineIndex] = newLine;
          updateCode(lines.join('\n'));
      }
      setEditModal({...editModal, visible: false});
  };

  const handleBackgroundClick = (tick: number, stringId: string | undefined, x: number, y: number) => {
      setNoteTooltip(null); 
      setSelectionMenu({...selectionMenu, visible: false});
      setEditModal({ ...editModal, visible: false });
      setSelectedNoteIds([]);
      setSelectedNoteId(null);
      
      if (tick < TICKS_COUNT_IN) {
          return;
      }

      setInsertMenu({ visible: true, tick, stringId, x: Math.min(x + 10, window.innerWidth - 180), y: Math.min(y + 10, window.innerHeight - 150) });
  };
  
  const handleSeekAndClear = (tick: number) => {
      setSelectedNoteId(null);
      setSelectedNoteIds([]);
      setSelectionMenu({ ...selectionMenu, visible: false });
      setInsertMenu({ ...insertMenu, visible: false });
      setEditModal({ ...editModal, visible: false });
      
      handleSeek(tick);
  };

  const handleMenuAction = (type: 'NOTE' | 'SILENCE' | 'TEXT' | 'PASTE') => {
      const { tick, stringId } = insertMenu;
      if (type === 'NOTE' && stringId) {
          let finger: string | undefined;
          if (fingeringMode === 'auto') {
               if (['4D','5D','6D','4G','5G','6G'].includes(stringId)) finger = 'I';
               else finger = 'P';
          }
          handleNoteAdd(stringId, finger, tick); 
      }
      else if (type === 'TEXT') { setTextInputModal({ visible: true, text: '', targetTick: tick }); }
      setInsertMenu({ ...insertMenu, visible: false });
  };

  const commitVoiceNote = (stringId: string) => {
      voiceBufferRef.current = null;
      voicePartialRef.current = null;
      
      let finger = 'P';
      if (['4D','5D','6D','4G','5G','6G'].includes(stringId)) finger = 'I';

      handleNoteAddRef.current(stringId, finger, currentTickRef.current, 0); 
      
      setActiveVoiceStringId(stringId);
      setTimeout(() => setActiveVoiceStringId(null), 300);
  };

  const startRecursiveVoiceRecognition = () => {
      if (!isVoiceActiveRef.current) return;
      
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) return;

      const recognition = new SpeechRecognition();
      recognition.continuous = true; 
      recognition.lang = 'fr-FR';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      
      recognition.onstart = () => setIsListening(true);
      
      recognition.onend = () => {
          if (isVoiceActiveRef.current) {
              setTimeout(startRecursiveVoiceRecognition, 50);
          } else {
              setIsListening(false);
          }
      };
      
      recognition.onerror = (event: any) => {
          if (event.error === 'no-speech' || event.error === 'aborted') { return; }
          console.warn("Speech Error:", event.error);
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
              isVoiceActiveRef.current = false;
              setIsListening(false);
              alert("Accès micro refusé. Vérifiez les permissions.");
          }
      };

      recognition.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; ++i) {
             const result = event.results[i];
             if (result.isFinal) {
                  let text: string = result[0].transcript.toUpperCase().trim();
                  
                  text = text.replace(/\bJ\s*['’]?\s*AI\b/gi, " G ");
                  text = text.replace(/\bJ\s*['’]?\s*Y\b/gi, " G ");
                  text = text.replace(/\bJ\s*E\b/gi, " G "); 
                  text = text.replace(/\bJAI\b/gi, " G ");
                  text = text.replace(/\bGAI\b/gi, " G ");
                  text = text.replace(/\bGE\b/gi, " G ");
                  text = text.replace(/J\s*['’]?\s*AI/gi, " G ");
                  text = text.replace(/\bJ[IY]\b/gi, " G "); 

                  text = text.replace(/\bD[EÈ]S\b/gi, " D ");
                  text = text.replace(/\bD\s*['’]?\s*ELLE\b/gi, " D ");
                  text = text.replace(/\bD\s*['’]?\s*AILE\b/gi, " D ");
                  text = text.replace(/\bDE\b/gi, " D "); 
                  text = text.replace(/\bD[ÉE]S\b/gi, " D ");
                  text = text.replace(/\bDAY\b/gi, " D ");

                  Object.entries(NUMBER_MAPPING).forEach(([word, digit]) => {
                      text = text.replace(new RegExp(`\\b${word}\\b`, 'g'), digit);
                  });

                  text = text.replace(/([1-6])\s+([GD])/g, "$1$2"); 
                  text = text.replace(/([GD])\s+([1-6])/g, "$2$1"); 
                  text = text.replace(/\s+/g, " ");

                  setVoiceLog(`"${text}"`);

                  const tokens = text.split(" ");

                  tokens.forEach((t: string) => {
                      const sMatch = t.match(/^([1-6][GD]|[GD][1-6])$/);
                      if (sMatch) {
                          let cleanId = sMatch[0];
                          if (cleanId.match(/^[GD][1-6]$/)) { cleanId = cleanId[1] + cleanId[0]; } 

                          commitVoiceNote(cleanId);
                          return;
                      }

                      if (t.match(/^[1-6]$/)) {
                           if (voicePartialRef.current && voicePartialRef.current.type === 'number') {
                               const hand = voicePartialRef.current.value;
                               const combined = t + hand;
                               commitVoiceNote(combined);
                           } else {
                               voicePartialRef.current = { value: t, type: 'number' };
                           }
                           return;
                      }

                      if (t.match(/^[GD]$/)) {
                           if (voicePartialRef.current && voicePartialRef.current.type === 'number') {
                               const num = voicePartialRef.current.value;
                               const combined = num + t;
                               commitVoiceNote(combined);
                           } else {
                               voicePartialRef.current = { value: t, type: 'hand' };
                           }
                           return;
                      }
                  });
             }
          }
      };

      recognitionRef.current = recognition;
      try {
          recognition.start();
      } catch(e) {
          console.error("Start error", e);
      }
  };

  const toggleVoiceInput = async () => {
    await audioEngine.init();
    if (audioEngine.ctx?.state === 'suspended') {
        try { await audioEngine.ctx.resume(); } catch(e) {}
    }

    if (!window.isSecureContext) {
        alert("⚠️ Attention: Le micro nécessite une connexion sécurisée (HTTPS). Sur mobile, l'accès sera probablement bloqué.");
    }

    if (isVoiceActiveRef.current) {
        isVoiceActiveRef.current = false;
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch(e) {}
            recognitionRef.current = null;
        }
        setIsListening(false);
        setVoiceLog("");
    } else {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Votre navigateur ne supporte pas la reconnaissance vocale. (Essayez Chrome/Edge).");
            return;
        }
        
        isVoiceActiveRef.current = true;
        setVoiceLog("");
        startRecursiveVoiceRecognition();
    }
  };

  const handleNoteDrag = (note: ParsedNote, newStringId: string, newTick: number) => {
     if (!note) return;
     if (newTick < TICKS_COUNT_IN) return; 

     const allNotes = [...parsedData];
     const index = allNotes.findIndex(n => n.id === note.id);
     
     if (index !== -1) { 
         if (note.stringId === 'TEXTE') {
             allNotes[index] = { ...allNotes[index], tick: newTick };
         } else {
             allNotes[index] = { ...allNotes[index], stringId: newStringId, tick: newTick }; 
         }
     }
     regenerateCodeFromAbsolutePositions(allNotes);
  };

  const deleteNote = () => { if (!editModal.note) return; handleDeleteNote(editModal.note); setEditModal({ ...editModal, visible: false }); };

  const saveProjectFile = () => {
    const project = { title: tabTitle, version: '1.0', timestamp: new Date().toISOString(), code, tuning: currentTuning, scaleName: selectedScaleName, bpm, rhythmMode };
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; 
    const safeName = tabTitle.trim().replace(/[^a-z0-9\-_]/gi, '_') || 'projet_ngonilele';
    a.download = `${safeName}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const handleLoadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const project = JSON.parse(event.target?.result as string);
        if (project.title) setTabTitle(project.title);
        if (project.code) updateCode(project.code);
        if (project.tuning) { setCurrentTuning(project.tuning); audioEngine.setTuning(project.tuning); }
        if (project.scaleName) setSelectedScaleName(project.scaleName);
        if (project.bpm) setBpm(project.bpm);
        if (project.rhythmMode) setRhythmMode(project.rhythmMode);
        alert("Projet chargé !");
      } catch (err) { alert("Erreur chargement."); }
    };
    reader.readAsText(file); e.target.value = '';
  };

  const handleDownloadPDF = () => {
      const title = tabTitle || "Ma Composition Ngonilélé";
      generatePDF(code, title, selectedScaleName);
  };

  const handleExportAudio = async () => {
      setIsExporting(true);
      isExportingRef.current = true;
      audioEngine.setNotes(parsedData);
      audioEngine.setBpm(bpm);
      
      try {
          audioEngine.init(); 
          const mp3Blob = await audioEngine.exportMp3();
          if (mp3Blob) {
              const url = URL.createObjectURL(mp3Blob);
              const a = document.createElement('a');
              a.style.display = 'none';
              a.href = url;
              const safeName = tabTitle.trim().replace(/[^a-z0-9\-_]/gi, '_') || 'audio_ngonilele';
              a.download = `${safeName}.mp3`;
              document.body.appendChild(a);
              a.click();
              setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
          } else {
              alert("Impossible de générer l'audio (aucune note ?)");
          }
      } catch (e) {
          alert("Erreur lors de l'export audio.");
          console.error(e);
      } finally {
          setIsExporting(false);
          isExportingRef.current = false;
      }
  };

  const handleExportVideo = () => {
    setMainTab('editor');
    
    setTimeout(async () => {
        if (!visualizerRef.current) {
            alert("Impossible d'initialiser l'enregistrement vidéo.");
            setMainTab('media');
            return;
        }
        
        stopPlayback(); 
        setIsExporting(true);
        isExportingRef.current = true;
        setIsRecording(true);
        setCurrentTick(0);

        try {
            audioEngine.init();
            if (audioEngine.ctx && audioEngine.ctx.state === 'suspended') {
                 // @ts-ignore
                 await audioEngine.ctx.resume();
            }
            await audioEngine.loadSamples();

            audioEngine.setNotes(parsedData);
            audioEngine.setBpm(bpm);
            audioEngine.setPlaybackSpeed(exportPlaybackSpeed); 

            const audioBuffer = await audioEngine.renderProjectToBuffer();

            if (!audioBuffer) {
                 alert("Erreur: Impossible de générer l'audio pour la vidéo.");
                 setIsExporting(false);
                 isExportingRef.current = false;
                 setIsRecording(false);
                 return;
            }
            
            const canvasStream = visualizerRef.current?.getCanvasStream();
            const audioStream = audioEngine.getAudioStream();
            
            if (!audioStream || !canvasStream) { 
                alert("Erreur d'initialisation des flux pour l'enregistrement."); 
                setIsExporting(false);
                isExportingRef.current = false;
                setIsRecording(false);
                setMainTab('media');
                return; 
            }
            
            const combinedStream = new MediaStream([ ...canvasStream.getVideoTracks(), ...audioStream.getAudioTracks() ]);
            
            let mimeType = 'video/webm; codecs=vp8';
            
            if (videoFormat === 'mp4') {
                if (MediaRecorder.isTypeSupported('video/mp4')) {
                    mimeType = 'video/mp4';
                } else {
                     console.warn("MP4 not supported, falling back to WebM");
                     alert("Le format MP4 n'est pas supporté par ce navigateur. Export en WebM.");
                     mimeType = 'video/webm; codecs=vp8';
                }
            } else {
                if (MediaRecorder.isTypeSupported('video/webm; codecs=vp8')) {
                    mimeType = 'video/webm; codecs=vp8';
                } else {
                    mimeType = 'video/webm';
                }
            }
            
            recordedMimeTypeRef.current = mimeType;

            const recorder = new MediaRecorder(combinedStream, { 
                mimeType: mimeType, 
                videoBitsPerSecond: 8000000,
                audioBitsPerSecond: 192000
            });
            mediaRecorderRef.current = recorder; 
            recordedChunksRef.current = [];
            
            recorder.ondataavailable = (event) => { 
                if (event.data.size > 0) recordedChunksRef.current.push(event.data); 
            };
            
            recorder.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); 
                a.style.display = 'none'; 
                a.href = url; 
                const safeName = tabTitle.trim().replace(/[^a-z0-9\-_]/gi, '_') || 'video_ngonilele';
                a.download = `${safeName}.` + (mimeType.includes('mp4') ? 'mp4' : 'webm');
                document.body.appendChild(a); 
                a.click(); 
                setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
                
                setIsRecording(false); 
                setIsExporting(false);
                isExportingRef.current = false;
                setMainTab('media');
            };
            
            recorder.start(); 
            
            setPlaybackState(PlaybackState.PLAYING); 
            
            setTimeout(() => {
                audioEngine.playPrerendered(audioBuffer, true);
            }, 500);

        } catch (e) {
            console.error(e);
            alert("Erreur lors de l'exportation vidéo (Contexte Audio ou Support Navigateur)."); 
            setIsExporting(false);
            isExportingRef.current = false;
            setIsRecording(false);
            setMainTab('media');
        }
            
    }, 1000); 
  };

  const stopRecording = () => { 
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop(); 
      }
  };
  
  // MODIF: Utilisation d'une modale React au lieu de window.confirm
  const handleNewProject = () => {
      setConfirmNewProjectModal(true);
  };

  const executeNewProject = () => {
      setCode(HEADER_SILENCE);
      setTabTitle("Ma Composition");
      setSelectedPresetName("");
      setPlaybackState(PlaybackState.STOPPED);
      setCurrentTick(TICKS_COUNT_IN);
      setConfirmNewProjectModal(false);
  };

  const isBeat = isMetronomeOn && playbackState === PlaybackState.PLAYING && (Math.abs(currentTick) % 12 < 2 || Math.abs(currentTick) % 12 > 10);

  if (userRole === 'none') {
      return <LoginScreen onLogin={() => setUserRole('admin')} onGuest={() => setUserRole('guest')} />;
  }

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-transparent text-[#5d4037] overflow-hidden font-sans" onClick={() => { if(editModal.visible) setEditModal({ ...editModal, visible: false }); if(insertMenu.visible) setInsertMenu({ ...insertMenu, visible: false }); }}>
      
      {/* MODAL: Confirmation Nouveau Projet */}
      {confirmNewProjectModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setConfirmNewProjectModal(false)}>
            <div className="bg-[#e5c4a1] border-2 border-[#A67C52] rounded-xl shadow-2xl p-6 w-full max-w-sm flex flex-col gap-4 text-center" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-center text-[#800020] mb-2">
                    <ShieldAlert size={48} />
                </div>
                <h3 className="font-bold text-xl text-[#5d4037]">Nouveau Projet ?</h3>
                <p className="text-sm text-[#8d6e63] font-medium">
                    Attention, vous allez effacer toute votre composition actuelle. Cette action est irréversible.
                </p>
                <div className="flex gap-3 justify-center mt-2">
                    <button 
                        onClick={() => setConfirmNewProjectModal(false)} 
                        className="px-4 py-2 text-[#8d6e63] font-bold hover:bg-[#cbb094] rounded border border-[#cbb094]"
                    >
                        Annuler
                    </button>
                    <button 
                        onClick={executeNewProject} 
                        className="px-6 py-2 bg-[#800020] text-white font-bold rounded shadow hover:bg-[#600018] flex items-center gap-2"
                    >
                        <Trash2 size={16}/> Tout Effacer
                    </button>
                </div>
            </div>
        </div>
      )}

      {legendModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setLegendModalOpen(false)}>
            <div className="bg-[#e5c4a1] border-2 border-[#cbb094] rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="bg-[#cbb094] p-4 flex items-center justify-between border-b border-[#bfa085]">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-[#5d4037]"><BookOpen size={20}/> Guide Complet de l'Application</h3>
                    <button onClick={() => setLegendModalOpen(false)}><X size={24} className="text-[#5d4037]"/></button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar bg-[#e5c4a1] flex flex-col gap-6 text-[#5d4037] text-sm md:text-base">
                    
                    <div className="bg-[#dcc0a3] p-4 rounded-lg">
                        <h4 className="font-bold border-b border-[#8d6e63]/30 mb-2 flex items-center gap-2 text-[#800020]"><Menu size={16}/> 1. Le Menu Latéral (Gauche)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <strong className="block mb-1 text-[#8d6e63]">Banque de Sons :</strong>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li><strong>Morceaux :</strong> Chansons pré-chargées.</li>
                                    <li><strong>Exercices :</strong> Gammes et rythmes pour s'entraîner.</li>
                                    <li><strong>Mes Morceaux :</strong> Vos créations personnelles sauvegardées.</li>
                                    <li><strong>Partager :</strong> Exportez vos morceaux (fichier .json) et envoyez-les à un ami par email.</li>
                                </ul>
                            </div>
                            <div>
                                <strong className="block mb-1 text-[#8d6e63]">Contributions & Assistance :</strong>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li><strong>Proposer :</strong> Envoyez vos tablatures ou idées de gammes au développeur.</li>
                                    <li><strong>Signaler un bug :</strong> Contact direct en cas de problème.</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#dcc0a3] p-4 rounded-lg">
                        <h4 className="font-bold border-b border-[#8d6e63]/30 mb-2 flex items-center gap-2 text-[#800020]"><Settings size={16}/> 2. L'Onglet Accordage</h4>
                        <p className="text-sm mb-2">Configurez votre Ngonilélé avant de commencer à jouer.</p>
                        <ul className="list-disc pl-5 space-y-1 text-sm">
                            <li><strong>Gamme :</strong> Choisissez parmi les presets (Pentatonique, Manitoumani, etc.).</li>
                            <li><strong>Personnaliser :</strong> Modifiez la note de chaque corde individuellement. Le nom de la gamme passera en "Personnalisée".</li>
                            <li><strong>Code Couleur :</strong> Référence visuelle des notes utilisées.</li>
                        </ul>
                    </div>

                    <div className="bg-[#dcc0a3] p-4 rounded-lg">
                        <h4 className="font-bold border-b border-[#8d6e63]/30 mb-2 flex items-center gap-2 text-[#800020]"><Edit3 size={16}/> 3. L'Onglet Éditeur (Principal)</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <div>
                                <h5 className="font-bold text-xs uppercase text-[#8d6e63] mb-1">Barre d'outils</h5>
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                    <li><strong>Contrôles :</strong> Play, Pause, Retour début, Vitesse, Métronome.</li>
                                    <li><strong>Rythme :</strong> 4/4 (Binaire) ou 3/3 (Ternaire).</li>
                                    <li><strong>Doigté :</strong> Auto (Pouce basses / Index aigües) ou Manuel (clique gauche ou droit sur les pavés couleur).</li>
                                    <li><strong>Outils :</strong> Annuler (Action/Note), Insérer Texte, Sauvegarder.</li>
                                </ul>
                            </div>
                            <div>
                                <h5 className="font-bold text-xs uppercase text-[#8d6e63] mb-1">Saisie & Grille</h5>
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                    <li><strong>Saisie pavés couleur :</strong> Cliquez sur les cases. La hauteur définit la durée (Haut=Rapide, Bas=Lent).</li>
                                    <li><strong>Souris (PC) :</strong> Clic Gauche = Pouce / Clic Droit = Index.</li>
                                    <li><strong>Tactile (Mobile) :</strong> Tap court = Pouce / Tap Long = Index.</li>
                                    <li><strong>Grille :</strong> Glissez les notes pour les déplacer. Clic droit pour éditer/supprimer. Sélection multiple possible.</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#dcc0a3] p-4 rounded-lg">
                        <h4 className="font-bold border-b border-[#8d6e63]/30 mb-2 flex items-center gap-2 text-[#800020]"><FileDown size={16}/> 4. L'Onglet Générer Médias</h4>
                        <ul className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                             <li className="flex flex-col gap-1 bg-[#e5c4a1] p-2 rounded">
                                 <strong className="flex items-center gap-1"><FileText size={14}/> PDF</strong>
                                 <span>Téléchargez la partition prête à imprimer.</span>
                             </li>
                             <li className="flex flex-col gap-1 bg-[#e5c4a1] p-2 rounded">
                                 <strong className="flex items-center gap-1"><Mic size={14}/> Audio</strong>
                                 <span>Export MP3 haute qualité (320kbps).</span>
                             </li>
                             <li className="flex flex-col gap-1 bg-[#e5c4a1] p-2 rounded">
                                 <strong className="flex items-center gap-1"><Film size={14}/> Vidéo</strong>
                                 <span>Vidéo défilante (WebM). Idéal pour s'entraîner ou partager une tablature.</span>
                             </li>
                        </ul>
                    </div>

                </div>
            </div>
        </div>
      )}

      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 border-r border-[#cbb094] flex flex-col transition-all duration-300 ease-in-out shadow-xl md:shadow-none backdrop-blur-sm relative overflow-hidden
        ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
        ${isDesktopSidebarOpen ? 'md:w-72' : 'md:w-0 md:opacity-0 md:overflow-hidden'}
      `}>
        {/* Background Layers */}
        <div className="absolute inset-0 bg-[#dcc0a3]/90 z-0" />
        <div 
            className="absolute inset-0 z-0 opacity-15 mix-blend-multiply pointer-events-none"
            style={{
                backgroundImage: `url('${MENU_BG_URL}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        />

        {/* Content Wrapper */}
        <div className="flex flex-col h-full w-full relative z-10">
            <div className="p-4 flex flex-col gap-4">
            <div className="flex flex-col items-center gap-2 text-center">
                <div className="w-[108px] h-[108px] flex items-center justify-center shrink-0">
                    <img 
                        src="https://raw.githubusercontent.com/julienflorin59-ux/Generateur-tablature-Ngonilele/main/logo_mandala.png" 
                        alt="Logo Ngonilélé" 
                        className="w-full h-full object-contain animate-in fade-in zoom-in transition-transform duration-300 hover:scale-110 active:scale-125 cursor-pointer mix-blend-multiply"
                    />
                </div>
                <div>
                    <h1 className="font-serif font-bold text-2xl leading-none text-[#800020] break-words">Ngonilélé</h1>
                    <span className="text-sm uppercase font-bold text-[#8d6e63] tracking-widest">Tablatures</span>
                </div>
            </div>
            
            <div className="flex gap-1 w-full">
                <button onClick={() => setBankTab('song')} className={`flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center gap-1 transition-all ${bankTab === 'song' ? 'bg-[#8d6e63] text-white shadow-sm' : 'text-[#8d6e63] hover:bg-[#dcc0a3]'}`}>
                    <Music size={12}/> Morceaux
                </button>
                <button onClick={() => setBankTab('exercise')} className={`flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center gap-1 transition-all ${bankTab === 'exercise' ? 'bg-[#8d6e63] text-white shadow-sm' : 'text-[#8d6e63] hover:bg-[#dcc0a3]'}`}>
                    <Activity size={12}/> Exercices
                </button>
                <button onClick={() => setBankTab('user')} className={`flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center gap-1 transition-all ${bankTab === 'user' ? 'bg-[#8d6e63] text-white shadow-sm' : 'text-[#8d6e63] hover:bg-[#dcc0a3]'}`}>
                    <User size={12}/> Mes Tabs
                </button>
            </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                <h3 className="text-xs font-black text-[#8d6e63] uppercase tracking-wider mb-2 px-2 mt-2 flex justify-between items-center">
                    <span>{bankTab === 'song' ? 'Chansons' : bankTab === 'exercise' ? 'Exercices' : 'Mes Créations'}</span>
                    <span className="bg-[#cbb094] text-[#5d4037] px-1.5 py-0.5 rounded text-[10px]">{filteredPresets.length}</span>
                </h3>
                
                <div className="flex flex-col gap-1">
                    {filteredPresets.map((preset) => (
                        <button 
                            key={preset.name}
                            onClick={() => { setSelectedPresetName(preset.name); handleLoadSelectedPreset(); }} 
                            className={`w-full text-left px-3 py-2.5 rounded-lg transition-all border border-transparent group relative
                            ${selectedPresetName === preset.name 
                                ? 'bg-[#e5c4a1] border-[#cbb094] shadow-sm' 
                                : 'hover:bg-[#e5c4a1]/50 hover:border-[#cbb094]/30'}
                            `}
                        >
                            <div className="flex items-center justify-between">
                                <span className={`text-xs font-bold ${selectedPresetName === preset.name ? 'text-[#5d4037]' : 'text-[#8d6e63] group-hover:text-[#5d4037]'}`}>
                                    {preset.name}
                                </span>
                                {bankTab === 'user' && selectedPresetName === preset.name && (
                                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                        <button onClick={handleShareUserPreset} className="p-1 hover:bg-[#dcc0a3] rounded text-[#8d6e63] hover:text-[#5d4037]" title="Partager par mail"><Mail size={12}/></button>
                                        {userRole === 'admin' && <button onClick={handleDeleteUserPreset} className="p-1 hover:bg-red-100 rounded text-[#8d6e63] hover:text-red-500" title="Supprimer"><Trash2 size={12}/></button>}
                                    </div>
                                )}
                            </div>
                        </button>
                    ))}
                    
                    {filteredPresets.length === 0 && (
                        <div className="text-center py-8 text-xs text-[#8d6e63] italic opacity-70">
                            Aucun élément trouvé.
                        </div>
                    )}
                </div>
            </div>
            
            <div className="p-4 border-t border-[#cbb094] bg-[#e5c4a1]/30 flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-[#8d6e63] mb-1">Contribuer</h4>
                    <a href="mailto:julienflorin59@gmail.com?subject=Proposition%20Morceau%20Ngonilélé" className="flex items-center gap-2 text-xs font-bold text-[#5d4037] hover:text-[#8d6e63] transition-colors p-1.5 hover:bg-[#cbb094]/50 rounded">
                        <Music size={14}/>
                        <span>Proposer un morceau</span>
                    </a>
                    <a href="mailto:julienflorin59@gmail.com?subject=Proposition%20Gamme%20Ngonilélé" className="flex items-center gap-2 text-xs font-bold text-[#5d4037] hover:text-[#8d6e63] transition-colors p-1.5 hover:bg-[#cbb094]/50 rounded">
                        <Settings size={14}/>
                        <span>Proposer une gamme</span>
                    </a>
                    <button onClick={handleShareCurrentProject} className="flex items-center gap-2 text-xs font-bold text-[#5d4037] hover:text-[#8d6e63] transition-colors p-1.5 hover:bg-[#cbb094]/50 rounded w-full text-left">
                        <Send size={14}/>
                        <span>Envoyer ma tablature</span>
                    </button>
                </div>
                
                <div className="w-full h-[1px] bg-[#cbb094]/50"></div>

                <div className="flex flex-col gap-1">
                    <a href="mailto:julienflorin59@gmail.com?subject=Bug%20Ngonilélé" className="flex items-center gap-2 text-xs font-bold text-[#800020] hover:text-red-600 transition-colors p-1.5 hover:bg-[#cbb094]/50 rounded">
                        <Bug size={14}/>
                        <span>Reporter un bug</span>
                    </a>
                    <button onClick={() => setLegendModalOpen(true)} className="flex items-center gap-2 text-xs font-bold text-[#5d4037] hover:text-[#8d6e63] transition-colors p-1.5 hover:bg-[#cbb094]/50 rounded w-full text-left">
                        <LifeBuoy size={14}/>
                        <span>Guide d'utilisation</span>
                    </button>
                    <a href="https://github.com/julienflorin59-ux/Generateur-tablature-Ngonilele/blob/main/Livret_Ngonil%C3%A9l%C3%A9.pdf" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-bold text-[#5d4037] hover:text-[#8d6e63] transition-colors p-1.5 hover:bg-[#cbb094]/50 rounded">
                        <BookOpen size={14}/>
                        <span>Télécharger le Livret Ngonilélé</span>
                    </a>
                </div>

                <div className="w-full h-[1px] bg-[#cbb094]/50"></div>

                <div className="text-[10px] text-center text-[#8d6e63] leading-tight">
                    <div className="font-bold">Développé par Julien Florin</div>
                    <a href="mailto:julienflorin59@gmail.com" className="hover:underline opacity-80 hover:opacity-100">julienflorin59@gmail.com</a>
                    <div className="opacity-50 mt-1">v1.3.1</div>
                </div>
            </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full bg-transparent">
          
          <DynamicBackground activeTab={mainTab} />

          <header className="pt-2 px-2 md:pt-8 md:px-10 pb-1 bg-transparent flex-none relative z-10">
              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 mb-2 md:mb-4">
                 <button onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)} className="flex items-center justify-center p-2 bg-[#dcc0a3] hover:bg-[#cbb094] rounded-full text-[#5d4037] shadow-sm border border-[#cbb094] transition-all" aria-label="Menu Principal">
                    {isDesktopSidebarOpen ? <ChevronsLeft size={24}/> : <Menu size={24}/>}
                 </button>
                 <input type="file" accept=".json" ref={loadProjectInputRef} onChange={handleLoadProject} className="hidden" />
              </div>

              {/* Desktop Navigation Tabs (Hidden on Mobile) */}
              <nav className="hidden md:flex justify-center gap-2 md:gap-4 overflow-x-auto scrollbar-hide pb-2">
                  <button onClick={() => setMainTab('tuning')} className={`whitespace-nowrap px-4 py-2 flex items-center gap-2 rounded-lg font-bold text-sm transition-all ${mainTab === 'tuning' ? 'bg-[#8d6e63] text-[#e5c4a1] shadow-md' : 'bg-[#e5c4a1]/50 text-[#8d6e63] hover:bg-[#dcc0a3] backdrop-blur-sm'}`}><Settings size={16} /> Accordage</button>
                  <button onClick={() => setMainTab('editor')} className={`whitespace-nowrap px-4 py-2 flex items-center gap-2 rounded-lg font-bold text-sm transition-all ${mainTab === 'editor' ? 'bg-[#8d6e63] text-[#e5c4a1] shadow-md' : 'bg-[#e5c4a1]/50 text-[#8d6e63] hover:bg-[#dcc0a3] backdrop-blur-sm'}`}><Edit3 size={16} /> Éditeur</button>
                  <button onClick={() => setMainTab('media')} className={`whitespace-nowrap px-4 py-2 flex items-center gap-2 rounded-lg font-bold text-sm transition-all ${mainTab === 'media' ? 'bg-[#8d6e63] text-[#e5c4a1] shadow-md' : 'bg-[#e5c4a1]/50 text-[#8d6e63] hover:bg-[#dcc0a3] backdrop-blur-sm'}`}><FileDown size={16} /> Générer Médias</button>
              </nav>
          </header>

          {/* MAIN CONTENT AREA */}
          <div className="flex-1 bg-transparent border-t border-[#cbb094]/50 p-1 md:p-2 overflow-y-auto scrollbar-hide flex flex-col min-h-0 relative z-10 pb-20 md:pb-2">
              
              {textInputModal.visible && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
                  <div className="bg-[#e5c4a1] border-2 border-[#A67C52] rounded-xl shadow-2xl p-6 w-full max-w-sm flex flex-col gap-4">
                    <h3 className="font-bold text-lg text-[#5d4037]">Insérer texte</h3>
                    <input type="text" placeholder="Ex: Refrain..." className="w-full p-2 border border-[#cbb094] rounded bg-[#dcc0a3] text-[#5d4037] font-bold outline-none focus:ring-2 focus:ring-[#A67C52]" value={textInputModal.text} onChange={(e) => setTextInputModal({ ...textInputModal, text: e.target.value })} autoFocus onKeyDown={(e) => e.key === 'Enter' && handleConfirmTextInsert()} />
                    <div className="flex gap-2 justify-end mt-2">
                        <button onClick={() => setTextInputModal({ visible: false, text: '' })} className="px-4 py-2 text-[#8d6e63] font-bold hover:bg-[#cbb094] rounded">Annuler</button>
                        <button onClick={handleConfirmTextInsert} className="px-6 py-2 bg-[#A67C52] text-white font-bold rounded shadow hover:bg-[#8d6e63]">Valider</button>
                    </div>
                  </div>
                </div>
              )}

              {selectionMenu.visible && (
                   <div className="fixed z-[60] bg-[#e5c4a1] border border-[#cbb094] rounded-lg shadow-xl p-1.5 flex flex-col gap-1 min-w-[140px]" style={{ left: selectionMenu.x, top: selectionMenu.y }} onClick={(e) => e.stopPropagation()}>
                        <div className="text-[9px] uppercase font-bold text-[#8d6e63] px-2 py-1 mb-1 border-b border-[#cbb094]/50 flex justify-between">
                            <span>{selectionMenu.selectedIds.length} notes</span>
                            <button onClick={() => { setSelectedNoteIds([]); setSelectionMenu({ ...selectionMenu, visible: false}); }} className="hover:text-red-500"><X size={12}/></button>
                        </div>
                        <button onClick={handleDuplicateSelection} className="flex items-center gap-3 px-2 py-1.5 hover:bg-[#dcc0a3] rounded text-xs font-bold text-[#5d4037] text-left"><Repeat size={14} /><span>Répéter (Dupliquer)</span></button>
                        <button onClick={handleOpenBlockNameModal} className={`flex items-center gap-3 px-2 py-1.5 hover:bg-[#dcc0a3] rounded text-xs font-bold text-[#5d4037] text-left ${userRole !== 'admin' ? 'opacity-50' : ''}`}><Save size={14} /><span>Sauvegarder en Bloc</span></button>
                        <hr className="border-[#cbb094] my-1"/>
                        <button onClick={handleDeleteSelection} className="flex items-center gap-3 px-2 py-1.5 hover:bg-[#dcc0a3] rounded text-xs font-bold text-[#5d4037] text-left"><Trash2 size={14} /><span>Supprimer tout</span></button>
                   </div>
              )}

              {insertMenu.visible && (
                   <div className="fixed z-[60] bg-[#e5c4a1] border border-[#cbb094] rounded-lg shadow-xl p-1.5 flex flex-col gap-1 min-w-[130px]" style={{ left: insertMenu.x, top: insertMenu.y }} onClick={(e) => e.stopPropagation()}>
                        <div className="text-[9px] uppercase font-bold text-[#8d6e63] px-2 py-1 mb-1 border-b border-[#cbb094]/50">Action</div>
                        {insertMenu.stringId && <button onClick={() => handleMenuAction('NOTE')} className="flex items-center gap-3 px-2 py-1.5 hover:bg-[#dcc0a3] rounded text-xs font-bold text-[#5d4037] text-left"><Music size={14} /><span>Ajouter Note</span></button>}
                        <button onClick={() => handleMenuAction('TEXT')} className="flex items-center gap-3 px-2 py-1.5 hover:bg-[#dcc0a3] rounded text-xs font-bold text-[#5d4037] text-left"><MessageSquarePlus size={14} /><span>Insérer Texte</span></button>
                   </div>
              )}

              {noteTooltip && noteTooltip.visible && (
                  <div className="fixed z-[60] bg-[#e5c4a1] border border-[#A67C52] shadow-lg rounded-md px-3 py-2 pointer-events-none flex flex-col gap-0.5" style={{ left: noteTooltip.x, top: noteTooltip.y }}>
                      <span className="text-sm font-black text-[#5d4037]">{noteTooltip.title}</span>
                  </div>
              )}

              {editModal.visible && editModal.note && (
                  <div className="fixed z-50 bg-[#e5c4a1] border border-[#cbb094] rounded-lg shadow-xl p-1.5 flex flex-col gap-1 min-w-[130px]" style={{ left: editModal.x, top: editModal.y }} onClick={(e) => e.stopPropagation()}>
                      {editModal.note.stringId === 'TEXTE' ? (
                         <div className="text-[9px] font-bold text-[#8d6e63] px-2 pb-1 mb-1 border-b border-[#cbb094]">
                            Texte : {editModal.note.message}
                         </div>
                      ) : (
                         <>
                            <div className="text-[9px] font-bold text-[#8d6e63] px-2 pb-1 mb-1 border-b border-[#cbb094] flex items-center justify-between"><span>Note : {currentTuning[editModal.note.stringId]}</span></div>
                            <div className="text-[9px] font-bold text-[#5d4037] px-2 mb-1">Doigté :</div>
                            <button onClick={() => handleUpdateFinger(editModal.note!, 'P')} className={`flex items-center gap-2 px-2 py-1.5 hover:bg-[#dcc0a3] rounded text-[10px] font-bold text-[#5d4037] ${editModal.note.doigt === 'P' ? 'bg-[#8d6e63] text-white' : ''}`}><span>👍</span> Pouce</button>
                            <button onClick={() => handleUpdateFinger(editModal.note!, 'I')} className={`flex items-center gap-2 px-2 py-1.5 hover:bg-[#dcc0a3] rounded text-[10px] font-bold text-[#5d4037] ${editModal.note.doigt === 'I' ? 'bg-[#8d6e63] text-white' : ''}`}><span>☝️</span> Index</button>
                            <hr className="border-[#cbb094] my-1"/>
                         </>
                      )}
                      
                      <button onClick={deleteNote} className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#dcc0a3] rounded text-[10px] font-bold text-[#5d4037]"><Trash2 size={12} /> Supprimer</button>
                  </div>
              )}

              {mainTab === 'tuning' && (
                  <div className="h-full overflow-y-auto scrollbar-hide animate-in fade-in duration-300 pb-2 pt-1 flex flex-col items-center">
                      <div className="bg-[#dcc0a3]/60 p-4 rounded-xl backdrop-blur-sm shadow-sm w-full max-w-3xl flex flex-col items-center gap-2 border border-[#cbb094]">
                          <h2 className="text-lg md:text-xl font-bold mb-1">Gamme & Accordage</h2>
                          <div className="mb-1 w-full max-w-xl">
                              <label className="text-xs text-[#8d6e63] mb-0.5 block font-bold text-center">Sélectionner la gamme :</label>
                              <div className="relative inline-block w-full">
                                <select className="w-full p-1.5 bg-[#d0b090]/80 border-2 border-[#cbb094] rounded shadow-inner font-black text-[#5d4037] appearance-none outline-none focus:ring-4 focus:ring-[#A67C52] text-xs md:text-sm text-center" value={selectedScaleName} onChange={handleScaleChange}>
                                    <option value="Personnalisée" className="bg-[#e5c4a1]">-- Personnalisée --</option>
                                    {SCALES_PRESETS.map(s => <option key={s.name} value={s.name} className="bg-[#e5c4a1]">{s.name}</option>)}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-[#5d4037]"><ChevronDown size={24} /></div>
                              </div>
                          </div>
                          <div className="mt-1 w-full max-w-xl">
                              <h3 className="font-bold text-sm mb-0.5 text-center text-[#8d6e63]">Code Couleur</h3>
                              <div className="flex flex-wrap justify-center gap-3 items-center px-1">
                                  {Object.entries(NOTE_COLORS).map(([note, color]) => (
                                      <div key={note} className="group flex flex-col items-center justify-center cursor-default">
                                          <div className="w-5 h-5 md:w-6 md:h-6 rounded-full relative transition-transform transform group-hover:scale-110 duration-300 shadow-md" style={{ backgroundColor: color, boxShadow: `0 2px 4px ${color}80, inset 0 2px 3px rgba(255,255,255,0.4)` }}></div>
                                          <span className="font-bold text-[10px] mt-0.5 text-[#5d4037]">{note}</span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>
                      <div className="border-t border-[#cbb094]/50 pt-1 mt-1 mb-1 w-full max-w-3xl">
                         <h3 className="font-black text-sm mb-1 flex items-center gap-2 justify-center text-[#5d4037] mt-2"><Plus size={14} /> Personnaliser l'accordage</h3>
                         <div className="bg-[#dcc0a3]/60 p-3 rounded-xl border-2 border-[#cbb094] shadow-sm backdrop-blur-sm">
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-black mb-1 text-[#5d4037] border-b-2 border-[#5d4037]/20 pb-0.5 text-xs md:text-sm text-center">Main Gauche (G)</h4>
                                    <div className="flex flex-col gap-1.5">{STRING_CONFIGS.filter(s => s.hand === 'G').sort((a,b) => a.index - b.index).map(str => (<StringSelector key={str.stringId} stringId={str.stringId} currentNote={currentTuning[str.stringId] || 'C4'} onNoteChange={handleNoteChange} hand="G" />))}</div>
                                </div>
                                <div>
                                    <h4 className="font-black mb-1 text-[#5d4037] border-b-2 border-[#5d4037]/20 pb-0.5 text-xs md:text-sm text-center">Main Droite (D)</h4>
                                    <div className="flex flex-col gap-1.5">{STRING_CONFIGS.filter(s => s.hand === 'D').sort((a,b) => a.index - b.index).map(str => (<StringSelector key={str.stringId} stringId={str.stringId} currentNote={currentTuning[str.stringId] || 'C4'} onNoteChange={handleNoteChange} hand="D" />))}</div>
                                </div>
                             </div>
                         </div>
                      </div>
                  </div>
              )}

              {mainTab === 'editor' && (
                  <div className="flex w-full border border-[#cbb094]/50 rounded-lg shadow-sm animate-in fade-in duration-300 h-full flex-col bg-transparent">
                       <div className="bg-[#dcc0a3]/60 border-b border-[#cbb094] flex flex-col gap-1 p-1 z-20 shadow-sm flex-none h-auto backdrop-blur-sm">
                            
                            <div className="flex flex-col md:flex-row items-center justify-center gap-2 w-full relative mb-0.5">
                                <div className="flex items-center justify-center gap-2">
                                    <input
                                        type="text"
                                        value={tabTitle}
                                        onChange={(e) => setTabTitle(e.target.value)}
                                        className="bg-transparent text-base md:text-2xl font-serif font-normal text-[#5d4037] placeholder-[#8d6e63] outline-none border-b-2 border-transparent hover:border-[#8d6e63] focus:border-[#8d6e63] pb-0 text-center w-full min-w-[150px]"
                                        placeholder="Ma Composition"
                                    />
                                    <button onClick={handleNewProject} className="p-1.5 bg-[#e5c4a1] hover:bg-[#cbb094] rounded text-[#8d6e63] hover:text-[#5d4037] transition-colors border border-[#cbb094]" title="Nouveau / Tout effacer">
                                        <FilePlus size={16} />
                                    </button>
                                </div>

                                <div className="flex gap-2">
                                     <button onClick={() => { setSaveName(tabTitle); setSaveModalOpen(true); }} className={`flex items-center gap-1 px-3 py-0.5 bg-[#8d6e63] text-[#e5c4a1] rounded shadow-md hover:bg-[#6d4c41] transition-colors font-bold text-xs ${userRole !== 'admin' ? 'opacity-80' : ''}`}>
                                         <Save size={14} /> Enregistrer ma tablature
                                     </button>
                                     <button onClick={() => setMyBlocksModalOpen(true)} className="flex items-center gap-1 px-3 py-0.5 bg-[#8d6e63] text-[#e5c4a1] rounded shadow-md hover:bg-[#6d4c41] transition-colors font-bold text-xs">
                                         <LayoutGrid size={14} /> Mes Blocs
                                     </button>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-center gap-1 md:gap-2 w-full">
                                <button onClick={() => setLegendModalOpen(true)} className="px-2 h-7 bg-[#8d6e63] text-white rounded shadow hover:bg-[#6d4c41] transition-colors font-medium text-xs flex items-center gap-1 mr-1">
                                    <Info size={12} /> Légende
                                </button>

                                <div className="flex items-center gap-0 bg-[#e5c4a1] rounded border border-[#cbb094] shadow-sm h-7 overflow-hidden">
                                    <button onClick={rewindPlayback} className="h-full px-2 hover:bg-[#cbb094] text-[#5d4037] transition-colors flex items-center justify-center border-r border-[#cbb094]" title="Début"><SkipBack size={14} /></button>
                                    {playbackState === PlaybackState.PLAYING ? (
                                         <button onClick={pausePlayback} className="h-full px-2 hover:bg-[#cbb094] text-[#5d4037] transition-colors flex items-center justify-center border-r border-[#cbb094]"><Pause size={16} /></button>
                                    ) : (
                                         <button onClick={startPlayback} className="h-full px-2 hover:bg-[#cbb094] text-[#5d4037] transition-colors flex items-center justify-center border-r border-[#cbb094]"><Play size={16} /></button>
                                    )}
                                    
                                    <div className="flex items-center gap-1 px-2 h-full border-r border-[#cbb094]" data-tooltip="Vitesse">
                                        <Gauge size={12} className="text-[#8d6e63]" />
                                        <select value={playbackSpeed} onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))} className="bg-transparent font-bold text-[#5d4037] outline-none text-xs cursor-pointer h-full py-0">
                                            <option value={0.5} className="bg-[#e5c4a1]">x0.5</option>
                                            <option value={0.75} className="bg-[#e5c4a1]">x0.75</option>
                                            <option value={1} className="bg-[#e5c4a1]">x1.0</option>
                                            <option value={1.5} className="bg-[#e5c4a1]">x1.5</option>
                                        </select>
                                    </div>

                                     <div className="flex items-center gap-1 px-2 h-full border-r border-[#cbb094]">
                                         <Activity size={12} className="text-[#8d6e63]" />
                                         <span className="font-bold text-[#5d4037] text-xs w-8 text-center">{bpm}</span>
                                          <div className="flex flex-col justify-center">
                                              <button onClick={() => setBpm(Math.min(240, bpm + 5))} className="hover:text-[#800020] leading-none"><ChevronDown size={8} className="rotate-180"/></button>
                                              <button onClick={() => setBpm(Math.max(40, bpm - 5))} className="hover:text-[#800020] leading-none"><ChevronDown size={8}/></button>
                                          </div>
                                     </div>
                                     <button onClick={() => setIsMetronomeOn(!isMetronomeOn)} className={`h-full px-2 transition-colors flex items-center justify-center ${isMetronomeOn ? 'bg-[#8d6e63] text-white' : 'text-[#5d4037] hover:bg-[#cbb094]'}`}>
                                        <Timer size={14} className={isBeat ? 'animate-pulse' : ''} />
                                     </button>
                                </div>

                                <div className="flex items-center bg-[#8d6e63] rounded overflow-hidden shadow-sm text-xs font-medium border border-[#8d6e63] h-7 ml-1">
                                    <button onClick={() => setRhythmMode('binary')} className={`h-full px-2 transition-colors ${rhythmMode === 'binary' ? 'bg-[#8d6e63] text-[#e5c4a1]' : 'bg-[#e5c4a1] text-[#5d4037] hover:bg-[#dcc0a3]'}`}>4/4</button>
                                    <div className="w-[1px] h-full bg-[#e5c4a1]/30"></div>
                                    <button onClick={() => setRhythmMode('ternary')} className={`h-full px-2 transition-colors ${rhythmMode === 'ternary' ? 'bg-[#8d6e63] text-[#e5c4a1]' : 'bg-[#e5c4a1] text-[#5d4037] hover:bg-[#dcc0a3]'}`}>3/4</button>
                                </div>

                                <button 
                                    onClick={() => setFingeringMode(fingeringMode === 'auto' ? 'manual' : 'auto')}
                                    className={`flex items-center gap-1 px-2 h-7 rounded shadow border transition-colors font-medium text-xs ml-1 ${fingeringMode === 'auto' ? 'bg-[#8d6e63] text-[#e5c4a1] border-[#8d6e63] hover:bg-[#6d4c41]' : 'bg-[#e5c4a1] text-[#5d4037] border-[#cbb094] hover:bg-[#dcc0a3]'}`}
                                    data-tooltip={`Mode Auto :\n3 1ères cordes = Pouce\n3 dernières cordes = Index\n\nMode Manuel :\nClic Gauche = Pouce\nClic Droit = Index`}
                                >
                                    {fingeringMode === 'auto' ? <Wand2 size={12} /> : <Hand size={12} />}
                                    <span className="hidden md:inline">Mode Doigté</span>
                                </button>

                                <button 
                                    onClick={toggleVoiceInput}
                                    className={`flex items-center gap-1 px-2 h-7 rounded shadow border transition-colors font-medium text-xs ${isListening ? 'bg-red-600 text-white border-red-600' : 'bg-[#e5c4a1] text-[#5d4037] border-[#cbb094] hover:bg-[#cbb094]'}`}
                                    data-tooltip={`Cliquez sur une ligne de la grille\npuis dictez la note (ex: "1D", "2G")`}
                                >
                                    {isListening ? (
                                        <>
                                            <Square size={12} />
                                            <div className="flex items-center gap-[2px] h-3 px-1">
                                                <div className="w-[2px] bg-white h-2 animate-[pulse_0.6s_ease-in-out_infinite]"></div>
                                                <div className="w-[2px] bg-white h-3 animate-[pulse_0.4s_ease-in-out_infinite]"></div>
                                                <div className="w-[2px] bg-white h-1.5 animate-[pulse_0.7s_ease-in-out_infinite]"></div>
                                                <div className="w-[2px] bg-white h-3 animate-[pulse_0.5s_ease-in-out_infinite]"></div>
                                                <div className="w-[2px] bg-white h-2 animate-[pulse_0.6s_ease-in-out_infinite]"></div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <Mic size={12} />
                                            <span className="hidden md:inline">Saisie Vocale</span>
                                        </>
                                    )}
                                </button>
                                {isListening && <div className="hidden">Log: {voiceLog}</div>}

                                <button
                                    onClick={async () => {
                                        await audioEngine.init();
                                        if (audioEngine.ctx?.state === 'suspended') await audioEngine.ctx.resume();
                                        setIsMidiEnabled(!isMidiEnabled);
                                    }}
                                    className={`flex items-center gap-1 px-2 h-7 rounded shadow border transition-colors font-medium text-xs ${isMidiEnabled ? 'bg-[#8d6e63] text-[#e5c4a1] border-[#8d6e63]' : 'bg-[#e5c4a1] text-[#5d4037] border-[#cbb094] hover:bg-[#cbb094]'}`}
                                >
                                    <Piano size={12} />
                                    <span className="hidden md:inline">MIDI</span>
                                </button>
                            </div>
                       </div>
                       
                       <div className="flex-1 flex flex-col bg-transparent relative min-h-0">
                           <div className="flex-none bg-[#dcc0a3]/60 z-10 shadow-sm relative pt-1 px-0 pb-0 backdrop-blur-sm">
                                <StringPad 
                                    onInsert={(stringId, finger, advanceTicks) => handleNoteAdd(stringId, finger, undefined, advanceTicks)}
                                    tuning={currentTuning}
                                    fingeringMode={fingeringMode}
                                    activeStringId={activeVoiceStringId}
                                    playbackFeedback={playbackFeedback}
                                />
                           </div>

                           <div className="flex-1 relative min-h-0">
                                <Visualizer 
                                    ref={visualizerRef}
                                    data={activeData}
                                    currentTick={currentTick}
                                    tuning={currentTuning}
                                    rhythmMode={rhythmMode}
                                    playbackState={playbackState}
                                    isExporting={isExporting}
                                    onNoteClick={handleNoteClick}
                                    onNoteDrag={handleNoteDrag}
                                    onNoteHover={handleNoteHover}
                                    selectedNoteId={selectedNoteId}
                                    selectedNoteIds={selectedNoteIds}
                                    onBackgroundClick={handleBackgroundClick}
                                    onDeleteNote={handleDeleteNote}
                                    onSeek={handleSeekAndClear}
                                    onNoteContextMenu={handleNoteContextMenu}
                                    onMultiSelectionEnd={handleMultiSelectionFinished}
                                />
                           </div>
                       </div>
                  </div>
              )}

              {mainTab === 'media' && (
                  <div className="flex flex-col items-center justify-center h-full gap-8 animate-in fade-in duration-300 p-8 text-center">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                            {/* PDF CARD */}
                            <div className="bg-[#dcc0a3]/80 p-6 rounded-xl border border-[#cbb094] shadow-md flex flex-col items-center gap-4 hover:scale-105 transition-transform backdrop-blur-sm">
                                <div className="w-16 h-16 bg-[#e5c4a1] rounded-full flex items-center justify-center text-[#8d6e63] shadow-inner"><FileText size={32}/></div>
                                <h3 className="font-bold text-lg">Partition PDF</h3>
                                <p className="text-sm opacity-80">Format A4 imprimable avec diagrammes et annotations.</p>
                                <button onClick={handleDownloadPDF} className="mt-auto px-6 py-2 bg-[#8d6e63] text-white font-bold rounded shadow hover:bg-[#6d4c41] flex items-center gap-2"><Download size={16}/> Télécharger PDF</button>
                            </div>
                            
                            {/* AUDIO CARD */}
                            <div className="bg-[#dcc0a3]/80 p-6 rounded-xl border border-[#cbb094] shadow-md flex flex-col items-center gap-4 hover:scale-105 transition-transform backdrop-blur-sm">
                                <div className="w-16 h-16 bg-[#e5c4a1] rounded-full flex items-center justify-center text-[#8d6e63] shadow-inner"><Headphones size={32}/></div>
                                <h3 className="font-bold text-lg">Export Audio</h3>
                                <p className="text-sm opacity-80">Fichier MP3 haute qualité (320kbps).</p>
                                <button onClick={handleExportAudio} disabled={isExporting} className="mt-auto px-6 py-2 bg-[#8d6e63] text-white font-bold rounded shadow hover:bg-[#6d4c41] flex items-center gap-2 disabled:opacity-50">
                                    {isExporting ? <Loader2 size={16} className="animate-spin"/> : <Mic size={16}/>}
                                    <span>Télécharger MP3</span>
                                </button>
                            </div>

                            {/* VIDEO CARD */}
                            <div className="bg-[#dcc0a3]/80 p-6 rounded-xl border border-[#cbb094] shadow-md flex flex-col items-center gap-4 hover:scale-105 transition-transform backdrop-blur-sm">
                                <div className="w-16 h-16 bg-[#e5c4a1] rounded-full flex items-center justify-center text-[#8d6e63] shadow-inner"><Video size={32}/></div>
                                <h3 className="font-bold text-lg">Export Vidéo</h3>
                                <p className="text-sm opacity-80">Vidéo défilante (Format WebM).</p>
                                <div className="flex flex-col gap-2 w-full text-xs font-bold text-[#5d4037]">
                                    <div className="flex justify-center gap-2 bg-[#e5c4a1] p-1 rounded items-center">
                                         <span>Vitesse :</span>
                                         <select value={exportPlaybackSpeed} onChange={(e) => setExportPlaybackSpeed(parseFloat(e.target.value))} className="bg-transparent outline-none cursor-pointer">
                                             <option value={1} className="bg-[#e5c4a1]">1.0x</option>
                                             <option value={0.75} className="bg-[#e5c4a1]">0.75x</option>
                                             <option value={0.5} className="bg-[#e5c4a1]">0.5x</option>
                                         </select>
                                    </div>
                                    <p className="text-[10px] text-[#8d6e63] mt-1 italic leading-tight text-center font-normal">Si problème pour lire la vidéo, installer VLC</p>
                                </div>
                                <button onClick={handleExportVideo} disabled={isExporting || isRecording} className="mt-auto px-6 py-2 bg-[#8d6e63] text-white font-bold rounded shadow hover:bg-[#6d4c41] flex items-center gap-2 disabled:opacity-50">
                                    {isRecording ? <Loader2 size={16} className="animate-spin"/> : <Film size={16}/>}
                                    <span>{isRecording ? 'Enregistrement...' : 'Générer Vidéo'}</span>
                                </button>
                            </div>
                        </div>
                  </div>
              )}

          </div>

          {/* MOBILE BOTTOM NAVIGATION BAR */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#dcc0a3] border-t border-[#cbb094] flex justify-around p-2 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
               <button onClick={() => setMainTab('tuning')} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${mainTab === 'tuning' ? 'bg-[#8d6e63] text-white shadow-sm' : 'text-[#5d4037] hover:bg-[#cbb094]/50'}`}>
                   <Settings size={20} />
                   <span className="text-[10px] font-bold">Accordage</span>
               </button>
               <button onClick={() => setMainTab('editor')} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${mainTab === 'editor' ? 'bg-[#8d6e63] text-white shadow-sm' : 'text-[#5d4037] hover:bg-[#cbb094]/50'}`}>
                   <Edit3 size={20} />
                   <span className="text-[10px] font-bold">Éditeur</span>
               </button>
               <button onClick={() => setMainTab('media')} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${mainTab === 'media' ? 'bg-[#8d6e63] text-white shadow-sm' : 'text-[#5d4037] hover:bg-[#cbb094]/50'}`}>
                   <FileDown size={20} />
                   <span className="text-[10px] font-bold">Médias</span>
               </button>
          </div>

      </main>
    </div>
  );
}