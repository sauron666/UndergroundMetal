import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignUpForm } from "./signup-form";

export const metadata: Metadata = { title: "Sign up" };

export default function SignUpPage() {
  return (
    <div className="container py-16 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl text-center">Carve your name</CardTitle>
        </CardHeader>
        <CardContent>
          <SignUpForm />
          <p className="text-xs text-center mt-6 text-muted-foreground">
            Already in the crypt?{" "}
            <Link href="/auth/signin" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
