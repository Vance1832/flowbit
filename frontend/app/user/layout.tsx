import type { ReactNode } from "react";

import { UserAppProvider } from "@/components/providers/UserAppProvider";
import { UserShell } from "@/components/user/UserShell";

export default function UserLayout({ children }: { children: ReactNode }) {
  return (
    <UserAppProvider>
      <UserShell>{children}</UserShell>
    </UserAppProvider>
  );
}
