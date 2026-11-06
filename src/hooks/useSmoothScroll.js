// export default function useSmoothScroll() {
//   const scrollTo = (elementId, offset = 0) => {
//     const el = document.getElementById(elementId)
//     if (!el) return
//     const top = el.getBoundingClientRect().top + window.pageYOffset - offset
//     window.scrollTo({ top, behavior: 'smooth' })
//   }
//   return scrollTo
// }