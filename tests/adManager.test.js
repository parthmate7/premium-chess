import assert from 'node:assert/strict'
import test from 'node:test'
import { createAdConfig } from '../src/ads/adConfig.js'
import { getAdPlacementStatus, isAdPlacementEligible } from '../src/ads/adManager.js'

const enabledConfig = createAdConfig({
  VITE_ADS_ENABLED: 'true',
  VITE_ADSENSE_APPROVED: 'true',
  VITE_ADSENSE_PUBLISHER_ID: 'ca-pub-1234567890123456',
  VITE_AD_PLACEMENT_SITE_BANNER: 'true',
  VITE_AD_SLOT_SITE_BANNER: '1234567890',
  VITE_AD_PLACEMENT_SIDEBAR: 'true',
  VITE_AD_SLOT_SIDEBAR: '2345678901',
})

test('all ad placements default to disabled without environment configuration', () => {
  const config = createAdConfig({})

  assert.equal(config.adsEnabled, false)
  assert.equal(config.publisherApproved, false)
  assert.equal(config.publisherId, '')
  assert.equal(config.placements.siteBanner.enabled, false)
  assert.equal(config.placements.sidebar.enabled, false)
  assert.equal(config.placements.puzzlePage.enabled, false)
  assert.equal(config.placements.postGameResult.enabled, false)
  assert.equal(config.placements.siteBanner.slotId, '')
})

test('an active or unknown game state always blocks ad placements', () => {
  assert.deepEqual(
    getAdPlacementStatus('siteBanner', { isGameActive: true }, enabledConfig),
    { eligible: false, reason: 'active_game' },
  )
  assert.deepEqual(
    getAdPlacementStatus('siteBanner', {}, enabledConfig),
    { eligible: false, reason: 'game_state_unknown' },
  )
})

test('an eligible placement requires approved, valid publisher setup and explicit inactivity', () => {
  assert.equal(
    isAdPlacementEligible('siteBanner', { isGameActive: false }, enabledConfig),
    true,
  )
  assert.deepEqual(
    getAdPlacementStatus('puzzlePage', { isGameActive: false }, enabledConfig),
    { eligible: false, reason: 'placement_disabled' },
  )
})

test('missing approval, invalid publisher IDs, and premium membership fail closed', () => {
  const noApproval = createAdConfig({
    VITE_ADS_ENABLED: 'true',
    VITE_ADSENSE_PUBLISHER_ID: 'ca-pub-1234567890123456',
    VITE_AD_PLACEMENT_SITE_BANNER: 'true',
  })
  const invalidPublisher = createAdConfig({
    VITE_ADS_ENABLED: 'true',
    VITE_ADSENSE_APPROVED: 'true',
    VITE_ADSENSE_PUBLISHER_ID: 'publisher-id-not-configured',
    VITE_AD_PLACEMENT_SITE_BANNER: 'true',
    VITE_AD_SLOT_SITE_BANNER: '1234567890',
  })

  assert.deepEqual(
    getAdPlacementStatus('siteBanner', { isGameActive: false }, noApproval),
    { eligible: false, reason: 'publisher_not_approved' },
  )
  assert.deepEqual(
    getAdPlacementStatus('siteBanner', { isGameActive: false }, invalidPublisher),
    { eligible: false, reason: 'publisher_id_invalid' },
  )
  assert.deepEqual(
    getAdPlacementStatus(
      'siteBanner',
      { isGameActive: false, isPremium: true },
      enabledConfig,
    ),
    { eligible: false, reason: 'premium_membership' },
  )
})

test('a configured placement requires a real numeric AdSense ad-unit ID', () => {
  const missingSlot = createAdConfig({
    VITE_ADS_ENABLED: 'true',
    VITE_ADSENSE_APPROVED: 'true',
    VITE_ADSENSE_PUBLISHER_ID: 'ca-pub-1234567890123456',
    VITE_AD_PLACEMENT_SITE_BANNER: 'true',
  })
  const invalidSlot = createAdConfig({
    VITE_ADS_ENABLED: 'true',
    VITE_ADSENSE_APPROVED: 'true',
    VITE_ADSENSE_PUBLISHER_ID: 'ca-pub-1234567890123456',
    VITE_AD_PLACEMENT_SITE_BANNER: 'true',
    VITE_AD_SLOT_SITE_BANNER: 'not-a-real-slot',
  })

  assert.deepEqual(
    getAdPlacementStatus('siteBanner', { isGameActive: false }, missingSlot),
    { eligible: false, reason: 'ad_slot_id_missing' },
  )
  assert.deepEqual(
    getAdPlacementStatus('siteBanner', { isGameActive: false }, invalidSlot),
    { eligible: false, reason: 'ad_slot_id_invalid' },
  )
})

test('unknown placement names are not eligible', () => {
  assert.deepEqual(
    getAdPlacementStatus('notConfigured', { isGameActive: false }, enabledConfig),
    { eligible: false, reason: 'unknown_placement' },
  )
})
