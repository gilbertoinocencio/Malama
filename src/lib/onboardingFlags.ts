const FLAG_KEY = 'Malama_engagement_card_seen'

export function hasSeenEngagementOnboarding(): boolean {
  try {
    return localStorage.getItem(FLAG_KEY) === 'true'
  } catch {
    return false
  }
}

export function markEngagementOnboardingSeen(): void {
  try {
    localStorage.setItem(FLAG_KEY, 'true')
  } catch {
    // silently fail in environments without localStorage
  }
}
