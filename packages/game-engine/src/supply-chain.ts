/**
 * Chaîne de valeur sectorielle par paliers (section 8 du document de
 * conception) : une entreprise de niveau 1 s'approvisionne en matières
 * premières auprès des entreprises de niveau 0 du même secteur parent,
 * plutôt que d'acheter dans le vide. L'appariement est automatique à
 * chaque cycle (comme le marché de matières premières ou les enchères) —
 * pas de négociation manuelle entre joueurs — au prix fixé par chaque
 * vendeur, les acheteurs préférant les vendeurs les moins chers d'abord.
 * Chaque appariement devient une ligne SupplyContract, jusqu'ici une table
 * jamais utilisée.
 */

export interface B2bSeller {
  companyId: string;
  /** Stock invendu disponible ce cycle (cf. runProductLine, stockUnitsAfter) — pas la capacité totale. */
  availableUnits: number;
  unitPrice: number;
}

export interface B2bBuyer {
  companyId: string;
  /** Capacité de production visée pour ce cycle, avant plafonnement par l'approvisionnement obtenu. */
  desiredUnits: number;
}

export interface B2bMatch {
  buyerCompanyId: string;
  sellerCompanyId: string;
  quantity: number;
  price: number;
}

/**
 * Apparie acheteurs et vendeurs au sein d'un même secteur parent — chaque
 * acheteur puise chez les vendeurs les moins chers en premier, jusqu'à
 * satisfaction de son besoin ou épuisement du stock disponible. Rationnement
 * naturel si la demande totale dépasse l'offre : les premiers acheteurs
 * (ordre de la liste) sont mieux servis, comme dans une file d'attente.
 */
export function matchB2bSupply(buyers: B2bBuyer[], sellers: B2bSeller[]): B2bMatch[] {
  const remainingSellers = sellers
    .filter((s) => s.availableUnits > 0)
    .map((s) => ({ ...s }))
    .sort((a, b) => a.unitPrice - b.unitPrice);

  const matches: B2bMatch[] = [];
  for (const buyer of buyers) {
    let remaining = buyer.desiredUnits;
    for (const seller of remainingSellers) {
      if (remaining <= 0) break;
      if (seller.availableUnits <= 0) continue;
      const quantity = Math.min(remaining, seller.availableUnits);
      matches.push({ buyerCompanyId: buyer.companyId, sellerCompanyId: seller.companyId, quantity, price: seller.unitPrice });
      remaining -= quantity;
      seller.availableUnits -= quantity;
    }
  }
  return matches;
}
