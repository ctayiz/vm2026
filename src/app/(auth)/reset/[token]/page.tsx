import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { db } from "@/lib/db";
import { getDictionary } from "@/lib/i18n-server";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ResetPage({ params }: { params: { token: string } }) {
  const t = getDictionary();
  const reset = await db.passwordReset.findUnique({
    where: { token: params.token },
    include: { user: { select: { displayName: true } } },
  });
  const valid = reset && !reset.usedAt && reset.expiresAt.getTime() > Date.now();

  if (!valid) {
    return (
      <Card className="glass shadow-2xl shadow-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="size-5 text-amber-300" /> {t.reset.invalidTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t.reset.invalidText}</p>
        </CardContent>
        <CardFooter>
          <Button asChild size="lg" variant="secondary" className="w-full">
            <Link href="/login">{t.reset.toLogin}</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return <ResetPasswordForm token={params.token} userName={reset.user.displayName} />;
}
