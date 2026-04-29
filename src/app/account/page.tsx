import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "./profile-form";
import { EmailPrefsForm } from "./email-prefs-form";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin?next=/account");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { emailPreference: true, subscription: true },
  });
  if (!user) redirect("/auth/signin");

  // Lazily provision EmailPreference for legacy users
  let prefs = user.emailPreference;
  if (!prefs) {
    prefs = await db.emailPreference.create({
      data: {
        userId: user.id,
        unsubscribeToken: crypto.randomBytes(24).toString("hex"),
      },
    });
  }

  return (
    <div className="container py-10 md:py-14 max-w-3xl">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">
            ⛧ Account
          </p>
          <h1 className="font-display text-4xl">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {user.email} · {user.role.toLowerCase()} · {user.tier.toLowerCase()}
          </p>
        </div>
        {user.username && (
          <Link
            href={`/u/${user.username}`}
            className="text-xs uppercase tracking-widest text-muted-foreground hover:text-primary"
          >
            View public profile →
          </Link>
        )}
      </header>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm
              user={{
                id: user.id,
                username: user.username,
                name: user.name,
                bio: user.bio,
                image: user.image,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Email preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <EmailPrefsForm
              prefs={{
                weeklyDigest: prefs.weeklyDigest,
                newShowAlerts: prefs.newShowAlerts,
                newArticleAlerts: prefs.newArticleAlerts,
                productUpdates: prefs.productUpdates,
              }}
            />
          </CardContent>
        </Card>

        {user.passwordHash && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Change password</CardTitle>
            </CardHeader>
            <CardContent>
              <PasswordForm />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Subscription</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {user.subscription ? (
              <div className="space-y-2">
                <p>
                  Status:{" "}
                  <span className="font-mono">{user.subscription.status}</span>
                </p>
                <p>
                  Renews:{" "}
                  <span className="font-mono">
                    {user.subscription.currentPeriodEnd.toLocaleDateString()}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  To cancel, manage in Stripe (a customer portal is on the
                  roadmap).
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">
                You're on the free tier.{" "}
                <Link href="/premium" className="text-primary hover:underline">
                  Go premium →
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
