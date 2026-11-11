import { createHash } from 'node:crypto';

const TYPES = new Set(['image', 'video', 'audio']);
const MIME = { image: new Set(['image/png', 'image/jpeg', 'image/webp']), video: new Set(['video/mp4', 'video/webm']), audio: new Set(['audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/ogg']) };
const MAX_BYTES = { image: 25_000_000, video: 1_000_000_000, audio: 200_000_000 };
const ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
const HASH = /^[a-f0-9]{64}$/;
function requiredId(value, name) { if (typeof value !== 'string' || !ID.test(value)) throw new Error(`Invalid ${name}`); return value; }
function assertAsset(asset) {
  if (!asset || typeof asset !== 'object' || Array.isArray(asset)) throw new Error('Invalid asset');
  requiredId(asset.projectId, 'projectId'); requiredId(asset.assetId, 'assetId');
  if (!TYPES.has(asset.type) || !MIME[asset.type].has(asset.mimeType)) throw new Error('Unsupported asset type or MIME');
  if (!Number.isSafeInteger(asset.bytes) || asset.bytes < 1 || asset.bytes > MAX_BYTES[asset.type]) throw new Error('Invalid asset size');
  if (typeof asset.sha256 !== 'string' || !HASH.test(asset.sha256)) throw new Error('Invalid SHA-256');
  if (!['verified', 'quarantined'].includes(asset.status)) throw new Error('Asset must be verified or quarantined');
  if (asset.status === 'verified' && asset.verified !== true) throw new Error('Verification required');
  return asset;
}
export function sha256(bytes) { if (!(bytes instanceof Uint8Array)) throw new Error('Expected bytes'); return createHash('sha256').update(bytes).digest('hex'); }
export function storageKey(projectId, assetId, sha) {
  requiredId(projectId, 'projectId'); requiredId(assetId, 'assetId');
  if (typeof sha !== 'string' || !HASH.test(sha)) throw new Error('Invalid SHA-256');
  return `projects/${projectId}/assets/${assetId}/${sha}`;
}
export function verifyAssetBytes({ projectId, assetId, type, mimeType, bytes, expectedSha256 }) {
  requiredId(projectId, 'projectId'); requiredId(assetId, 'assetId');
  if (!(bytes instanceof Uint8Array)) throw new Error('Expected bytes');
  const sha = sha256(bytes);
  if (sha !== expectedSha256) throw new Error('Asset checksum mismatch');
  const record = { projectId, assetId, type, mimeType, bytes: bytes.byteLength, sha256: sha, status: 'verified', verified: true };
  assertAsset(record);
  return Object.freeze({ ...record, storageKey: storageKey(projectId, assetId, sha) });
}
export function registerAsset(registry, asset) {
  assertAsset(asset);
  if (!Array.isArray(registry)) throw new Error('Invalid registry');
  if (registry.some(a => a.projectId === asset.projectId && a.assetId === asset.assetId)) throw new Error('Duplicate asset ID');
  return [...registry, Object.freeze({ ...asset, storageKey: storageKey(asset.projectId, asset.assetId, asset.sha256) })];
}
export function findReusableAsset(registry, { projectId, type, sha256: digest }) {
  requiredId(projectId, 'projectId');
  if (!TYPES.has(type) || !HASH.test(digest ?? '')) throw new Error('Invalid lookup');
  return registry.find(a => a.projectId === projectId && a.type === type && a.sha256 === digest && a.status === 'verified' && a.verified === true) ?? null;
}
export function attachAssetToScene(registry, { projectId, assetId, sceneId, expectedType }) {
  requiredId(projectId, 'projectId'); requiredId(assetId, 'assetId'); requiredId(sceneId, 'sceneId');
  const asset = registry.find(a => a.projectId === projectId && a.assetId === assetId);
  if (!asset || asset.status !== 'verified' || asset.verified !== true) throw new Error('Verified asset unavailable in project');
  if (expectedType && asset.type !== expectedType) throw new Error('Asset type mismatch');
  return Object.freeze({ projectId, sceneId, assetId, type: asset.type, sha256: asset.sha256 });
}
export function storageSummary(registry, projectId) {
  requiredId(projectId, 'projectId');
  const assets = registry.filter(a => a.projectId === projectId);
  return { assetCount: assets.length, verifiedCount: assets.filter(a => a.status === 'verified' && a.verified === true).length, totalBytes: assets.reduce((sum, a) => sum + a.bytes, 0) };
}
