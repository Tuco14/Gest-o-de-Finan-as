import React from 'react';
import { AlertTriangle, Trash2, X, RotateCcw } from 'lucide-react';

interface ResetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-5 animate-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 cursor-pointer transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0 ring-4 ring-rose-500/10">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Zerar Todos os Dados?</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Esta ação reiniciará o aplicativo do zero</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-300 space-y-2">
          <p className="font-semibold text-rose-300 flex items-center gap-1.5">
            <span>Atenção:</span>
            <span>Os seguintes dados locais serão apagados:</span>
          </p>
          <ul className="list-disc list-inside space-y-1 text-zinc-400 text-[11px] pl-1">
            <li>Histórico completo de transações e lançamentos</li>
            <li>Saldos ajustados e contas bancárias personalizadas</li>
            <li>Orçamentos mensais e metas financeiras</li>
            <li>Contas a pagar e histórico de parcelas</li>
          </ul>
          <p className="text-[11px] text-zinc-500 pt-1 border-t border-zinc-800/80">
            Esta operação não pode ser desfeita.
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cancelar e Manter Dados
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all cursor-pointer shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 active:scale-98"
          >
            <RotateCcw className="w-4 h-4 stroke-[2.5]" />
            <span>Sim, Zerar Tudo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
