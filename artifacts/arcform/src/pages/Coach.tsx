import { useEffect, useRef, useState } from "react";
import { useChatWithCoach } from "@workspace/api-client-react";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, User, Zap } from "lucide-react";
import { ArcformLogo } from "@/components/ArcformLogo";

type Message = {
  id: string;
  role: "user" | "coach";
  content: string;
  adjusted?: boolean;
};

export default function Coach() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "coach", content: "Protocol active. What needs adjustment?" },
  ]);
  const [input, setInput] = useState("");
  const chat = useChatWithCoach();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chat.isPending]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages((previous) => [...previous, userMsg]);
    setInput("");

    chat.mutate(
      { data: { message: userMsg.content } },
      {
        onSuccess: (reply) => {
          setMessages((previous) => [
            ...previous,
            {
              id: (Date.now() + 1).toString(),
              role: "coach",
              content: reply.message,
              adjusted: reply.adjusted,
            },
          ]);
        },
        onError: () => {
          setMessages((previous) => [
            ...previous,
            {
              id: (Date.now() + 1).toString(),
              role: "coach",
              content: "Connection lost. Unable to process adjustment.",
            },
          ]);
        },
      },
    );
  };

  return (
    <div className="flex h-full min-h-full flex-col overflow-hidden bg-background">
      <div className="border-b border-border bg-card/50 p-4 md:p-6">
        <h1 className="text-lg font-medium tracking-tight">AI Coach</h1>
        <p className="text-xs font-light text-muted-foreground">System Active</p>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-8"
        data-testid="container-coach-conversation"
      >
        <div className="mx-auto min-h-full max-w-4xl">
            <div className="space-y-6 md:space-y-8">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 md:gap-4 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border sm:flex ${
                      message.role === "user"
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-card text-foreground"
                    }`}
                  >
                    {message.role === "user" ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <ArcformLogo variant="nav" iconOnly className="origin-center scale-75" />
                    )}
                  </div>
                  <div className="max-w-[88%] space-y-2 md:max-w-2xl">
                    <div
                      className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm font-light leading-relaxed md:px-5 md:py-3.5 ${
                        message.role === "user"
                          ? "bg-foreground text-background"
                          : "bg-card text-foreground"
                      }`}
                    >
                      {message.content}
                    </div>
                    {message.adjusted && (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <Zap className="h-3 w-3" />
                        Protocol Adjusted
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {chat.isPending && (
                <div className="flex gap-3 md:gap-4">
                  <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card sm:flex">
                    <ArcformLogo
                      variant="nav"
                      iconOnly
                      className="origin-center scale-75 text-muted-foreground"
                    />
                  </div>
                  <div className="rounded-2xl bg-card px-5 py-3.5">
                    <div className="flex h-5 items-center gap-1.5">
                      <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" />
                      <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:0.2s]" />
                      <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
        </div>
      </div>

      <div className="mt-auto bg-gradient-to-t from-background via-background to-transparent px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:border-t md:border-border md:bg-card/50 md:p-6">
        <div className="relative mx-auto max-w-4xl">
          <Textarea
            placeholder="Message AI Coach"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
            className="h-12 min-h-12 resize-none rounded-full border-border bg-card py-3 pl-4 pr-14 text-sm font-light focus-visible:ring-1 focus-visible:ring-foreground md:h-14 md:min-h-14 md:bg-background md:py-4"
            data-testid="input-coach-message"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={chat.isPending || !input.trim()}
            aria-label="Send message"
            data-testid="button-send-coach-message"
            className="absolute bottom-1.5 right-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background transition-all hover:scale-105 disabled:pointer-events-none disabled:opacity-30 md:bottom-2 md:right-2 md:h-10 md:w-10"
          >
            <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}