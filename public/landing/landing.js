

const glow = document.querySelector(".glow");

window.addEventListener("mousemove", (e) => {
  // Move the warm background glow slightly toward the cursor.
  const x = (e.clientX / window.innerWidth - 0.5) * 40;
  const y = (e.clientY / window.innerHeight - 0.5) * 40;
  glow.style.transform = `translate(${x}px, ${y}px)`;
});
