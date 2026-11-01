const PLACEMENT_DEFINITIONS = {
  siteBanner: {
    enabledKey: 'VITE_AD_PLACEMENT_SITE_BANNER',
    slotKey: 'VITE_AD_SLOT_SITE_BANNER',
  },
  sidebar: {
    enabledKey: 'VITE_AD_PLACEMENT_SIDEBAR',
    slotKey: 'VITE_AD_SLOT_SIDEBAR',
  },
  puzzlePage: {
    enabledKey: 'VITE_AD_PLACEMENT_PUZZLE_PAGE',
    slotKey: 'VITE_AD_SLOT_PUZZLE_PAGE',
  },
  postGameResult: {
    enabledKey: 'VITE_AD_PLACEMENT_POST_GAME_RESULT',
    slotKey: 'VITE_AD_SLOT_POST_GAME_RESULT',
  },
}

function isEnabled(value) {
  return value === 'true'
}

export function createAdConfig(env = import.meta.env ?? {}) {
  const publisherId = env.VITE_ADSENSE_PUBLISHER_ID?.trim() ?? ''

  return Object.freeze({
    adsEnabled: isEnabled(env.VITE_ADS_ENABLED),
    publisherApproved: isEnabled(env.VITE_ADSENSE_APPROVED),
    adsFreePremiumEnabled: isEnabled(env.VITE_ADS_FREE_PREMIUM_ENABLED),
    publisherId,
    placements: Object.freeze(
      Object.fromEntries(Object.entries(PLACEMENT_DEFINITIONS).map(([name, keys]) => {
        const slotId = env[keys.slotKey]?.trim() ?? ''

        return [
          name,
          Object.freeze({
            enabled: isEnabled(env[keys.enabledKey]),
            slotId,
          }),
        ]
      })),
    ),
  })
}

export const adConfig = createAdConfig()
