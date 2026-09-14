export function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'attention':
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white text-black border border-white uppercase tracking-wider">Attention</span>;
    case 'new':
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border border-dashed border-muted-foreground text-muted-foreground uppercase tracking-wider">New</span>;
    case 'on_track':
    default:
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border border-border text-foreground uppercase tracking-wider">On Track</span>;
  }
}
