// =====================================================
// NURA — GLP-1 Service
// Dose logging, push subscription, goal reformulation
// =====================================================

import { supabase } from './supabase';
import type { GLP1Dose, Profile } from '../types';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

// Convert a base64url VAPID public key to Uint8Array for pushManager.subscribe
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

export const glp1Service = {
  // ──────────────────────────────────────────────────────────────────────────
  // Push Subscription
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Subscribe the browser to Web Push and persist the subscription
   * in the push_subscriptions table. Safe to call multiple times.
   */
  async subscribeToPush(userId: string): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    if (!VAPID_PUBLIC_KEY) {
      console.warn('[GLP1] VITE_VAPID_PUBLIC_KEY not set — push disabled');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return false;

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = subscription.toJSON();
      const { endpoint, keys } = json as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      await supabase.from('push_subscriptions').upsert(
        { user_id: userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
        { onConflict: 'endpoint' }
      );

      return true;
    } catch (err) {
      console.error('[GLP1] subscribeToPush error:', err);
      return false;
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Dose Logging
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Persist a GLP-1 dose application.
   * Called after the agent emits a <dose_json> block.
   */
  async saveDose(
    userId: string,
    dose: {
      medication: string;
      dose_mg?: number | null;
      applied_at: string;
      notes?: string | null;
      is_first?: boolean;
      phase?: string | null;
      next_dose_scheduled_at?: string | null;
    }
  ): Promise<void> {
    const { error } = await supabase.from('glp1_doses').insert({
      user_id:                userId,
      medication:             dose.medication,
      dose_mg:                dose.dose_mg ?? null,
      applied_at:             dose.applied_at,
      notes:                  dose.notes ?? null,
      is_first:               dose.is_first ?? false,
      phase:                  dose.phase ?? null,
      next_dose_scheduled_at: dose.next_dose_scheduled_at ?? null,
      notification_sent:      false,
    });

    if (error) throw error;
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Dose History
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Return the N most recent dose records for a user.
   */
  async getDoseHistory(userId: string, limit = 5): Promise<GLP1Dose[]> {
    const { data, error } = await supabase
      .from('glp1_doses')
      .select('*')
      .eq('user_id', userId)
      .order('applied_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data as GLP1Dose[]) || [];
  },

  /**
   * Return the next scheduled dose that hasn't been notified yet.
   */
  async getNextScheduledDose(userId: string): Promise<GLP1Dose | null> {
    const { data } = await supabase
      .from('glp1_doses')
      .select('*')
      .eq('user_id', userId)
      .not('next_dose_scheduled_at', 'is', null)
      .order('next_dose_scheduled_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    return (data as GLP1Dose | null) || null;
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Goal Reformulation
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Recalculate and persist nutrition targets adapted for GLP-1 therapy.
   *
   * Phase 'start'    → calories -300, protein = weight × 1.8 g
   * Phase 'adjust'   → calories -150, protein = weight × 2.0 g
   * Phase 'maintain' → calories unchanged, protein = weight × 1.8 g
   *
   * Carbs and fats are scaled proportionally to fill the remaining calorie gap.
   */
  async reformulateGoals(userId: string, profile: Profile): Promise<void> {
    const phase = profile.glp1_phase || 'start';
    const weight = profile.weight || 70;

    const baseCalories = profile.target_calories || 2000;
    const baseCarbs    = profile.target_carbs    || 250;
    const baseFats     = profile.target_fats     || 65;

    // Calorie adjustment
    const calorieDelta = phase === 'start' ? -300 : phase === 'adjust' ? -150 : 0;
    const newCalories  = Math.max(1200, baseCalories + calorieDelta);

    // Protein target
    const proteinMultiplier = phase === 'adjust' ? 2.0 : 1.8;
    const newProtein = Math.round(weight * proteinMultiplier);

    // Scale carbs & fats proportionally to keep caloric ratio
    const ratio = newCalories / (baseCalories || 1);
    const newCarbs = Math.round(baseCarbs * ratio);
    const newFats  = Math.round(baseFats  * ratio);

    const { error } = await supabase
      .from('profiles')
      .update({
        target_calories: newCalories,
        target_protein:  newProtein,
        target_carbs:    newCarbs,
        target_fats:     newFats,
      })
      .eq('id', userId);

    if (error) throw error;
  },
};

export default glp1Service;
