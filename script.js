// simple fade-in on scroll for cards/sections
const revealEls = document.querySelectorAll("[data-reveal]");

const onScroll = () => {
  const trigger = window.innerHeight * 0.9;
  revealEls.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < trigger) {
      el.style.opacity = 1;
      el.style.transform = "translateY(0px)";
    }
  });
};

window.addEventListener("scroll", onScroll);
window.addEventListener("load", () => {
  revealEls.forEach(el => {
    el.style.opacity = 0;
    el.style.transform = "translateY(12px)";
    el.style.transition = "all 0.4s ease-out";
  });
  onScroll();
});
