import * as Haptics from 'expo-haptics'

/**
 * Thin, fire-and-forget wrapper around expo-haptics. Every call swallows its
 * promise so a missing taptic engine (web, older devices) is a silent no-op.
 *
 * Reserve these for moments worth feeling — a real navigation or a completed
 * action — never for high-frequency or passive UI, per the animation framework.
 */
export const haptic = {
  /** Subtle tick — selection changes, tab switches. */
  selection: () => { Haptics.selectionAsync().catch(() => {}) },
  /** Light bump — minor confirmations. */
  light: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}) },
  /** Medium bump — firmer confirmation. */
  medium: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}) },
  /** Success notification — an action completed (logged a touch, cleared an email). */
  success: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}) },
}
