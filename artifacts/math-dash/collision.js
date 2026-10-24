export const MOVEMENT_LIMITS = Object.freeze({
  baseScrollSpeed: 245,
  maxScrollBonus: 175,
  maxRunSpeed: 260,
  maxFrameSeconds: 0.04,
});

function axisTimes(start, end, size, extent) {
  const delta = end - start;
  if (Math.abs(delta) < 1e-8) {
    return start + size > 0 && start < extent ? [-Infinity, Infinity] : null;
  }

  const a = (-size - start) / delta;
  const b = (extent - start) / delta;
  return [Math.min(a, b), Math.max(a, b)];
}

export function sweptAabbHit({
  playerStartX,
  playerEndX,
  playerStartY,
  playerEndY,
  playerWidth,
  playerHeight,
  worldStartX,
  worldEndX,
  hazardX,
  hazardOffset = 0,
  hazardWidth,
  hazardY,
  hazardHeight,
}) {
  const bodyWidth = playerWidth - 8;
  const bodyHeight = playerHeight - 4;
  const x0 = playerStartX + 4 - (hazardX + hazardOffset - worldStartX);
  const x1 = playerEndX + 4 - (hazardX + hazardOffset - worldEndX);
  const y0 = playerStartY + 3 - hazardY;
  const y1 = playerEndY + 3 - hazardY;
  const xTimes = axisTimes(x0, x1, bodyWidth, hazardWidth);
  const yTimes = axisTimes(y0, y1, bodyHeight, hazardHeight);

  return !!xTimes && !!yTimes && Math.max(0, xTimes[0], yTimes[0]) <= Math.min(1, xTimes[1], yTimes[1]);
}

function hazardRect(type, hazard, groundY) {
  switch (type) {
    case 'spike':
      return { x: hazard.x, y: groundY - 30, width: hazard.width, height: 30 };
    case 'block':
      return { x: hazard.x, y: groundY - hazard.height, width: hazard.width, height: hazard.height };
    case 'beam':
      return { x: hazard.x, y: groundY - 43, width: hazard.width, height: 16 };
    default:
      return null;
  }
}

export function sweptHazardHit({ type, hazard, groundY, ...movement }) {
  const rect = hazardRect(type, hazard, groundY);
  if (!rect) return false;

  return sweptAabbHit({
    ...movement,
    hazardX: rect.x,
    hazardWidth: rect.width,
    hazardY: rect.y,
    hazardHeight: rect.height,
  });
}

export function isOverGap(playerCenterX, gapX, gapWidth, worldX) {
  return playerCenterX > gapX - worldX && playerCenterX < gapX + gapWidth - worldX;
}

export function shouldLandOnGround({ landed, verticalVelocity, previousBottom, currentBottom, groundY, overGap }) {
  return !landed && verticalVelocity >= 0 && previousBottom <= groundY + 4 && currentBottom >= groundY && !overGap;
}

export function losesGroundSupportAtGap({ overGap, currentBottom, groundY, supportY }) {
  return overGap && currentBottom >= groundY && supportY === groundY;
}

export function fellBelowStage(playerY, stageHeight) {
  return playerY > stageHeight + 40;
}
