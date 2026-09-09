import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "ai_telemedicine": "AI-Powered Telemedicine",
      "hero_title": "Detect Diabetic Retinopathy",
      "hero_title_highlight": "in Seconds.",
      "hero_subtitle": "Empowering doctors with mathematically precise Grad-CAM visualizations and state-of-the-art AI lesion segmentation for early blindness prevention.",
      "welcome_back": "Welcome Back",
      "create_account": "Create Account",
      "sign_in_desc": "Sign in to access your dashboard",
      "join_desc": "Join the MadhuVision network today",
      "email_label": "Email Address",
      "password_label": "Password",
      "sign_in_btn": "Sign In to Dashboard",
      "create_btn": "Create Free Account",
      "processing": "Processing...",
      "new_to": "New to MadhuVision? ",
      "already_have": "Already have an account? ",
      "create_here": "Create an account",
      "sign_in_here": "Sign in here"
    }
  },
  hi: {
    translation: {
      "ai_telemedicine": "AI-संचालित टेलीमेडिसिन",
      "hero_title": "डायबिटिक रेटिनोपैथी का पता लगाएं",
      "hero_title_highlight": "कुछ ही सेकंड में।",
      "hero_subtitle": "गणितीय रूप से सटीक AI और शुरुआती अंधेपन की रोकथाम के लिए डॉक्टरों को सशक्त बनाना।",
      "welcome_back": "वापसी पर स्वागत है",
      "create_account": "खाता बनाएं",
      "sign_in_desc": "अपने डैशबोर्ड तक पहुंचने के लिए साइन इन करें",
      "join_desc": "आज ही मधुविज़न (MadhuVision) नेटवर्क से जुड़ें",
      "email_label": "ईमेल पता",
      "password_label": "पासवर्ड",
      "sign_in_btn": "डैशबोर्ड में साइन इन करें",
      "create_btn": "मुफ़्त खाता बनाएँ",
      "processing": "प्रोसेसिंग...",
      "new_to": "मधुविज़न पर नए हैं? ",
      "already_have": "क्या आपके पास पहले से खाता है? ",
      "create_here": "एक खाता बनाएं",
      "sign_in_here": "यहाँ साइन इन करें"
    }
  },
  te: {
    translation: {
      "ai_telemedicine": "AI-ఆధారిత టెలిమెడిసిన్",
      "hero_title": "డయాబెటిక్ రెటినోపతిని గుర్తించండి",
      "hero_title_highlight": "సెకన్లలో.",
      "hero_subtitle": "ఖచ్చితమైన AI విశ్లేషణ మరియు ప్రారంభ అంధత్వ నివారణ కోసం వైద్యులకు సాధికారత కల్పించడం.",
      "welcome_back": "తిరిగి స్వాగతం",
      "create_account": "ఖాతా సృష్టించండి",
      "sign_in_desc": "మీ డాష్‌బోర్డ్‌ను యాక్సెస్ చేయడానికి సైన్ ఇన్ చేయండి",
      "join_desc": "ఈరోజే MadhuVision నెట్‌వర్క్‌లో చేరండి",
      "email_label": "ఇమెయిల్ చిరునామా",
      "password_label": "పాస్‌వర్డ్",
      "sign_in_btn": "డాష్‌బోర్డ్‌కు సైన్ ఇన్ చేయండి",
      "create_btn": "ఉచిత ఖాతాను సృష్టించండి",
      "processing": "ప్రాసెస్ చేయబడుతోంది...",
      "new_to": "MadhuVision కి కొత్తా? ",
      "already_have": "ఇప్పటికే ఖాతా ఉందా? ",
      "create_here": "ఖాతాను సృష్టించండి",
      "sign_in_here": "ఇక్కడ సైన్ ఇన్ చేయండి"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;
