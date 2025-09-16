const speedSlider = document.getElementById("speedSlider");
const speedValue = document.getElementById("speedVal");

speedSlider.addEventListener("input", function () {
  const value = this.value;
  speedValue.textContent = `${value}x`;

  // Add animation when value changes
  speedValue.style.transform = "scale(1.1)";
  setTimeout(() => {
    speedValue.style.transform = "scale(1)";
  }, 200);
});

// Toggle animations
const toggles = document.querySelectorAll(".switch input");
toggles.forEach((toggle) => {
  toggle.addEventListener("change", function () {
    if (this.checked) {
      this.parentElement.classList.add("active");
    } else {
      this.parentElement.classList.remove("active");
    }
  });
});

// Load saved settings
document.addEventListener("DOMContentLoaded", function () {
  // In a real extension, you would load saved settings here
  // For demo purposes, we'll just animate the UI
  setTimeout(() => {
    document.querySelector(".container").style.opacity = "1";
  }, 50);
});
