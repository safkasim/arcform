import { useState } from "react";
import { Link } from "wouter";
import { 
  useListTrainerClients, 
  useLinkTrainerClient, 
  getListTrainerClientsQueryKey,
  getGetAthleteInviteCodeQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArcformLogo } from "@/components/ArcformLogo";
import { StatusBadge } from "./components/StatusBadge";

function displayDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? value : new Date(timestamp).toLocaleDateString();
}

export function TrainerDashboard({ onLogout }: { onLogout: () => void }) {
  const queryClient = useQueryClient();
  const { data: clients, isLoading } = useListTrainerClients();
  const linkClient = useLinkTrainerClient();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [linkError, setLinkError] = useState("");
  const [linkSuccess, setLinkSuccess] = useState("");

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError("");
    setLinkSuccess("");
    try {
      const linkedClient = await linkClient.mutateAsync({ data: { code: inviteCode } });
      await queryClient.invalidateQueries({ queryKey: getListTrainerClientsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetAthleteInviteCodeQueryKey() });
      setIsAddOpen(false);
      setInviteCode("");
      setLinkSuccess(`${linkedClient.name} is now linked to your roster.`);
    } catch (error) {
      const responseError = error as { data?: { error?: string } };
      setLinkError(
        responseError.data?.error
          ?? "That code could not be linked. Check the six digits or ask the athlete to generate a new code.",
      );
    }
  };

  const clientCount = clients?.length || 0;
  const isAtCapacity = clientCount >= 25;

  return (
    <div className="flex flex-col flex-1">
      <header className="border-b border-border bg-background px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <ArcformLogo />
          <span className="text-muted-foreground text-xs font-light ml-2 border-l border-border pl-4">Trainer Portal</span>
        </div>
        <Button variant="outline" size="sm" onClick={onLogout} className="text-xs">Sign Out</Button>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto p-6 md:p-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-light tracking-tight mb-2">Roster</h1>
            <p className="text-muted-foreground font-light text-sm flex items-center gap-2">
              <span className={isAtCapacity ? "text-foreground font-medium" : ""}>{clientCount} / 25</span> athletes managed
              {isAtCapacity && <span className="text-[10px] bg-muted px-2 py-0.5 rounded uppercase tracking-wider text-muted-foreground ml-2">Capacity Reached</span>}
            </p>
          </div>
          <Button onClick={() => setIsAddOpen(true)} disabled={isAtCapacity} className="shrink-0">
            Add Invite Code
          </Button>
        </div>
        {linkSuccess && (
          <p role="status" className="mb-6 rounded-xl border border-border bg-card px-4 py-3 text-sm">
            {linkSuccess}
          </p>
        )}

        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-card rounded-xl border border-border/50" />)}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="border-b border-border bg-background/50 text-muted-foreground font-light text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="font-medium p-4 whitespace-nowrap pl-6">Athlete</th>
                    <th className="font-medium p-4 whitespace-nowrap">Status</th>
                    <th className="font-medium p-4 whitespace-nowrap">Goal</th>
                    <th className="font-medium p-4 text-right whitespace-nowrap">Adherence</th>
                    <th className="font-medium p-4 text-right whitespace-nowrap">Progress Score</th>
                    <th className="font-medium p-4 text-right whitespace-nowrap pr-6">Last Check-in</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {clients?.map(client => (
                    <tr key={client.id} className="group hover:bg-muted/10 transition-colors">
                      <td className="p-0 pl-2">
                        <Link href={`/client/${client.id}`} className="block p-4 font-medium text-foreground">
                          {client.name}
                          <span className="block text-xs text-muted-foreground font-light mt-0.5">{client.email}</span>
                        </Link>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={client.status} />
                      </td>
                      <td className="p-4 text-muted-foreground capitalize font-light">
                        {client.goal.replace('_', ' ')}
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-medium">{client.adherence}%</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-medium">{client.progressScore}</span>
                        <span className="text-muted-foreground text-xs ml-1 font-light">/ 100</span>
                      </td>
                      <td className="p-4 text-right text-muted-foreground font-light text-xs pr-6">
                        {displayDate(client.lastCheckIn)}
                      </td>
                    </tr>
                  ))}
                  {clients?.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-muted-foreground font-light border-dashed">
                        Your roster is empty. Add your first athlete to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-light tracking-tight mb-1">Link Athlete</h2>
            <p className="text-sm text-muted-foreground font-light mb-6">
              Enter the six-digit invite code generated by your athlete.
            </p>
            
            <form onSubmit={handleAddClient} className="space-y-4">
              <div className="space-y-2">
                <Input 
                  id="invite-code"
                  aria-label="Six-digit invite code"
                  required 
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  placeholder="000000"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="h-16 bg-background text-center text-2xl tracking-[0.35em]"
                  autoFocus
                />
              </div>
              {linkError && <p role="alert" className="text-sm font-light text-foreground">{linkError}</p>}
              
              <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-border/50">
                <Button type="button" variant="ghost" onClick={() => {
                  setIsAddOpen(false);
                  setInviteCode("");
                  setLinkError("");
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={linkClient.isPending || inviteCode.length !== 6}>
                  {linkClient.isPending ? "Linking..." : "Link Athlete"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
