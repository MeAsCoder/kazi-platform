import Link from "next/link";
import { Logo, SignOutButton, Badge } from "@/components/ui";

export function DashHeader({ area, name }: { area: string; name?: string | null }) {
  return (
    <header className="border-b border-line bg-card/70 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted sm:inline">{name}</span>
          <Badge tone="muted">{area}</Badge>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
