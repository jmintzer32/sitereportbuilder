import React, { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { 
  Camera, Mic, Square, Send, Loader2, CheckCircle2, 
  AlertCircle, HardHat, FileText, Settings, Download, 
  Layout, ShieldAlert, ClipboardList, Eye, Trash2, Edit3, Plus, X, Share2, Mail,
  MoreVertical, Smartphone, Image
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { get, set, del } from 'idb-keyval';

interface Entry {
  id: string;
  images: string[];
  observation: string;
  actionResponsibility: string;
  transcription?: string;
  audioData?: string;
  audioMimeType?: string;
  pendingAI?: boolean;
}

interface ProjectInfo {
  name: string;
  date: string;
  author: string;
}

type TemplateType = 'QUICK' | 'ENCLOSURE_QC' | 'CLARK_QC' | 'WARRANTY';

interface TemplateConfig {
  id: TemplateType;
  name: string;
  icon: React.ReactNode;
  color: string;
  hexColor: string;
  headerLabel: string;
}

const TEMPLATES: TemplateConfig[] = [
  { 
    id: 'QUICK', 
    name: 'Quick Observations', 
    icon: <Eye className="w-4 h-4" />, 
    color: 'bg-clark-bright',
    hexColor: '#00A9E0',
    headerLabel: 'QUICK FIELD OBSERVATION'
  },
  { 
    id: 'ENCLOSURE_QC', 
    name: 'Clark Enclosure QC', 
    icon: <ShieldAlert className="w-4 h-4" />, 
    color: 'bg-clark-bright',
    hexColor: '#00A9E0',
    headerLabel: 'ENCLOSURE QC REPORT'
  },
  { 
    id: 'CLARK_QC', 
    name: 'Clark QC Report', 
    icon: <ClipboardList className="w-4 h-4" />, 
    color: 'bg-clark-bright',
    hexColor: '#00A9E0',
    headerLabel: 'QUALITY CONTROL REPORT'
  },
  { 
    id: 'WARRANTY', 
    name: 'Warranty Status', 
    icon: <HardHat className="w-4 h-4" />, 
    color: 'bg-clark-bright',
    hexColor: '#00A9E0',
    headerLabel: 'WARRANTY STATUS REPORT'
  },
];

const CLARK_LOGO_BASE64 = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 150'%3E%3Crect width='500' height='150' fill='%23001430'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='serif' font-weight='bold' font-size='80' fill='white'%3ECLARK%3C/text%3E%3Ctext x='50%25' y='85%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-weight='bold' font-size='20' fill='white' letter-spacing='10'%3ECONSTRUCTION%3C/text%3E%3C/svg%3E";

interface AnalysisResult {
  Transcription: string;
  Observation: string;
  Action_And_Responsibility: string;
}

// Sends the dictation (and photos for context) to our server, which calls Gemini.
async function analyzeEntry(images: string[], audio: string, audioMimeType: string | undefined, timeoutMs: number): Promise<AnalysisResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        images: images.map(img => img.split(',')[1]),
        audio,
        audioMimeType,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `AI request failed (${res.status})`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const ReportContent = ({ currentTemplate, projectInfo, entries }: { currentTemplate: TemplateConfig, projectInfo: ProjectInfo | null, entries: Entry[] }) => (
  <div style={{ 
    backgroundColor: '#ffffff', 
    width: '100%', 
    color: '#001430', 
    fontFamily: '"Inter", sans-serif', 
    margin: '0 auto', 
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '297mm',
    paddingBottom: '10mm'
  }}>
    {/* PDF Header */}
    <div 
      style={{ 
        backgroundColor: currentTemplate.hexColor, 
        color: '#ffffff', 
        padding: '24px 40px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '900', margin: 0, letterSpacing: '-0.02em', textTransform: 'uppercase', fontFamily: '"Inter", sans-serif' }}>{currentTemplate.headerLabel}</h2>
      </div>
      <div style={{ textAlign: 'right', fontFamily: '"Inter", sans-serif' }}>
        <p style={{ fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', margin: 0 }}>PROJECT: {projectInfo?.name}</p>
        <p style={{ fontSize: '9px', opacity: 0.8, textTransform: 'uppercase', margin: 0, fontWeight: '600' }}>AUTHOR: {projectInfo?.author} | DATE: {projectInfo?.date}</p>
      </div>
    </div>

    <div style={{ 
      padding: '40px', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '40px',
      flex: 1
    }}>
      {entries.map((entry, index) => (
        <div 
          key={entry.id} 
          data-pdf-break=""
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '20px', 
            paddingBottom: '40px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span 
              style={{ 
                color: '#001430', 
                fontSize: '12px', 
                fontWeight: '900', 
                padding: '0',
                fontFamily: '"Inter", sans-serif',
                letterSpacing: '0.05em'
              }}
            >
              ITEM {index + 1}
            </span>
          </div>
          
          <div style={{ display: 'flex', gap: '30px' }}>
            <div style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
              {entry.images.map((img, i) => (
                <div 
                  key={i} 
                  // The first photo stays with its "ITEM n" label; later photos may start a new page.
                  data-pdf-break={i > 0 ? '' : undefined}
                  data-pdf-keep=""
                  style={{ 
                    width: '100%',
                    aspectRatio: '4/3', 
                    borderRadius: '4px', 
                    overflow: 'hidden', 
                    border: '2px solid #0066B3',
                    breakInside: 'avoid'
                  }}
                >
                  <img src={img} alt="Site" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <h4 style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#000000', margin: 0, fontFamily: '"Inter", sans-serif' }}>Observation Summary</h4>
                <p style={{ fontSize: '15px', lineHeight: '1.6', fontWeight: '400', color: '#001430', margin: 0, fontFamily: '"Libre Baskerville", serif' }}>{entry.observation}</p>
                {entry.transcription && (
                  <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #00A9E0' }}>
                    <h4 style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#000000', margin: 0, fontFamily: '"Inter", sans-serif' }}>Voice Note Transcription</h4>
                    <p style={{ fontSize: '11px', fontStyle: 'italic', color: '#0066B3', margin: 0, fontFamily: '"Libre Baskerville", serif' }}>{entry.transcription}</p>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <h4 style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#000000', margin: 0, fontFamily: '"Inter", sans-serif' }}>Action & Responsibility</h4>
                  <p style={{ fontSize: '14px', fontWeight: '800', color: '#001430', margin: 0, fontFamily: '"Inter", sans-serif' }}>{entry.actionResponsibility}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* PDF Footer Sign-off */}
      <div data-pdf-break="" data-pdf-keep="" data-pdf-end="" style={{ 
        marginTop: 'auto', 
        paddingTop: '20px', 
        breakInside: 'avoid',
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr 1fr', 
        gap: '40px', 
        alignItems: 'flex-start', 
        borderTop: '1px solid #e5e5e5' 
      }}>
        <div style={{ textAlign: 'left' }}>
          <p style={{ fontSize: '14px', fontWeight: '800', color: '#003366', margin: 0, fontFamily: '"Inter", sans-serif' }}>Clark Construction Group, LLC</p>
          {currentTemplate.id === 'ENCLOSURE_QC' && (
            <p style={{ fontSize: '11px', fontWeight: '700', color: '#0066B3', margin: 0, marginTop: '2px', fontFamily: '"Inter", sans-serif' }}>Enclosure Group</p>
          )}
          {currentTemplate.id === 'CLARK_QC' && (
            <p style={{ fontSize: '11px', fontWeight: '700', color: '#0066B3', margin: 0, marginTop: '2px', fontFamily: '"Inter", sans-serif' }}>Quality Control Division</p>
          )}
        </div>
        <div style={{ textAlign: 'left' }}>
          <p style={{ fontSize: '11px', color: '#666666', margin: 0, lineHeight: '1.4', fontFamily: '"Inter", sans-serif' }}>
            7900 Westpark Drive<br />
            Suite T300<br />
            McLean, Virginia 22102
          </p>
        </div>
        <div style={{ textAlign: 'left' }}>
          <p style={{ fontSize: '11px', color: '#666666', margin: 0, lineHeight: '1.4', fontFamily: '"Inter", sans-serif' }}>
            Phone: (301) 272-8100<br />
            www.clarkconstruction.com
          </p>
        </div>
      </div>
    </div>
  </div>
);

function MainApp({ onReset }: { onReset: () => void }) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Temporary state for the setup form
  const [tempInfo, setTempInfo] = useState<ProjectInfo>({
    name: '',
    date: new Date().toISOString().split('T')[0],
    author: ''
  });

  useEffect(() => {
    async function loadData() {
      try {
        const savedEntries = await get('constructReport_entries');
        if (savedEntries) setEntries(savedEntries);

        const savedProjectInfo = await get('constructReport_projectInfo');
        if (savedProjectInfo) {
          setProjectInfo(savedProjectInfo);
          setTempInfo(savedProjectInfo);
          setIsSettingUp(false);
        }
      } catch (err) {
        console.error("Failed to load data from IndexedDB", err);
      } finally {
        setIsInitializing(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!isInitializing) {
      set('constructReport_entries', entries).catch(err => {
        console.error("Failed to save entries", err);
        setError("Could not save to device storage. Your device may be low on space.");
      });
    }
  }, [entries, isInitializing]);

  useEffect(() => {
    if (!isInitializing) {
      if (projectInfo) {
        set('constructReport_projectInfo', projectInfo).catch(err => console.error("Failed to save project info", err));
      } else {
        del('constructReport_projectInfo');
      }
    }
  }, [projectInfo, isInitializing]);

  const [currentImages, setCurrentImages] = useState<string[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [pendingShareFile, setPendingShareFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('QUICK');
  const [isExporting, setIsExporting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCapture, setShowCapture] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [showPostSharePrompt, setShowPostSharePrompt] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
      setShowMenu(false);
    }
  };

  // Form fields for manual entry/edit
  const [manualObservation, setManualObservation] = useState('');
  const [manualActionResponsibility, setManualActionResponsibility] = useState('');
  const [liveTranscription, setLiveTranscription] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const handleCapturePhoto = () => {
    fileInputRef.current?.click();
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = () => reject(new Error(`Could not read image ${file.name}`));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      try {
        const compressedImages = await Promise.all(
          Array.from(files).map((file: File) => compressImage(file))
        );
        setCurrentImages(prev => [...prev, ...compressedImages]);
      } catch (err) {
        console.error(err);
        setError("One of the photos could not be loaded. Try a different photo.");
      }
    }
    // Reset so picking the same photo again still fires onChange
    e.target.value = '';
  };

  const removeCurrentImage = (index: number) => {
    setCurrentImages(prev => prev.filter((_, i) => i !== index));
  };

  const playAudioFeedback = (type: 'start' | 'stop') => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'start') {
        // A pleasant ascending double beep
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      } else {
        // A pleasant descending double beep
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch (e) {
      console.error("Audio feedback failed", e);
    }
  };

  const startRecording = async () => {
    try {
      playAudioFeedback('start');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      setAudioBlob(null);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        setAudioBlob(blob);
      };
      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
      setLiveTranscription('');

      // Start Web Speech API as fallback
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setLiveTranscription(prev => prev + ' ' + finalTranscript);
          }
        };
        recognition.start();
        recognitionRef.current = recognition;
      }
    } catch (err) {
      console.error(err);
      setError("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      playAudioFeedback('stop');
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
  };

  const isLowConnection = () => {
    if (!navigator.onLine) return true;
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn && conn.effectiveType) {
      // Treat 2G and 3G as low service areas
      if (['slow-2g', '2g', '3g'].includes(conn.effectiveType)) {
        return true;
      }
    }
    return false;
  };

  const handleAddOrUpdateEntry = async () => {
    if (isRecording) stopRecording();
    if (currentImages.length === 0) {
      setError("Please capture at least one photo.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // When editing, keep the existing AI/audio data unless a new dictation was recorded.
      const existing = editingId ? entries.find(e => e.id === editingId) : undefined;
      let observation = manualObservation;
      let actionResponsibility = manualActionResponsibility;
      let transcription = existing?.transcription || "";
      let pendingAI = existing?.pendingAI || false;
      let audioBase64Data = existing?.audioData || "";
      let audioMimeType = existing?.audioMimeType;

      // If we have audio, try to use Gemini to transcribe and analyze
      if (audioBlob) {
        audioMimeType = audioBlob.type || 'audio/webm';
        audioBase64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(audioBlob);
        });

        if (isLowConnection()) {
          // Offline or Low Service mode
          observation = liveTranscription.trim() || manualObservation || "Pending network connection... Summary will be generated later.";
          actionResponsibility = manualActionResponsibility || "Pending...";
          transcription = liveTranscription.trim() || "Audio saved. Transcription pending network connection.";
          pendingAI = true;
        } else {
          try {
            const data = await analyzeEntry(currentImages, audioBase64Data, audioMimeType, 30000);
            observation = data.Observation;
            actionResponsibility = data.Action_And_Responsibility;
            transcription = data.Transcription;
            pendingAI = false;
          } catch (apiErr) {
            console.error("API Error during entry creation:", apiErr);
            // Fallback to pending if API fails (e.g., flaky connection)
            observation = liveTranscription.trim() || manualObservation || "API Error. Summary will be generated later.";
            actionResponsibility = manualActionResponsibility || "Pending...";
            transcription = liveTranscription.trim() || "Audio saved. Transcription pending retry.";
            pendingAI = true;
          }
        }
      }

      const newEntry: Entry = {
        id: editingId || Date.now().toString(),
        images: currentImages,
        observation: observation || manualObservation,
        actionResponsibility: actionResponsibility || manualActionResponsibility,
        transcription: transcription,
        audioData: audioBase64Data || undefined,
        audioMimeType: audioBase64Data ? audioMimeType : undefined,
        pendingAI: pendingAI
      };

      if (editingId) {
        setEntries(prev => prev.map(e => e.id === editingId ? newEntry : e));
      } else {
        setEntries(prev => [...prev, newEntry]);
      }

      resetCapture();
      setShowCapture(false);
    } catch (err) {
      console.error(err);
      setError("Failed to process entry.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetCapture = () => {
    if (isRecording) stopRecording();
    setCurrentImages([]);
    setAudioBlob(null);
    setLiveTranscription('');
    setManualObservation('');
    setManualActionResponsibility('');
    setEditingId(null);
    setError(null);
  };

  const closeCapture = () => {
    resetCapture();
    setShowCapture(false);
  };

  const handleEdit = (entry: Entry) => {
    resetCapture();
    setEditingId(entry.id);
    setCurrentImages(entry.images);
    setManualObservation(entry.observation);
    setManualActionResponsibility(entry.actionResponsibility);
    setShowCapture(true);
  };

  const handleDelete = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    if (editingId === id) closeCapture();
    setItemToDelete(null);
  };

  const processPendingEntries = async (): Promise<boolean> => {
    const pendingEntries = entries.filter(e => e.pendingAI && e.audioData);
    if (pendingEntries.length === 0) return true;

    if (isLowConnection()) {
      // If offline or low service, just return true to allow PDF generation with placeholders
      return true;
    }

    setIsExporting(true);
    const updates = new Map<string, Partial<Entry>>();
    let failed = 0;

    for (const entry of pendingEntries) {
      try {
        const data = await analyzeEntry(entry.images, entry.audioData!, entry.audioMimeType, 45000);
        updates.set(entry.id, {
          observation: data.Observation,
          actionResponsibility: data.Action_And_Responsibility,
          transcription: data.Transcription,
          pendingAI: false
        });
      } catch (err) {
        console.error("Failed to process pending entry:", err);
        failed++;
      }
    }

    if (updates.size > 0) {
      // flushSync so the hidden report is re-rendered before the PDF is captured
      flushSync(() => {
        setEntries(prev => prev.map(e => updates.has(e.id) ? { ...e, ...updates.get(e.id) } : e));
      });
    }
    setIsExporting(false);

    if (failed > 0) {
      alert("Some AI summaries could not be generated right now. The report will use the saved text for those items.");
    }
    return true;
  };

  const generatePDF = async () => {
    const root = reportRef.current;
    if (!root) return null;

    // Make sure photos and fonts are ready before measuring/capturing
    await document.fonts?.ready;
    await Promise.all(Array.from<HTMLImageElement>(root.querySelectorAll<HTMLImageElement>('img')).map(img =>
      img.complete ? Promise.resolve() : new Promise(res => { img.onload = img.onerror = () => res(null); })
    ));

    const PAGE_WIDTH_MM = 210;
    const PAGE_HEIGHT_MM = 297;
    const PAGE_WIDTH_PX = 794;
    const PX_PER_MM = PAGE_WIDTH_PX / PAGE_WIDTH_MM;
    const PAGE_HEIGHT_PX = PAGE_HEIGHT_MM * PX_PER_MM;
    const MARGIN_MM = 12;
    const MARGIN_PX = MARGIN_MM * PX_PER_MM;

    // Measure the report (rendered off-screen at A4 width) to find where pages can break
    // without cutting through a photo or a block of text.
    const rootTop = root.getBoundingClientRect().top;
    const measure = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { top: r.top - rootTop, bottom: r.bottom - rootTop };
    };
    const keepTogether = Array.from<HTMLElement>(root.querySelectorAll<HTMLElement>('[data-pdf-keep], h2, h4, p')).map(measure);
    const isCleanBreak = (y: number) => keepTogether.every(k => !(k.top < y - 0.5 && y + 0.5 < k.bottom));
    const breakPoints = Array.from<HTMLElement>(root.querySelectorAll<HTMLElement>('[data-pdf-break]'))
      .map(el => measure(el).top)
      .filter(isCleanBreak)
      .sort((a, b) => a - b);
    const endEl = root.querySelector('[data-pdf-end]');
    const contentEnd = endEl ? measure(endEl).bottom : root.scrollHeight;

    const slices: { start: number; end: number }[] = [];
    let start = 0;
    while (start < contentEnd - 1) {
      // First page starts at the very top (header is full-bleed); later pages get a top margin.
      const capacity = slices.length === 0 ? PAGE_HEIGHT_PX - MARGIN_PX : PAGE_HEIGHT_PX - 2 * MARGIN_PX;
      const limit = start + capacity;
      if (contentEnd <= limit) {
        slices.push({ start, end: contentEnd });
        break;
      }
      const candidates = breakPoints.filter(b => b > start + 1 && b <= limit);
      // If a single block is taller than a page, there is no clean break; cut at the page limit.
      const end = candidates.length > 0 ? candidates[candidates.length - 1] : limit;
      slices.push({ start, end });
      start = end;
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.setFontSize(8);
    pdf.setTextColor(150);

    for (let i = 0; i < slices.length; i++) {
      const { start: sliceStart, end: sliceEnd } = slices[i];
      const sliceHeight = Math.ceil(sliceEnd - sliceStart);

      // Capture one page at a time; this keeps each canvas small enough for mobile Safari.
      const canvas = await html2canvas(root, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: PAGE_WIDTH_PX,
        width: PAGE_WIDTH_PX,
        height: sliceHeight,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById('report-capture-root');
          if (!el) return;
          el.style.visibility = 'visible';
          el.style.position = 'absolute';
          el.style.top = '0';
          el.style.left = '0';
          el.style.opacity = '1';
          el.style.width = `${PAGE_WIDTH_PX}px`;
          el.style.height = `${sliceHeight}px`;
          el.style.overflow = 'hidden';
          const content = el.firstElementChild as HTMLElement | null;
          if (content) {
            content.style.width = `${PAGE_WIDTH_PX}px`;
            content.style.marginTop = `-${sliceStart}px`;
          }
        }
      });

      if (i > 0) pdf.addPage();
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const y = i === 0 ? 0 : MARGIN_MM;
      pdf.addImage(imgData, 'JPEG', 0, y, PAGE_WIDTH_MM, sliceHeight / PX_PER_MM);
      pdf.text(`Page ${i + 1} of ${slices.length}`, PAGE_WIDTH_MM - 12, PAGE_HEIGHT_MM - 6, { align: 'right' });
    }
    return pdf;
  };

  const reportFileName = () => {
    const safeName = (projectInfo?.name || 'Site').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'Site';
    return `Report_${safeName}.pdf`;
  };

  const shareFile = async (file: File) => {
    await navigator.share({
      files: [file],
      title: 'Site Visit Report',
      text: `Attached is the site visit report for ${projectInfo?.name}.`
    });
    setPendingShareFile(null);
    setShowPostSharePrompt(true);
    setShowPreview(false);
  };

  const handleShare = async () => {
    const processed = await processPendingEntries();
    if (!processed) return;

    setIsExporting(true);
    try {
      const pdf = await generatePDF();
      if (!pdf) return;

      const pdfBlob = pdf.output('blob');
      const file = new File([pdfBlob], reportFileName(), { type: 'application/pdf' });

      // Try Web Share API first
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        try {
          await shareFile(file);
          return;
        } catch (shareErr: any) {
          if (shareErr?.name === 'AbortError') return; // user closed the share sheet
          if (shareErr?.name === 'NotAllowedError') {
            // Building the PDF took too long and the browser no longer treats this as a tap.
            // Ask for one more tap to open the share sheet.
            setPendingShareFile(file);
            return;
          }
          console.warn("Share failed, falling back to print:", shareErr);
          // Fall through to print
        }
      }

      // Fallback to Print
      window.print();
      setShowPostSharePrompt(true);
      setShowPreview(false);
    } catch (err) {
      console.error("Share error:", err);
      alert("Failed to generate report for sharing.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = async () => {
    const processed = await processPendingEntries();
    if (!processed) return;

    setIsExporting(true);
    try {
      const pdf = await generatePDF();
      if (!pdf) return;

      pdf.save(reportFileName());
      
      setTimeout(() => {
        setShowPostSharePrompt(true);
        setShowPreview(false);
      }, 500);
    } catch (err) {
      console.error("Download error:", err);
      alert("Download failed. Please use the 'Share / Print' button instead.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveProjectInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempInfo.name && tempInfo.author) {
      setProjectInfo(tempInfo);
      setIsSettingUp(false);
    }
  };

  const handleEditProjectInfo = () => {
    if (projectInfo) {
      setTempInfo(projectInfo);
      setIsSettingUp(true);
    }
  };

  const handleStartNewReport = async () => {
    if (confirm("Are you sure? This will clear all current observations.")) {
      // Clear IndexedDB explicitly
      await del('constructReport_entries');
      await del('constructReport_projectInfo');
      
      // Reset the application state completely by remounting
      onReset();
    }
  };

  const currentTemplate = TEMPLATES.find(t => t.id === selectedTemplate)!;

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-clark-navy flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (isSettingUp) {
    return (
      <div className="min-h-screen bg-clark-navy flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="bg-clark-bright p-8 text-white">
            <HardHat className="w-12 h-12 mb-4" />
            <h2 className="text-3xl font-black tracking-tighter">REPORT SETUP</h2>
            <p className="text-white/80 font-medium">Enter project details to begin.</p>
          </div>
          <form onSubmit={handleSaveProjectInfo} className="p-8 space-y-6">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Project Name</label>
              <input 
                required
                value={tempInfo.name}
                onChange={(e) => setTempInfo({...tempInfo, name: e.target.value})}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-clark-bright outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Date</label>
                <input 
                  type="date"
                  required
                  value={tempInfo.date}
                  onChange={(e) => setTempInfo({...tempInfo, date: e.target.value})}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-clark-bright outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Author</label>
                <input 
                  required
                  value={tempInfo.author}
                  onChange={(e) => setTempInfo({...tempInfo, author: e.target.value})}
                  placeholder="Your Name"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-clark-bright outline-none"
                />
              </div>
            </div>
            <button 
              type="submit"
              className="w-full bg-clark-navy text-white py-4 rounded-2xl font-bold shadow-xl active:scale-95 transition-transform"
            >
              {projectInfo ? 'Update Info' : 'Start Report'}
            </button>
            {projectInfo && (
              <button 
                type="button"
                onClick={() => setIsSettingUp(false)}
                className="w-full text-stone-400 text-sm font-bold"
              >
                Cancel
              </button>
            )}
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-stone-100 text-stone-900 font-sans pb-24 no-print">
        <header className="bg-clark-navy text-white p-5 shadow-lg flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <h1 className="text-sm sm:text-lg font-black tracking-tight uppercase">Site visit Report Builder</h1>
        </div>
        <div className="flex gap-2 relative">
          {entries.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all active:scale-90"
              >
                <MoreVertical className="w-6 h-6" />
              </button>

              <AnimatePresence>
                {showMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-[60]" 
                      onClick={() => setShowMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden z-[70] text-stone-900"
                    >
                      <div className="p-2 space-y-1">
                        <button
                          onClick={async () => { 
                            setShowMenu(false);
                            const processed = await processPendingEntries();
                            if (processed) setShowPreview(true);
                          }}
                          disabled={isExporting}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-stone-50 rounded-xl transition-colors disabled:opacity-50"
                        >
                          {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4 text-clark-navy" />}
                          Preview Report
                        </button>
                        <button
                          onClick={() => { handleDownload(); setShowMenu(false); }}
                          disabled={isExporting}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-stone-50 rounded-xl transition-colors disabled:opacity-50"
                        >
                          {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-clark-navy" />}
                          Download PDF
                        </button>
                        <button
                          onClick={() => { handleShare(); setShowMenu(false); }}
                          disabled={isExporting}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-stone-50 rounded-xl transition-colors"
                        >
                          <Share2 className="w-4 h-4 text-clark-bright" />
                          Share / Print
                        </button>
                        
                        <div className="h-px bg-stone-100 my-1" />
                        
                        {deferredPrompt && (
                          <button
                            onClick={handleInstall}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-stone-50 rounded-xl transition-colors text-clark-bright"
                          >
                            <Smartphone className="w-4 h-4" />
                            Add to Home Screen
                          </button>
                        )}

                        <button
                          onClick={handleStartNewReport}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-red-50 text-red-600 rounded-xl transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Start New Report
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Project Header Display */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 flex justify-between items-start">
          <div className="space-y-1">
            <h2 className="text-xl font-black tracking-tight text-clark-navy uppercase">{projectInfo?.name}</h2>
            <div className="flex gap-3 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
              <span>{projectInfo?.date}</span>
              <span>•</span>
              <span>BY: {projectInfo?.author}</span>
            </div>
          </div>
          <button 
            onClick={handleEditProjectInfo}
            className="p-2 bg-stone-50 rounded-lg text-stone-400 hover:text-clark-bright transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        </section>

        {/* Template Selector */}
        <section className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200">
          <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400 mb-3 block">Report Template</label>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTemplate(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap border ${
                  selectedTemplate === t.id 
                    ? `${t.color} text-white border-transparent shadow-md` 
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:border-stone-300'
                }`}
              >
                {t.icon}
                {t.name}
              </button>
            ))}
          </div>
        </section>

        {/* Entries List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-stone-500">Observations ({entries.length})</h2>
            {!showCapture && (
              <button 
                onClick={() => { resetCapture(); setShowCapture(true); }}
                className="flex items-center gap-1 text-clark-medium text-xs font-bold hover:text-clark-navy"
              >
                <Plus className="w-4 h-4" /> ADD ENTRY
              </button>
            )}
          </div>

          <div className="space-y-4">
            {entries.length === 0 && !showCapture && (
              <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-stone-200">
                <FileText className="w-12 h-12 text-stone-200 mx-auto mb-4" />
                <p className="text-stone-400 text-sm font-medium">No observations yet.</p>
                <button 
                  onClick={() => { resetCapture(); setShowCapture(true); }}
                  className="mt-4 text-clark-medium font-bold text-sm"
                >
                  Start First Entry
                </button>
              </div>
            )}
            {entries.map((entry) => (
              <motion.div 
                layout
                key={entry.id} 
                onClick={() => handleEdit(entry)}
                className="flex gap-4 relative group cursor-pointer border-b border-stone-200 pb-6 last:border-0"
              >
                <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-stone-100 relative shadow-sm">
                  <img src={entry.images[0]} alt="Site" className="w-full h-full object-cover" />
                  {entry.images.length > 1 && (
                    <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md">
                      +{entry.images.length - 1}
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-1 pr-8">
                  <p className="text-sm font-bold text-clark-navy line-clamp-2">
                    {entry.pendingAI && <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full mr-2 uppercase tracking-tight"><AlertCircle className="w-3 h-3" /> Pending AI</span>}
                    {entry.observation}
                  </p>
                  <p className="text-[10px] text-stone-400 uppercase font-bold tracking-tight">{entry.actionResponsibility}</p>
                  {entry.transcription && entry.pendingAI && (
                    <div className="mt-2 p-2 bg-stone-50 rounded text-[10px] text-stone-500 italic border-l-2 border-clark-bright">
                      "{entry.transcription}"
                    </div>
                  )}
                </div>
                <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setItemToDelete(entry.id); }} 
                    className="p-1.5 bg-stone-100 rounded-lg text-stone-600 hover:bg-red-100 hover:text-red-700 shadow-sm border border-stone-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Capture Form / Modal */}
        <AnimatePresence>
          {showCapture && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden"
            >
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">{editingId ? 'Edit Entry' : 'New Entry'}</h3>
                  <button onClick={closeCapture} className="text-stone-400 hover:text-stone-600">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Capture Controls */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleCapturePhoto}
                      className="aspect-square rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 flex flex-col items-center justify-center gap-2 transition-all hover:border-clark-bright hover:bg-clark-bright/5"
                    >
                      <Camera className="w-6 h-6 text-stone-400" />
                      <span className="text-[10px] font-bold uppercase text-stone-500 text-center leading-tight">Camera / Gallery</span>
                    </button>
                    <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={onFileChange} className="hidden" />

                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                        isRecording 
                          ? 'border-red-500 bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse' 
                          : audioBlob 
                            ? 'border-clark-bright bg-clark-bright/5 border-dashed' 
                            : 'border-stone-300 bg-stone-50 border-dashed hover:border-clark-bright hover:bg-clark-bright/5'
                      }`}
                    >
                      {isRecording ? (
                        <Square className="w-8 h-8 text-white fill-white" />
                      ) : (
                        <Mic className={`w-6 h-6 ${audioBlob ? 'text-clark-bright' : 'text-stone-400'}`} />
                      )}
                      <span className={`text-[10px] font-bold uppercase text-center leading-tight px-1 ${isRecording ? 'text-white' : 'text-stone-500'}`}>
                        {isRecording ? 'Tap to Stop' : audioBlob ? 'Audio Ready' : 'Dictate to AI'}
                      </span>
                    </button>
                  </div>

                  {/* Live Transcription Preview */}
                  {(isRecording || liveTranscription) && (
                    <div className="bg-stone-900 text-stone-100 p-4 rounded-xl text-sm italic relative overflow-hidden">
                      {isRecording && (
                        <div className="absolute top-0 left-0 w-full h-1 bg-red-500/20">
                          <div className="h-full bg-red-500 animate-[pulse_1s_ease-in-out_infinite]" style={{ width: '100%' }}></div>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        {isRecording && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>}
                        <span className="text-[10px] uppercase tracking-widest font-bold text-stone-400">
                          {isRecording ? 'Listening...' : 'Recorded Audio'}
                        </span>
                      </div>
                      <p className="opacity-90">{liveTranscription || "Listening for speech..."}</p>
                    </div>
                  )}

                  {/* Photo Preview Strip */}
                  {currentImages.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {currentImages.map((img, idx) => (
                        <div key={idx} className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 relative group">
                          <img src={img} alt="Preview" className="w-full h-full object-cover" />
                          <button 
                            onClick={() => removeCurrentImage(idx)}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Manual Fields */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Observation</label>
                    <textarea 
                      value={manualObservation}
                      onChange={(e) => setManualObservation(e.target.value)}
                      placeholder="Describe what you see..."
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-clark-bright outline-none min-h-[80px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Action & Responsibility</label>
                    <input 
                      value={manualActionResponsibility}
                      onChange={(e) => setManualActionResponsibility(e.target.value)}
                      placeholder="Required fix and responsible trade..."
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-clark-bright outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleAddOrUpdateEntry}
                  disabled={isLoading || currentImages.length === 0}
                  className="w-full bg-clark-navy text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 disabled:opacity-30 shadow-lg active:scale-[0.98] transition-transform"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  <span>{isLoading ? 'Processing...' : editingId ? 'Update Entry' : 'Add to Report'}</span>
                </button>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4" /> {error}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Preview Modal */}
        <AnimatePresence>
          {showPreview && (
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 no-print">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white w-full max-w-4xl h-[90vh] rounded-3xl overflow-hidden flex flex-col"
              >
                <div className="p-4 border-b flex justify-between items-center bg-clark-navy text-white">
                  <h3 className="font-bold uppercase tracking-tight">Report Preview</h3>
                  <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-white/10 rounded-full">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-8 bg-stone-100">
                  <div className="mx-auto shadow-2xl bg-white" style={{ width: '210mm' }}>
                    <ReportContent 
                      currentTemplate={currentTemplate}
                      projectInfo={projectInfo}
                      entries={entries}
                    />
                  </div>
                </div>
                <div className="p-4 border-t flex gap-4 bg-white">
                  <button 
                    onClick={handleDownload}
                    disabled={isExporting}
                    className="flex-1 bg-clark-navy text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Download PDF
                  </button>
                  <button 
                    onClick={handleShare}
                    disabled={isExporting}
                    className="flex-1 bg-clark-bright text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Share2 className="w-4 h-4" />
                    Share / Print
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Action Button for Mobile */}
      {!showCapture && (
        <button 
          onClick={() => { resetCapture(); setShowCapture(true); }}
          className="fixed bottom-8 right-8 w-16 h-16 bg-clark-bright text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-50"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}
      </div>

      {/* Hidden Report for PDF Generation & Printing */}
      <div 
        id="report-capture-root"
        className="fixed top-0 left-0 bg-white"
        style={{ width: '794px', zIndex: -100, visibility: 'hidden', pointerEvents: 'none' }}
        ref={reportRef}
      >
        <ReportContent 
          currentTemplate={currentTemplate}
          projectInfo={projectInfo}
          entries={entries}
        />
      </div>

      {/* Post-Share Prompt Modal */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 no-print">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-sm rounded-3xl overflow-hidden flex flex-col p-6 text-center space-y-6"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-clark-navy mb-2">Delete Item?</h3>
                <p className="text-sm text-stone-500 font-medium">Are you sure you want to delete this item? This action cannot be undone.</p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleDelete(itemToDelete)}
                  className="w-full bg-red-600 text-white py-3 rounded-xl font-bold active:scale-95 transition-all"
                >
                  Yes, Delete
                </button>
                <button 
                  onClick={() => setItemToDelete(null)}
                  className="w-full bg-stone-100 text-stone-700 py-3 rounded-xl font-bold active:scale-95 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {pendingShareFile && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 no-print">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-sm rounded-3xl overflow-hidden flex flex-col p-6 text-center space-y-6"
            >
              <div className="w-16 h-16 bg-clark-bright/10 text-clark-bright rounded-full flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-clark-navy mb-2">Report Ready</h3>
                <p className="text-sm text-stone-500 font-medium">Tap Share to send your PDF.</p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => shareFile(pendingShareFile).catch(err => {
                    if (err?.name !== 'AbortError') console.error("Share error:", err);
                  })}
                  className="w-full bg-clark-bright text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
                <button 
                  onClick={() => setPendingShareFile(null)}
                  className="w-full bg-stone-100 text-stone-700 py-3 rounded-xl font-bold active:scale-95 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showPostSharePrompt && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 no-print">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-sm rounded-3xl overflow-hidden flex flex-col p-6 text-center space-y-6"
            >
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-clark-navy mb-2">Report Shared!</h3>
                <p className="text-sm text-stone-500 font-medium">What would you like to do next?</p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => setShowPostSharePrompt(false)}
                  className="w-full bg-clark-navy text-white py-3 rounded-xl font-bold active:scale-95 transition-all"
                >
                  Continue Editing
                </button>
                <button 
                  onClick={handleStartNewReport}
                  className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold active:scale-95 transition-all"
                >
                  Start New Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Loading Overlay */}
      <AnimatePresence>
        {isExporting && (
          <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-white no-print">
            <Loader2 className="w-12 h-12 animate-spin mb-4" />
            <h2 className="text-xl font-bold">Processing...</h2>
            <p className="text-sm opacity-80 mt-2 text-center max-w-xs">
              Generating AI summaries and preparing your report. This may take a moment.
            </p>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function App() {
  const [key, setKey] = useState(0);
  
  const handleReset = () => {
    setKey(prev => prev + 1);
  };
  
  return (
    <div key={key}>
      <MainApp onReset={handleReset} />
    </div>
  );
}
