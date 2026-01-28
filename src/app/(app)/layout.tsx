
// This layout is now simplified and doesn't perform auth checks.
// The checks would typically be here in a real app.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
