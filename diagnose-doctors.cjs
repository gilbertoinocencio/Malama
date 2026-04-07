// Script para verificar se os médicos estão no banco de dados
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas!');
  console.error('Verifique o arquivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDoctors() {
  console.log('🔍 Verificando médicos no banco de dados...\n');

  try {
    // 1. Verificar TODOS os médicos (sem filtro de status)
    console.log('1️⃣ Buscando TODOS os médicos:');
    const { data: allDoctors, error: allError } = await supabase
      .from('doctors')
      .select('*');

    if (allError) {
      console.error('❌ Erro ao buscar médicos:', allError);
    } else {
      console.log(`✅ Encontrados ${allDoctors?.length || 0} médicos no total`);
      console.table(allDoctors);
    }

    // 2. Verificar médicos com status 'approved'
    console.log('\n2️⃣ Buscando médicos com status "approved":');
    const { data: approvedDoctors, error: approvedError } = await supabase
      .from('doctors')
      .select('*')
      .eq('status', 'approved')
      .order('rating', { ascending: false });

    if (approvedError) {
      console.error('❌ Erro ao buscar médicos aprovados:', approvedError);
    } else {
      console.log(`✅ Encontrados ${approvedDoctors?.length || 0} médicos aprovados`);
      console.table(approvedDoctors);
    }

    // 3. Verificar disponibilidade dos médicos
    if (approvedDoctors && approvedDoctors.length > 0) {
      console.log('\n3️⃣ Verificando disponibilidade dos médicos:');
      for (const doctor of approvedDoctors) {
        const { data: availability, error: availError } = await supabase
          .from('doctor_availability')
          .select('*')
          .eq('doctor_id', doctor.id)
          .eq('is_active', true);

        if (availError) {
          console.error(`❌ Erro ao buscar disponibilidade do médico ${doctor.name}:`, availError);
        } else {
          console.log(`\n📅 Médico ${doctor.name} (${doctor.id}):`);
          console.log(`   ${availability?.length || 0} horários de disponibilidade`);
          if (availability && availability.length > 0) {
            console.table(availability);
          } else {
            console.warn('   ⚠️ NENHUM horário de disponibilidade encontrado!');
          }
        }
      }
    }

    // 4. Verificar consultas existentes
    console.log('\n4️⃣ Verificando consultas existentes:');
    const { data: consultations, error: consultError } = await supabase
      .from('consultations')
      .select('*')
      .limit(10);

    if (consultError) {
      console.error('❌ Erro ao buscar consultas:', consultError);
    } else {
      console.log(`✅ Encontradas ${consultations?.length || 0} consultas`);
      if (consultations && consultations.length > 0) {
        console.table(consultations);
      }
    }

  } catch (err) {
    console.error('❌ Erro inesperado:', err);
  }
}

checkDoctors();
