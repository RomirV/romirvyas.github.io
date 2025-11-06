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

// Apply typing effect to elements with the class "typing"
document.addEventListener("DOMContentLoaded", () => {
  const typingElements = document.querySelectorAll(".typing");

  // Immediately make typing elements visually transparent to prevent their
  // text from flashing before the scheduled typing starts, while preserving
  // layout (so wrapping/height is locked in). Store the full text on the
  // element for use by the typing routine.
  typingElements.forEach(element => {
    // Use innerText (rendered text) and trim to remove HTML indentation/newline
    // whitespace that can appear from nested block elements in the source.
    const txt = (element.innerText || element.textContent || "").trim();
    element.dataset.fullText = txt;
    // Capture the computed color now (before we make it transparent) so
    // the typing overlay and final reveal can use the correct color.
    const cs = getComputedStyle(element);
    element.dataset.originalColor = cs.color;
    // Make text invisible but keep it in the DOM for layout
    element.style.color = 'transparent';
  });

  // Schedule typing in sequence: start the next element only after the
  // previous one has finished. This ensures later elements (like the
  // paragraph) don't start typing before the heading completes.
  const interElementDelay = 750; // ms after an element finishes before next starts
  let currentIndex = 0;
  const runNext = () => {
    if (currentIndex >= typingElements.length) return;
    const el = typingElements[currentIndex];
    typeEffect(el, 30, () => {
      currentIndex++;
      setTimeout(runNext, interElementDelay);
    });
  };
  // Kick off the first typing run
  runNext();
});

// Improved typing effect that reserves the element's final size before typing
function typeEffect(element, speed, onComplete) {
  // Get the final text from the pre-stored dataset (set at DOMContentLoaded)
  const fullText = element.dataset.fullText || element.textContent || "";

  // When a new typing run starts, remove any final cursors left behind by
  // previous runs so only the active typing cursor is visible.
  document.querySelectorAll('.typing-final-cursor').forEach(c => {
    if (c && c.parentNode) c.parentNode.removeChild(c);
  });

  // Respect reduced motion preference: reveal the full text instantly
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    element.style.color = element.dataset.originalColor || getComputedStyle(element).color;
    if (typeof onComplete === 'function') onComplete();
    return;
  }

  // Use an overlay span to render typed characters while the element contains the
  // full (transparent) text to lock layout/wrapping in place. This prevents words
  // from shifting lines mid-type.
  const cs = getComputedStyle(element);
  // Use the stored originalColor when available (we saved it before making
  // the element transparent on DOMContentLoaded). Fallback to computed style.
  const originalColor = element.dataset.originalColor || cs.color;
  const originalPosition = cs.position;
  const prevDisplay = cs.display;

  // Ensure the element can contain an absolutely positioned overlay
  if (originalPosition === 'static') {
    element.style.position = 'relative';
  }
  if (prevDisplay === 'inline') {
    element.style.display = 'inline-block';
  }

  // The element already contains the full text and was made transparent at
  // DOMContentLoaded to avoid flash — ensure it's still transparent and reserve layout.
  element.style.color = 'transparent';

  // Create the overlay that will show typed characters
  const overlay = document.createElement('span');
  overlay.className = 'typing-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.style.position = 'absolute';
  overlay.style.left = '0';
  overlay.style.top = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.pointerEvents = 'none';
  overlay.style.overflow = 'hidden';
  // Inherit font/line-height so characters align exactly
  overlay.style.font = cs.font;
  overlay.style.lineHeight = cs.lineHeight;
  // If the element contains block children (like <div> inside an <h1>), the
  // computed whiteSpace may be 'normal' which will collapse line breaks in
  // the overlay. Use 'pre-wrap' so newline characters and wrapping match the
  // underlying content's layout (preserves block breaks rendered as newlines).
  overlay.style.whiteSpace = cs.whiteSpace === 'normal' ? 'pre-wrap' : cs.whiteSpace;
  // Ensure overlay behaves like a block so that line breaks and wrapping
  // align with the element's layout (this helps keep the first line on its own row).
  overlay.style.display = 'block';
  overlay.style.wordBreak = cs.wordBreak || 'normal';
  overlay.style.color = originalColor;

  // Start with an empty overlay
  overlay.textContent = '';
  element.appendChild(overlay);

  // Ensure the blink keyframes and helper class exist once
  if (!document.getElementById('typing-cursor-styles')) {
    const style = document.createElement('style');
    style.id = 'typing-cursor-styles';
    style.textContent = `@keyframes typing-blink{0%,49%{opacity:1}50%,100%{opacity:0}} .typing-cursor{animation:typing-blink 1s step-end infinite}`;
    document.head.appendChild(style);
  }

  // Create a text node for typed characters so we can keep a DOM cursor
  // element next to it that will naturally follow the text as it grows.
  const typedNode = document.createTextNode('');
  overlay.appendChild(typedNode);

  const cursor = document.createElement('span');
  cursor.className = 'typing-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.style.display = 'inline-block';
  cursor.style.width = '0.20ch';
  cursor.style.height = '1.1em';
  cursor.style.backgroundColor = originalColor;
  cursor.style.marginLeft = '0.12ch';
  cursor.style.verticalAlign = 'text-bottom';
  // For reduced-motion users we'll turn off the animation below.
  overlay.appendChild(cursor);

  // If user prefers reduced motion, reveal instantly and place a static cursor
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Reveal underlying text
    element.style.color = originalColor;
    // Fill the overlay instantly
    typedNode.nodeValue = fullText;
    // Make cursor static (no animation)
    cursor.style.animation = 'none';
    // Restore positioning/display if we changed them earlier
    if (originalPosition === 'static') element.style.position = originalPosition;
    if (prevDisplay === 'inline') element.style.display = prevDisplay;
    return;
  }

  // Use a recursive timeout-based ticker instead of setInterval so we can
  // insert custom pauses (for example at newline characters) without
  // affecting the global per-element stagger.
  let i = 0;
  const newlinePause = 300; // ms pause when hitting a newline (shorter gap)

  const tick = () => {
    if (i < fullText.length) {
      typedNode.nodeValue += fullText[i];

      // Determine next delay: normal speed or a slightly longer pause when
      // we just typed a newline so the next line starts with a short gap.
      const ch = fullText[i];
      i++;
      const nextDelay = ch === '\n' ? newlinePause : speed;
      setTimeout(tick, nextDelay);
      return;
    }

    // Finished typing: remove overlay and reveal the real element text, then
    // insert a final cursor at the end of the content.
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);

    element.style.color = originalColor;

    const prevFinal = element.querySelector('.typing-final-cursor');
    if (prevFinal && prevFinal.parentNode) prevFinal.parentNode.removeChild(prevFinal);

    const finalCursor = document.createElement('span');
    finalCursor.className = 'typing-cursor typing-final-cursor';
    finalCursor.setAttribute('aria-hidden', 'true');
    finalCursor.style.display = 'inline-block';
    finalCursor.style.width = '0.20ch';
    finalCursor.style.height = '1.1em';
    finalCursor.style.backgroundColor = originalColor;
    finalCursor.style.marginLeft = '0.12ch';
    finalCursor.style.verticalAlign = 'text-bottom';

    let insertionTarget = element;
    if (element.lastElementChild) insertionTarget = element.lastElementChild;
    insertionTarget.appendChild(finalCursor);

    if (originalPosition === 'static') element.style.position = originalPosition;
    if (prevDisplay === 'inline') element.style.display = prevDisplay;

    if (typeof onComplete === 'function') onComplete();
  };

  // Start typing
  setTimeout(tick, speed);
}
