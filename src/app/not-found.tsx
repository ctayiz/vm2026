import Link from "next/link";
import { getDictionary } from "@/lib/i18n-server";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const t = getDictionary();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <Logo className="size-12" />
      <div>
        <h1 className="text-2xl font-bold">404 · {t.notFound.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.notFound.text}</p>
      </div>
      <Button asChild>
        <Link href="/">{t.notFound.home}</Link>
      </Button>
    </div>
  );
}
