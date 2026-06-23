;(function () {
  try {
    var mode = localStorage.getItem('lianyu-theme')
    var root = document.documentElement
    var isLight = mode === 'light'
    var bg = isLight ? '#ffffff' : '#0a0a10'
    var text = isLight ? '#1a1a1e' : '#e8edf2'
    root.classList.toggle('dark', !isLight)
    root.classList.toggle('light', isLight)
    root.style.colorScheme = isLight ? 'light' : 'dark'
    root.style.backgroundColor = bg
    root.style.setProperty('--boot-bg', bg)
    root.style.setProperty('--boot-text', text)
    root.style.setProperty('--boot-accent', '#f4a6b5')
    if (document.body) {
      document.body.style.backgroundColor = bg
      document.body.style.color = text
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        document.body.style.backgroundColor = bg
        document.body.style.color = text
      })
    }
  } catch (e) {
    document.documentElement.classList.add('dark')
    document.documentElement.style.backgroundColor = '#0a0a10'
  }
})()
