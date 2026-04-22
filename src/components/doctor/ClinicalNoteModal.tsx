// =====================================================
// Malama — Modal de Prontuário Clínico
// Gate obrigatório para encerrar consulta
// =====================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  X, Save, CheckCircle, AlertTriangle, ChevronDown, ChevronUp,
  Activity, FileText, Stethoscope, ClipboardList, Weight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { clinicalNoteService, appointmentChatService, consultationService } from '../../services/doctorPortalService';
import type { ClinicalNote, ClinicalNoteFormData } from '../../types/doctorPortal';
import { ConsultationStatus } from '../../types/doctorPortal';

interface Props {
  consultationId: string;
  doctorId: string;
  patientId: string;
  patientName: string;
  onClose: () => void;
  onConsultationClosed: (consultationId: string) => void;
}

const EMPTY_FORM: ClinicalNoteFormData = {
  chief_complaint:    '',
  history_illness:    '',
  relevant_history:   '',
  physical_exam:      '',
  diagnosis:          '',
  plan:               '',
  free_text:          '',
  weight_kg:          '',
  height_cm:          '',
  blood_pressure_sys: '',
  blood_pressure_dia: '',
  heart_rate:         '',
  waist_cm:           '',
};

const Section: React.FC<{
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, icon, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-left"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          {icon}
          {title}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
};

const TextArea: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}> = ({ label, value, onChange, placeholder, rows = 3 }) => (
  <div>
    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800
                 focus:outline-none focus:ring-2 focus:ring-[#7d4a3c]/30 focus:border-[#7d4a3c]
                 resize-none placeholder:text-gray-300"
    />
  </div>
);

const NumericInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  step?: string;
}> = ({ label, value, onChange, suffix, step = '0.1' }) => (
  <div>
    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        step={step}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800
                   focus:outline-none focus:ring-2 focus:ring-[#7d4a3c]/30 focus:border-[#7d4a3c]"
      />
      {suffix && <span className="text-xs text-gray-400 whitespace-nowrap">{suffix}</span>}
    </div>
  </div>
);

export const ClinicalNoteModal: React.FC<Props> = ({
  consultationId,
  doctorId,
  patientId,
  patientName,
  onClose,
  onConsultationClosed,
}) => {
  const [form, setForm] = useState<ClinicalNoteFormData>(EMPTY_FORM);
  const [existingNote, setExistingNote] = useState<ClinicalNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    clinicalNoteService.getByConsultation(consultationId).then(note => {
      if (note) {
        setExistingNote(note);
        setForm({
          chief_complaint:    note.chief_complaint    ?? '',
          history_illness:    note.history_illness    ?? '',
          relevant_history:   note.relevant_history   ?? '',
          physical_exam:      note.physical_exam      ?? '',
          diagnosis:          note.diagnosis          ?? '',
          plan:               note.plan               ?? '',
          free_text:          note.free_text          ?? '',
          weight_kg:          note.weight_kg          != null ? String(note.weight_kg)          : '',
          height_cm:          note.height_cm          != null ? String(note.height_cm)          : '',
          blood_pressure_sys: note.blood_pressure_sys != null ? String(note.blood_pressure_sys) : '',
          blood_pressure_dia: note.blood_pressure_dia != null ? String(note.blood_pressure_dia) : '',
          heart_rate:         note.heart_rate         != null ? String(note.heart_rate)         : '',
          waist_cm:           note.waist_cm           != null ? String(note.waist_cm)           : '',
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [consultationId]);

  const field = useCallback(<K extends keyof ClinicalNoteFormData>(key: K) => (v: string) => {
    setForm(f => ({ ...f, [key]: v }));
  }, []);

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const note = await clinicalNoteService.upsert(consultationId, doctorId, patientId, form);
      setExistingNote(note);
      toast.success('Rascunho salvo');
    } catch {
      toast.error('Erro ao salvar rascunho');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalizeAndClose = async () => {
    if (!form.diagnosis?.trim()) {
      toast.error('Preencha pelo menos o campo Diagnóstico antes de encerrar');
      return;
    }

    setClosing(true);
    try {
      // 1. Salvar / upsert prontuário
      let note = await clinicalNoteService.upsert(consultationId, doctorId, patientId, form);

      // 2. Finalizar prontuário (is_draft = false)
      note = await clinicalNoteService.finalize(note.id);

      // 3. Verificar gate novamente
      const check = await clinicalNoteService.canCloseConsultation(consultationId);
      if (!check.can_close) {
        toast.error(check.reason ?? 'Não é possível encerrar a consulta');
        setClosing(false);
        return;
      }

      // 4. Marcar consulta como concluída
      await consultationService.updateStatus(consultationId, ConsultationStatus.COMPLETED);

      // 5. Abrir canal de chat pós-consulta (20 dias)
      await appointmentChatService.openChat(consultationId);

      toast.success('Consulta encerrada. Canal de acompanhamento aberto por 20 dias.');
      onConsultationClosed(consultationId);
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao encerrar consulta');
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl
                      flex flex-col max-h-[96dvh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#7d4a3c]" />
              Prontuário Clínico
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{patientName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Banner informativo */}
        <div className="mx-5 mt-4 flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800">
            O prontuário deve ser finalizado para encerrar a consulta. Após o encerramento, um canal de acompanhamento de <strong>20 dias</strong> será aberto automaticamente.
          </p>
        </div>

        {/* Form */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#7d4a3c] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {/* Métricas Clínicas */}
            <Section title="Métricas Clínicas" icon={<Weight className="w-4 h-4 text-[#7d4a3c]" />}>
              <div className="grid grid-cols-2 gap-3">
                <NumericInput label="Peso (kg)"    value={form.weight_kg}          onChange={field('weight_kg')}          suffix="kg" />
                <NumericInput label="Altura (cm)"  value={form.height_cm}          onChange={field('height_cm')}          suffix="cm" />
                <NumericInput label="PA Sistólica" value={form.blood_pressure_sys} onChange={field('blood_pressure_sys')} suffix="mmHg" step="1" />
                <NumericInput label="PA Diastólica" value={form.blood_pressure_dia} onChange={field('blood_pressure_dia')} suffix="mmHg" step="1" />
                <NumericInput label="FC (bpm)"     value={form.heart_rate}         onChange={field('heart_rate')}         suffix="bpm" step="1" />
                <NumericInput label="Cintura (cm)" value={form.waist_cm}           onChange={field('waist_cm')}           suffix="cm" />
              </div>
            </Section>

            {/* Anamnese */}
            <Section title="Anamnese" icon={<Stethoscope className="w-4 h-4 text-[#7d4a3c]" />}>
              <TextArea label="Queixa principal"         value={form.chief_complaint}  onChange={field('chief_complaint')}  placeholder="Motivo da consulta..." />
              <TextArea label="História da doença atual" value={form.history_illness}  onChange={field('history_illness')}  placeholder="Evolução, início dos sintomas..." />
              <TextArea label="Antecedentes relevantes"  value={form.relevant_history} onChange={field('relevant_history')} placeholder="Histórico familiar, comorbidades, medicamentos..." />
            </Section>

            {/* Exame Físico */}
            <Section title="Exame Físico" icon={<Activity className="w-4 h-4 text-[#7d4a3c]" />} defaultOpen={false}>
              <TextArea label="Exame físico" value={form.physical_exam} onChange={field('physical_exam')} placeholder="Achados do exame físico..." rows={4} />
            </Section>

            {/* Diagnóstico e Plano */}
            <Section title="Diagnóstico e Plano" icon={<ClipboardList className="w-4 h-4 text-[#7d4a3c]" />}>
              <TextArea label="Diagnóstico / CID-10 *" value={form.diagnosis} onChange={field('diagnosis')} placeholder="Hipótese diagnóstica..." />
              <TextArea label="Plano terapêutico"      value={form.plan}      onChange={field('plan')}      placeholder="Conduta, encaminhamentos, metas..." rows={4} />
            </Section>

            {/* Anotações livres */}
            <Section title="Anotações Livres" icon={<FileText className="w-4 h-4 text-gray-400" />} defaultOpen={false}>
              <TextArea label="Observações" value={form.free_text} onChange={field('free_text')} placeholder="Notas extras, orientações particulares..." rows={3} />
            </Section>
          </div>
        )}

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving || loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300
                       text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando…' : 'Salvar Rascunho'}
          </button>

          <button
            type="button"
            onClick={handleFinalizeAndClose}
            disabled={closing || loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                       bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm font-semibold
                       disabled:opacity-50 transition"
          >
            <CheckCircle className="w-4 h-4" />
            {closing ? 'Encerrando…' : 'Finalizar e Encerrar Consulta'}
          </button>
        </div>
      </div>
    </div>
  );
};
