import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from './supabase';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
let genAI: GoogleGenerativeAI | null = null;

const getGenAI = () => {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(apiKey || 'mock_key');
  }
  return genAI;
};

const MODEL_NAME = "gemini-2.5-flash"; // Vision model

// ============================================
// TypeScript Interfaces
// ============================================

export interface BodyMeasurements {
  waist?: number;
  hip?: number;
  chest?: number;
  arm_left?: number;
  arm_right?: number;
  thigh_left?: number;
  thigh_right?: number;
  calf_left?: number;
  calf_right?: number;
}

export interface BodyAnalysisResult {
  bodyFatPercentage: number; // e.g., 18.5
  muscleMassKg: number; // e.g., 62.35
  measurements: BodyMeasurements;
  aiScore: number; // 0-100, photo quality
  detectedBiotype: 'ecto' | 'meso' | 'endo';
  message: string; // AI feedback message
  rawResponse?: any; // Full AI response for debugging
}

export interface BodyScan {
  id: string;
  user_id: string;
  photo_url: string;
  pose_type: 'front' | 'side' | 'back';
  body_fat_percentage: number;
  muscle_mass_kg: number;
  measurements: BodyMeasurements;
  height_cm: number;
  weight_kg: number;
  age?: number;
  gender?: 'male' | 'female';
  bmi?: number;
  ffmi?: number;
  detected_biotype?: 'ecto' | 'meso' | 'endo';
  ai_score?: number;
  ai_prompt?: string;
  ai_raw_response?: any;
  created_at: string;
}

export interface BodyScanSession {
  id: string;
  user_id: string;
  completed: boolean;
  tutorial_shown: boolean;
  front_scan_id?: string;
  side_scan_id?: string;
  back_scan_id?: string;
  avg_body_fat?: number;
  avg_muscle_mass?: number;
  started_at: string;
  completed_at?: string;
}

// ============================================
// AI Analysis Function
// ============================================

export const analyzeBodyImage = async (
  base64Image: string,
  heightCm: number,
  weightKg: number,
  age?: number,
  gender?: 'male' | 'female',
  poseType: 'front' | 'side' | 'back' = 'front',
  language: string = 'pt'
): Promise<BodyAnalysisResult> => {
  if (!apiKey) {
    throw new Error("API Key missing - check VITE_GEMINI_API_KEY");
  }

  console.log(`🔍 Analyzing ${poseType} body image...`, { heightCm, weightKg, age, gender });

  // Extract MIME type and base64 data
  const mimeType = base64Image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/jpeg';
  const data = base64Image.split(',')[1];

  const langName = language === 'pt' ? 'Portuguese (Brazilian)' : language === 'en' ? 'English' : 'Spanish';

  // Build comprehensive prompt based on research
  const prompt = `You are Malama, an expert AI body composition analyst with advanced computer vision and anthropometric expertise. Analyze this ${poseType} body photo with scientific precision.

**USER CONTEXT:**
- Height: ${heightCm} cm
- Weight: ${weightKg} kg
${age ? `- Age: ${age} years` : ''}
${gender ? `- Gender: ${gender}` : ''}
- Pose: ${poseType.toUpperCase()}

**ANALYSIS PROTOCOL (follow strictly):**

### 1. IMAGE QUALITY ASSESSMENT (0-100)
Evaluate objectively:
- **Lighting** (0-25): Even illumination, no harsh shadows or overexposure
- **Body Visibility** (0-25): Full body visible from head to toe, not cropped
- **Pose Alignment** (0-25): Correct stance (A-pose for front/back, true profile for side)
- **Clarity** (0-25): Sharp image, minimal blur, appropriate distance (2-3m)

**Scoring guide:**
- 90-100: Professional quality, ideal conditions
- 75-89: Good quality, minor issues
- 60-74: Acceptable, some limitations
- 40-59: Poor quality, significant issues
- Below 40: Very poor, unreliable for analysis

### 2. BODY FAT PERCENTAGE ESTIMATION
Use MULTI-EVIDENCE approach:
- **Visual markers**: Muscle definition visibility, subcutaneous fat layers
- **Fat distribution patterns**: Abdomen, love handles, chest, thighs, arms
- **Reference standards** (adapt to gender):
  - Males: Essential 2-5%, Athletes 6-13%, Fitness 14-17%, Average 18-24%, Overweight 25%+
  - Females: Essential 10-13%, Athletes 14-20%, Fitness 21-24%, Average 25-31%, Overweight 32%+
- **Cross-validate** with provided weight and height

**Be realistic, not optimistic.** Common ranges:
- Visible abs: typically 10-15% (male), 18-22% (female)
- Some definition but soft: typically 15-20% (male), 22-28% (female)
- No visible definition: typically 20%+ (male), 28%+ (female)

### 3. MUSCLE MASS CALCULATION
Formula: muscle_mass_kg = weight_kg × (1 - body_fat_percentage/100)
Calculate precisely and round to 1 decimal place.

### 4. CIRCUMFERENCE MEASUREMENTS (cm)
Use height as reference scale. Estimate based on visible proportions:

${poseType === 'front' || poseType === 'back' ? `**FULL MEASUREMENTS (visible from this pose):**
- waist: Narrowest point (typically above navel)
- hip: Widest point of glutes
- chest: At nipple line (males) / under bust (females)
- arm_left: Mid-bicep circumference
- arm_right: Mid-bicep circumference
- thigh_left: Mid-thigh circumference
- thigh_right: Mid-thigh circumference
- calf_left: Widest point of calf
- calf_right: Widest point of calf` : `**SIDE PROFILE MEASUREMENTS (visible from side):**
- waist: Anterior-posterior depth at narrowest point
- hip: Gluteal protrusion from side
- chest: Thoracic depth from side

Note: For side pose, provide reasonable estimates for all measurements based on visible proportions and typical body symmetry.`}

**Estimation technique:**
- Use height as known reference (${heightCm} cm)
- Compare body part ratios to height
- Consider typical proportions for detected body fat level
- Be conservative - better to underestimate than overestimate

### 5. BIOTYPE CLASSIFICATION
Analyze skeletal frame and fat distribution:
- **ECTO**: Narrow shoulders, lean build, fast metabolism appearance, difficulty gaining mass
- **MESO**: Broad shoulders, athletic frame, balanced proportions, muscular tendency
- **ENDO**: Wider frame, rounder physique, stores fat easily, slower metabolism appearance

Consider: shoulder width vs hip width, limb length, joint size, natural fat storage pattern.

### 6. FEEDBACK MESSAGE (in Portuguese - Brazilian)
Provide constructive, science-based feedback:
- Acknowledge photo quality objectively
- Mention key observations (muscle development areas, fat distribution pattern)
- Give actionable tip for progress tracking
- Be encouraging but REALISTIC - avoid false praise

**Tone:** Professional, supportive, evidence-based.
**Length:** 2-3 sentences maximum.

---

**CRITICAL RULES:**
1. These are AI ESTIMATES with ±3-5% margin of error for body fat
2. Accuracy depends entirely on photo quality, pose, and lighting
3. Use for TREND TRACKING, not absolute diagnostic values
4. Never replace professional medical assessment
5. If photo quality is poor (score < 50), state limitations clearly

**OUTPUT FORMAT:**
Return ONLY a valid JSON object, no markdown, no explanations:

{
  "bodyFatPercentage": <number with 1 decimal, e.g., 18.5>,
  "muscleMassKg": <number with 1 decimal, e.g., 58.3>,
  "measurements": {
    "waist": <number with 1 decimal>,
    "hip": <number with 1 decimal>,
    "chest": <number with 1 decimal>,
    "arm_left": <number with 1 decimal>,
    "arm_right": <number with 1 decimal>,
    "thigh_left": <number with 1 decimal>,
    "thigh_right": <number with 1 decimal>,
    "calf_left": <number with 1 decimal>,
    "calf_right": <number with 1 decimal>
  },
  "aiScore": <integer 0-100>,
  "detectedBiotype": <"ecto" | "meso" | "endo">,
  "message": "<string in Brazilian Portuguese>"
}`;

  try {
    const model = getGenAI().getGenerativeModel({ model: MODEL_NAME });

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data
        }
      }
    ]);

    const response = result.response;
    const text = response.text();

    console.log('📊 Raw AI response (first 300 chars):', text.substring(0, 300));

    // Clean and parse JSON - remove markdown code blocks
    let cleanedText = text
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .replace(/^[^{}]*({)/, '{')  // Remove everything before first {
      .replace(/}[^}]*$/, '}')     // Remove everything after last }
      .trim();

    const parsed = JSON.parse(cleanedText) as BodyAnalysisResult;

    // Validate required fields
    const requiredFields = ['bodyFatPercentage', 'muscleMassKg', 'aiScore', 'detectedBiotype', 'message', 'measurements'];
    const missingFields = requiredFields.filter(field => !parsed[field as keyof BodyAnalysisResult]);

    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields);
      console.error('Parsed data:', parsed);
      throw new Error(`Resposta da IA incompleta. Faltam: ${missingFields.join(', ')}`);
    }

    // Validate ranges
    if (parsed.bodyFatPercentage < 2 || parsed.bodyFatPercentage > 60) {
      console.warn('⚠️ Body fat percentage out of normal range:', parsed.bodyFatPercentage);
    }

    if (parsed.aiScore < 0 || parsed.aiScore > 100) {
      throw new Error('AI score fora do intervalo válido (0-100)');
    }

    if (!['ecto', 'meso', 'endo'].includes(parsed.detectedBiotype)) {
      console.warn('⚠️ Invalid biotype:', parsed.detectedBiotype, '- defaulting to meso');
      parsed.detectedBiotype = 'meso';
    }

    // Ensure measurements object exists
    if (!parsed.measurements || typeof parsed.measurements !== 'object') {
      parsed.measurements = {};
    }

    console.log('✅ Body analysis complete:', {
      bodyFat: parsed.bodyFatPercentage + '%',
      muscle: parsed.muscleMassKg + 'kg',
      score: parsed.aiScore,
      biotype: parsed.detectedBiotype
    });

    return {
      ...parsed,
      rawResponse: parsed // Store full response for debugging
    };

  } catch (error) {
    console.error('❌ Body analysis failed:', error);
    throw new Error(`Body analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// ============================================
// Database Operations
// ============================================

export const BodyAnalysisService = {

  /**
   * Upload body scan photo to Supabase Storage
   */
  async uploadBodyPhoto(
    userId: string,
    base64Image: string,
    poseType: 'front' | 'side' | 'back'
  ): Promise<string> {
    try {
      // Convert base64 to blob
      const base64Data = base64Image.split(',')[1];
      const mimeType = base64Image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/jpeg';
      const extension = mimeType.split('/')[1];

      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });

      // Upload to storage: body-scans/{userId}/{timestamp}_{pose}.{ext}
      const fileName = `${userId}/${Date.now()}_${poseType}.${extension}`;

      const { data, error } = await supabase.storage
        .from('body-scans')
        .upload(fileName, blob, {
          contentType: mimeType,
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('body-scans')
        .getPublicUrl(fileName);

      console.log('📸 Photo uploaded:', urlData.publicUrl);
      return urlData.publicUrl;

    } catch (error) {
      console.error('❌ Photo upload failed:', error);
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Save body scan analysis to database
   */
  async saveBodyScan(
    userId: string,
    photoUrl: string,
    poseType: 'front' | 'side' | 'back',
    analysis: BodyAnalysisResult,
    heightCm: number,
    weightKg: number,
    age?: number,
    gender?: 'male' | 'female',
    aiPrompt?: string
  ): Promise<BodyScan> {
    try {
      const { data, error } = await supabase
        .from('body_scans')
        .insert({
          user_id: userId,
          photo_url: photoUrl,
          pose_type: poseType,
          body_fat_percentage: analysis.bodyFatPercentage,
          muscle_mass_kg: analysis.muscleMassKg,
          measurements: analysis.measurements,
          height_cm: heightCm,
          weight_kg: weightKg,
          age,
          gender,
          ai_score: analysis.aiScore,
          detected_biotype: analysis.detectedBiotype,
          ai_prompt: aiPrompt,
          ai_raw_response: analysis.rawResponse
        })
        .select()
        .single();

      if (error) throw error;

      console.log('💾 Body scan saved:', data.id);
      return data as BodyScan;

    } catch (error) {
      console.error('❌ Save scan failed:', error);
      throw new Error(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Get user's body scan history
   */
  async getUserScans(userId: string, poseType?: 'front' | 'side' | 'back'): Promise<BodyScan[]> {
    try {
      let query = supabase
        .from('body_scans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (poseType) {
        query = query.eq('pose_type', poseType);
      }

      const { data, error } = await query;

      if (error) throw error;

      console.log(`📚 Found ${data?.length || 0} scans for user`);
      return (data || []) as BodyScan[];

    } catch (error) {
      console.error('❌ Get scans failed:', error);
      return [];
    }
  },

  /**
   * Get latest scan for each pose type
   */
  async getLatestScans(userId: string): Promise<{
    front?: BodyScan;
    side?: BodyScan;
    back?: BodyScan;
  }> {
    try {
      const scans = await this.getUserScans(userId);

      const front = scans.find(s => s.pose_type === 'front');
      const side = scans.find(s => s.pose_type === 'side');
      const back = scans.find(s => s.pose_type === 'back');

      return { front, side, back };

    } catch (error) {
      console.error('❌ Get latest scans failed:', error);
      return {};
    }
  },

  /**
   * Create or get active scan session
   */
  async getOrCreateSession(userId: string): Promise<BodyScanSession> {
    try {
      // Check for active session (completed = false)
      const { data: existingSession, error: fetchError } = await supabase
        .from('body_scan_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('completed', false)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingSession) {
        console.log('📋 Using existing session:', existingSession.id);
        return existingSession as BodyScanSession;
      }

      // Create new session
      const { data: newSession, error: createError } = await supabase
        .from('body_scan_sessions')
        .insert({ user_id: userId })
        .select()
        .single();

      if (createError) throw createError;

      console.log('🆕 Created new session:', newSession.id);
      return newSession as BodyScanSession;

    } catch (error) {
      console.error('❌ Get/create session failed:', error);
      throw error;
    }
  },

  /**
   * Update session with scan ID
   */
  async updateSession(
    sessionId: string,
    poseType: 'front' | 'side' | 'back',
    scanId: string
  ): Promise<void> {
    try {
      const fieldMap = {
        front: 'front_scan_id',
        side: 'side_scan_id',
        back: 'back_scan_id'
      };

      const { error } = await supabase
        .from('body_scan_sessions')
        .update({ [fieldMap[poseType]]: scanId })
        .eq('id', sessionId);

      if (error) throw error;

      console.log(`✅ Session updated: ${poseType} scan linked`);

    } catch (error) {
      console.error('❌ Update session failed:', error);
    }
  },

  /**
   * Complete session and calculate averages
   */
  async completeSession(sessionId: string): Promise<void> {
    try {
      // Get session with all scan IDs
      const { data: session, error: fetchError } = await supabase
        .from('body_scan_sessions')
        .select('*, body_scans(*)')
        .eq('id', sessionId)
        .single();

      if (fetchError) throw fetchError;

      // Get all scans for this session
      const scanIds = [
        session.front_scan_id,
        session.side_scan_id,
        session.back_scan_id
      ].filter(Boolean);

      if (scanIds.length === 0) {
        console.warn('⚠️ No scans to average');
        return;
      }

      const { data: scans, error: scansError } = await supabase
        .from('body_scans')
        .select('*')
        .in('id', scanIds);

      if (scansError) throw scansError;

      // Calculate averages
      const avgBodyFat = scans.reduce((sum, s: any) => sum + (s.body_fat_percentage || 0), 0) / scans.length;
      const avgMuscle = scans.reduce((sum, s: any) => sum + (s.muscle_mass_kg || 0), 0) / scans.length;

      // Update session
      const { error: updateError } = await supabase
        .from('body_scan_sessions')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          avg_body_fat: Math.round(avgBodyFat * 10) / 10,
          avg_muscle_mass: Math.round(avgMuscle * 100) / 100
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      console.log('🎯 Session completed:', {
        avgBodyFat: avgBodyFat.toFixed(1) + '%',
        avgMuscle: avgMuscle.toFixed(2) + 'kg'
      });

    } catch (error) {
      console.error('❌ Complete session failed:', error);
    }
  },

  /**
   * Delete a body scan
   */
  async deleteScan(scanId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('body_scans')
        .delete()
        .eq('id', scanId);

      if (error) throw error;

      console.log('🗑️ Scan deleted:', scanId);

    } catch (error) {
      console.error('❌ Delete scan failed:', error);
      throw error;
    }
  }
};
