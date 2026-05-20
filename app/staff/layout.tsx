import type { ReactNode } from "react";

import { StaffAppProvider } from "@/components/providers/StaffAppProvider";
import { StaffShell } from "@/components/staff/StaffShell";

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <StaffAppProvider>
      <StaffShell>{children}</StaffShell>
    </StaffAppProvider>
  );
}
