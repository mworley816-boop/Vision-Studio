export const LIMITS = Object.freeze({music:500,episode:2000});
export const EPISODE_ALLOCATION = Object.freeze({motion:1000,assets:300,audio:240,director:160,retries:300});
export function assertCents(n){if(!Number.isSafeInteger(n)||n<0)throw new Error('Amount must be nonnegative integer cents');}
export function remainingCents(kind,spent,reserved){if(!(kind in LIMITS))throw new Error('Unknown production type');assertCents(spent);assertCents(reserved);return Math.max(0,LIMITS[kind]-spent-reserved);}
export function canReserve(kind,spent,reserved,estimate){assertCents(estimate);return estimate<=remainingCents(kind,spent,reserved);}
export function reserve(state,estimate){if(!canReserve(state.kind,state.spentCents,state.reservedCents,estimate))throw new Error('Production cap exceeded');return {...state,reservedCents:state.reservedCents+estimate};}
export function settle(state,reservation,actual){assertCents(reservation);assertCents(actual);if(reservation>state.reservedCents)throw new Error('Unknown reservation');if(actual>reservation)throw new Error('Charge exceeds reservation; manual reconciliation required');if(state.spentCents+actual>LIMITS[state.kind])throw new Error('Production cap exceeded');return {...state,reservedCents:state.reservedCents-reservation,spentCents:state.spentCents+actual};}
