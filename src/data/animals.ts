export type AnimalKind = 'chicken' | 'cow';
export const animals = {
  chicken: { name:'鸡', price:150, capacity:4, product:'egg', housing:'coop-door', positions:[{x:1620,y:816},{x:1660,y:848},{x:1700,y:816},{x:1740,y:848}] },
  cow: { name:'牛', price:300, capacity:2, product:'milk', housing:'barn-door', positions:[{x:1280,y:680},{x:1400,y:680}] },
} as const;
export function isAnimalKind(v: unknown): v is AnimalKind { return v === 'chicken' || v === 'cow'; }
