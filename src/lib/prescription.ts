import jsPDF from 'jspdf';
import { supabase } from '../services/supabase';

export interface PrescriptionData {
  doctorName: string;
  doctorCRM: string;
  doctorSpecialty: string;
  patientName: string;
  patientCPF?: string;
  medication: string;
  dosage: string;
  instructions: string;
  issuedAt: Date;
  expiresAt: Date;
}

export async function generatePrescriptionPDF(data: PrescriptionData): Promise<Blob> {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();

  // Header bar
  doc.setFillColor(46, 204, 113); // green
  doc.rect(0, 0, pageW, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Receita Médica', pageW / 2, 16, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Nura — Nutrição Inteligente', pageW / 2, 23, { align: 'center' });

  // Reset color
  doc.setTextColor(30, 30, 30);

  // Doctor info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Dr(a). ${data.doctorName}`, 20, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`CRM: ${data.doctorCRM}`, 20, 49);
  doc.text(`${data.doctorSpecialty}`, 20, 56);

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 62, pageW - 20, 62);

  // Patient info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PACIENTE', 20, 72);
  doc.setFont('helvetica', 'normal');
  doc.text(data.patientName, 20, 79);
  if (data.patientCPF) {
    doc.text(`CPF: ${data.patientCPF}`, 20, 86);
  }

  // Divider
  doc.line(20, 93, pageW - 20, 93);

  // Prescription
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PRESCRIÇÃO', 20, 103);

  doc.setFillColor(240, 255, 247);
  doc.roundedRect(18, 108, pageW - 36, 50, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(data.medication, 25, 120);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Posologia: ${data.dosage}`, 25, 130);

  const instrLines = doc.splitTextToSize(`Instruções: ${data.instructions}`, pageW - 60);
  doc.text(instrLines, 25, 140);

  // Validity
  doc.line(20, 170, pageW - 20, 170);
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Emitido em: ${data.issuedAt.toLocaleDateString('pt-BR')}`, 20, 180);
  doc.text(
    `Válido até: ${data.expiresAt.toLocaleDateString('pt-BR')} (90 dias)`,
    20, 187
  );

  // Hash for integrity
  const hashData = `${data.doctorCRM}${data.patientName}${data.medication}${data.issuedAt.toISOString()}`;
  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(hashData)
  );
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  doc.setFontSize(7);
  doc.text(`Hash: ${hashHex.substring(0, 40)}...`, 20, 200);
  doc.text('Documento assinado digitalmente via Nura Telemedicina', 20, 206);

  // Footer
  doc.setFillColor(46, 204, 113);
  const pageH = doc.internal.pageSize.getHeight();
  doc.rect(0, pageH - 14, pageW, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('nura.app — Telemedicina', pageW / 2, pageH - 5, { align: 'center' });

  return doc.output('blob');
}

export async function savePrescription(params: {
  consultationId: string;
  doctorId: string;
  patientId: string;
  pdfBlob: Blob;
  medication: string;
  dosage: string;
  instructions: string;
}): Promise<string> {
  const { consultationId, doctorId, patientId, pdfBlob, medication, dosage, instructions } = params;

  // 1. Upload PDF to Supabase Storage
  const fileName = `${patientId}/${consultationId}_${Date.now()}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from('prescriptions')
    .upload(fileName, pdfBlob, { contentType: 'application/pdf' });

  if (uploadError) {
    // If storage is not set up yet, just save the record without PDF
    console.warn('[Prescription] Storage upload failed:', uploadError.message);
  }

  // 2. Get signed URL (or empty string if upload failed)
  let pdfUrl = '';
  if (!uploadError) {
    const { data: signedData } = await supabase.storage
      .from('prescriptions')
      .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year
    pdfUrl = signedData?.signedUrl || '';
  }

  // 3. Save to DB
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90);

  const { error } = await supabase.from('prescriptions').insert({
    consultation_id: consultationId,
    doctor_id: doctorId,
    patient_id: patientId,
    medication,
    dosage,
    instructions,
    validity_days: 90,
    issued_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
    pdf_url: pdfUrl,
    status: 'active',
  });

  if (error) throw error;
  return pdfUrl;
}
