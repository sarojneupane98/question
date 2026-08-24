import { AppShell } from '@/components/layout/AppShell'

/**
 * Layout for every signed-in dashboard route.
 *
 * It exists as a route group so the landing page at `/` can keep the root layout
 * to itself — the landing page has its own header and must not pay for the
 * sidebar, the theme hook or the store subscription.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
