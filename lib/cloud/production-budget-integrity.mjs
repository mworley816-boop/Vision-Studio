/** Read-only integrity check; does not authorize spending or alter stored budgets. */
export function productionBudgetIsValid(kind,budgetCents){
 return (kind==='music'&&budgetCents===500)||(kind==='episode'&&budgetCents===2000);
}
