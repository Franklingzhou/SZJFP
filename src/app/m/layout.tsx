import { MiniAppProvider } from '@/components/miniapp/context';
import MiniAppShell from '@/components/miniapp/shell';

export default function MiniAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MiniAppProvider>
      <MiniAppShell>{children}</MiniAppShell>
    </MiniAppProvider>
  );
}
