import { useEffect, useRef, useState } from 'react'
import { adConfig } from './adConfig.js'
import { getAdPlacementStatus } from './adManager.js'
import './Ad.css'

const PLACEMENT_LABELS = {
  siteBanner: 'Homepage banner',
  sidebar: 'Dashboard sidebar',
  puzzlePage: 'Chess puzzles',
  postGameResult: 'Post-game results',
}

let adsenseScriptPromise

function loadAdsenseScript(publisherId) {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('Google AdSense requires a browser environment.'))
  }

  if (adsenseScriptPromise) return adsenseScriptPromise

  adsenseScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.async = true
    script.crossOrigin = 'anonymous'
    script.dataset.adsenseClient = publisherId
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(publisherId)}`
    script.onload = () => resolve()
    script.onerror = () => {
      adsenseScriptPromise = undefined
      reject(new Error('Google AdSense could not be loaded. Check the network and publisher setup.'))
    }
    document.head.appendChild(script)
  })

  return adsenseScriptPromise
}

export function Ad({
  placement,
  isGameActive,
  isPremium = false,
  config = adConfig,
}) {
  const slotRef = useRef(null)
  const [status, setStatus] = useState('loading')
  const placementConfig = config.placements[placement]
  const placementStatus = getAdPlacementStatus(
    placement,
    { isGameActive, isPremium },
    config,
  )

  useEffect(() => {
    if (!placementStatus.eligible || !placementConfig?.slotId || !slotRef.current) {
      return undefined
    }

    let active = true
    const slot = slotRef.current
    let timeoutId
    const observer = new MutationObserver(() => {
      const adStatus = slot.dataset.adStatus

      if (adStatus === 'filled' || adStatus === 'unfilled') {
        window.clearTimeout(timeoutId)
        if (active) setStatus(adStatus)
      }
    })

    observer.observe(slot, { attributes: true, attributeFilter: ['data-ad-status'] })

    loadAdsenseScript(config.publisherId)
      .then(() => {
        if (!active || slot.dataset.requested === 'true') return

        slot.dataset.requested = 'true'
        window.adsbygoogle = window.adsbygoogle || []
        window.adsbygoogle.push({})
        timeoutId = window.setTimeout(() => {
          if (active && slot.dataset.adStatus !== 'filled' && slot.dataset.adStatus !== 'unfilled') {
            setStatus('error')
          }
        }, 15000)
      })
      .catch(() => {
        if (active) setStatus('error')
      })

    return () => {
      active = false
      observer.disconnect()
      window.clearTimeout(timeoutId)
    }
  }, [config.publisherId, placementConfig?.slotId, placementStatus.eligible])

  if (!placementStatus.eligible) return null

  return (
    <section
      className={`ad-placement ad-placement-${placement}`}
      aria-label={PLACEMENT_LABELS[placement] ?? 'Advertisement'}
      aria-busy={status === 'loading'}
    >
      <div className="ad-label">ADVERTISEMENT</div>
      <div className="ad-content">
        <ins
          ref={slotRef}
          className="adsbygoogle ad-slot"
          style={{ display: 'block' }}
          data-ad-client={config.publisherId}
          data-ad-slot={placementConfig.slotId}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
        {(status === 'loading' || status === 'requested') && (
          <div className="ad-state ad-state-loading" role="status">
            <span className="ad-spinner" aria-hidden="true" />
            <span>Loading advertisement</span>
          </div>
        )}
        {status === 'error' && (
          <div className="ad-state ad-state-error" role="status">
            Advertisement could not be loaded.
          </div>
        )}
        {status === 'unfilled' && (
          <div className="ad-state ad-state-empty" role="status">
            No advertisement is available right now.
          </div>
        )}
      </div>
    </section>
  )
}
