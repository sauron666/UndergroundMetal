import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignInForm } from "./signin-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to follow bands, save concerts, and write articles.",
};

export default function SignInPage() {
  return (
    <div className="container py-16 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl text-center">
            Enter the crypt
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SignInForm />
          <p className="text-xs text-center mt-6 text-muted-foreground">
            No account?{" "}
            <Link href="/auth/signup" className="text-primary hover:underline">
              Carve one
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
