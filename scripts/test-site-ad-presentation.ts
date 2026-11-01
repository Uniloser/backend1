import assert from 'node:assert/strict';
import { test } from 'node:test';
import { promotionCreativeSchema } from '../src/validators/promotionCreative';

test('preserves a custom Discovery banner creative from the Admin builder', () => {
  const creative = {
    layout: 'minimal',
    siteLayout: 'hero',
    bannerSize: 'custom',
    desktopHeight: 250,
    mobileHeight: 200,
    headline: 'Your next obsession starts here.',
    tagline: 'Discover stories. Find your people.',
    boldText: '',
    accentColor: '#ef476f',
    secondaryColor: '#ed8b00',
    textColor: '#ffffff',
    overlayColor: '#111111',
    textAlign: 'center',
    fontStyle: 'sans',
    showBrand: true,
    positions: { brand: { x: 17, y: 28 } },
    badgeText: 'Sponsored Pick',
    showGenres: false,
    showSave: false,
    artwork: [],
    textScale: {},
    buttonStyle: { width: 100, height: 100, radius: 5 },
  };

  const parsed = promotionCreativeSchema.parse(creative);
  assert.equal(parsed.secondaryColor, '#ed8b00');
  assert.equal(parsed.headline, creative.headline);
  assert.equal(parsed.bannerSize, 'custom');
  assert.equal(parsed.desktopHeight, 250);
  assert.equal(parsed.mobileHeight, 200);
  assert.equal(parsed.boldText, '');
  assert.deepEqual(parsed.positions, { brand: { x: 17, y: 28 } });
});
