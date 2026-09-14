import { Route, Switch, useParams } from "wouter";
import { TrainerDashboard } from "./TrainerDashboard";
import { TrainerClientDetail } from "./TrainerClientDetail";
import { PageTransition } from "@/components/motion/PageTransition";

export function TrainerRouter({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="dark flex flex-col min-h-[100dvh] bg-background text-foreground font-sans selection:bg-white selection:text-black">
      <div className="h-[100dvh] overflow-hidden">
        <PageTransition>
          <Switch>
            <Route path="/" component={() => <TrainerDashboard onLogout={onLogout} />} />
            <Route path="/client/:id" component={() => <TrainerClientRoute onLogout={onLogout} />} />
            {/* fallback */}
            <Route component={() => <TrainerDashboard onLogout={onLogout} />} />
          </Switch>
        </PageTransition>
      </div>
    </div>
  );
}

function TrainerClientRoute({ onLogout }: { onLogout: () => void }) {
  const { id } = useParams<{ id: string }>();
  return <TrainerClientDetail id={id} onLogout={onLogout} />;
}
