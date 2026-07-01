import { MiniAppProvider } from '@/components/miniapp/context';
import MiniAppShell from '@/components/miniapp/shell';
import { Toaster } from 'sonner';

export default function MiniAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MiniAppProvider>
      <Toaster position="top-center" richColors />
      <MiniAppShell>{children}</MiniAppShell>
    </MiniAppProvider>
  );
}
