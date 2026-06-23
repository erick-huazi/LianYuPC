;(function () {
  try {
    var mode = localStorage.getItem('lianyu-theme')
    var root = document.documentElement
    var isLight = mode === 'light'
    root.classList.toggle('dark', !isLight)
    root.classList.toggle('light', isLight)
    root.style.colorScheme = isLight ? 'light' : 'dark'
  } catch (e) {
    document.documentElement.classList.add('dark')
  }
})()
