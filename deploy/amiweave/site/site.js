const downloads = {
  windows: {
    label: 'Download for Windows',
    href: 'https://github.com/erick-huazi/LianYuPC/releases/download/v0.3.0-rc.2/Amiweave-0.3.0-rc.2-win-x64.exe',
    card: '[data-platform="windows"]',
  },
  mac: {
    label: 'Choose a macOS build',
    href: '#downloads',
    card: '[data-platform="mac-arm64"]',
  },
  other: {
    label: 'View all downloads',
    href: '#downloads',
    card: null,
  },
}

function detectPlatform() {
  const value = `${navigator.userAgentData?.platform || ''} ${navigator.userAgent || ''}`.toLowerCase()
  if (value.includes('windows')) return 'windows'
  if (value.includes('mac')) return 'mac'
  return 'other'
}

const selected = downloads[detectPlatform()]
const primaryLink = document.querySelector('#primary-download')
const primaryLabel = document.querySelector('#primary-download-label')

if (primaryLink && primaryLabel) {
  primaryLink.href = selected.href
  primaryLabel.textContent = selected.label
}

if (selected.card) {
  document.querySelector(selected.card)?.classList.add('is-recommended')
}
