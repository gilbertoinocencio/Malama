// =====================================================
// Malama — Galeria de Exames do Paciente (visão médico)
// =====================================================

import React, { useEffect, useState } from 'react';
import {
  FileText, Image as ImageIcon, Download, Eye,
  MessageSquare, Save, X, Calendar, Building
} from 'lucide-react';
import toast from 'react-hot-toast';
import { patientExamService } from '../../services/doctorPortalService';
import type { PatientExam } from '../../types/doctorPortal';

interface Props {
  doctorId: string;
  patientId: string;
}

const FileIcon: React.FC<{ fileType: string | null }> = ({ fileType }) => {
  if (fileType?.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-blue-500" />;
  return <FileText className="w-5 h-5 text-red-500" />;
};

const formatFileSize = (kb: number | null) => {
  if (!kb) return '';
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

const NoteModal: React.FC<{
  exam: PatientExam;
  doctorId: string;
  onSave: (exam: PatientExam) => void;
  onClose: () => void;
}> = ({ exam, doctorId, onSave, onClose }) => {
  const [note, setNote] = useState(exam.doctor_note ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await patientExamService.reviewExam(exam.id, note, doctorId);
      onSave(updated);
      toast.success('Anotação salva');
      onClose();
    } catch {
      toast.error('Erro ao salvar anotação');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#7d4a3c]" />
            Anotação médica — {exam.exam_name}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={5}
          placeholder="Interpretação clínica, valores de referência, próximas condutas..."
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800
                     focus:outline-none focus:ring-2 focus:ring-[#7d4a3c]/30 focus:border-[#7d4a3c]
                     resize-none"
        />

        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[#7d4a3c] hover:bg-[#623a2f] text-white
                       text-sm font-medium rounded-xl disabled:opacity-50 transition"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const PatientExamPanel: React.FC<Props> = ({ doctorId, patientId }) => {
  const [exams, setExams] = useState<PatientExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [annotating, setAnnotating] = useState<PatientExam | null>(null);
  const [preview, setPreview] = useState<PatientExam | null>(null);

  useEffect(() => {
    patientExamService.getPatientExams(patientId, doctorId)
      .then(setExams)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [patientId, doctorId]);

  const handleSaveNote = (updated: PatientExam) => {
    setExams(prev => prev.map(e => e.id === updated.id ? updated : e));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-2 border-[#7d4a3c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (exams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-gray-300" />
        </div>
        <p className="font-semibold text-gray-700 mb-1">Nenhum exame enviado</p>
        <p className="text-sm text-gray-400 max-w-xs">
          O paciente pode enviar exames pelo app. Eles aparecerão aqui para sua análise.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {exams.map(exam => (
          <div
            key={exam.id}
            className="flex flex-col border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition"
          >
            {/* Thumbnail */}
            {exam.file_type?.startsWith('image/') ? (
              <div
                className="h-36 bg-gray-100 cursor-pointer overflow-hidden"
                onClick={() => setPreview(exam)}
              >
                <img
                  src={exam.file_url ?? undefined}
                  alt={exam.exam_name}
                  className="w-full h-full object-cover hover:scale-105 transition"
                />
              </div>
            ) : (
              <div className="h-36 bg-gray-50 flex flex-col items-center justify-center gap-2 cursor-pointer"
                   onClick={() => exam.file_url && window.open(exam.file_url, '_blank', 'noopener,noreferrer')}>
                <FileText className="w-10 h-10 text-gray-300" />
                <span className="text-xs text-gray-400">PDF / Documento</span>
              </div>
            )}

            {/* Info */}
            <div className="p-4 flex-1 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileIcon fileType={exam.file_type} />
                  <p className="font-semibold text-sm text-gray-800 leading-tight">{exam.exam_name}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={exam.file_url ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
                    title="Visualizar"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                  <a
                    href={exam.file_url ?? undefined}
                    download={exam.file_name}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                {exam.exam_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(exam.exam_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </span>
                )}
                {exam.lab_name && (
                  <span className="flex items-center gap-1">
                    <Building className="w-3 h-3" />
                    {exam.lab_name}
                  </span>
                )}
                {exam.file_size_kb && (
                  <span>{formatFileSize(exam.file_size_kb)}</span>
                )}
              </div>

              {/* Doctor note */}
              {exam.doctor_note ? (
                <div className="mt-1 p-2.5 bg-amber-50 border border-amber-100 rounded-lg">
                  <p className="text-xs text-amber-800 leading-relaxed">{exam.doctor_note}</p>
                  <p className="text-[10px] text-amber-500 mt-1">
                    Anotado em {new Date(exam.reviewed_at!).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              ) : (
                <div className="mt-1 p-2 bg-gray-50 border border-dashed border-gray-200 rounded-lg flex items-center gap-2">
                  <span className="text-xs text-gray-400 italic flex-1">Sem anotação médica</span>
                </div>
              )}

              <button
                onClick={() => setAnnotating(exam)}
                className="mt-auto flex items-center gap-1.5 text-xs font-medium text-[#7d4a3c]
                           hover:text-[#623a2f] transition"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {exam.doctor_note ? 'Editar anotação' : 'Adicionar anotação'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Image lightbox */}
      {preview && preview.file_type?.startsWith('image/') && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreview(null)}
        >
          <img
            src={preview.file_url ?? undefined}
            alt={preview.exam_name}
            className="max-w-full max-h-[90vh] rounded-xl object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setPreview(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Annotation modal */}
      {annotating && (
        <NoteModal
          exam={annotating}
          doctorId={doctorId}
          onSave={handleSaveNote}
          onClose={() => setAnnotating(null)}
        />
      )}
    </>
  );
};
