

const raw = sessionStorage.getItem("narataStory");
if (!raw) {
 
  window.location.href = "upload.html";
}
const story = JSON.parse(raw);

document.getElementById("story-title").textContent = story.storyTitle || "Your story";

const chaptersEl = document.getElementById("chapters");
const navEl = document.getElementById("chapter-nav");
const alreadyTyped = new Set();

// ---- build each chapter section + its nav dot ----
story.chapters.forEach((chapter, i) => {
  const section = document.createElement("section");
  section.className = "chapter";
  section.id = `chapter-${i}`;
  section.innerHTML = `
    <p class="chapter-eyebrow">Chapter ${i + 1}</p>
    <h2 class="chapter-heading">${escapeHtml(chapter.title)}</h2>
    <div class="chapter-body" id="body-${i}"></div>
  `;
  chaptersEl.appendChild(section);

  const dot = document.createElement("button");
  dot.className = "chapter-dot";
  dot.setAttribute("aria-label", chapter.title);
  dot.addEventListener("click", () => {
    document.getElementById(`chapter-${i}`).scrollIntoView({ behavior: "smooth" });
  });
  navEl.appendChild(dot);
});

const endNote = document.createElement("p");
endNote.className = "end-note";
endNote.textContent = "— end —";
chaptersEl.appendChild(endNote);

const chapterEls = document.querySelectorAll(".chapter");
const dotEls = document.querySelectorAll(".chapter-dot");

// ---- watch which chapter is centered in the viewport ----
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      const index = [...chapterEls].indexOf(entry.target);
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
        dotEls.forEach((d) => d.classList.remove("active"));
        dotEls[index]?.classList.add("active");
        typeChapter(index);
      } else {
        entry.target.classList.remove("active");
      }
    });
  },
  { threshold: 0.5 }
);
chapterEls.forEach((el) => observer.observe(el));

// ---- type a chapter's text out word by word, only the first time it's seen ----
function typeChapter(index) {
  if (alreadyTyped.has(index)) return;
  alreadyTyped.add(index);

  const bodyEl = document.getElementById(`body-${index}`);
  const words = story.chapters[index].content.split(" ");
  const cursor = document.createElement("span");
  cursor.className = "typed-cursor";

  let i = 0;
  const interval = setInterval(() => {
    bodyEl.textContent = words.slice(0, i + 1).join(" ");
    bodyEl.appendChild(cursor);
    i++;
    if (i >= words.length) {
      clearInterval(interval);
      cursor.remove();
    }
  }, 35);
}

// ---- auto-scroll toggle ----
const autoBtn = document.getElementById("autoscroll-btn");
const autoLabel = document.getElementById("autoscroll-label");
let autoScrolling = false;
let autoScrollFrame = null;

autoBtn.addEventListener("click", () => {
  autoScrolling = !autoScrolling;
  autoBtn.classList.toggle("on", autoScrolling);
  autoLabel.textContent = `Auto-scroll: ${autoScrolling ? "on" : "off"}`;
  if (autoScrolling) runAutoScroll();
});

// Stop auto-scroll if the person scrolls or drags manually.
["wheel", "touchstart"].forEach((evt) =>
  window.addEventListener(evt, () => {
    if (autoScrolling) {
      autoScrolling = false;
      autoBtn.classList.remove("on");
      autoLabel.textContent = "Auto-scroll: off";
    }
  })
);

function runAutoScroll() {
  if (!autoScrolling) return;
  window.scrollBy(0, 0.6);
  autoScrollFrame = requestAnimationFrame(runAutoScroll);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
