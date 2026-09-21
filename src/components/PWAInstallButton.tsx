import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Share, PlusSquare, X, CheckCircle2 } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  // Se já estiver instalado e rodando em modo standalone, ocultamos o botão
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-lime-400 hover:bg-lime-300 text-zinc-950 transition-all cursor-pointer shadow-md shadow-lime-400/20 active:scale-95"
        title="Instalar aplicativo no celular ou computador"
      >
        <Download className="w-3.5 h-3.5 stroke-[2.5]" />
        <span>Instalar App</span>
      </button>

      {/* Modal com Instruções de Instalação */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-lime-400/10 border border-lime-400/30 flex items-center justify-center text-lime-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Instalar FinControl</h3>
                  <p className="text-[11px] text-zinc-400">Aplicativo nativo para celular e PC</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-zinc-850 p-3.5 rounded-xl border border-zinc-800 space-y-3 text-xs">
              {isIOS ? (
                <>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-md bg-zinc-700 text-zinc-200 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      1
                    </div>
                    <p className="text-zinc-300">
                      No Safari do iOS, toque no botão <strong className="text-white">Compartilhar</strong> (<Share className="w-3 h-3 inline text-lime-400" />) na barra inferior.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-md bg-zinc-700 text-zinc-200 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      2
                    </div>
                    <p className="text-zinc-300">
                      Role para baixo e selecione <strong className="text-white">"Adicionar à Tela de Início"</strong> (<PlusSquare className="w-3 h-3 inline text-lime-400" />).
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-md bg-lime-400/20 text-lime-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      1
                    </div>
                    <p className="text-zinc-300">
                      No Chrome, Edge ou navegador mobile, clique no ícone de <strong className="text-white">Instalar</strong> na barra de endereços ou abra o menu (três pontinhos).
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-md bg-lime-400/20 text-lime-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      2
                    </div>
                    <p className="text-zinc-300">
                      Selecione <strong className="text-white">"Instalar FinControl"</strong> ou <strong className="text-white">"Adicionar à tela inicial"</strong>.
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-1.5 text-[11px] text-zinc-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                <span>Funciona 100% offline com dados salvos no aparelho</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                <span>Carregamento instantâneo sem barra de navegador</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
