import { adConfig } from './adConfig.js'

const ADSENSE_PUBLISHER_ID_PATTERN = /^ca-pub-\d{16}$/
const ADSENSE_SLOT_ID_PATTERN = /^\d+$/

function unavailable(reason) {
  return { eligible: false, reason }
}

export function getAdPlacementStatus(
  placementName,
  { isGameActive, isPremium = false } = {},
  config = adConfig,
) {
  const placement = config.placements[placementName]

  if (!placement) return unavailable('unknown_placement')
  if (isGameActive !== false) {
    return unavailable(isGameActive ? 'active_game' : 'game_state_unknown')
  }
  if (isPremium) return unavailable('premium_membership')
  if (!config.adsEnabled) return unavailable('ads_disabled')
  if (!config.publisherApproved) return unavailable('publisher_not_approved')
  if (!config.publisherId) return unavailable('publisher_id_missing')
  if (!ADSENSE_PUBLISHER_ID_PATTERN.test(config.publisherId)) {
    return unavailable('publisher_id_invalid')
  }
  if (!placement.enabled) return unavailable('placement_disabled')
  if (!placement.slotId) return unavailable('ad_slot_id_missing')
  if (!ADSENSE_SLOT_ID_PATTERN.test(placement.slotId)) {
    return unavailable('ad_slot_id_invalid')
  }

  return { eligible: true, reason: 'ready' }
}

export function isAdPlacementEligible(placementName, context, config = adConfig) {
  return getAdPlacementStatus(placementName, context, config).eligible
}
