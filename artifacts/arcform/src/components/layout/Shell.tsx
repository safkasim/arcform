import * as React from "react"
import { Link, useLocation } from "wouter"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Calendar, Dumbbell, History, LogOut, MessageSquare, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ArcformLogo } from "@/components/ArcformLogo"
import { PageTransition } from "@/components/motion/PageTransition"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/plan", label: "Plan", icon: Calendar },
  { href: "/workout", label: "Workout", icon: Dumbbell },
  { href: "/coach", label: "Coach", icon: MessageSquare },
  { href: "/history", label: "History", icon: History },
]

export function Shell({ children, onLogout }: { children: React.ReactNode; onLogout: () => void }) {
  const [location] = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const reduceMotion = useReducedMotion()

  return (
    <div className="flex h-[100dvh] overflow-hidden flex-col md:flex-row bg-background dark">
      {/* Mobile Topbar */}
      <div className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
        <Link href="/" onClick={() => setMobileMenuOpen(false)}>
          <ArcformLogo variant="nav" />
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
        <motion.div
          className="fixed inset-0 top-14 z-40 bg-background md:hidden p-4 flex flex-col gap-2"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
          transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href))
            return (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-4 text-sm font-medium transition-colors",
                  isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-foreground hover:text-background"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}
          <Button
            type="button"
            variant="outline"
            onClick={onLogout}
            className="mt-auto h-12 justify-start gap-3 text-sm font-medium"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 flex-col border-r bg-card/30 p-6 sticky top-0 h-[100dvh]">
        <Link href="/" className="mb-12 mt-4 inline-block">
          <ArcformLogo variant="nav" />
        </Link>
        <div className="flex flex-col gap-2 flex-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href))
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all",
                  isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-foreground hover:text-background"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </div>
        <div className="space-y-5">
          <Button
            type="button"
            variant="outline"
            onClick={onLogout}
            className="w-full justify-start gap-3 text-sm"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
          <div className="text-xs text-muted-foreground font-light">
            v 1.0.0
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        <div className="h-full flex-1 overflow-hidden">
          <PageTransition>
          {children}
          </PageTransition>
        </div>
      </main>
    </div>
  )
}
