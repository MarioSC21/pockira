const preview = document.querySelector("#note-preview")
const themeButtons = document.querySelectorAll("[data-preview-theme]")

for (const button of themeButtons) {
  button.addEventListener("click", () => {
    if (!(preview instanceof HTMLElement) || !(button instanceof HTMLElement)) {
      return
    }
    preview.dataset.theme = button.dataset.previewTheme
    for (const themeButton of themeButtons) {
      themeButton.setAttribute("aria-pressed", String(themeButton === button))
    }
  })
}

const detectOs = () => {
  const platform = navigator.userAgentData?.platform ?? navigator.userAgent
  // Before "linux": Android user agents also say Linux.
  if (/android/iu.test(platform)) {
    return "android"
  }
  if (/win/iu.test(platform)) {
    return "windows"
  }
  if (/mac/iu.test(platform)) {
    return "mac"
  }
  if (/linux/iu.test(platform)) {
    return "linux"
  }
  return null
}

const os = detectOs()
if (os) {
  document
    .querySelector(`.download-card[data-os="${os}"]`)
    ?.classList.add("is-recommended")
}

const revealItems = document.querySelectorAll(".reveal")
if ("IntersectionObserver" in window && revealItems.length > 0) {
  document.documentElement.classList.add("js")
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible")
          observer.unobserve(entry.target)
        }
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
  )
  for (const item of revealItems) {
    observer.observe(item)
  }
}
