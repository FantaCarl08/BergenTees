function getNextSunday() {
  var target = new Date();
  target.setHours(0, 0, 0, 0);
  var daysUntilSunday = (7 - target.getDay()) % 7 || 7;
  target.setDate(target.getDate() + daysUntilSunday);
  return target;
}

var countdownTarget = getNextSunday();
var days = document.getElementById("cd-days");
var hours = document.getElementById("cd-hours");
var minutes = document.getElementById("cd-minutes");
var seconds = document.getElementById("cd-seconds");

function updateCountdown() {
  var remaining = countdownTarget.getTime() - Date.now();
  if (remaining <= 0) {
    countdownTarget = getNextSunday();
    remaining = countdownTarget.getTime() - Date.now();
  }
  days.textContent = String(Math.floor(remaining / 86400000)).padStart(2, "0");
  hours.textContent = String(Math.floor((remaining % 86400000) / 3600000)).padStart(2, "0");
  minutes.textContent = String(Math.floor((remaining % 3600000) / 60000)).padStart(2, "0");
  seconds.textContent = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");
}

updateCountdown();
setInterval(updateCountdown, 1000);
