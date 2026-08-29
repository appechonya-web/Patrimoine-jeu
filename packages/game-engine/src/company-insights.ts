/**
 * Astuce heuristique par cycle (cf. domain/residence.ts pour le même esprit
 * côté personnel) — le joueur se plaignait de ne pas comprendre pourquoi
 * son revenu restait faible malgré un gros investissement : plutôt que de
 * le laisser déduire lui-même la cause depuis des chiffres bruts, on
 * pointe explicitement le poste le plus actionnable, dans un ordre de
 * priorité (le plus urgent/impactant d'abord).
 */
export interface CompanyCycleTipInputs {
  revenue: number;
  costs: number;
  unitsSold: number;
  unitsLostDemand: number;
  worstProductMargin: { label: string; margin: number } | null;
  staffCosts: number;
  totalLoanPayments: number;
  cashReserve: number;
  treasuryInvestment: number;
}

const HIGH_DEMAND_LOSS_RATIO = 0.2;
const HIGH_STAFF_COST_RATIO = 0.5;
const HIGH_LOAN_PAYMENT_RATIO = 0.3;
const IDLE_CASH_THRESHOLD = 5_000;

export function computeCompanyCycleTip(inputs: CompanyCycleTipInputs): string {
  const totalDemand = inputs.unitsSold + inputs.unitsLostDemand;
  const lostRatio = totalDemand > 0 ? inputs.unitsLostDemand / totalDemand : 0;
  if (lostRatio > HIGH_DEMAND_LOSS_RATIO) {
    return `Tu perds ${(lostRatio * 100).toFixed(0)}% de la demande faute de capacité — investis dans l'équipement ou l'expansion de capacité.`;
  }

  if (inputs.worstProductMargin && inputs.worstProductMargin.margin < 0) {
    return `Ta gamme "${inputs.worstProductMargin.label}" vend à perte (marge négative) — augmente son prix ou réduis son coût de production (automatisation).`;
  }

  if (inputs.revenue > 0 && inputs.staffCosts / inputs.revenue > HIGH_STAFF_COST_RATIO) {
    return `Tes charges de personnel dépassent la moitié de ton revenu — vérifie que chaque poste rapporte plus qu'il ne coûte avant d'embaucher davantage.`;
  }

  if (inputs.revenue > 0 && inputs.totalLoanPayments / inputs.revenue > HIGH_LOAN_PAYMENT_RATIO) {
    return `Le remboursement de tes prêts pèse lourd sur ton revenu — évite d'emprunter davantage tant que ce poste domine.`;
  }

  if (inputs.cashReserve > IDLE_CASH_THRESHOLD && inputs.treasuryInvestment === 0) {
    return `${Math.round(inputs.cashReserve).toLocaleString("fr-BE")} € de trésorerie dorment sans rien rapporter — places-en une partie pour un revenu passif.`;
  }

  if (inputs.revenue - inputs.costs > 0) {
    return `Cycle rentable — continue sur cette voie.`;
  }

  return `Ce cycle est en perte — regarde le détail ci-dessous pour identifier le poste qui pèse le plus.`;
}
