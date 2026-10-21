/* 归仓 · 演示层动效（不触碰 app.js 的业务逻辑） */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // HERO 逐行揭示
  var hero = document.getElementById("hero");
  if (hero) { requestAnimationFrame(function () { setTimeout(function () { hero.classList.add("in"); }, 120); }); }

  // 光标聚光
  var spot = document.getElementById("spot");
  if (spot && matchMedia("(hover:hover)").matches && !reduce) {
    window.addEventListener("mousemove", function (e) {
      spot.style.left = e.clientX + "px";
      spot.style.top = e.clientY + "px";
    }, { passive: true });
  }

  // 滚动揭示
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.16 });
    document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
  }

  // 数字滚动
  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    if (isNaN(target)) return;
    var small = el.querySelector("small");
    var smallHtml = small ? small.outerHTML : "";
    var dur = 1500, t0 = null;
    if (reduce) { return; }
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = (target * eased).toFixed(2);
      el.childNodes[0] && (el.textContent = "");
      el.insertAdjacentText("afterbegin", val);
      if (smallHtml) el.insertAdjacentHTML("beforeend", smallHtml);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  document.querySelectorAll("[data-count]").forEach(function (el) {
    if (!("IntersectionObserver" in window)) return;
    var o = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { countUp(el); o.disconnect(); } }); }, { threshold: 0.6 });
    o.observe(el);
  });

  // 跑马灯
  var track = document.getElementById("marqueeTrack");
  if (track) {
    var items = ["保单满期金未领取", "承运人延误补偿", "自动续费显著提醒", "电商价保差额", "保险生存金", "会员退费协商", "EV 打扰闸门", "分级授权 · L0→L3", "可审计行动包"];
    var cell = items.map(function (t) { return "<span>" + t + "</span>"; }).join("");
    track.innerHTML = cell + cell; // 复制一份实现无缝循环
  }
})();
