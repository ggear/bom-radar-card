import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const cardSource = await readFile(new URL('../src/bom-radar-card.js', import.meta.url), 'utf8');
const leafletCss = cardSource.match(/const LEAFLET_CSS = `([\s\S]*?)`;/)?.[1] ?? '';
const cardCss = cardSource.match(/const CARD_CSS = `([\s\S]*?)`;/)?.[1] ?? '';

function getCssProperty(css, selector, property) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rules = css.matchAll(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, 'g'));

  for (const [, declarations] of rules) {
    const value = declarations.match(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`))?.[1];
    if (value !== undefined) return value.trim();
  }

  assert.fail(`Expected ${selector} to declare ${property}`);
}

function getZIndex(selector) {
  const zIndex = getCssProperty(leafletCss, selector, 'z-index');
  assert.match(zIndex, /^-?\d+$/, `Expected ${selector} to declare a numeric z-index`);
  return Number(zIndex);
}

test('keeps loaded Leaflet tiles and overlays behind the home marker pane', () => {
  const tileZIndex = getZIndex('.leaflet-tile-pane');
  const overlayZIndex = getZIndex('.leaflet-overlay-pane');
  const markerZIndex = getZIndex('.leaflet-marker-pane');
  const controlZIndex = getZIndex('.leaflet-control');

  assert.equal(getZIndex('.leaflet-pane'), 400);
  assert.equal(tileZIndex, 200);
  assert.equal(overlayZIndex, 400);
  assert.equal(getZIndex('.leaflet-shadow-pane'), 500);
  assert.equal(markerZIndex, 600);
  assert.equal(getZIndex('.leaflet-tooltip-pane'), 650);
  assert.equal(getZIndex('.leaflet-popup-pane'), 700);
  assert.equal(controlZIndex, 800);
  assert.equal(getZIndex('.leaflet-top,.leaflet-bottom'), 1000);
  assert.ok(tileZIndex < overlayZIndex);
  assert.ok(overlayZIndex < markerZIndex);
  assert.ok(markerZIndex < controlZIndex);
});

test('preserves Leaflet absolute positioning for the home marker icon', () => {
  assert.equal(getCssProperty(cardCss, '.marker-dot', 'position'), 'absolute');
});

test('isolates Leaflet below card-owned controls and overlays', () => {
  const mapZIndex = Number(getCssProperty(cardCss, '#map', 'z-index'));
  const controlsZIndex = Number(getCssProperty(cardCss, '.controls', 'z-index'));
  const badgeZIndex = Number(getCssProperty(cardCss, '.layer-badge', 'z-index'));
  const legendZIndex = Number(getCssProperty(cardCss, '.legend-card', 'z-index'));

  assert.equal(getCssProperty(cardCss, '#map', 'position'), 'relative');
  assert.equal(mapZIndex, 0);
  assert.ok(mapZIndex < controlsZIndex);
  assert.ok(mapZIndex < badgeZIndex);
  assert.ok(mapZIndex < legendZIndex);
});
