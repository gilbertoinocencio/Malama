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
  const prompt = `You are NURA, an expert AI body composition analyst. Analyze this ${poseType} body photo using advanced computer vision and anthropometric estimation.

**CONTEXT:**
- Height: ${heightCm} cm
- Weight: ${weightKg} kg
${age ? `- Age: ${age} years` : ''}
${gender ? `- Gender: ${gender}` : ''}
- Pose: ${poseType.toUpperCase()}

**ANALYSIS TASKS:**

1. **Photo Quality Assessment (0-100 score):**
   - Lighting quality
   - Body visibility (full body in frame?)
   - Pose alignment (correct A-pose for front/back, profile for side?)
   - Image clarity
   - Background interference

2. **Body Composition Estimation:**
   Using the provided height/weight and visual analysis:
   - Estimate body fat percentage (consider visible muscle definition, fat distribution)
   - Calculate lean muscle mass in kg (use: muscle_mass = weight * (1 - body_fat/100))
   - Reference standards: Athletes 6-13%, Fitness 14-17%, Average 18-24%, Overweight 25%+

3. **Circumference Measurements (in cm):**
   Based on height as reference scale, estimate:
   ${poseType === 'front' || poseType === 'back' ? `
   - Waist (narrowest point)
   - Hip (widest point)
   - Chest (nipple line for males, under bust for females)
   - Arm_left and arm_right (bicep, flexed)
   - Thigh_left and thigh_right (mid-thigh)
   - Calf_left and calf_right (widest point)
   ` : `
   - Waist (visible from side profile)
   - Hip (visible from side profile)
   - Chest (visible from side profile)
   `}

4. **Biotype Classification:**
   - ECTOMORPH: Lean, narrow shoulders, fast metabolism, difficulty gaining weight
   - MESOMORPH: Athletic, balanced proportions, gains muscle easily
   - ENDOMORPH: Wider frame, stores fat easily, rounder physique

5. **Feedback Message:**
   Provide encouraging, actionable feedback in ${langName}. Mention:
   - Photo quality assessment
   - Key observations (muscle development, fat distribution)
   - Progress tracking tips

**IMPORTANT NOTES:**
- These are AI ESTIMATES, not clinical measurements
- Accuracy depends on photo quality, pose, and lighting
- Use as tracking tool for TRENDS, not absolute values
- Recommend professional assessment for medical purposes

**OUTPUT FORMAT:**
Return a STRICT JSON object with this structure:
{
  "bodyFatPercentage": <number, e.g., 18.5>,
  "muscleMassKg": <number, e.g., 62.35>,
  "measurements": {
    "waist": <number in cm>,
    "hip": <number in cm>,
    "chest": <number in cm>,
    "arm_left": <number in cm>,
    "arm_right": <number in cm>,
    "thigh_left": <number in cm>,
    "thigh_right": <number in cm>,
    "calf_left": <number in cm>,
    "calf_right": <number in cm>
  },
  "aiScore": <number 0-100>,
  "detectedBiotype": <"ecto" | "meso" | "endo">,
  "message": <string in ${langName}>
}

Analyze the image now.`;

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

    console.log('📊 Raw AI response:', text.substring(0, 200) + '...');

    // Clean and parse JSON
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedText) as BodyAnalysisResult;

    // Validate result
    if (!parsed.bodyFatPercentage || !parsed.muscleMassKg || !parsed.aiScore) {
      throw new Error('Invalid AI response structure');
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
