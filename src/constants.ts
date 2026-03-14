import { DailyStats } from './types';

export const INITIAL_STATS: DailyStats = {
  consumedCalories: 0,
  targetCalories: 2200,
  macros: {
    protein: 0,
    carbs: 0,
    fats: 0
  },
  targetMacros: {
    protein: 150,
    carbs: 220,
    fats: 70
  }
};

export const USER_AVATAR = "https://lh3.googleusercontent.com/aida-public/AB6AXuA-xQHSmu8x8yOTWxOzGrssEMcbvwBsOU_HpWpnTSoH9vWro66G-X9zTulu_4lv_VpgKUlGbnGhn0KQGAB4_g6DsgRCu79kp1p8flyThCOSXgMpWp8m8BgHZBU4uvAHANhijMX7k33ailofN6ARlpwv26to8KY0OGKwT9xb5_64ZKS70fmz00OQ5iontQwSIMeYkmRFNT0UZKQVdKq2TSGuukgbzNthbfQsoS-iGld7nR2yuSe9G2pKTlRV6jJCC7Bv6d7O-hIRbbA";

export const MOTIVATIONAL_PHRASES = [
  "Feed the Flow",
  "Keep the flow going.",
  "Consistency over perfection.",
  "Nourish your momentum.",
  "Balance is the key."
];

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
  { code: 'es', label: 'Español' }
];