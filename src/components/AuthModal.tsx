import React, { useState } from 'react';
import { 
  User as FirebaseUser, 
  signInWithPopup, 
  googleProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  auth
} from '../lib/firebase';
import { LogIn, LogOut, Cloud, CloudOff, User, Mail, Lock, AlertCircle, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: FirebaseUser | null;
  onSuccessToast: (msg: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  user,
  onSuccessToast,
}) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onSuccessToast('Conectado à nuvem com sucesso! Seus dados agora sincronizam automaticamente.');
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Falha ao conectar com Google');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor preencha email e senha.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
        onSuccessToast('Conta criada com sucesso! Dados sincronizados na nuvem.');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        onSuccessToast('Login realizado com sucesso! Seus dados foram carregados.');
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está cadastrado. Tente entrar em vez de criar conta.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError(err.message || 'Erro ao autenticar.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      onSuccessToast('Você saiu da conta na nuvem.');
      onClose();
    } catch (err: any) {
      setError('Erro ao desconectar.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {user ? (
          <div className="space-y-5 text-center">
            <div className="w-14 h-14 bg-lime-400/20 text-lime-400 rounded-full flex items-center justify-center mx-auto ring-4 ring-lime-400/10">
              <Cloud className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">Sincronização em Nuvem Ativa</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Conectado como <strong className="text-zinc-200">{user.email || 'Usuário'}</strong>
              </p>
            </div>

            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-400 text-left space-y-1.5">
              <div className="flex items-center gap-2 text-lime-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse"></span>
                <span>Sincronização em Tempo Real</span>
              </div>
              <p>
                Qualquer transação, conta ou meta que você criar ou editar será salva diretamente na nuvem e estará disponível imediatamente em qualquer outro dispositivo ou navegador.
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-2.5 px-4 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Desconectar desta Conta</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-lime-400/20 text-lime-400 flex items-center justify-center">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  {isRegistering ? 'Criar Conta na Nuvem' : 'Acessar em Qualquer Dispositivo'}
                </h2>
                <p className="text-xs text-zinc-400">
                  Carregue suas informações automaticamente em qualquer navegador
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Google Sign-in */}
            <button
              id="google-login-btn"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-white hover:bg-zinc-100 text-zinc-900 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continuar com Google</span>
            </button>

            <div className="flex items-center gap-3 my-3">
              <div className="h-px bg-zinc-800 flex-1" />
              <span className="text-[11px] text-zinc-500 uppercase font-semibold">ou por e-mail</span>
              <div className="h-px bg-zinc-800 flex-1" />
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">E-mail</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-lime-400 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-600 outline-hidden transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Senha</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-lime-400 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-600 outline-hidden transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-lime-400 hover:bg-lime-300 text-zinc-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-lime-400/20 disabled:opacity-50"
              >
                <LogIn className="w-4 h-4 stroke-[2.5]" />
                <span>{isRegistering ? 'Cadastrar e Sincronizar' : 'Entrar e Carregar Dados'}</span>
              </button>
            </form>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError(null);
                }}
                className="text-xs text-zinc-400 hover:text-lime-400 transition-colors cursor-pointer"
              >
                {isRegistering
                  ? 'Já possui uma conta? Faça login aqui'
                  : 'Não tem conta ainda? Crie gratuitamente'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
