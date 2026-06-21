// =====================================================
// Malama — Configurações Globais (Admin)
// =====================================================

import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { settingsService } from '../../services/doctorPortalService';
import toast from 'react-hot-toast';

export const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({
    default_platform_fee: '25',
    min_consultation_duration: '20',
    min_consultation_price: '80',
    support_email: 'suporte@Malama.app',
    doctor_value_bronze: '90',
    doctor_value_prata: '100',
    doctor_value_ouro: '120',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await settingsService.getAllSettings();
        const settingsMap: Record<string, string> = {};
        data.forEach(s => { settingsMap[s.key] = s.value; });
        setSettings(settingsMap);
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

          {/* Valor por consulta por patente do médico */}
          <div className="pt-4 border-t border-gray-100">
            <h4 className="text-sm font-semibold text-gray-800 mb-1">Valor por consulta realizada (patentes)</h4>
            <p className="text-xs text-gray-400 mb-3">
              Valor do repasse por consulta realizada conforme a patente do médico. A patente é
              atribuída a cada médico na aba Médicos.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🥉 Bronze (R$)</label>
                <input
                  type="number"
                  value={settings.doctor_value_bronze}
                  onChange={e => updateSetting('doctor_value_bronze', e.target.value)}
                  min={0}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🥈 Prata (R$)</label>
                <input
                  type="number"
                  value={settings.doctor_value_prata}
                  onChange={e => updateSetting('doctor_value_prata', e.target.value)}
                  min={0}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🥇 Ouro (R$)</label>
                <input
                  type="number"
                  value={settings.doctor_value_ouro}
                  onChange={e => updateSetting('doctor_value_ouro', e.target.value)}
                  min={0}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c]"
                />
              </div>
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
    </div>
  );
};
