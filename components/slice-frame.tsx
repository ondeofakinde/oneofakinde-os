import { AppShell } from "@/features/shell/app-shell";
import type { Session } from "@/lib/domain/contracts";

type SliceFrameProps = {
  title: string;
  subtitle: string;
  session?: Session | null;
  children: React.ReactNode;
};

export function SliceFrame({ title, subtitle, session, children }: SliceFrameProps) {
  return (
    <AppShell title={title} subtitle={subtitle} session={session}>
      {children}
    </AppShell>
  );
}
