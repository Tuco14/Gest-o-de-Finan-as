import React, { useState } from 'react';
import { 
  User as FirebaseUser, 
  signInWithPopup, 
  signInWithRedirect,
  googleProvider, 
  signOut, 
  auth 
} from '../lib/firebase';
import { 
  LogOut, 
  Cloud, 
  AlertCircle, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  ArrowRight,
  Globe,
  CheckCircle2
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: FirebaseUser | null;
  localUser?: { name: string; email: string } | null;
  onSaveLocalUser?: (name: string, email: string) => void;
  onClearLocalUser?: () => void;
  onSuccessToast: (msg: string) => void;
}

type ErrorType = 
  | 'OPERATION_NOT_ALLOWED' 
  | 'UNAUTHORIZED_DOMAIN' 
  | 'POPUP_BLOCKED' 
  | 'POPUP_CLOSED' 
  | 'GENERIC'
  | null;

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  user,
  localUser,
  onSaveLocalUser,
  onClearLocalUser,
  onSuccessToast,
}) => {
  const [isLocalModeOpen, setIsLocalModeOpen] = useState(false);
  const [localName, setLocalName] = useState(localUser?.name || 'Administrador');
  const [localEmail, setLocalEmail] = useState(localUser?.email || '');

  const [loading, setLoading] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  // Estados de erro detalhados
  const [errorType, setErrorType] = useState<ErrorType>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rawErrorCode, setRawErrorCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const firebaseProjectId = 'pioneering-shift-2q6d2';

  const handleCopyDomain = () => {
    if (!currentHostname) return;
    navigator.clipboard.writeText(currentHostname);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2500);
  };

  const handleGoogleLogin = async () => {
    setErrorType(null);
    setErrorMessage(null);
    setRawErrorCode(null);
    setLoading(true);

    try {
      await signInWithPopup(auth, googleProvider);
      onSuccessToast('Conectado à nuvem com sucesso! Seus dados agora sincronizam automaticamente.');
      onClose();
    } catch (err: any) {
      console.error('Erro no login Google:', err);
      const code = err?.code || '';
      const msg = err?.message || '';
      setRawErrorCode(code);

      if (code === 'auth/operation-not-allowed' || msg.includes('operation-not-allowed')) {
        setErrorType('OPERATION_NOT_ALLOWED');
        setErrorMessage('O provedor de login Google precisa ser ativado no Firebase Console.');
      } else if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
        setErrorType('UNAUTHORIZED_DOMAIN');
        setErrorMessage(`O domínio "${currentHostname}" não está autorizado no Firebase Authentication.`);
      } else if (code === 'auth/popup-blocked' || msg.includes('popup-blocked')) {
        setErrorType('POPUP_BLOCKED');
        setErrorMessage('O navegador ou iframe bloqueou a janela pop-up do Google.');
      } else if (code === 'auth/popup-closed-by-user' || msg.includes('popup-closed-by-user')) {
        setErrorType('POPUP_CLOSED');
        setErrorMessage('A janela do Google foi fechada antes de concluir o login.');
      } else if (code === 'auth/cancelled-popup-request') {
        setErrorType('GENERIC');
        setErrorMessage('Solicitação de login anterior cancelada. Tente novamente.');
      } else if (code === 'auth/network-request-failed') {
        setErrorType('GENERIC');
        setErrorMessage('Erro de conexão com os servidores do Firebase. Verifique sua internet ou bloqueador de anúncios.');
      } else {
        setErrorType('GENERIC');
        setErrorMessage(msg || 'Falha ao autenticar com o Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRedirectLogin = async () => {
    setErrorType(null);
    setErrorMessage(null);
    setLoading(true);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err: any) {
      console.error('Erro no redirect Google:', err);
      setErrorType('GENERIC');
      setErrorMessage(err?.message || 'Falha ao iniciar redirecionamento.');
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      if (onClearLocalUser) onClearLocalUser();
      onSuccessToast('Você saiu da conta na nuvem.');
      onClose();
    } catch (err: any) {
      setErrorType('GENERIC');
      setErrorMessage('Erro ao desconectar.');
    }
  };

  const handleSaveLocalProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localName.trim()) return;
    if (onSaveLocalUser) {
      onSaveLocalUser(localName.trim(), localEmail.trim() || 'usuario@local.app');
    }
    onSuccessToast('Perfil local ativado! Seus dados continuam seguros e salvos no navegador.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 cursor-pointer transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {user ? (
          /* Usuário Conectado ao Google / Firebase */
          <div className="space-y-5 text-center">
            <div className="w-14 h-14 bg-lime-400/20 text-lime-400 rounded-full flex items-center justify-center mx-auto ring-4 ring-lime-400/10">
              <Cloud className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">Sincronização em Nuvem Ativa</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Conectado com conta Google: <br />
                <strong className="text-zinc-200 font-medium">{user.email || 'Conta Google'}</strong>
              </p>
            </div>

            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-400 text-left space-y-1.5">
              <div className="flex items-center gap-2 text-lime-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse"></span>
                <span>Firestore em Tempo Real Conectado</span>
              </div>
              <p>
                Todas as suas transações, categorias, contas e metas estão sendo salvas automaticamente no banco de dados na nuvem e sincronizadas entre seus dispositivos.
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-2.5 px-4 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Desconectar Conta Google</span>
            </button>
          </div>
        ) : (
          /* Não Conectado: Foco Exclusivo no Login com Google */
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-lime-400/20 text-lime-400 flex items-center justify-center shrink-0">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  Sincronizar com Google
                </h2>
                <p className="text-xs text-zinc-400">
                  Acesse suas finanças em qualquer dispositivo com 1 clique
                </p>
              </div>
            </div>

            {/* DIAGNÓSTICO: OPERAÇÃO NÃO PERMITIDA (auth/operation-not-allowed) */}
            {errorType === 'OPERATION_NOT_ALLOWED' && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2.5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4.5 h-4.5 shrink-0 text-amber-400 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-white">Google Sign-In precisa ser ativado no Firebase Console</p>
                    <p className="text-[11px] text-zinc-300">
                      O provedor Google precisa estar com status <strong>Ativado</strong> no console do projeto.
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-[11px] space-y-2">
                  <p className="font-semibold text-zinc-200">Como ativar no Firebase Console:</p>
                  <ol className="list-decimal list-inside space-y-1 text-zinc-300">
                    <li>
                      Acesse o projeto <code className="text-lime-400 bg-zinc-900 px-1 py-0.5 rounded">{firebaseProjectId}</code>
                    </li>
                    <li>
                      Abra o menu <strong className="text-white">Build &gt; Authentication &gt; Sign-in method</strong>
                    </li>
                    <li>
                      Clique em <strong className="text-lime-400">Google</strong>, marque <strong className="text-white">Ativar</strong> e salve
                    </li>
                  </ol>
                  <a
                    href={`https://console.firebase.google.com/project/${firebaseProjectId}/authentication/providers`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-lime-400 hover:text-lime-300 font-semibold pt-1 transition-colors"
                  >
                    <span>Ir para Provedores no Console</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            {/* DIAGNÓSTICO: DOMÍNIO NÃO AUTORIZADO (auth/unauthorized-domain) */}
            {errorType === 'UNAUTHORIZED_DOMAIN' && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2.5">
                <div className="flex items-start gap-2">
                  <Globe className="w-4.5 h-4.5 shrink-0 text-amber-400 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-white">Domínio precisa de autorização no Firebase</p>
                    <p className="text-[11px] text-zinc-300">
                      O Firebase exige que o endereço atual esteja listado em Domínios Autorizados.
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-[11px] space-y-2">
                  <div className="flex items-center justify-between gap-2 bg-zinc-900 p-2 rounded-md border border-zinc-800">
                    <span className="font-mono text-lime-400 truncate">{currentHostname}</span>
                    <button
                      type="button"
                      onClick={handleCopyDomain}
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {copiedDomain ? <Check className="w-3 h-3 text-lime-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedDomain ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>

                  <p className="font-semibold text-zinc-200">Como adicionar no Firebase:</p>
                  <ol className="list-decimal list-inside space-y-1 text-zinc-300">
                    <li>Vá em <strong className="text-white">Authentication &gt; Settings &gt; Authorized domains</strong></li>
                    <li>Clique em <strong className="text-white">Add domain</strong> e cole o domínio copiado acima</li>
                  </ol>
                  <a
                    href={`https://console.firebase.google.com/project/${firebaseProjectId}/authentication/settings`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-lime-400 hover:text-lime-300 font-semibold pt-1 transition-colors"
                  >
                    <span>Configurar Domínios no Console</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            {/* DIAGNÓSTICO: POPUP BLOQUEADO / FECHADO */}
            {(errorType === 'POPUP_BLOCKED' || errorType === 'POPUP_CLOSED') && (
              <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-200 text-xs space-y-2.5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4.5 h-4.5 shrink-0 text-sky-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-white">Janela pop-up foi bloqueada pelo navegador</p>
                    <p className="text-[11px] text-zinc-300 mt-0.5">
                      Para evitar restrições de pop-up ou de iframe, você pode entrar usando o redirecionamento direto abaixo:
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleRedirectLogin}
                  disabled={loading}
                  className="w-full py-2 px-3 bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Entrar com Redirecionamento Direto (sem pop-up)</span>
                </button>
              </div>
            )}

            {/* ERRO GENÉRICO */}
            {errorType === 'GENERIC' && errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <div className="space-y-1">
                  <span>{errorMessage}</span>
                  {rawErrorCode && (
                    <p className="text-[10px] font-mono text-rose-400/80">Código: {rawErrorCode}</p>
                  )}
                </div>
              </div>
            )}

            {/* BENEFÍCIOS DO LOGIN COM GOOGLE */}
            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-zinc-200 font-semibold text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-lime-400" />
                <span>Vantagens da Sincronização em Nuvem</span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-zinc-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                  <span>Sincronização instantânea e automática em tempo real</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                  <span>Acesse seus lançamentos no celular, tablet e computador</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                  <span>Backup contínuo e protegido com sua conta Google</span>
                </li>
              </ul>
            </div>

            {/* BOTÃO PRINCIPAL DE LOGIN: GOOGLE */}
            <div className="space-y-2.5">
              <button
                id="google-login-btn"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3 px-4 bg-white hover:bg-zinc-100 text-zinc-900 font-bold rounded-xl text-xs flex items-center justify-center gap-3 transition-all cursor-pointer shadow-md hover:shadow-lg disabled:opacity-50 active:scale-99"
              >
                <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span className="text-sm font-semibold">{loading ? 'Conectando ao Google...' : 'Continuar com Google'}</span>
              </button>

              <button
                type="button"
                onClick={handleGoogleRedirectLogin}
                disabled={loading}
                className="w-full py-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer text-center"
              >
                O pop-up não abriu? Clique para entrar por redirecionamento direto
              </button>
            </div>

            {/* MODO LOCAL / CONVIDADO (Sem bloqueio) */}
            <div className="pt-2 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => setIsLocalModeOpen(!isLocalModeOpen)}
                className="w-full flex items-center justify-between text-xs text-zinc-400 hover:text-zinc-200 py-1.5 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-lime-400" />
                  <span>Prefere usar sem nuvem? <strong>Modo Local</strong></span>
                </span>
                {isLocalModeOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {isLocalModeOpen && (
                <form onSubmit={handleSaveLocalProfile} className="mt-2.5 p-3.5 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-2.5">
                  <p className="text-[11px] text-zinc-400">
                    Seu progresso, contas, lançamentos e metas ficam 100% salvos no armazenamento local do seu navegador, sem depender de conexões externas.
                  </p>

                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-400 mb-1">Seu Nome ou Apelido</label>
                    <input
                      type="text"
                      required
                      value={localName}
                      onChange={e => setLocalName(e.target.value)}
                      placeholder="Ex: Carlos Silva"
                      className="w-full bg-zinc-900 border border-zinc-700 focus:border-lime-400 rounded-lg py-1.5 px-2.5 text-xs text-white placeholder-zinc-500 outline-hidden"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Check className="w-3.5 h-3.5 text-lime-400" />
                    <span>Ativar Modo Local Seguro</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
