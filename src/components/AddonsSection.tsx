import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceAddons } from "@/hooks/useWorkspaceAddons";
import { useWorkspace } from "@/hooks/useWorkspace";
import { PayPalSmartButtons } from "@/components/PayPalSmartButtons";
import { Sparkles, UserPlus, Zap, Check, Users } from "lucide-react";

interface Addon {
  id: "addon_seat_monthly" | "addon_credits_1k_monthly" | "addon_credits_5k_monthly" | "addon_leads_100_monthly";
  productId: "addon_seat" | "addon_credits_1k" | "addon_credits_5k" | "addon_leads_100";
  name: string;
  unit: string;
  price: string;
  description: string;
  icon: typeof UserPlus;
  highlight?: boolean;
}

const ADDONS: Addon[] = [
  {
    id: "addon_leads_100_monthly",
    productId: "addon_leads_100",
    name: "+100 Leads",
    unit: "/mo",
    price: "$8",
    description: "Top up your monthly lead allowance once you've claimed your plan's included leads.",
    icon: Users,
    highlight: true,
  },
  {
    id: "addon_seat_monthly",
    productId: "addon_seat",
    name: "Additional User Seat",
    unit: "/seat/mo",
    price: "$8",
    description: "Add another teammate to your workspace. Cancel anytime.",
    icon: UserPlus,
  },
  {
    id: "addon_credits_1k_monthly",
    productId: "addon_credits_1k",
    name: "+1,000 AI Credits",
    unit: "/mo",
    price: "$15",
    description: "Extra AI email + enrichment credits added to your monthly quota.",
    icon: Zap,
  },
  {
    id: "addon_credits_5k_monthly",
    productId: "addon_credits_5k",
    name: "+5,000 AI Credits",
    unit: "/mo",
    price: "$59",
    description: "Best value for power users running large outreach campaigns.",
    icon: Sparkles,
  },
];

export function AddonsSection() {
  const { user } = useAuth();
  const { current } = useWorkspace();
  const { addons, extraSeats, extraCredits, extraLeads, refetch } = useWorkspaceAddons();
  const [selected, setSelected] = useState<Addon | null>(null);

  const isOwner = current?.role === "owner";

  const purchasedQty = (productId: string) =>
    addons
      .filter((a) => a.product_id === productId)
      .reduce((acc, a) => acc + (a.quantity || 1), 0);


  return (
    <section className="bg-card border border-border/60 rounded-xl p-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-lg text-primary-deep flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Add-ons
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Stack on top of any plan — extra leads, seats and credits, billed monthly. Cancel anytime.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            +{extraLeads.toLocaleString()} leads/mo
          </Badge>
          <Badge variant="secondary" className="text-xs">
            +{extraSeats} extra seat{extraSeats === 1 ? "" : "s"}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            +{extraCredits.toLocaleString()} credits/mo
          </Badge>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {ADDONS.map((addon) => {
          const Icon = addon.icon;
          const owned = purchasedQty(addon.productId);
          return (
            <div
              key={addon.id}
              className={`relative p-4 rounded-lg border transition-all ${
                addon.highlight
                  ? "border-primary/40 bg-gradient-to-br from-primary/5 to-transparent"
                  : "border-border/60 bg-muted/20"
              }`}
            >
              {addon.highlight && (
                <span className="absolute -top-2 right-3 text-[10px] font-bold uppercase tracking-wider bg-gradient-primary text-primary-foreground px-2 py-0.5 rounded-full shadow-glow">
                  Best value
                </span>
              )}
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm font-semibold">{addon.name}</p>
              </div>
              <p className="text-xs text-muted-foreground min-h-[40px]">{addon.description}</p>
              <div className="flex items-baseline gap-1 my-3">
                <span className="text-2xl font-display font-bold text-primary-deep">{addon.price}</span>
                <span className="text-xs text-muted-foreground">{addon.unit}</span>
              </div>
              {owned > 0 && (
                <div className="text-xs text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1">
                  <Check className="h-3 w-3" /> {owned} active
                </div>
              )}
              <Button
                size="sm"
                className="w-full bg-gradient-primary"
                disabled={!isOwner || busy === addon.id}
                onClick={() => buy(addon.id)}
              >
                {busy === addon.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : owned > 0 ? (
                  "Add another"
                ) : (
                  "Add to plan"
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {!isOwner && (
        <p className="text-xs text-muted-foreground">
          Only the workspace owner can purchase add-ons.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Add-ons are billed as separate monthly subscriptions and can be canceled anytime from your billing portal.
      </p>
    </section>
  );
}
