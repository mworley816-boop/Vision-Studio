/** Invalidate local storyboard approvals when visual references change.
 * This is local planning protection, not authorization for paid generation.
 */
export function invalidateProjectSceneApprovals(productions, projectId) {
  if (!projectId || !Array.isArray(productions)) throw new Error('Invalid project approval update');
  return productions.map(production => {
    if (production.projectId !== projectId) return production;
    if (!Array.isArray(production.scenes)) throw new Error('Invalid production scenes');
    if (!production.scenes.some(scene => scene.approved)) return production;
    return {
      ...production,
      scenes: production.scenes.map(scene => scene.approved ? {...scene, approved:false} : scene)
    };
  });
}

/** Only invalidate when the identity-defining visual bible actually changed. */
export function visualBibleChanged(previous, next) {
  if (!previous || !next || previous.projectId !== next.projectId) throw new Error('Visual Bible project mismatch');
  const signature = bible => JSON.stringify({
    style:bible.style, palette:bible.palette,
    characters:bible.characters, locations:bible.locations
  });
  return signature(previous) !== signature(next);
}
