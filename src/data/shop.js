// @ts-check
// Shop & economy (PLAN §7.9)
export const SHOP = {
  offerCount: 4,
  basePrice: { mg: 25, shotgun: 45, sniper: 45, bazooka: 90 },
  sellBase: 8,
  typePremium: { mg: 1, shotgun: 1.5, sniper: 1.5, bazooka: 2.5 },
  rerollBase: 10, rerollStep: 5,
  vendPrice: 35,
  vendOutcomes: [
    { id: 'gun', weight: 55 },
    { id: 'resources', weight: 30 },
    { id: 'jackpot', weight: 10 },
    { id: 'chicken', weight: 5 },
  ],
  upgrades: [
    { id: 'ammoCap', name: 'Ammo Cap +25%', prices: [40, 80, 120] },
    { id: 'shieldCap', name: 'Shield Cap +25', prices: [50, 100, 150] },
    { id: 'slot4', name: '4th Gun Slot', prices: [100] },
  ],
  supplies: [
    { id: 'ammoRefill', name: 'Ammo Refill', price: 30 },
    { id: 'medkit', name: 'Medkit', price: 20 },
  ],
};
