import * as Notifications from 'expo-notifications'
import type { Contact, Opportunity } from '@/types'

const CONTACT_PREFIX = 'dialed-contact-'
const OPP_PREFIX     = 'dialed-opp-'

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: current } = await Notifications.getPermissionsAsync()
  if (current === 'granted') return true
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

// Cancel all previously scheduled notifications for a given prefix
async function cancelByPrefix(prefix: string) {
  const all = await Notifications.getAllScheduledNotificationsAsync()
  await Promise.all(
    all.filter(n => n.identifier.startsWith(prefix))
       .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier))
  )
}

function tomorrowAt9(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(9, 0, 0, 0)
  return d
}

// ── Contact cadence reminders ─────────────────────────────────────────────────
// Called every time contacts are loaded. Cancels stale reminders and schedules
// fresh ones for tomorrow at 9am. Max 5 overdue + 3 due-soon to avoid noise.

export async function scheduleContactReminders(contacts: Contact[]): Promise<void> {
  const granted = await requestNotificationPermissions()
  if (!granted) return

  await cancelByPrefix(CONTACT_PREFIX)

  const overdue = contacts.filter(c => c.status === 'overdue').slice(0, 5)
  const dueSoon = contacts.filter(c => c.status === 'due-soon').slice(0, 3)

  for (const ct of overdue) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${CONTACT_PREFIX}overdue-${ct.id}`,
      content: {
        title: `${ct.name} is overdue`,
        body: `You haven't connected in ${ct.days_since_contact} days. Reach out to keep the relationship strong.`,
        sound: true,
        data: { contactId: ct.id },
      },
      trigger: tomorrowAt9(),
    })
  }

  for (const ct of dueSoon) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${CONTACT_PREFIX}due-${ct.id}`,
      content: {
        title: `Connect with ${ct.name} soon`,
        body: `Your check-in with ${ct.name} is coming up in the next couple of days.`,
        sound: true,
        data: { contactId: ct.id },
      },
      trigger: tomorrowAt9(),
    })
  }
}

// ── Opportunity deadline reminders ────────────────────────────────────────────
// Schedules at 7d, 3d, 1d, and day-of for each non-completed opp with a deadline.
// Safe to call on every load — cancels and rebuilds from current state.

export async function scheduleOppReminders(opps: Opportunity[]): Promise<void> {
  const granted = await requestNotificationPermissions()
  if (!granted) return

  await cancelByPrefix(OPP_PREFIX)

  const now = Date.now()

  for (const opp of opps) {
    if (!opp.deadline || opp.state === 'completed') continue

    const deadlineDate = new Date(opp.deadline)
    deadlineDate.setHours(23, 59, 0, 0)
    const msLeft = deadlineDate.getTime() - now
    const daysLeft = Math.ceil(msLeft / 86_400_000)

    // Day-of
    if (daysLeft === 0) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${OPP_PREFIX}${opp.id}-0d`,
        content: {
          title: `"${opp.title}" is due today`,
          body: `Today is your deadline. Don't let this one slip.`,
          sound: true,
          data: { oppId: opp.id },
        },
        trigger: tomorrowAt9(), // fires at 9am today if before 9am, else skipped
      })
    }

    // 1 day before
    if (daysLeft > 0 && daysLeft <= 2) {
      const t = new Date(deadlineDate)
      t.setDate(t.getDate() - 1)
      t.setHours(9, 0, 0, 0)
      if (t.getTime() > now) {
        await Notifications.scheduleNotificationAsync({
          identifier: `${OPP_PREFIX}${opp.id}-1d`,
          content: {
            title: `"${opp.title}" deadline is tomorrow`,
            body: `Make sure you're prepared — deadline is tomorrow.`,
            sound: true,
            data: { oppId: opp.id },
          },
          trigger: t,
        })
      }
    }

    // 3 days before
    if (daysLeft > 2 && daysLeft <= 4) {
      const t = new Date(deadlineDate)
      t.setDate(t.getDate() - 3)
      t.setHours(9, 0, 0, 0)
      if (t.getTime() > now) {
        await Notifications.scheduleNotificationAsync({
          identifier: `${OPP_PREFIX}${opp.id}-3d`,
          content: {
            title: `"${opp.title}" in 3 days`,
            body: `Your deadline for "${opp.title}" is coming up in 3 days.`,
            sound: true,
            data: { oppId: opp.id },
          },
          trigger: t,
        })
      }
    }

    // 7 days before
    if (daysLeft > 4) {
      const t = new Date(deadlineDate)
      t.setDate(t.getDate() - 7)
      t.setHours(9, 0, 0, 0)
      if (t.getTime() > now) {
        await Notifications.scheduleNotificationAsync({
          identifier: `${OPP_PREFIX}${opp.id}-7d`,
          content: {
            title: `"${opp.title}" in 1 week`,
            body: `One week until your "${opp.title}" deadline. Start preparing now.`,
            sound: true,
            data: { oppId: opp.id },
          },
          trigger: t,
        })
      }
    }
  }
}
