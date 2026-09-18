

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");
const dropText = document.getElementById("drop-text");
const readBtn = document.getElementById("read-btn");
const statusEl = document.getElementById("status");
const extractSection = document.getElementById("extract");
const extractText = document.getElementById("extract-text");
const generateBtn = document.getElementById("generate-btn");

let selectedFile = null;
let extractedText = "";

// ---- picking a file (click) ----
fileInput.addEventListener("change", () => {
  handleFile(fileInput.files[0]);
});

// ---- picking a file (drag and drop) ----
dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});
dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  handleFile(e.dataTransfer.files[0]);
});

function handleFile(file) {
  if (!file) {
    dropText.textContent = "Please choose a file";
    dropText.classList.remove("chosen");
    readBtn.disabled = true;
    selectedFile = null;
    return;
  }
  if (file.type !== "application/pdf") {
    setStatus("That's not a PDF. Please choose a PDF file.", "error");
    return;
  }
  selectedFile = file;
  dropText.textContent = file.name;
  dropText.classList.add("chosen");
  readBtn.disabled = false;
  setStatus("");
}

// ---- STEP 2: "Read PDF" button sends the file to our backend ----
readBtn.addEventListener("click", async () => {
  if (!selectedFile) return;

  readBtn.disabled = true;
  setStatus("Reading your PDF…", "");

  const formData = new FormData();
  formData.append("paper", selectedFile);

  try {
    const res = await fetch("/api/extract", { method: "POST", body: formData });
    const data = await res.json();

    if (!res.ok) {
      setStatus(data.error || "Could not read that PDF.", "error");
      readBtn.disabled = false;
      return;
    }

    extractedText = data.text;
    extractText.textContent = extractedText;
    extractSection.hidden = false;
    setStatus(`Read ${data.pages} page${data.pages === 1 ? "" : "s"}.`, "ok");
    extractSection.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    console.error(err);
    setStatus("Something went wrong reaching the server.", "error");
  } finally {
    readBtn.disabled = false;
  }
});

// ---- STEP 3: "Generate research story" sends the text to Gemini (via our backend) ----
generateBtn.addEventListener("click", async () => {
  if (!extractedText) return;

  generateBtn.disabled = true;
  generateBtn.textContent = "Writing your story…";

  try {
    const res = await fetch("/api/generate-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: extractedText }),
    });
    const story = await res.json();

    if (!res.ok) {
      setStatus(story.error || "Could not generate the story.", "error");
      generateBtn.disabled = false;
      generateBtn.textContent = "Generate research story";
      return;
    }

    // Hand the story to story.html using sessionStorage (a small storage
    // box the browser keeps for this tab only).
    sessionStorage.setItem("narataStory", JSON.stringify(story));
    window.location.href = "story.html";
  } catch (err) {
    console.error(err);
    setStatus("Something went wrong reaching the server.", "error");
    generateBtn.disabled = false;
    generateBtn.textContent = "Generate research story";
  }
});

function setStatus(msg, kind) {
  statusEl.textContent = msg;
  statusEl.className = "status" + (kind ? " " + kind : "");
}
