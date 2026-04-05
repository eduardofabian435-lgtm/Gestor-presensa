import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Mail, Lock, Loader2, User, HelpCircle, Chrome } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    console.log("Iniciando login com Google...");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log("Google Login Sucesso:", user.email, user.uid);

      // Check if profile exists, if not create it
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        console.log("Criando novo perfil de usuário...");
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name: user.displayName || 'Usuário',
          email: user.email || '',
          role: user.email?.toLowerCase() === "eduardofabian435@gmail.com" ? 'admin' : 'teacher'
        });
      } else {
        console.log("Perfil de usuário já existe.");
      }
      
      console.log("Navegando para a página inicial...");
      navigate('/');
    } catch (err: any) {
      console.error("Erro detalhado do Google Login:", err);
      if (err.code === 'auth/popup-blocked') {
        setError('O pop-up de login foi bloqueado pelo seu navegador. Por favor, permita pop-ups para este site.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError('O login foi cancelado. Tente novamente.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('A janela de login foi fechada antes de completar o processo.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('O login com Google não está ativado no Firebase Console.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Este domínio não está autorizado no Firebase Console. Por favor, adicione o domínio do Netlify na lista de domínios autorizados do Firebase.');
      } else {
        setError(`Erro ao entrar com Google: ${err.message || 'Erro desconhecido'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 font-sans relative overflow-hidden">
      {/* Background Cover Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=2000&auto=format&fit=crop" 
          alt="School Background"
          className="w-full h-full object-cover opacity-20"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-md w-full bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.06)] p-10 border border-white/50 relative z-10"
      >
        <div className="text-center mb-10">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-blue-600 text-white mb-6 shadow-2xl shadow-blue-200"
          >
            <ClipboardList className="w-10 h-10" />
          </motion.div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Portal de Acesso
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Sistema de Presença Institucional
          </p>
        </div>

        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl font-semibold flex items-center gap-2 overflow-hidden"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="text-center space-y-4">
            <p className="text-sm text-slate-600 font-medium px-4">
              Para garantir a segurança e facilidade de acesso, utilize sua conta institucional do Google.
            </p>
            
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-bold text-lg hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-blue-100"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Chrome className="w-6 h-6" />
                  Entrar com Google
                </>
              )}
            </button>
          </div>

          <div className="pt-6 border-t border-slate-50">
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl">
              <HelpCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Precisa de ajuda?</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Se você é um professor e não consegue acessar, entre em contato com a administração para vincular seu e-mail.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-slate-50 text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black">Segurança de Dados</p>
          <p className="text-xs text-slate-400 mt-2 font-medium">Acesso via Google Identity Service</p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
