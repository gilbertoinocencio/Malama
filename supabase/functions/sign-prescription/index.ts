// =====================================================
// Nura — Edge Function: sign-prescription
// Assina um PDF com o certificado ICP-Brasil do médico
// POST { pdf_base64, pfx_password, doctor_id }
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import forge from 'https://esm.sh/node-forge@1.3.1';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase      = createClient(SUPABASE_URL, SERVICE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function err(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ─── Auth guard ──────────────────────────────────────
async function getAuthDoctor(req: Request, doctor_id: string) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return null;

  const { data: doctor } = await supabase
    .from('doctors')
    .select('id')
    .eq('user_id', user.id)
    .eq('id', doctor_id)
    .single();

  return doctor ?? null;
}

// ─── Main ────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return err('Method not allowed', 405);

  let body: { pdf_base64: string; pfx_password: string; doctor_id: string };
  try {
    body = await req.json();
  } catch {
    return err('Invalid JSON body');
  }

  const { pdf_base64, pfx_password, doctor_id } = body;
  if (!pdf_base64 || !pfx_password || !doctor_id) {
    return err('pdf_base64, pfx_password e doctor_id são obrigatórios');
  }

  // 1. Validar que o JWT pertence ao médico informado
  const doctor = await getAuthDoctor(req, doctor_id);
  if (!doctor) return err('Não autorizado', 401);

  // 2. Baixar .pfx do bucket privado (tenta .pfx e .p12)
  let pfxData: ArrayBuffer | null = null;
  for (const ext of ['pfx', 'p12']) {
    const { data, error } = await supabase.storage
      .from('doctors-certificates')
      .download(`${doctor_id}/certificate.${ext}`);
    if (!error && data) {
      pfxData = await data.arrayBuffer();
      break;
    }
  }
  if (!pfxData) return err('Certificado não encontrado. Faça upload em Configurações.', 404);

  // 3. Parsear .pfx com node-forge
  let privateKey: forge.pki.rsa.PrivateKey;
  let certificate: forge.pki.Certificate;
  try {
    const pfxBuffer = forge.util.createBuffer(new Uint8Array(pfxData));
    const pfxAsn1  = forge.asn1.fromDer(pfxBuffer);
    const pfx      = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, pfx_password);

    const keyBags  = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const certBags = pfx.getBags({ bagType: forge.pki.oids.certBag });

    const keyBag  = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
    const certBag = certBags[forge.pki.oids.certBag]?.[0];

    if (!keyBag?.key || !certBag?.cert) {
      return err('Certificado inválido ou estrutura inesperada do .pfx', 422);
    }

    privateKey  = keyBag.key as forge.pki.rsa.PrivateKey;
    certificate = certBag.cert;
  } catch {
    return err('Senha incorreta ou certificado inválido', 422);
  }

  // 4. Criar assinatura PKCS#7 CMS SignedData (detached)
  let sigBase64: string;
  try {
    const pdfBytes = Uint8Array.from(atob(pdf_base64), c => c.charCodeAt(0));

    const p7 = forge.pkcs7.createSignedData();
    p7.content = forge.util.createBuffer(pdfBytes);
    p7.addCertificate(certificate);
    p7.addSigner({
      key:             privateKey,
      certificate,
      digestAlgorithm: forge.pki.oids.sha256,
      authenticatedAttributes: [
        { type: forge.pki.oids.contentType,   value: forge.pki.oids.data },
        { type: forge.pki.oids.messageDigest                              },
        { type: forge.pki.oids.signingTime,   value: new Date()          },
      ],
    });
    p7.sign({ detached: true });

    const sigDer = forge.asn1.toDer(p7.toAsn1()).getBytes();
    sigBase64 = btoa(sigDer);
  } catch (e: any) {
    return err(`Erro ao assinar: ${e?.message ?? 'desconhecido'}`, 500);
  }

  // 5. Embutir assinatura no trailer do PDF
  // Formato: PDF original + bloco de assinatura ICP-Brasil
  const encoder    = new TextEncoder();
  const pdfBytes   = Uint8Array.from(atob(pdf_base64), c => c.charCodeAt(0));
  const sigBlock   = encoder.encode(
    `\n%%ICP-BRASIL-SIGNATURE%%\n${sigBase64}\n%%END-SIGNATURE%%\n`
  );
  const signedPdf  = new Uint8Array(pdfBytes.length + sigBlock.length);
  signedPdf.set(pdfBytes);
  signedPdf.set(sigBlock, pdfBytes.length);

  const signedBase64 = btoa(String.fromCharCode(...signedPdf));
  return ok({ signed_pdf_base64: signedBase64 });
});
