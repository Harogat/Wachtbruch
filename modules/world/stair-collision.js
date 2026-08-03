export const STAIR_COLLISION_SCHEMA = 'wachtbruch-stair-collision';
export const STAIR_COLLISION_VERSION = 1;

export const STAIR_COLLISION_RATIOS = Object.freeze({
  walkableHalfWidth: 0.44,
  collisionHalfLength: 0.6,
  flankHalfThickness: 0.075
});

export function createStairCollisionDimensions(cellSize, scale = 1) {
  const safeCellSize = Math.max(0, Number(cellSize) || 0);
  const safeScale = Math.max(0, Number(scale) || 0);
  const walkableHalfWidth = safeCellSize * STAIR_COLLISION_RATIOS.walkableHalfWidth * safeScale;
  const collisionHalfLength = safeCellSize * STAIR_COLLISION_RATIOS.collisionHalfLength * safeScale;
  const flankHalfThickness = safeCellSize * STAIR_COLLISION_RATIOS.flankHalfThickness * safeScale;
  return {
    walkableHalfWidth,
    collisionHalfLength,
    flankHalfThickness,
    flankCenterOffset: walkableHalfWidth + flankHalfThickness
  };
}

export function circleRectangleOverlapDepth(
  x,
  z,
  radius,
  centerX,
  halfWidth,
  halfLength
) {
  const minX = centerX - halfWidth;
  const maxX = centerX + halfWidth;
  const minZ = -halfLength;
  const maxZ = halfLength;
  const closestX = Math.max(minX, Math.min(x, maxX));
  const closestZ = Math.max(minZ, Math.min(z, maxZ));
  const deltaX = x - closestX;
  const deltaZ = z - closestZ;
  if (deltaX || deltaZ) return Math.max(0, radius - Math.hypot(deltaX, deltaZ));
  return radius + Math.min(x - minX, maxX - x, z - minZ, maxZ - z);
}

export function stairFlankOverlapDepthLocal({
  x = 0,
  z = 0,
  radius = 0,
  walkableHalfWidth = 0,
  collisionHalfLength = 0,
  flankHalfThickness = 0
} = {}) {
  const centerOffset = walkableHalfWidth + flankHalfThickness;
  return Math.max(
    circleRectangleOverlapDepth(
      x,
      z,
      radius,
      centerOffset,
      flankHalfThickness,
      collisionHalfLength
    ),
    circleRectangleOverlapDepth(
      x,
      z,
      radius,
      -centerOffset,
      flankHalfThickness,
      collisionHalfLength
    )
  );
}

export function stairFlankMoveBlocked(currentDepth, nextDepth, epsilon = 0.0001) {
  if (nextDepth <= 0) return false;
  return currentDepth <= 0 || nextDepth >= currentDepth - epsilon;
}

export function createGodotStairCollisionProfile() {
  return {
    schema: STAIR_COLLISION_SCHEMA,
    version: STAIR_COLLISION_VERSION,
    ratios: { ...STAIR_COLLISION_RATIOS }
  };
}
