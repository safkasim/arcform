import { type ReactNode, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

import { Shell } from '@/components/layout/Shell';
import Home from '@/pages/Home';
import Plan from '@/pages/Plan';
import Coach from '@/pages/Coach';
import WorkoutIndex from '@/pages/WorkoutIndex';
import WorkoutLog from '@/pages/WorkoutLog';
import History from '@/pages/History';
import { LoginGate } from '@/components/auth/LoginGate';

const queryClient = new QueryClient();
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/arcform-banner.png`,
  },
  variables: {
    colorPrimary: "#ffffff",
    colorForeground: "#ffffff",
    colorMutedForeground: "#a3a3a3",
    colorDanger: "#fca5a5",
    colorBackground: "#0a0a0a",
    colorInput: "#171717",
    colorInputForeground: "#ffffff",
    colorNeutral: "#333333",
    fontFamily: "Inter, sans-serif",
    borderRadius: "1rem",
  },
};

function Router({ onLogout }: { onLogout: () => void }) {
  return (
    <Shell onLogout={onLogout}>
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/plan" component={Plan} />
          <Route path="/coach" component={Coach} />
          <Route path="/workout" component={WorkoutIndex} />
          <Route path="/workout/:id" component={WorkoutLog} />
          <Route path="/history" component={History} />
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </Shell>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: "Welcome back", subtitle: "Sign in to access your account" } },
        signUp: { start: { title: "Create your account", subtitle: "Get started today" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <ClerkQueryClientCacheInvalidator />
      <Switch>
        <Route path="/sign-in/*?" component={AuthenticatedApp} />
        <Route path="/sign-up/*?" component={AuthenticatedApp} />
        <Route path="/" component={AuthenticatedApp} />
        <Route component={AuthenticatedApp} />
      </Switch>
    </ClerkProvider>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const currentQueryClient = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (previousUserId.current !== undefined && previousUserId.current !== userId) {
        currentQueryClient.clear();
      }
      previousUserId.current = userId;
    });
    return unsubscribe;
  }, [addListener, currentQueryClient]);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <ClerkProviderWithRoutes />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function AuthenticatedApp() {
  return (
    <LoginGate>
      {(onLogout) => <Router onLogout={onLogout} />}
    </LoginGate>
  );
}

export default App;
