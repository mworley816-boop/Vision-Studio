/** Production kind must match its parent project's kind; no spending authorization. */
export function projectProductionKindsMatch(projectKind,productionKind){
 return (projectKind==='music'&&productionKind==='music')
  ||(projectKind==='series'&&productionKind==='episode');
}
