import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  LogOut, UploadCloud, Activity, User, Droplet, Clock, Search, 
  FileText, ShieldCheck, X, LayoutDashboard, UserPlus, Users, Info, 
  Settings, ChevronLeft, AlertCircle, Download, Mail, Bot, Send, Sparkles, MessageSquare, Edit2, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';
import { translateText, getCachedText } from '../bhashini';

export default function Dashboard() {
  const [session, setSession] = useState(null);
  const [diagnoses, setDiagnoses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState('overview'); // overview, add_patient, patients, about, settings, madhu_ai
  const [selectedPatient, setSelectedPatient] = useState(null); 
  const [displayLang, setDisplayLang] = useState('en');
  
  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    doctor_name: '', license_number: '', hospital_name: '', contact_number: ''
  });
  
  // Madhu AI Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: 'Hello! I am Madhu AI. I can answer your questions about Diabetic Retinopathy grades, diet plans, and general retinal health. How can I assist you today?' }
  ]);

  // Form state
  const [formData, setFormData] = useState({
    patient_name: '', patient_id: '', patient_age: '', gender: 'Male',
    patient_mobile: '', patient_email: '', blood_group: 'O+',
    blood_sugar_level: '', diabetes_duration_years: ''
  });
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('error');
  const [fullScreenImage, setFullScreenImage] = useState(null);

  const navigate = useNavigate();

  // Bhashini Translation Wrapper
  const Translate = ({ text }) => {
    const [translated, setTranslated] = useState(() => {
      if (displayLang === 'en' || !text) return text;
      const cached = getCachedText(text, displayLang);
      if (cached) return cached;
      return <span className="opacity-0">{text}</span>; 
    });

    useEffect(() => {
      if (displayLang === 'en' || !text) {
        setTranslated(text);
        return;
      }
      
      const cached = getCachedText(text, displayLang);
      if (cached) {
        setTranslated(cached);
        return;
      }
      
      setTranslated(<span className="opacity-0">{text}</span>);
      
      translateText([text], displayLang).then(res => {
        if (res && res[0]) {
          setTranslated(<span className="animate-in fade-in duration-300">{res[0]}</span>);
        } else {
          setTranslated(text);
        }
      });
    }, [text, displayLang]);

    return <>{translated}</>;
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchDiagnoses(session.user.id);
      } else {
        navigate('/');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) navigate('/');
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchDiagnoses = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('madhuvision')
        .select('*')
        .eq('doctor_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDiagnoses(data || []);
    } catch (error) {
      console.error('Error fetching diagnoses:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    if (selectedFile) setFilePreview(URL.createObjectURL(selectedFile));
    else setFilePreview(null);
  };

  const handleSignOut = async () => await supabase.auth.signOut();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage('Please select a retinal image to analyze.');
      setMessageType('error');
      return;
    }
    setSubmitting(true);
    setMessage('');

    try {
      const formPayload = new FormData();
      formPayload.append('file', file);
      
      const aiResponse = await fetch('http://localhost:8000/predict', { method: 'POST', body: formPayload });
      const aiData = await aiResponse.json();
      if (!aiData.success) throw new Error('AI analysis failed: ' + aiData.error);

      const base64Data = aiData.heatmap_base64;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
      const heatmapBlob = new Blob([new Uint8Array(byteNumbers)], { type: 'image/jpeg' });

      const fileName = `${Math.random()}.jpg`;
      const filePath = `${session.user.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('retinal-images').upload(filePath, heatmapBlob, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('retinal-images').getPublicUrl(filePath);

      const { data: existingPatient, error: fetchPatientError } = await supabase.from('patients').select('patient_name').eq('patient_id', formData.patient_id).maybeSingle();
      if (fetchPatientError) throw fetchPatientError;

      if (existingPatient) {
        if (existingPatient.patient_name.toLowerCase().trim() !== formData.patient_name.toLowerCase().trim()) {
          throw new Error(`Patient ID ${formData.patient_id} is already assigned to "${existingPatient.patient_name}".`);
        }
      }

      const patientData = {
        patient_id: formData.patient_id, patient_name: formData.patient_name, patient_age: parseInt(formData.patient_age),
        gender: formData.gender, patient_mobile: formData.patient_mobile, patient_email: formData.patient_email,
        blood_group: formData.blood_group, diabetes_duration_years: parseInt(formData.diabetes_duration_years) || null,
      };

      const { error: patientError } = await supabase.from('patients').upsert([patientData]);
      if (patientError) throw patientError;

      const newDiagnosis = {
        patient_name: formData.patient_name, patient_id: formData.patient_id, patient_age: parseInt(formData.patient_age),
        gender: formData.gender, patient_mobile: formData.patient_mobile, patient_email: formData.patient_email,
        blood_group: formData.blood_group, blood_sugar_level: parseFloat(formData.blood_sugar_level),
        diabetes_duration_years: parseInt(formData.diabetes_duration_years) || null,
        image_url: publicUrlData.publicUrl, ai_grade: aiData.grade, confidence: aiData.confidence, doctor_id: session.user.id
      };

      const { error: insertError } = await supabase.from('madhuvision').insert([newDiagnosis]);
      if (insertError) throw insertError;

      setMessage('Diagnosis saved successfully!');
      setMessageType('success');
      setFormData({
        patient_name: '', patient_id: '', patient_age: '', gender: 'Male', patient_mobile: '', 
        patient_email: '', blood_group: 'O+', blood_sugar_level: '', diabetes_duration_years: ''
      });
      setFile(null);
      setFilePreview(null);
      
      await fetchDiagnoses(session.user.id);
      setActiveTab('patients'); 
      
    } catch (error) {
      setMessage(`Error: ${error.message}`);
      setMessageType('error');
    } finally {
      setSubmitting(false);
    }
  };

  const generatePDF = () => {
    // We use native browser print for perfect vector-based PDFs, bypassing html2canvas CSS limitations
    window.print();
  };

  const handleEmail = () => {
    if (!selectedPatient) return;
    
    const doctorName = session?.user?.user_metadata?.doctor_name || 'MadhuVision Staff';
    const hospitalName = session?.user?.user_metadata?.hospital_name || 'MadhuVision Clinic';
    
    const subject = encodeURIComponent(`Medical Report: Diabetic Retinopathy Screening - ${selectedPatient.patient_name}`);
    const body = encodeURIComponent(
      `Dear ${selectedPatient.patient_name},\n\n` +
      `Here is a summary of your recent retinal screening at ${hospitalName}:\n\n` +
      `Patient ID: ${selectedPatient.patient_id}\n` +
      `Date: ${new Date(selectedPatient.created_at).toLocaleDateString()}\n` +
      `AI Diagnosis: ${getGradeBadge(selectedPatient.ai_grade).label}\n` +
      `Confidence: ${(selectedPatient.confidence * 100).toFixed(1)}%\n\n` +
      `Please find your detailed Grad-CAM visual report attached in the portal or contact your doctor for further guidance.\n\n` +
      `Doctor: Dr. ${doctorName}\n` +
      `Hospital: ${hospitalName}\n`
    );
    
    window.location.href = `mailto:${selectedPatient.patient_email || ''}?subject=${subject}&body=${body}`;
  };

  const getGradeBadge = (grade) => {
    if (grade === 0) return { bg: 'bg-emerald-400/20', text: 'text-emerald-700', border: 'border-emerald-500/30', label: 'No DR (Grade 0)' };
    if (grade === 1 || grade === 2) return { bg: 'bg-amber-400/20', text: 'text-amber-700', border: 'border-amber-500/30', label: `Mild/Mod (Grade ${grade})` };
    return { bg: 'bg-rose-400/20', text: 'text-rose-700', border: 'border-rose-500/30', label: `Severe (Grade ${grade})` };
  };

  const LogoSVG = () => (
    <svg width="32" height="32" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 drop-shadow-sm">
      <path d="M 20 95 L 20 25 L 60 60" stroke="#FFFFFF" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 60 60 L 100 25 L 100 95" stroke="#2A9D8F" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 30 65 Q 60 40 90 65 Q 60 90 30 65 Z" fill="#0B1727" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="60" cy="65" r="10" fill="#2A9D8F" />
    </svg>
  );

  // ---------------------------------------------------------
  // ANIMATION VARIANTS
  // ---------------------------------------------------------
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  const scaleVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  // ---------------------------------------------------------
  // VIEWS (Tabs) - GLASSMORPHISM UI with Animations
  // ---------------------------------------------------------

  const renderOverview = () => {
    const totalScans = diagnoses.length;
    const severeDR = diagnoses.filter(d => d.ai_grade >= 3).length;
    const avgConfidence = totalScans > 0 ? (diagnoses.reduce((acc, curr) => acc + curr.confidence, 0) / totalScans * 100).toFixed(1) : 0;

    return (
      <motion.div variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 drop-shadow-sm"><Translate text="Dashboard Overview" /></h2>
        
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-white/60 shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100/50 text-blue-600 flex items-center justify-center shadow-inner">
                <Activity size={20} />
              </div>
              <p className="text-slate-600 font-bold text-sm"><Translate text="Total Scans" /></p>
            </div>
            <p className="text-4xl font-extrabold text-slate-800">{totalScans}</p>
          </motion.div>
          
          <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-white/60 shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-400/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-100/50 text-rose-600 flex items-center justify-center shadow-inner">
                <AlertCircle size={20} />
              </div>
              <p className="text-slate-600 font-bold text-sm"><Translate text="Severe DR Detected" /></p>
            </div>
            <p className="text-4xl font-extrabold text-slate-800">{severeDR}</p>
          </motion.div>
          
          <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-white/60 shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100/50 text-emerald-600 flex items-center justify-center shadow-inner">
                <ShieldCheck size={20} />
              </div>
              <p className="text-slate-600 font-bold text-sm"><Translate text="Avg AI Confidence" /></p>
            </div>
            <p className="text-4xl font-extrabold text-slate-800">{avgConfidence}%</p>
          </motion.div>
        </div>
        
        {/* --- Charts Section --- */}
        {totalScans > 0 && (
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* DR Severity Distribution (Pie Chart) */}
            <div className="bg-white/50 backdrop-blur-xl p-8 rounded-3xl border border-white/60 shadow-xl">
              <h3 className="font-bold text-slate-800 mb-6 drop-shadow-sm"><Translate text="DR Severity Distribution" /></h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={[
                        { name: 'No DR', value: diagnoses.filter(d => d.ai_grade === 0).length, color: '#34d399' },
                        { name: 'Mild/Mod', value: diagnoses.filter(d => d.ai_grade === 1 || d.ai_grade === 2).length, color: '#fbbf24' },
                        { name: 'Severe', value: diagnoses.filter(d => d.ai_grade >= 3).length, color: '#fb7185' },
                      ].filter(d => d.value > 0)} 
                      dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={50} outerRadius={70} paddingAngle={5}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                      fontSize={11}
                      fontWeight="bold"
                    >
                      {[{ name: 'No DR', value: diagnoses.filter(d => d.ai_grade === 0).length, color: '#34d399' },
                        { name: 'Mild/Mod', value: diagnoses.filter(d => d.ai_grade === 1 || d.ai_grade === 2).length, color: '#fbbf24' },
                        { name: 'Severe', value: diagnoses.filter(d => d.ai_grade >= 3).length, color: '#fb7185' }
                      ].filter(d => d.value > 0).map((entry, index) => <Cell key={index} fill={entry.color} />)}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Scans Over Time (Bar Chart) */}
            <div className="bg-white/50 backdrop-blur-xl p-8 rounded-3xl border border-white/60 shadow-xl">
              <h3 className="font-bold text-slate-800 mb-6 drop-shadow-sm"><Translate text="Scans Over Time" /></h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(() => {
                    const counts = {};
                    diagnoses.forEach(d => {
                      const date = new Date(d.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                      counts[date] = (counts[date] || 0) + 1;
                    });
                    return Object.keys(counts).map(date => ({ date, scans: counts[date] })).reverse();
                  })()} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.4)'}} contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="scans" fill="#2A9D8F" radius={[6, 6, 0, 0]}>
                      <LabelList dataKey="scans" position="top" fill="#475569" fontSize={12} fontWeight="bold" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div variants={itemVariants} className="bg-white/50 backdrop-blur-xl p-8 rounded-3xl border border-white/60 shadow-xl">
          <h3 className="text-lg font-bold text-slate-800 mb-6 drop-shadow-sm"><Translate text="Recent Activity" /></h3>
          {diagnoses.length === 0 ? (
            <p className="text-slate-600 text-sm"><Translate text="No recent scans." /></p>
          ) : (
            <div className="space-y-4">
              {diagnoses.slice(0, 5).map(diag => {
                const badge = getGradeBadge(diag.ai_grade);
                return (
                  <motion.div variants={itemVariants} key={diag.id} className="flex items-center justify-between p-4 border border-white/60 rounded-2xl bg-white/40 backdrop-blur-md hover:bg-white/60 transition-colors shadow-sm">
                    <div className="flex items-center gap-4">
                      <img src={diag.image_url} alt="scan" className="w-12 h-12 rounded-lg object-cover shadow-sm" />
                      <div>
                        <p className="font-bold text-slate-800">{diag.patient_name}</p>
                        <p className="text-xs text-slate-600">{new Date(diag.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${badge.bg} ${badge.text} ${badge.border} backdrop-blur-md shadow-sm`}>{badge.label}</span>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
      </motion.div>
    );
  };
  const renderAddPatient = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="max-w-3xl mx-auto">
      <motion.div variants={itemVariants} className="bg-white/50 backdrop-blur-xl p-8 md:p-10 rounded-3xl shadow-2xl border border-white/60 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#0B1727] to-[#2A9D8F]"></div>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#2A9D8F]/20 backdrop-blur-md border border-[#2A9D8F]/20 flex items-center justify-center text-[#2A9D8F] shadow-sm">
            <UserPlus size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 drop-shadow-sm"><Translate text="Add New Patient Scan" /></h2>
            <p className="text-sm text-slate-600"><Translate text="Enter patient details and upload retinal image for AI analysis." /></p>
          </div>
        </div>
        
        {message && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`p-4 mb-8 text-sm rounded-2xl flex items-start gap-3 border backdrop-blur-md shadow-sm ${messageType === 'error' ? 'bg-rose-400/20 text-rose-800 border-rose-500/30' : 'bg-emerald-400/20 text-emerald-800 border-emerald-500/30'}`}>
            <ShieldCheck className="shrink-0 mt-0.5" size={18} />
            <span className="font-medium">{message}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-sm font-semibold text-slate-700">
          <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 text-slate-700"><Translate text="Patient ID" /> *</label>
              <input type="text" name="patient_id" required value={formData.patient_id} onChange={handleChange} className="w-full px-4 py-3 bg-white/40 backdrop-blur-md border border-white/50 focus:border-[#2A9D8F] focus:ring-1 focus:ring-[#2A9D8F] focus:bg-white/70 rounded-xl outline-none shadow-sm transition-all placeholder:text-slate-400" placeholder="e.g. PT-1002" />
            </div>
            <div>
              <label className="block mb-2 text-slate-700"><Translate text="Patient Name" /> *</label>
              <input type="text" name="patient_name" required value={formData.patient_name} onChange={handleChange} className="w-full px-4 py-3 bg-white/40 backdrop-blur-md border border-white/50 focus:border-[#2A9D8F] focus:ring-1 focus:ring-[#2A9D8F] focus:bg-white/70 rounded-xl outline-none shadow-sm transition-all placeholder:text-slate-400" placeholder="John Doe" />
            </div>
          </motion.div>
          
          <motion.div variants={itemVariants} className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="block mb-2 text-slate-700">Age *</label>
              <input type="number" name="patient_age" required value={formData.patient_age} onChange={handleChange} className="w-full px-4 py-3 bg-white/40 backdrop-blur-md border border-white/50 focus:border-[#2A9D8F] focus:ring-1 focus:ring-[#2A9D8F] focus:bg-white/70 rounded-xl outline-none shadow-sm transition-all" placeholder="Years" />
            </div>
            <div>
              <label className="block mb-2 text-slate-700">Gender</label>
              <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-3 bg-white/40 backdrop-blur-md border border-white/50 focus:border-[#2A9D8F] focus:ring-1 focus:ring-[#2A9D8F] focus:bg-white/70 rounded-xl outline-none cursor-pointer shadow-sm">
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
            <div>
              <label className="block mb-2 text-slate-700">Blood Group</label>
              <select name="blood_group" value={formData.blood_group} onChange={handleChange} className="w-full px-4 py-3 bg-white/40 backdrop-blur-md border border-white/50 focus:border-[#2A9D8F] focus:ring-1 focus:ring-[#2A9D8F] focus:bg-white/70 rounded-xl outline-none cursor-pointer shadow-sm">
                <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                <option>O+</option><option>O-</option><option>AB+</option><option>AB-</option>
              </select>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="block mb-2 text-slate-700">Mobile *</label>
              <input type="text" name="patient_mobile" required value={formData.patient_mobile} onChange={handleChange} className="w-full px-4 py-3 bg-white/40 backdrop-blur-md border border-white/50 focus:border-[#2A9D8F] focus:ring-1 focus:ring-[#2A9D8F] focus:bg-white/70 rounded-xl outline-none shadow-sm transition-all placeholder:text-slate-400" placeholder="Number" />
            </div>
            <div>
              <label className="block mb-2 text-slate-700">Sugar Level (mg/dL) *</label>
              <input type="number" step="0.1" name="blood_sugar_level" required value={formData.blood_sugar_level} onChange={handleChange} className="w-full px-4 py-3 bg-white/40 backdrop-blur-md border border-white/50 focus:border-[#2A9D8F] focus:ring-1 focus:ring-[#2A9D8F] focus:bg-white/70 rounded-xl outline-none shadow-sm transition-all" placeholder="Level" />
            </div>
            <div>
              <label className="block mb-2 text-slate-700">Diabetes Duration</label>
              <input type="number" name="diabetes_duration_years" value={formData.diabetes_duration_years} onChange={handleChange} className="w-full px-4 py-3 bg-white/40 backdrop-blur-md border border-white/50 focus:border-[#2A9D8F] focus:ring-1 focus:ring-[#2A9D8F] focus:bg-white/70 rounded-xl outline-none shadow-sm transition-all" placeholder="Years" />
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="pt-4">
            <label className="block mb-3 text-slate-800 font-bold text-base">Upload Retinal Scan *</label>
            <div className="relative">
              <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <div className={`w-full p-8 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-center transition-all backdrop-blur-md shadow-sm ${filePreview ? 'border-[#2A9D8F] bg-white/70' : 'border-white/60 bg-white/30 hover:bg-white/50'}`}>
                {filePreview ? (
                  <div className="flex flex-col items-center">
                    <img src={filePreview} alt="Preview" className="w-32 h-32 object-cover rounded-xl shadow-lg mb-4 border border-white/50" />
                    <span className="text-base font-bold text-[#2A9D8F]">{file.name}</span>
                    <span className="text-sm text-slate-600 mt-1">Click to replace</span>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-white/60 backdrop-blur-md rounded-full shadow-sm border border-white/80 flex items-center justify-center text-slate-500 mb-4"><UploadCloud size={32} /></div>
                    <p className="text-base font-bold text-slate-800">Drag & drop or click to browse</p>
                    <p className="text-sm text-slate-600 mt-1 font-medium">Supports JPG, PNG (Max 5MB)</p>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          <motion.button variants={itemVariants} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} type="submit" disabled={submitting} className="w-full py-4 mt-8 bg-gradient-to-r from-[#0B1727] to-[#1a2e4c] text-white font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl transition-all disabled:opacity-70 flex items-center justify-center gap-2 border border-white/10">
            {submitting ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div><span>Analyzing Scan...</span></> : <><span>Process Diagnosis</span><Activity size={20} /></>}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );

  const renderPatientList = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="bg-white/50 backdrop-blur-xl rounded-3xl shadow-xl border border-white/60 flex-1 flex flex-col h-full overflow-hidden">
      <div className="p-8 border-b border-white/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 backdrop-blur-md border border-indigo-500/30 flex items-center justify-center text-indigo-700 shadow-sm"><Users size={24} /></div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 drop-shadow-sm"><Translate text="All Patient Records" /></h2>
            <p className="text-sm text-slate-600 font-medium"><Translate text="View and manage all your clinical diagnoses." /></p>
          </div>
        </div>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-2.5 text-slate-500" />
          <input type="text" placeholder="Search patients..." className="pl-10 pr-4 py-2 bg-white/40 backdrop-blur-md border border-white/50 rounded-xl text-sm font-semibold outline-none focus:border-[#2A9D8F] focus:bg-white/60 shadow-sm w-full sm:w-64 transition-all" />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        {diagnoses.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center border-2 border-dashed border-white/50 rounded-2xl bg-white/20 backdrop-blur-md shadow-sm">
            <Users size={48} className="text-slate-400 mb-4" />
            <p className="text-slate-600 font-bold"><Translate text="No patient records found." /></p>
            <p className="text-sm text-slate-500 mt-1"><Translate text="Click 'Add New Scan' to analyze your first patient." /></p>
          </div>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-white/50 text-slate-600">
                <th className="pb-4 font-bold px-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/30">
              {diagnoses.map((diag, index) => {
                const badge = getGradeBadge(diag.ai_grade);
                return (
                  <motion.tr 
                    key={diag.id} 
                    variants={itemVariants}
                    onClick={() => setSelectedPatient(diag)} 
                    className="hover:bg-white/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-4">
                        <img src={diag.image_url} alt="Scan" className="w-12 h-12 rounded-lg object-cover border border-white/50 shadow-sm group-hover:border-[#2A9D8F] transition-colors" />
                        <div>
                          <p className="font-bold text-slate-800 text-base">{diag.patient_name}</p>
                          <p className="text-xs text-slate-600 font-semibold">ID: {diag.patient_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-700 font-medium">
                      <p>{diag.patient_age} yrs • {diag.gender}</p>
                      <p className="text-xs mt-0.5 text-slate-600">Sugar: {diag.blood_sugar_level} mg/dL</p>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border} shadow-sm backdrop-blur-md`}>{badge.label}</span>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-slate-800 font-semibold">{new Date(diag.created_at).toLocaleDateString()}</p>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  );

  const renderSinglePatient = () => {
    if (!selectedPatient) return null;
    const badge = getGradeBadge(selectedPatient.ai_grade);
    
    return (
      <motion.div variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between no-print">
          <motion.button variants={itemVariants} onClick={() => setSelectedPatient(null)} className="flex items-center gap-2 text-slate-600 hover:text-[#2A9D8F] font-bold transition-colors bg-white/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/50 shadow-sm w-fit">
            <ChevronLeft size={20} /> Back to All Patients
          </motion.button>
          
          <motion.div variants={itemVariants} className="flex gap-3">
            <button onClick={handleEmail} className="flex items-center gap-2 bg-white/50 hover:bg-white/80 text-blue-700 font-bold px-4 py-2 rounded-xl border border-blue-500/30 shadow-sm transition-all">
              <Mail size={18} /> Email Patient
            </button>
            <button onClick={generatePDF} className="flex items-center gap-2 bg-[#2A9D8F] hover:bg-[#218276] text-white font-bold px-4 py-2 rounded-xl shadow-md transition-all">
              <Download size={18} /> Download PDF
            </button>
          </motion.div>
        </div>

        <motion.div id="pdf-report-content" variants={itemVariants} className="bg-white/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 overflow-hidden">
          <div className="p-8 border-b border-white/40 flex justify-between items-start bg-white/20">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-800 drop-shadow-sm">{selectedPatient.patient_name}</h2>
              <p className="text-slate-600 font-semibold mt-1">Patient ID: {selectedPatient.patient_id} | Scanned on {new Date(selectedPatient.created_at).toLocaleDateString()}</p>
            </div>
            <span className={`px-4 py-2 rounded-xl text-sm font-bold border ${badge.bg} ${badge.text} ${badge.border} backdrop-blur-md shadow-sm`}>{badge.label}</span>
          </div>

          <div className="grid md:grid-cols-2 gap-0">
            {/* Left Image View */}
            <div className="p-8 border-r border-white/40 flex flex-col items-center justify-center bg-white/10">
              <p className="text-slate-600 font-bold text-sm mb-4 self-start uppercase tracking-wider">Grad-CAM Retina Scan</p>
              <div 
                className="w-full aspect-square rounded-2xl overflow-hidden shadow-xl border-4 border-white/50 cursor-pointer relative group"
                onClick={() => setFullScreenImage(selectedPatient.image_url)}
              >
                <img src={selectedPatient.image_url} alt="Retina" crossOrigin="anonymous" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white font-bold flex items-center gap-2"><Search size={20}/> Click to Expand</span>
                </div>
              </div>
            </div>
            
            {/* Right Details View */}
            <div className="p-8 space-y-8 bg-white/30">
              <motion.div variants={itemVariants} className="bg-white/50 backdrop-blur-xl p-8 rounded-3xl mb-8 shadow-xl border border-white/60">
        <h3 className="font-bold text-slate-800 mb-6 drop-shadow-sm"><Translate text="Patient Information" /></h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white/40 p-4 rounded-2xl border border-white/50"><p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1"><Translate text="Name" /></p><p className="font-bold text-slate-800">{selectedPatient.patient_name}</p></div>
          <div className="bg-white/40 p-4 rounded-2xl border border-white/50"><p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1"><Translate text="Age/Gender" /></p><p className="font-bold text-slate-800">{selectedPatient.patient_age} / {selectedPatient.gender}</p></div>
          <div className="bg-white/40 p-4 rounded-2xl border border-white/50"><p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1"><Translate text="Blood Sugar" /></p><p className="font-bold text-slate-800">{selectedPatient.blood_sugar_level} <Translate text="mg/dL" /></p></div>
          <div className="bg-white/40 p-4 rounded-2xl border border-white/50"><p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1"><Translate text="Diabetes Duration" /></p><p className="font-bold text-slate-800">{selectedPatient.diabetes_duration_years} <Translate text="Years" /></p></div>
        </div>
      </motion.div>

              <div className="pt-8 border-t border-white/40">
                <p className="text-slate-600 font-bold text-sm mb-4 uppercase tracking-wider">AI Analysis Metrics</p>
                <div className="bg-white/40 backdrop-blur-md p-6 rounded-2xl border border-white/50 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-slate-800">Model Confidence</span>
                    <span className="font-extrabold text-[#2A9D8F] text-lg">{(selectedPatient.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-3 bg-white/60 rounded-full overflow-hidden mb-4 shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: `${selectedPatient.confidence * 100}%` }} 
                      transition={{ duration: 1, delay: 0.5, ease: "easeOut" }} 
                      className="h-full bg-gradient-to-r from-[#2A9D8F] to-emerald-400 rounded-full"
                    ></motion.div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">The AI model is highly confident in this diagnosis. The Grad-CAM heatmap highlights the specific vascular structures that contributed to the classification of Grade {selectedPatient.ai_grade}.</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const renderAbout = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-8 drop-shadow-sm"><Translate text="About Us" /></h2>
      <div className="bg-white/50 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-white/60">
        <h3 className="font-bold text-slate-800 text-xl mb-4"><Translate text="About MadhuVision" /></h3>
        <p className="text-slate-700 leading-relaxed font-medium mb-6">
          <Translate text="MadhuVision was created for the Smart India Hackathon (SIH) 2026 to combat preventable blindness in India. By combining deep learning, mathematically proven Grad-CAM visualizations, and an intuitive UI, we empower rural and urban clinics to detect Diabetic Retinopathy in seconds." />
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="bg-blue-500/10 p-6 rounded-2xl border border-blue-500/20">
            <h4 className="font-bold text-blue-800 mb-2"><Translate text="Explainable AI" /></h4>
            <p className="text-sm text-blue-700/80"><Translate text="Our models don't just give a grade; they show you exactly why. We extract FC layer weights to generate true activation maps." /></p>
          </div>
          <div className="bg-[#2A9D8F]/10 p-6 rounded-2xl border border-[#2A9D8F]/20">
            <h4 className="font-bold text-[#2A9D8F] mb-2"><Translate text="Bhashini Integrated" /></h4>
            <p className="text-sm text-[#2A9D8F]/80"><Translate text="Built with vernacular translation in mind, ensuring our platform is usable by healthcare staff across all linguistic regions of India." /></p>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newUserMsg = { role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, newUserMsg]);
    setChatInput('');

    setTimeout(() => {
      let response = "I am Madhu AI, specialized in Diabetic Retinopathy. Please ask me about DR grades, diet plans, or general eye health!";
      const lowerInput = newUserMsg.text.toLowerCase();

      if (lowerInput.includes('diet') || lowerInput.includes('food')) {
         if (lowerInput.includes('mild') || lowerInput.includes('grade 1') || lowerInput.includes('grade 2')) {
           response = "For Mild to Moderate DR, focus on stabilizing blood sugar. A diet rich in leafy greens, whole grains, and lean proteins is recommended. Avoid refined sugars and processed carbs.";
         } else if (lowerInput.includes('severe') || lowerInput.includes('grade 3') || lowerInput.includes('grade 4') || lowerInput.includes('proliferative')) {
           response = "For Severe/Proliferative DR, strict glycemic control is critical. Limit carbohydrates, avoid all processed sugars, and consult a nutritionist. Omega-3 rich foods like fish can help support retinal health and reduce inflammation.";
         } else {
           response = "A DR-friendly diet focuses on low-glycemic foods, high fiber, and antioxidant-rich vegetables. Managing your blood sugar, blood pressure, and cholesterol is key to preventing progression.";
         }
      } else if (lowerInput.includes('grade') || lowerInput.includes('level')) {
         response = "Diabetic Retinopathy has 4 main grades:\n1. Mild Nonproliferative (Microaneurysms occur)\n2. Moderate Nonproliferative (Blood vessels swell)\n3. Severe Nonproliferative (Blocked blood vessels)\n4. Proliferative (New fragile blood vessels grow and can bleed).";
      } else if (lowerInput.includes('symptom') || lowerInput.includes('sign')) {
         response = "Early DR often has no symptoms. As it progresses, symptoms include spots or dark strings floating in your vision (floaters), blurred vision, fluctuating vision, and vision loss.";
      } else if (lowerInput.includes('cure') || lowerInput.includes('treatment')) {
         response = "While there is no absolute cure, treatments like laser surgery (photocoagulation), anti-VEGF injections, or vitrectomy can slow or stop the progression. Early detection and blood sugar management are the best defenses.";
      }

      setChatMessages(prev => [...prev, { role: 'assistant', text: response }]);
    }, 1000);
  };

  const renderMadhuAI = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="max-w-4xl mx-auto h-[80vh] flex flex-col">
      <motion.div variants={itemVariants} className="bg-white/50 backdrop-blur-xl rounded-t-3xl border border-white/60 shadow-xl p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-700 flex items-center justify-center border border-indigo-500/20 shadow-sm">
          <Sparkles size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 drop-shadow-sm">Madhu AI Assistant</h2>
          <p className="text-sm font-bold text-slate-500">Ask questions about DR Grades, Diets, and Symptoms</p>
        </div>
      </motion.div>
      
      <motion.div variants={itemVariants} className="flex-1 bg-white/30 backdrop-blur-md border-x border-white/60 p-6 overflow-y-auto space-y-4">
        {chatMessages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] p-4 rounded-2xl shadow-sm border ${
              msg.role === 'user' 
                ? 'bg-[#2A9D8F] text-white border-[#2A9D8F] rounded-br-sm' 
                : 'bg-white/80 text-slate-800 border-white/60 rounded-bl-sm backdrop-blur-xl'
            }`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200/50">
                  <Bot size={16} className="text-indigo-600" />
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider"><Translate text="Madhu AI" /></span>
                </div>
              )}
              <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed"><Translate text={msg.text} /></p>
            </div>
          </div>
        ))}
      </motion.div>

      <motion.form variants={itemVariants} onSubmit={handleChatSubmit} className="bg-white/50 backdrop-blur-xl rounded-b-3xl border border-white/60 shadow-xl p-4 flex gap-3">
        <input 
          type="text" 
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Ask about DR levels, diet plans, or symptoms..." 
          className="flex-1 bg-white/50 backdrop-blur-md border border-white/60 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#2A9D8F] focus:bg-white/70 font-bold text-slate-700 shadow-sm transition-all"
        />
        <button type="submit" disabled={!chatInput.trim()} className="bg-[#2A9D8F] hover:bg-[#218276] disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all">
          <Send size={18} /> Send
        </button>
      </motion.form>
    </motion.div>
  );

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const { data, error } = await supabase.auth.updateUser({
      data: profileForm
    });
    
    if (error) {
      alert(error.message);
    } else {
      setSession({ ...session, user: data.user });
      setIsEditingProfile(false);
    }
    setSubmitting(false);
  };

  const renderSettings = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-8 drop-shadow-sm"><Translate text="System Settings" /></h2>
      <div className="bg-white/50 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-white/60">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-slate-800 drop-shadow-sm"><Translate text="Doctor Profile Details" /></h3>
          {!isEditingProfile && (
            <button 
              onClick={() => {
                setProfileForm({
                  doctor_name: session?.user?.user_metadata?.doctor_name || '',
                  license_number: session?.user?.user_metadata?.license_number || '',
                  hospital_name: session?.user?.user_metadata?.hospital_name || '',
                  contact_number: session?.user?.user_metadata?.contact_number || ''
                });
                setIsEditingProfile(true);
              }}
              className="flex items-center gap-2 text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              <Edit2 size={14} /> <Translate text="Edit Profile" />
            </button>
          )}
        </div>
        
        {isEditingProfile ? (
          <form onSubmit={handleProfileUpdate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <label className="font-bold text-slate-500 uppercase tracking-wider text-xs mb-2 block"><Translate text="FULL NAME" /></label>
                <input required type="text" value={profileForm.doctor_name} onChange={(e) => setProfileForm({...profileForm, doctor_name: e.target.value})} className="w-full px-4 py-2.5 bg-white/60 border border-white/80 rounded-xl outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="font-bold text-slate-500 uppercase tracking-wider text-xs mb-2 block"><Translate text="EMAIL ADDRESS" /></label>
                <input disabled type="email" value={session?.user?.email} className="w-full px-4 py-2.5 bg-slate-100/50 text-slate-400 border border-slate-200/50 rounded-xl outline-none cursor-not-allowed" />
              </div>
              <div>
                <label className="font-bold text-slate-500 uppercase tracking-wider text-xs mb-2 block"><Translate text="LICENSE NUMBER" /></label>
                <input type="text" value={profileForm.license_number} onChange={(e) => setProfileForm({...profileForm, license_number: e.target.value})} className="w-full px-4 py-2.5 bg-white/60 border border-white/80 rounded-xl outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="font-bold text-slate-500 uppercase tracking-wider text-xs mb-2 block"><Translate text="HOSPITAL / CLINIC" /></label>
                <input type="text" value={profileForm.hospital_name} onChange={(e) => setProfileForm({...profileForm, hospital_name: e.target.value})} className="w-full px-4 py-2.5 bg-white/60 border border-white/80 rounded-xl outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="font-bold text-slate-500 uppercase tracking-wider text-xs mb-2 block"><Translate text="CONTACT NUMBER" /></label>
                <input type="text" value={profileForm.contact_number} onChange={(e) => setProfileForm({...profileForm, contact_number: e.target.value})} className="w-full px-4 py-2.5 bg-white/60 border border-white/80 rounded-xl outline-none focus:border-indigo-400" />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <button type="button" onClick={() => setIsEditingProfile(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors">
                <Translate text="Cancel" />
              </button>
              <button type="submit" disabled={submitting} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-md disabled:opacity-50">
                <Save size={16} /> <Translate text="Save Changes" />
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
            <div>
              <p className="font-bold text-slate-500 uppercase tracking-wider text-xs mb-2"><Translate text="FULL NAME" /></p>
              <p className="font-semibold text-slate-800">{session?.user?.user_metadata?.doctor_name || 'Not Provided'}</p>
            </div>
            <div>
              <p className="font-bold text-slate-500 uppercase tracking-wider text-xs mb-2"><Translate text="EMAIL ADDRESS" /></p>
              <p className="font-semibold text-slate-800">{session?.user?.email}</p>
            </div>
            <div>
              <p className="font-bold text-slate-500 uppercase tracking-wider text-xs mb-2"><Translate text="LICENSE NUMBER" /></p>
              <p className="font-semibold text-slate-800">{session?.user?.user_metadata?.license_number || 'Not Provided'}</p>
            </div>
            <div>
              <p className="font-bold text-slate-500 uppercase tracking-wider text-xs mb-2"><Translate text="HOSPITAL / CLINIC" /></p>
              <p className="font-semibold text-slate-800">{session?.user?.user_metadata?.hospital_name || 'Not Provided'}</p>
            </div>
            <div>
              <p className="font-bold text-slate-500 uppercase tracking-wider text-xs mb-2"><Translate text="CONTACT NUMBER" /></p>
              <p className="font-semibold text-slate-800">{session?.user?.user_metadata?.contact_number || 'Not Provided'}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );

  // ---------------------------------------------------------
  // RENDER LAYOUT
  // ---------------------------------------------------------

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="animate-spin text-[#2A9D8F]"><Activity size={48} /></div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden relative">
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #pdf-report-content, #pdf-report-content * { visibility: visible; }
            #pdf-report-content { position: absolute; left: 0; top: 0; width: 100%; padding: 0; margin: 0; box-shadow: none !important; border: none !important; background: white !important; }
            .no-print { display: none !important; }
            @page { margin: 1cm; size: A4 portrait; }
          }
        `}
      </style>
      
      {/* --- Abstract Glassmorphism Animated Background Blobs --- */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0], rotate: [0, 45, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-400/30 blur-[120px] pointer-events-none z-0"
      ></motion.div>
      
      <motion.div 
        animate={{ scale: [1, 1.3, 1], x: [0, -40, 0], y: [0, -50, 0], rotate: [0, -45, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/30 blur-[120px] pointer-events-none z-0"
      ></motion.div>
      
      <motion.div 
        animate={{ scale: [1, 1.1, 1], x: [0, 20, -20, 0], y: [0, -20, 20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute top-[30%] left-[30%] w-[40%] h-[40%] rounded-full bg-teal-400/20 blur-[120px] pointer-events-none z-0"
      ></motion.div>

      {/* --- Left Sidebar (Dark Glass) --- */}
      <aside className="w-64 bg-[#0B1727]/90 backdrop-blur-3xl text-white flex flex-col shadow-[10px_0_30px_rgba(0,0,0,0.1)] relative z-20 border-r border-white/10">
        <div className="p-6 border-b border-white/10 flex items-center gap-3 bg-black/10">
          <LogoSVG />
          <span className="text-xl font-bold tracking-tight">Madhu<span className="text-[#2A9D8F] font-normal">Vision</span></span>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button onClick={() => { setActiveTab('overview'); setSelectedPatient(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'overview' && !selectedPatient ? 'bg-[#2A9D8F]/90 backdrop-blur-md text-white shadow-lg border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}>
            <LayoutDashboard size={20} /> <Translate text="Dashboard Home" />
          </button>
          
          <button onClick={() => { setActiveTab('add_patient'); setSelectedPatient(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'add_patient' && !selectedPatient ? 'bg-[#2A9D8F]/90 backdrop-blur-md text-white shadow-lg border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}>
            <UserPlus size={20} /> <Translate text="Add New Scan" />
          </button>
          
          <button onClick={() => { setActiveTab('patients'); setSelectedPatient(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${(activeTab === 'patients' || selectedPatient) ? 'bg-[#2A9D8F]/90 backdrop-blur-md text-white shadow-lg border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}>
            <Users size={20} /> <Translate text="All Patients" />
          </button>

          <button onClick={() => { setActiveTab('madhu_ai'); setSelectedPatient(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all mt-4 border ${activeTab === 'madhu_ai' ? 'bg-indigo-500/90 text-white border-indigo-400/50 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border-indigo-500/20'}`}>
            <Sparkles size={20} className={activeTab === 'madhu_ai' ? 'animate-pulse' : ''} /> <Translate text="Madhu AI" />
          </button>

          <div className="pt-6 pb-2">
            <p className="px-4 text-xs font-bold uppercase tracking-wider text-slate-500"><Translate text="System" /></p>
          </div>

          <button onClick={() => { setActiveTab('about'); setSelectedPatient(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'about' && !selectedPatient ? 'bg-[#2A9D8F]/90 backdrop-blur-md text-white shadow-lg border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}>
            <Info size={20} /> <Translate text="About Us" />
          </button>

          <button onClick={() => { setActiveTab('settings'); setSelectedPatient(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'settings' && !selectedPatient ? 'bg-[#2A9D8F]/90 backdrop-blur-md text-white shadow-lg border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}>
            <Settings size={20} /> <Translate text="Settings" />
          </button>
        </nav>

        <div className="p-4 border-t border-white/10 bg-black/20">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs border border-white/20">
              {session?.user?.user_metadata?.doctor_name ? session.user.user_metadata.doctor_name.charAt(0).toUpperCase() : 'DR'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold truncate text-white">{session?.user?.user_metadata?.doctor_name || session?.user?.email}</p>
              <p className="text-xs text-slate-400 font-medium"><Translate text="Doctor Account" /></p>
            </div>
          </div>
          <button onClick={handleSignOut} className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold text-rose-400 hover:bg-rose-500/20 border border-transparent hover:border-rose-500/30 transition-all">
            <LogOut size={16} /> <Translate text="Sign Out" />
          </button>
        </div>
      </aside>

      {/* --- Main Content Area (Glass) --- */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        
        {/* Top Header */}
        <header className="h-20 bg-white/40 backdrop-blur-xl border-b border-white/50 flex items-center justify-between px-8 z-10 shadow-sm no-print">
          <h1 className="text-xl font-extrabold text-slate-800 capitalize drop-shadow-sm">
            {selectedPatient ? 'Patient Details' : activeTab.replace('_', ' ')}
          </h1>
          <div className="flex items-center gap-4">
            <select 
              value={displayLang}
              onChange={(e) => setDisplayLang(e.target.value)}
              className="px-4 py-2 bg-white/50 backdrop-blur-md border border-white/60 focus:border-[#2A9D8F] focus:ring-1 focus:ring-[#2A9D8F] rounded-full text-sm font-bold outline-none cursor-pointer text-slate-700 shadow-sm transition-all hover:bg-white/70"
            >
              <option value="en">English (Default)</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="gu">ગુજરાતી (Gujarati)</option>
              <option value="mr">मराठी (Marathi)</option>
              <option value="bn">বাংলা (Bengali)</option>
              <option value="kn">ಕನ್ನಡ (Kannada)</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="te">తెలుగు (Telugu)</option>
            </select>
          </div>
        </header>

        {/* Scrollable View Content */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          <AnimatePresence mode="wait">
            {selectedPatient ? (
              <motion.div key="patient-detail" className="h-full">
                {renderSinglePatient()}
              </motion.div>
            ) : (
              <motion.div key={activeTab} className="h-full">
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'add_patient' && renderAddPatient()}
                {activeTab === 'patients' && renderPatientList()}
                {activeTab === 'madhu_ai' && renderMadhuAI()}
                {activeTab === 'about' && renderAbout()}
                {activeTab === 'settings' && renderSettings()}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* --- Lightbox Modal (Dark Glass) --- */}
      <AnimatePresence>
        {fullScreenImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1727]/80 backdrop-blur-xl p-4"
            onClick={() => setFullScreenImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-[90vw] max-h-[90vh] flex justify-center bg-black/50 rounded-2xl overflow-hidden shadow-2xl border border-white/20 backdrop-blur-md"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/40 hover:bg-black/60 p-2 rounded-full backdrop-blur-xl border border-white/10 transition-all z-10"
                onClick={() => setFullScreenImage(null)}
              >
                <X size={24} />
              </button>
              <img src={fullScreenImage} alt="Full screen" className="max-w-full max-h-[90vh] object-contain" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
