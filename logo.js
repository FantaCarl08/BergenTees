// Bygger 3D-teksten av stablede kopier, slik at CSS-animasjonen kan spinne den
document.querySelectorAll(".logo[data-text]").forEach(function (logo) {
  var text = logo.getAttribute("data-text");
  logo.setAttribute("aria-label", text);
  var layers = 36;
  var step = 0.014;
  var half = (layers * step) / 2;
  for (var i = 0; i < layers; i++) {
    var s = document.createElement("span");
    s.className = "layer" + (i === 0 ? "" : " back");
    s.setAttribute("aria-hidden", i === 0 ? "false" : "true");
    s.textContent = text;
    s.style.transform = "translateZ(" + (half - i * step) + "em)";
    // forsiden i full aksentfarge, sidene toner ned mot skyggefargen
    var pct = Math.round(100 - (i / (layers - 1)) * 100);
    s.style.color = i === 0
      ? "var(--accent)"
      : "color-mix(in srgb, var(--accent) " + Math.round(pct * 0.55) + "%, var(--side))";
    logo.appendChild(s);
  }
});
