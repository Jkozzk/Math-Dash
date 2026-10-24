import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MOVEMENT_LIMITS,
  fellBelowStage,
  isOverGap,
  losesGroundSupportAtGap,
  shouldLandOnGround,
  sweptHazardHit,
} from './collision.js';

const groundY = 364;
const maxScrollSpeed = MOVEMENT_LIMITS.baseScrollSpeed + MOVEMENT_LIMITS.maxScrollBonus;
const frameSeconds = MOVEMENT_LIMITS.maxFrameSeconds;
const movement = {
  playerStartX: 200,
  playerEndX: 200 + MOVEMENT_LIMITS.maxRunSpeed * frameSeconds,
  playerWidth: 30,
  playerHeight: 42,
  worldStartX: 1000,
  worldEndX: 1000 + maxScrollSpeed * frameSeconds,
};
const hazardX = movement.worldStartX + 230;

const hazards = [
  { type: 'spike', hazard: { x: hazardX, width: 34 }, startY: groundY - 100, endY: groundY + 1 },
  { type: 'block', hazard: { x: hazardX, width: 36, height: 35 }, startY: groundY - 100, endY: groundY + 1 },
  { type: 'beam', hazard: { x: hazardX, width: 76 }, startY: groundY - 100, endY: groundY - 20 },
];

test('fast combined scrolling and lateral movement sweep through each hazard', () => {
  assert.equal(maxScrollSpeed, 420, 'the scenario uses the game’s current maximum scroll speed');
  assert.ok(Math.abs(movement.playerEndX - movement.playerStartX - 10.4) < 1e-9);
  assert.ok(Math.abs(movement.worldEndX - movement.worldStartX - 16.8) < 1e-9);

  for (const { type, hazard, startY, endY } of hazards) {
    const common = { type, hazard, groundY, ...movement };

    assert.equal(sweptHazardHit({
      ...common,
      playerStartY: startY,
      playerEndY: startY,
      worldEndX: movement.worldStartX,
      playerEndX: movement.playerStartX,
    }), false, `${type} should not overlap at the starting position`);
    assert.equal(sweptHazardHit({
      ...common,
      playerStartY: endY,
      playerEndY: endY,
    }), false, `${type} should not overlap at the ending position`);
    assert.equal(sweptHazardHit({
      ...common,
      playerStartY: startY,
      playerEndY: endY,
      playerHeight: 42,
    }), true, `${type} should collide while the player and hazard cross during the frame`);
  }
});

test('jumping above spikes and blocks avoids ground-hazard collisions', () => {
  for (const { type, hazard } of hazards.filter(({ type }) => type === 'spike' || type === 'block')) {
    assert.equal(sweptHazardHit({
      type,
      hazard,
      groundY,
      ...movement,
      playerHeight: 42,
      playerStartY: groundY - 42 - 75,
      playerEndY: groundY - 42 - 95,
    }), false, `a jump with clearance should avoid the ${type}`);
  }
});

test('ducking clears an overhead beam while moving at maximum horizontal speeds', () => {
  const duckHeight = 25;
  assert.equal(sweptHazardHit({
    type: 'beam',
    hazard: hazards.find(({ type }) => type === 'beam').hazard,
    groundY,
    ...movement,
    playerHeight: duckHeight,
    playerStartY: groundY - duckHeight,
    playerEndY: groundY - duckHeight,
  }), false);
});

test('falling into a gap loses ground support and eventually ends the run', () => {
  const gapX = movement.worldStartX + 200;
  const gapWidth = 100;
  const playerCenterX = movement.playerEndX + 15;
  const overGap = isOverGap(playerCenterX, gapX, gapWidth, movement.worldEndX);
  const currentBottom = groundY + 10;

  assert.equal(overGap, true);
  assert.equal(shouldLandOnGround({
    landed: false,
    verticalVelocity: 300,
    previousBottom: groundY - 1,
    currentBottom,
    groundY,
    overGap,
  }), false);
  assert.equal(losesGroundSupportAtGap({ overGap, currentBottom, groundY, supportY: groundY }), true);
  assert.equal(fellBelowStage(501, 460), true);
});

test('a clean jump over a gap neither loses support nor counts as a fall', () => {
  const gapX = movement.worldStartX + 200;
  const gapWidth = 100;
  const playerCenterX = movement.playerEndX + 15;
  const overGap = isOverGap(playerCenterX, gapX, gapWidth, movement.worldEndX);
  const airborneBottom = groundY - 70;

  assert.equal(overGap, true);
  assert.equal(shouldLandOnGround({
    landed: false,
    verticalVelocity: -120,
    previousBottom: airborneBottom + 4,
    currentBottom: airborneBottom,
    groundY,
    overGap,
  }), false);
  assert.equal(losesGroundSupportAtGap({
    overGap,
    currentBottom: airborneBottom,
    groundY,
    supportY: groundY,
  }), false);
  assert.equal(fellBelowStage(groundY - 42 - 70, 460), false);
});
