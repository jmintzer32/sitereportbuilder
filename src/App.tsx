import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Camera, Mic, Square, Send, Loader2, CheckCircle2, 
  AlertCircle, HardHat, FileText, Settings, Download, 
  Layout, ShieldAlert, ClipboardList, Eye, Trash2, Edit3, Plus, X, Share2, Mail,
  MoreVertical, Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Entry {
  id: string;
  images: string[];
  observation: string;
  proposedAction: string;
  tradeResponsible: string;
  transcription?: string;
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
                  style={{ 
                    width: '100%',
                    aspectRatio: '4/3', 
                    borderRadius: '4px', 
                    overflow: 'hidden', 
                    border: '2px solid #0066B3' 
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
                  <h4 style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#000000', margin: 0, fontFamily: '"Inter", sans-serif' }}>Proposed Action</h4>
                  <p style={{ fontSize: '14px', fontWeight: '800', color: '#001430', margin: 0, fontFamily: '"Inter", sans-serif' }}>{entry.proposedAction}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <h4 style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#000000', margin: 0, fontFamily: '"Inter", sans-serif' }}>Responsible Trade</h4>
                  <p style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', color: '#001430', margin: 0, fontFamily: '"Inter", sans-serif' }}>{entry.tradeResponsible}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* PDF Footer Sign-off */}
      <div style={{ 
        marginTop: 'auto', 
        paddingTop: '20px', 
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
  const [entries, setEntries] = useState<Entry[]>(() => {
    const saved = localStorage.getItem('constructReport_entries');
    return saved ? JSON.parse(saved) : [];
  });
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(() => {
    const saved = localStorage.getItem('constructReport_projectInfo');
    return saved ? JSON.parse(saved) : null;
  });
  const [isSettingUp, setIsSettingUp] = useState(() => {
    const saved = localStorage.getItem('constructReport_projectInfo');
    return saved ? false : true;
  });
  
  // Temporary state for the setup form
  const [tempInfo, setTempInfo] = useState<ProjectInfo>({
    name: projectInfo?.name || '',
    date: projectInfo?.date || new Date().toISOString().split('T')[0],
    author: projectInfo?.author || ''
  });

  useEffect(() => {
    localStorage.setItem('constructReport_entries', JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    if (projectInfo) {
      localStorage.setItem('constructReport_projectInfo', JSON.stringify(projectInfo));
    } else {
      localStorage.removeItem('constructReport_projectInfo');
    }
  }, [projectInfo]);

  const [currentImages, setCurrentImages] = useState<string[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('QUICK');
  const [isExporting, setIsExporting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCapture, setShowCapture] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [showPostSharePrompt, setShowPostSharePrompt] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
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
  const [manualAction, setManualAction] = useState('');
  const [manualTrade, setManualTrade] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  const handleCapturePhoto = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setCurrentImages(prev => [...prev, reader.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeCurrentImage = (index: number) => {
    setCurrentImages(prev => prev.filter((_, i) => i !== index));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
      };
      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleAddOrUpdateEntry = async () => {
    if (currentImages.length === 0 && !editingId) {
      setError("Please capture at least one photo.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let observation = manualObservation;
      let action = manualAction;
      let trade = manualTrade;
      let transcription = "";

      // If we have audio, use Gemini to transcribe and analyze
      if (audioBlob) {
        const audioBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(audioBlob);
        });

        const imageParts = currentImages.map(img => ({
          inlineData: { mimeType: "image/jpeg", data: img.split(',')[1] }
        }));

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: {
            parts: [
              ...imageParts,
              { inlineData: { mimeType: "audio/webm", data: audioBase64 } },
              { text: "Analyze these site photos (if provided) and the accompanying audio dictation. Output a JSON object with four keys: Transcription (the exact text of what was said), Observation (a professional summary), Proposed_Action, and Trade_Responsible." },
            ],
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                Transcription: { type: Type.STRING },
                Observation: { type: Type.STRING },
                Proposed_Action: { type: Type.STRING },
                Trade_Responsible: { type: Type.STRING },
              },
              required: ["Transcription", "Observation", "Proposed_Action", "Trade_Responsible"],
            },
          },
        });

        if (response.text) {
          const data = JSON.parse(response.text);
          observation = data.Observation;
          action = data.Proposed_Action;
          trade = data.Trade_Responsible;
          transcription = data.Transcription;
        }
      }

      const newEntry: Entry = {
        id: editingId || Date.now().toString(),
        images: currentImages,
        observation: observation || manualObservation,
        proposedAction: action || manualAction,
        tradeResponsible: trade || manualTrade,
        transcription: transcription
      };

      if (editingId) {
        setEntries(entries.map(e => e.id === editingId ? newEntry : e));
      } else {
        setEntries([...entries, newEntry]);
      }

      resetCapture();
      setShowCapture(false);
    } catch (err) {
      setError("Failed to process entry.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetCapture = () => {
    setCurrentImages([]);
    setAudioBlob(null);
    setManualObservation('');
    setManualAction('');
    setManualTrade('');
    setEditingId(null);
    setError(null);
  };

  const handleEdit = (entry: Entry) => {
    setEditingId(entry.id);
    setCurrentImages(entry.images);
    setManualObservation(entry.observation);
    setManualAction(entry.proposedAction);
    setManualTrade(entry.tradeResponsible);
    setShowCapture(true);
  };

  const handleDelete = (id: string) => {
    setEntries(entries.filter(e => e.id !== id));
  };

  const generatePDF = async () => {
    if (!reportRef.current) return null;
    
    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: 794,
      width: 794,
      onclone: (clonedDoc) => {
        const el = clonedDoc.getElementById('report-capture-root');
        if (el) {
          el.style.visibility = 'visible';
          el.style.position = 'relative';
          el.style.left = '0';
          el.style.opacity = '1';
          el.style.width = '794px';
        }
        const content = el?.firstElementChild as HTMLElement;
        if (content) {
          content.style.width = '794px';
        }
      }
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(`Page 1`, imgWidth - 20, pageHeight - 10);
    
    heightLeft -= pageHeight;
    let pageCount = 1;
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pageCount++;
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      pdf.text(`Page ${pageCount}`, imgWidth - 20, pageHeight - 10);
      heightLeft -= pageHeight;
    }
    return pdf;
  };

  const handleShare = async () => {
    setIsExporting(true);
    try {
      const pdf = await generatePDF();
      if (!pdf) return;

      const pdfBlob = pdf.output('blob');
      const fileName = `Report_${projectInfo?.name || 'Site'}.pdf`;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      // Try Web Share API first
      if (navigator.share) {
        try {
          const shareData = {
            files: [file],
            title: 'Site Visit Report',
            text: `Attached is the site visit report for ${projectInfo?.name}.`
          };
          
          // Attempt to share
          await navigator.share(shareData);
          
          setShowPostSharePrompt(true);
          setShowPreview(false);
          return;
        } catch (shareErr) {
          console.warn("Share failed, falling back to print:", shareErr);
          // Fall through to print
        }
      }

      // Fallback to Print
      window.print();
      
      const handleReturn = () => {
        setShowPostSharePrompt(true);
        setShowPreview(false);
        window.removeEventListener('focus', handleReturn);
      };
      
      window.addEventListener('focus', handleReturn);
      setTimeout(() => {
        setShowPostSharePrompt(true);
        setShowPreview(false);
      }, 1500);
    } catch (err) {
      console.error("Share error:", err);
      alert("Failed to generate report for sharing.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const pdf = await generatePDF();
      if (!pdf) return;

      pdf.save(`Report_${projectInfo?.name || 'Site'}.pdf`);
      
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

  const handleStartNewReport = () => {
    if (confirm("Are you sure? This will clear all current observations.")) {
      // Clear localStorage explicitly
      localStorage.removeItem('constructReport_entries');
      localStorage.removeItem('constructReport_projectInfo');
      
      // Reset the application state completely by remounting
      onReset();
    }
  };

  const currentTemplate = TEMPLATES.find(t => t.id === selectedTemplate)!;

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
                          onClick={() => { setShowPreview(true); setShowMenu(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-stone-50 rounded-xl transition-colors"
                        >
                          <Eye className="w-4 h-4 text-clark-navy" />
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
                  onClick={() => setShowCapture(true)}
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
                  <p className="text-sm font-bold text-clark-navy line-clamp-2">{entry.observation}</p>
                  <p className="text-[10px] text-stone-400 uppercase font-bold tracking-tight">{entry.tradeResponsible} • {entry.proposedAction}</p>
                  {entry.transcription && (
                    <div className="mt-2 p-2 bg-stone-50 rounded text-[10px] text-stone-500 italic border-l-2 border-clark-bright">
                      "{entry.transcription}"
                    </div>
                  )}
                </div>
                <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }} 
                    className="p-1.5 bg-stone-100 rounded-lg text-stone-600 hover:bg-red-100 hover:text-red-700"
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
                  <button onClick={() => setShowCapture(false)} className="text-stone-400 hover:text-stone-600">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Capture Controls */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={handleCapturePhoto}
                      className="aspect-video rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 flex flex-col items-center justify-center gap-2 transition-all hover:border-clark-bright hover:bg-clark-bright/5"
                    >
                      <Camera className="w-6 h-6 text-stone-400" />
                      <span className="text-[10px] font-bold uppercase text-stone-500">Add Photo</span>
                    </button>
                    <input type="file" accept="image/*" capture="environment" multiple ref={fileInputRef} onChange={onFileChange} className="hidden" />

                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${
                        audioBlob ? 'border-clark-bright bg-clark-bright/5' : 'border-stone-300 bg-stone-50'
                      } ${isRecording ? 'animate-pulse border-red-500 bg-red-50' : ''}`}
                    >
                      {isRecording ? (
                        <Square className="w-6 h-6 text-red-500" />
                      ) : (
                        <Mic className={`w-6 h-6 ${audioBlob ? 'text-clark-bright' : 'text-stone-400'}`} />
                      )}
                      <span className="text-[10px] font-bold uppercase text-stone-500">
                        {isRecording ? 'Recording...' : audioBlob ? 'Audio Ready' : 'Audio Dictation'}
                      </span>
                    </button>
                  </div>

                  {/* Photo Preview Strip */}
                  {currentImages.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {currentImages.map((img, idx) => (
                        <div key={idx} className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 relative group">
                          <img src={img} alt="Preview" className="w-full h-full object-cover" />
                          <button 
                            onClick={() => removeCurrentImage(idx)}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Action</label>
                      <input 
                        value={manualAction}
                        onChange={(e) => setManualAction(e.target.value)}
                        placeholder="Required fix..."
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-clark-bright outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Trade</label>
                      <input 
                        value={manualTrade}
                        onChange={(e) => setManualTrade(e.target.value)}
                        placeholder="Responsible..."
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-clark-bright outline-none"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleAddOrUpdateEntry}
                  disabled={isLoading || (currentImages.length === 0 && !editingId)}
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
                    className="flex-1 bg-clark-bright text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
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
        style={{ width: '100%', zIndex: -100, visibility: 'hidden', pointerEvents: 'none' }}
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
