import { FormEvent, ReactNode, useEffect, useState } from "react";
import { useClerk, useSignIn, useSignUp, useUser } from "@clerk/react";
import { ArrowLeft } from "lucide-react";
import { ArcformLogo } from "@/components/ArcformLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrainerRouter } from "@/pages/trainer/TrainerRouter";
import { useLocation } from "wouter";
import { getAuthProfile, saveAuthProfile } from "@workspace/api-client-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type Role = "athlete" | "trainer";
type AuthMode = "login" | "signup";

function clerkError(error: unknown): string {
  const candidate = error as { errors?: Array<{ longMessage?: string; message?: string }> };
  return candidate.errors?.[0]?.longMessage
    ?? candidate.errors?.[0]?.message
    ?? (error instanceof Error ? error.message : "Something went wrong. Please try again.");
}

export function LoginGate({
  children,
}: {
  children: ReactNode | ((onLogout: () => void) => ReactNode);
}) {
  const [, setLocation] = useLocation();
  const { signOut } = useClerk();
  const { user, isLoaded: userLoaded, isSignedIn } = useUser();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const reduceMotion = useReducedMotion();
  const [role, setRole] = useState<Role | null>(null);
  const [authenticatedRole, setAuthenticatedRole] = useState<Role | null>(null);
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [verificationNotice, setVerificationNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const resetLogin = async () => {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await signOut();
      setLocation("/");
      setRole(null);
      setAuthenticatedRole(null);
      setMode("login");
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setVerificationCode("");
      setVerificationRequired(false);
      setVerificationNotice("");
    } catch (signOutError) {
      setError(clerkError(signOutError));
    } finally {
      setPending(false);
    }
  };

  useEffect(() => {
    if (pending) return;
    if (!userLoaded || !isSignedIn || !user) {
      if (userLoaded && !isSignedIn) setAuthenticatedRole(null);
      return;
    }
    let cancelled = false;
    void getAuthProfile()
      .then((profile) => {
        if (!cancelled) {
          setRole(profile.role);
          setAuthenticatedRole(profile.role);
        }
      })
      .catch(() => {
        if (!cancelled) setAuthenticatedRole(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, pending, user, userLoaded]);

  const completeAuthentication = async (selectedRole: Role, selectedName: string) => {
    const profile = await saveAuthProfile({
      name: selectedName.trim() || user?.fullName || email,
      email: email.trim().toLowerCase() || user?.primaryEmailAddress?.emailAddress || "",
      role: selectedRole,
    });
    setRole(profile.role);
    setAuthenticatedRole(profile.role);
  };

  const finalizeSignIn = async (selectedRole: Role) => {
    const finalized = await signIn.finalize();
    if (finalized.error) throw finalized.error;
    const profile = await getAuthProfile();
    if (profile.role !== selectedRole) {
      await signOut({ redirectUrl: import.meta.env.BASE_URL || "/" });
      throw new Error(`This account is registered as a ${profile.role}. Choose that role to log in.`);
    }
    setAuthenticatedRole(profile.role);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!role || pending) return;
    setError("");
    if (mode === "signup" && (password.length < 8 || confirmPassword.length < 8)) {
      setError("Password and confirmation must each be at least 8 characters.");
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    try {
      if (mode === "login") {
        if (!verificationRequired) {
          if (isSignedIn) {
            await signOut();
          }
          const result = await signIn.password({
            identifier: email.trim().toLowerCase(),
            password,
          });
          if (signIn.status === "needs_client_trust" || signIn.status === "needs_second_factor") {
            const supportsEmailCode = signIn.supportedSecondFactors.some(
              (factor) => factor.strategy === "email_code",
            );
            if (!supportsEmailCode) {
              throw new Error("This account requires a verification method that Arcform does not currently support.");
            }
            const verification = await signIn.mfa.sendEmailCode();
            if (verification.error) throw verification.error;
            setVerificationRequired(true);
            setVerificationNotice(`Verification code sent to ${email.trim().toLowerCase()}.`);
          } else if (result.error) {
            throw result.error;
          } else if (signIn.status === "complete") {
            await finalizeSignIn(role);
          } else {
            throw new Error("Sign-in could not be completed. Please try again.");
          }
        } else {
          const verification = await signIn.mfa.verifyEmailCode({
            code: verificationCode.trim(),
          });
          if (verification.error) throw verification.error;
          if (signIn.status !== "complete") {
            throw new Error("Enter the verification code from your email.");
          }
          await finalizeSignIn(role);
        }
      } else if (!verificationRequired) {
        const result = await signUp.password({
          emailAddress: email.trim().toLowerCase(),
          password,
        });
        if (result.error) throw result.error;
        if (signUp.status === "complete") {
          const finalized = await signUp.finalize();
          if (finalized.error) throw finalized.error;
          await completeAuthentication(role, name);
        } else {
          const verification = await signUp.verifications.sendEmailCode();
          if (verification.error) throw verification.error;
          setVerificationRequired(true);
          setVerificationNotice(`Verification code sent to ${email.trim().toLowerCase()}.`);
        }
      } else {
        const result = await signUp.verifications.verifyEmailCode({
          code: verificationCode.trim(),
        });
        if (result.error) throw result.error;
        if (signUp.status !== "complete") throw new Error("Enter the verification code from your email.");
        const finalized = await signUp.finalize();
        if (finalized.error) throw finalized.error;
        await completeAuthentication(role, name);
      }
    } catch (submissionError) {
      const message = clerkError(submissionError);
      if (
        mode === "login"
        && !verificationRequired
        && /additional verification (?:is )?required/i.test(message)
      ) {
        try {
          const verification = await signIn.mfa.sendEmailCode();
          if (verification.error) throw verification.error;
          setVerificationRequired(true);
          setVerificationNotice(`Verification code sent to ${email.trim().toLowerCase()}.`);
          setError("");
        } catch (verificationError) {
          setError(clerkError(verificationError));
        }
      } else {
        setError(message);
      }
    } finally {
      setPending(false);
    }
  };

  const selectRole = (nextRole: Role) => {
    setRole(nextRole);
    setError("");
    setVerificationRequired(false);
    setVerificationCode("");
    setVerificationNotice("");
  };

  const resendVerificationCode = async () => {
    if (pending) return;
    setPending(true);
    setError("");
    setVerificationNotice("");
    try {
      const verification = mode === "login"
        ? await signIn.mfa.sendEmailCode()
        : await signUp.verifications.sendEmailCode();
      if (verification.error) throw verification.error;
      setVerificationNotice(`A new verification code was sent to ${email.trim().toLowerCase()}.`);
    } catch (resendError) {
      setError(clerkError(resendError));
    } finally {
      setPending(false);
    }
  };

  if (authenticatedRole === "athlete") {
    return <>{typeof children === "function" ? children(resetLogin) : children}</>;
  }
  if (authenticatedRole === "trainer") return <TrainerRouter onLogout={resetLogin} />;

  return (
    <main
      className="dark relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-black px-6 py-12 text-foreground"
      style={{
        backgroundImage: `url(${import.meta.env.BASE_URL}arcform-login-background.png)`,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 28%, rgba(0,0,0,0.2) 52%, rgba(0,0,0,0.82) 82%, #000 100%)" }} />
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-[min(860px,115vh)] w-[min(860px,115vw)] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "radial-gradient(circle, #000 0%, rgba(0,0,0,0.98) 38%, rgba(0,0,0,0.88) 53%, rgba(0,0,0,0.38) 68%, rgba(0,0,0,0) 78%)" }} />
      <div className="relative z-10 w-full max-w-sm">
        <ArcformLogo variant="large" className="mb-16 justify-center" />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={!role ? "role-selection" : `${role}-${mode}-${verificationRequired ? "verification" : "credentials"}`}
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10, filter: "blur(3px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -8, filter: "blur(2px)" }}
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
          {!role ? (
            <div className="grid justify-items-center gap-3">
            <Button type="button" onClick={() => selectRole("athlete")} className="h-11 w-full max-w-60 text-sm normal-case tracking-normal">Athlete</Button>
            <Button type="button" variant="outline" onClick={() => selectRole("trainer")} className="h-11 w-full max-w-60 text-sm normal-case tracking-normal">Trainer</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <button type="button" onClick={resetLogin} className="inline-flex items-center gap-2 text-sm font-light text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Choose another role
            </button>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{role} account</p>
              <h1 className="mt-3 text-3xl font-light tracking-tight">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
            </div>
            {mode === "signup" && !verificationRequired && (
              <div className="space-y-2">
                <Label htmlFor="arcform-name">Name</Label>
                <Input id="arcform-name" value={name} onChange={(event) => setName(event.target.value)} className="h-12" required autoComplete="name" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="arcform-email">Email</Label>
              <Input id="arcform-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12" required autoComplete="email" autoFocus disabled={verificationRequired} />
            </div>
            {!verificationRequired && (
              <div className="space-y-2">
                <Label htmlFor="arcform-password">Password</Label>
                <Input id="arcform-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12" required minLength={mode === "signup" ? 8 : undefined} autoComplete={mode === "login" ? "current-password" : "new-password"} />
                {mode === "signup" && (
                  <p className="text-xs text-muted-foreground">Use 15 or more characters.</p>
                )}
              </div>
            )}
            {mode === "signup" && !verificationRequired && (
              <div className="space-y-2">
                <Label htmlFor="arcform-confirm-password">Confirm Password</Label>
                <Input id="arcform-confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="h-12" required minLength={8} autoComplete="new-password" />
                <p className="text-xs text-muted-foreground">Use 15 or more characters.</p>
              </div>
            )}
            {verificationRequired && (
              <div className="space-y-2">
                <Label htmlFor="arcform-verification-code">Email verification code</Label>
                <Input id="arcform-verification-code" inputMode="numeric" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value)} className="h-12" required autoComplete="one-time-code" />
                <p className="text-xs text-muted-foreground">
                  Check {email.trim().toLowerCase()} and its spam or junk folder.
                </p>
                <button
                  type="button"
                  onClick={resendVerificationCode}
                  disabled={pending}
                  className="text-xs font-medium text-foreground underline underline-offset-4 disabled:opacity-50"
                >
                  Resend code
                </button>
              </div>
            )}
            {verificationNotice && (
              <p role="status" className="text-sm font-light text-foreground">
                {verificationNotice}
              </p>
            )}
            {mode === "signup" && !verificationRequired && (
              <div id="clerk-captcha" className="flex min-h-0 justify-center" />
            )}
            {error && <p role="alert" className="text-sm font-light text-foreground">{error}</p>}
            <Button type="submit" size="lg" className="h-14 w-full text-sm normal-case tracking-normal" disabled={pending}>
              {pending ? "Please wait…" : verificationRequired ? "Verify email" : mode === "login" ? `Log in as ${role}` : `Create ${role} account`}
            </Button>
            {!verificationRequired && (
              <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">
                {mode === "login" ? "Create an account" : "Already have an account? Log in"}
              </button>
            )}
            </form>
          )}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}