import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const geminiApiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!supabaseUrl || !supabaseKey || !geminiApiKey) {
    console.error("Missing required environment variables.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenerativeAI(geminiApiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

async function generateSummary(userId) {
    console.log(`Processing user: ${userId}`);
    
    // Determine the period (last 3 months)
    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setMonth(periodStart.getMonth() - 3);

    // Fetch user profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
    // Fetch onboarding data
    const { data: onboardingSession } = await supabase
        .from('chat_sessions')
        .select('onboarding_data')
        .eq('user_id', userId)
        .eq('session_type', 'onboarding')
        .single();
    
    // Fetch chat history for the period
    const { data: chats } = await supabase
        .from('chat_messages')
        .select('role, content, created_at')
        .eq('user_id', userId)
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString())
        .order('created_at', { ascending: true })
        // Limiting to recent to avoid huge token usage, in a real app this would use summarization chains
        .limit(100);

    // Filter to only user and agent interactions
    const promptContext = (chats || []).map(c => `${c.role === 'user' ? 'Usuário' : 'Agente'}: ${c.content}`).join('\n');

    const prompt = `
Você é uma assistente de IA responsável por gerar um resumo contínuo sobre um paciente (usuário).
Seu objetivo é extrair o essencial dos últimos meses de interação para salvar na 'memória de longo prazo' da nutricionista.

PERFIL DO USUÁRIO:
Nome/ID: ${profile?.display_name || userId}
Objetivos declarados no onboarding: ${JSON.stringify(onboardingSession?.onboarding_data || {})}

HISTÓRICO RECENTE DE CONVERSAS:
${promptContext}

TAREFA:
Escreva um parágrafo conciso (max 500 caracteres) resumindo o progresso do usuário nestes 3 meses. 
Foque em:
1. O que funcionou e o que não funcionou.
2. Novos gostos ou aversões descobertos.
3. Desafios de adesão à dieta.

O resumo deve ser escrito em terceira pessoa para que a Nutricionista leia e rapidamente entenda o contexto passado do paciente.
  `;

  try {
      const result = await model.generateContent(prompt);
      const summaryText = result.response.text();

      // Save to database
      const { error } = await supabase
        .from('historical_summaries')
        .insert({
            user_id: userId,
            period_start: periodStart.toISOString().split('T')[0],
            period_end: periodEnd.toISOString().split('T')[0],
            summary: summaryText.trim()
        });

      if (error) {
          console.error("Failed to save summary for user", userId, error);
      } else {
          console.log(`Successfully generated summary for user ${userId}.`);
      }
  } catch(e) {
      console.error(`Failed to generate summary for user ${userId}`, e.message);
  }
}

async function main() {
    // Usually this would iterate over users who just finished a 3-month cycle.
    // For demo/script purposes, we will pick all users or accept an argument.
    const userIdArg = process.argv[2];
    
    if (userIdArg) {
        await generateSummary(userIdArg);
    } else {
        const { data: users } = await supabase.from('profiles').select('id');
        for (const u of (users || [])) {
            await generateSummary(u.id);
        }
    }
    console.log("Historical summary generation complete.");
}

main();
