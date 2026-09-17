import React, { useState } from 'react';
import { Account } from '../types';
import { formatCurrency, generateId } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { Landmark, Plus, CreditCard, Wallet, ShieldCheck, Edit3 } from 'lucide-react';

interface AccountsSummaryProps {
  accounts: Account[];
  privacyMode: boolean;
  onAddAccount: (account: Account) => void;
  onUpdateBalance: (accountId: string, newBalance: number) => void;
}

export const AccountsSummary: React.FC<AccountsSummaryProps> = ({
  accounts,
  privacyMode,
  onAddAccount,
  onUpdateBalance,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [type, setType] = useState<Account['type']>('checking');
  const [balance, setBalance] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBalanceVal, setEditBalanceVal] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(balance.replace(',', '.'));
    if (!name.trim() || isNaN(num)) return;

    const newAcc: Account = {
      id: `acc-${generateId()}`,
      name: name.trim(),
      institution: institution.trim() || name.trim(),
      type,
      balance: num,
      color: type === 'credit' ? '#1E293B' : type === 'investment' ? '#059669' : '#6366F1',
      iconName: type === 'credit' ? 'CreditCard' : type === 'investment' ? 'ShieldCheck' : 'Landmark',
    };

    onAddAccount(newAcc);
    setIsAdding(false);
    setName('');
    setInstitution('');
    setBalance('');
  };

  const handleSaveBalance = (accId: string) => {
    const num = parseFloat(editBalanceVal.replace(',', '.'));
    if (!isNaN(num)) {
      onUpdateBalance(accId, num);
    }
    setEditingId(null);
  };

  return (
    <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Landmark className="w-5 h-5 text-lime-400" />
          <h3 className="font-bold text-white text-base">Contas & Carteiras</h3>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1 text-xs font-bold bg-lime-400 hover:bg-lime-300 text-zinc-950 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-md shadow-lime-400/20"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Nova Conta</span>
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleCreate} className="p-3 bg-zinc-800/80 border border-zinc-700 rounded-xl mb-3 space-y-2.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Nome da Conta (ex: Nubank Principal)"
              value={name}
              onChange={e => setName(e.target.value)}
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-hidden focus:border-lime-400"
              required
            />
            <input
              type="text"
              placeholder="Instituição (ex: Nubank, Itaú, C6)"
              value={institution}
              onChange={e => setInstitution(e.target.value)}
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-hidden focus:border-lime-400"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              value={type}
              onChange={e => setType(e.target.value as any)}
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-hidden focus:border-lime-400 cursor-pointer"
            >
              <option value="checking">Conta Corrente / Digital</option>
              <option value="credit">Cartão de Crédito</option>
              <option value="savings">Reserva / Poupança</option>
              <option value="investment">Investimentos</option>
              <option value="cash">Dinheiro em Espécie</option>
            </select>
            <input
              type="number"
              step="0.01"
              placeholder="Saldo Inicial (R$)"
              value={balance}
              onChange={e => setBalance(e.target.value)}
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-hidden focus:border-lime-400"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-2.5 py-1 text-zinc-400 hover:text-white cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-lime-400 hover:bg-lime-300 text-zinc-950 font-bold rounded-lg cursor-pointer"
            >
              Salvar
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {accounts.map(acc => {
          const isEditing = editingId === acc.id;

          return (
            <div
              key={acc.id}
              className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-850/60 hover:bg-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs"
                    style={{ backgroundColor: acc.color }}
                  >
                    <CategoryIcon name={acc.iconName} className="w-3.5 h-3.5" />
                  </span>
                  <button
                    onClick={() => {
                      setEditingId(acc.id);
                      setEditBalanceVal(acc.balance.toString());
                    }}
                    className="text-zinc-500 hover:text-lime-400 transition-colors cursor-pointer"
                    title="Ajustar saldo"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                </div>
                <h4 className="font-semibold text-white text-xs truncate">{acc.name}</h4>
                <p className="text-[10px] text-zinc-400 truncate">{acc.institution}</p>
              </div>

              <div className="mt-3 pt-2 border-t border-zinc-800">
                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.01"
                      value={editBalanceVal}
                      onChange={e => setEditBalanceVal(e.target.value)}
                      className="w-20 px-1.5 py-0.5 text-xs bg-zinc-900 text-white border border-lime-400 rounded-md focus:outline-hidden"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveBalance(acc.id)}
                      className="px-1.5 py-0.5 bg-lime-400 text-zinc-950 text-[10px] font-bold rounded-md cursor-pointer"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <span
                    className={`font-bold text-xs tracking-tight ${
                      acc.balance < 0 ? 'text-rose-400' : 'text-white'
                    }`}
                  >
                    {formatCurrency(acc.balance, privacyMode)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
