import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Globe, Activity, Eye, ShieldCheck, ArrowRight } from 'lucide-react';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration specifics
  const [confirmPassword, setConfirmPassword] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [license, setLicense] = useState('');
  const [hospital, setHospital] = useState('');
  const [contact, setContact] = useState('');
  
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  // Scroll hook for fading/scaling the overall canvas
  const { scrollYProgress } = useScroll();
  const canvasScale = useTransform(scrollYProgress, [0, 1], [1, 1.2]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/dashboard');
      } else {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              doctor_name: doctorName,
              license_number: license,
              hospital_name: hospital,
              contact_number: contact
            }
          }
        });
        if (error) throw error;

        // Also save explicitly to a dedicated 'doctors' database table
        if (data?.user) {
          const { error: dbError } = await supabase.from('doctors').insert([
            {
              id: data.user.id,
              doctor_name: doctorName,
              license_number: license,
              hospital_name: hospital,
              contact_number: contact,
              email: email
            }
          ]);
          if (dbError) {
            console.error("Error inserting into doctors table (Table might not exist yet):", dbError);
          }
        }
        
        setMessage('Check your email for the login link!');
      }
    } catch (error) {
      setMessage(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Animation Configurations ---
  const fadeInUp = {
    hidden: { opacity: 0, y: 80 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const LogoSVG = () => (
    <svg width="46" height="46" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-md shrink-0">
      {/* Left side of M (Dark Blue) */}
      <path d="M 20 95 L 20 25 L 60 60" stroke="#1E3A8A" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
      {/* Right side of M (Cyan) */}
      <path d="M 60 60 L 100 25 L 100 95" stroke="#06B6D4" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
      {/* Eye Background */}
      <path d="M 30 65 Q 60 40 90 65 Q 60 90 30 65 Z" fill="white" stroke="#1E3A8A" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      {/* Pupil */}
      <circle cx="60" cy="65" r="10" fill="#06B6D4" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans overflow-x-hidden">
      
      {/* --- Top Navigation --- */}
      <nav className="absolute top-0 w-full px-6 py-6 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <LogoSVG />
            <span className="text-2xl font-bold tracking-tight text-slate-800 flex items-center">
              Madhu<span className="text-cyan-500 font-normal">Vision</span>
            </span>
          </div>
          
          {/* Language Dropdown */}
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors cursor-pointer">
            <Globe size={18} className="text-slate-600" />
            <select className="bg-transparent outline-none text-sm font-medium text-slate-700 cursor-pointer">
              <option value="en">English (US)</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="te">తెలుగు (Telugu)</option>
            </select>
          </div>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <section className="relative pt-32 pb-16 lg:pt-40 lg:pb-24 px-6 overflow-hidden min-h-[85vh] flex items-center">
        
        {/* Center Graphic Element (Non-3D) */}
        <div className="absolute inset-0 m-auto flex justify-center items-center pointer-events-none z-0 mt-8">
          <motion.div 
            style={{ scale: canvasScale }}
            className="w-[300px] h-[300px] md:w-[400px] md:h-[400px] drop-shadow-2xl opacity-90"
          >
            <img 
              src="/light_retina_sphere.jpg" 
              alt="Retina Scan" 
              className="w-full h-full object-contain rounded-full shadow-[0_0_80px_rgba(6,182,212,0.3)]" 
            />
          </motion.div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto grid lg:grid-cols-2 gap-24 items-center">
          
          {/* Left Side: Copy & Graphics */}
          <motion.div 
            initial="hidden" 
            animate="visible" 
            variants={staggerContainer}
            className="space-y-8"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 font-semibold text-sm border border-blue-100">
              <Activity size={16} />
              <span>AI-Powered Telemedicine</span>
            </motion.div>
            
            <motion.h1 variants={fadeInUp} className="text-5xl lg:text-6xl font-extrabold leading-tight text-slate-900">
              Detect Diabetic Retinopathy <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
                in Seconds.
              </span>
            </motion.h1>
            
            <motion.p variants={fadeInUp} className="text-lg text-slate-600 max-w-xl leading-relaxed">
              Empowering doctors with mathematically precise Grad-CAM visualizations and state-of-the-art AI lesion segmentation for early blindness prevention.
            </motion.p>
            

          </motion.div>

          {/* Right Side: Glassmorphism Auth Card */}
          <motion.div 
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className={`w-full ${isLogin ? 'max-w-md' : 'max-w-xl'} mx-auto lg:ml-auto lg:translate-x-28 relative transition-all duration-300`}
          >
            {/* Ambient Background Glow for Card (Static, prevents float lag) */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-400 rounded-3xl blur-2xl opacity-20 animate-pulse pointer-events-none"></div>

            <motion.div
              style={{ willChange: "transform" }}
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="relative bg-white/70 backdrop-blur-xl border border-white/50 p-10 rounded-3xl shadow-2xl">
                <h2 className="text-3xl font-bold text-slate-800 mb-2">
                {isLogin ? 'Welcome Back' : 'Doctor Registration'}
              </h2>
              <p className="text-slate-500 mb-8">
                {isLogin ? 'Sign in to access your dashboard' : 'Join the MadhuVision network today'}
              </p>
              
              {message && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 mb-6 text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                  <ShieldCheck className="shrink-0 mt-0.5" size={18} />
                  <span>{message}</span>
                </motion.div>
              )}

              <form onSubmit={handleAuth} className="space-y-4">
                
                {!isLogin && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Doctor Name *</label>
                      <input type="text" required placeholder="Dr. John Doe" className="w-full px-4 py-2.5 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">License No. *</label>
                        <input type="text" required placeholder="MD-12345" className="w-full px-4 py-2.5 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm" value={license} onChange={(e) => setLicense(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Hospital / Clinic *</label>
                        <input type="text" required placeholder="City Hospital" className="w-full px-4 py-2.5 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm" value={hospital} onChange={(e) => setHospital(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Contact Number *</label>
                      <input type="tel" required placeholder="+91 9876543210" className="w-full px-4 py-2.5 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm" value={contact} onChange={(e) => setContact(e.target.value)} />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input type="email" required placeholder="doctor@clinic.com" className="w-full px-4 py-2.5 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                
                <div className={!isLogin ? "grid grid-cols-2 gap-4" : ""}>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Password *</label>
                    <input type="password" required placeholder="••••••••" className="w-full px-4 py-2.5 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  {!isLogin && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Confirm Password *</label>
                      <input type="password" required placeholder="••••••••" className="w-full px-4 py-2.5 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                    </div>
                  )}
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 mt-4 font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {loading ? 'Processing...' : (isLogin ? 'Sign In to Dashboard' : 'Create Doctor Account')}
                  {!loading && <ArrowRight size={18} />}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-200 text-center">
                <p className="text-slate-600 font-medium">
                  {isLogin ? "New to MadhuVision? " : "Already have an account? "}
                  <button 
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-blue-600 font-bold hover:text-blue-700 hover:underline transition-all"
                  >
                    {isLogin ? 'Create an account' : 'Sign in here'}
                  </button>
                </p>
              </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* --- Features Section (Animate on Scroll Demonstration) --- */}
      <section className="py-20 bg-white px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Why Choose MadhuVision?
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-lg text-slate-500 max-w-2xl mx-auto">
              Built by doctors, powered by mathematics. Our platform ensures every diagnosis is backed by explainable AI.
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}
              className="p-8 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-blue-600">
                <Eye size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">True Grad-CAM</h3>
              <p className="text-slate-600 leading-relaxed">
                Unlike pseudo-heatmaps, we extract exact FC layer weights to generate mathematically perfect activation maps.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}
              className="p-8 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-14 h-14 bg-cyan-100 rounded-xl flex items-center justify-center mb-6 text-cyan-600">
                <Activity size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Vessel Segmentation</h3>
              <p className="text-slate-600 leading-relaxed">
                Integrated top-hat morphological transformations perfectly isolate lesions and blood vessels in seconds.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}
              className="p-8 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mb-6 text-indigo-600">
                <ShieldCheck size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Secure & Compliant</h3>
              <p className="text-slate-600 leading-relaxed">
                Enterprise-grade security powered by Supabase. All patient data is encrypted and completely isolated.
              </p>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
