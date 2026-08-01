// =====================================================
// Malama — Configurações Globais (Admin)
// =====================================================

import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { settingsService } from '../../services/doctorPortalService';
import { IntegracaoAsaas } from '../../components/admin/IntegracaoAsaas';
import toast from 'react-hot-toast';

// Defaults de cada chave. Ficam fora do componente para servirem de base
// do merge no load — sem isso, chave ausente no banco vira `undefined` e o
// input controlado quebra (vira não-controlado, com warning do React e o
// campo aparecendo vazio na tela).
const DEFAULT_SETTINGS: Record<string, string> = {
  default_platform_fee: '25',
  transaction_fee_percent: '5',
  min_consultation_duration: '20',
  min_consultation_price: '80',
  support_email: 'suporte@malama.app',
  doctor_value_nivel1: '90',
  doctor_value_nivel2: '100',
  doctor_value_nivel3: '120',
  psi_value_nivel1: '80',
  psi_value_nivel2: '95',
  psi_value_nivel3: '110',
};

export const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await settingsService.getAllSettings();
        const settingsMap: Record<string, string> = {};
        data.forEach(s => { settingsMap[s.key] = s.value; });
        // Merge, não substituição: o que o banco não tem mantém o default.
        setSettings({ ...DEFAULT_SETTINGS, ...settingsMap });
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(settings).map(([key, value]) =>
          settingsService.updateSetting(key, value as string)
        )
      );
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7d4a3c]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Configurações Globais da Plataforma</h3>

        <div className="space-y-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comissão de indicação de suplementos (%) — uso futuro</label>
            <input
              type="number"
              value={settings.default_platform_fee}
              onChange={e => updateSetting('default_platform_fee', e.target.value)}
              min={0}
              max={100}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c]"
            />
            <p className="text-xs text-gray-400 mt-1">Reservado para a comissão do médico em indicações de suplementos (parceria futura). Não afeta o repasse por consulta.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor mínimo de consulta (R$)</label>
            <input
              type="number"
              value={settings.min_consultation_price}
              onChange={e => updateSetting('min_consultation_price', e.target.value)}
              min={0}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duração mínima de consulta (min)</label>
            <input
              type="number"
              value={settings.min_consultation_duration}
              onChange={e => updateSetting('min_consultation_duration', e.target.value)}
              min={10}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email de suporte</label>
            <input
              type="email"
              value={settings.support_email}
              onChange={e => updateSetting('support_email', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c]"
            />
          </div>

          {/* Taxa de transação do gateway — incide sobre o repasse */}
          <div className="pt-4 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Taxa de transação do gateway (%)
            </label>
            <input
              type="number"
              value={settings.transaction_fee_percent}
              onChange={e => updateSetting('transaction_fee_percent', e.target.value)}
              min={0}
              max={99}
              step="0.01"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c]"
            />
            <p className="text-xs text-gray-400 mt-1">
              Descontada do repasse ao profissional: uma consulta de R$100 com taxa de 5%
              transfere R$95 líquidos por PIX. Vale para médicos e psicólogos. Alterar aqui
              não muda repasse já processado — cada repasse guarda a taxa que foi aplicada.
            </p>
          </div>

          {/* Valor por consulta por nível — médico */}
          <div className="pt-4 border-t border-gray-100">
            <h4 className="text-sm font-semibold text-gray-800 mb-1">
              Valor por consulta realizada — médico
            </h4>
            <p className="text-xs text-gray-400 mb-3">
              Valor do repasse por consulta realizada conforme o nível do médico. O nível é
              atribuído a cada médico na aba Médicos.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nível 1 (R$)</label>
                <input
                  type="number"
                  value={settings.doctor_value_nivel1}
                  onChange={e => updateSetting('doctor_value_nivel1', e.target.value)}
                  min={0}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nível 2 (R$)</label>
                <input
                  type="number"
                  value={settings.doctor_value_nivel2}
                  onChange={e => updateSetting('doctor_value_nivel2', e.target.value)}
                  min={0}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nível 3 (R$)</label>
                <input
                  type="number"
                  value={settings.doctor_value_nivel3}
                  onChange={e => updateSetting('doctor_value_nivel3', e.target.value)}
                  min={0}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c]"
                />
              </div>
            </div>
          </div>

          {/* Valor por consulta por nível — psicólogo.
              Tabela própria: sessão de psicologia tem duração, custo e
              mercado diferentes; com uma chave só, um dos dois ficaria errado. */}
          <div className="pt-4 border-t border-gray-100">
            <h4 className="text-sm font-semibold text-gray-800 mb-1">
              Valor por sessão realizada — psicólogo
            </h4>
            <p className="text-xs text-gray-400 mb-3">
              Tabela separada da do médico. Vale checar contra o mercado antes de credenciar:
              abaixo do piso, a rede não se sustenta e a rotatividade quebra a continuidade do
              acompanhamento.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([1, 2, 3] as const).map(n => (
                <div key={n}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nível {n} (R$)
                  </label>
                  <input
                    type="number"
                    value={settings[`psi_value_nivel${n}`] ?? ''}
                    onChange={e => updateSetting(`psi_value_nivel${n}`, e.target.value)}
                    min={0}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c]"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-[#7d4a3c] hover:bg-[#623a2f] text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar configurações'}
          </button>
        </div>
      </div>

      <IntegracaoAsaas />
    </div>
  );
};
