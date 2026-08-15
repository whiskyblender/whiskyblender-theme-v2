(function () {
  var gate = document.getElementById('wb-age-gate');

  /* Gate is display:none by default; only show it for unverified users */
  if (document.cookie.indexOf('wb_age_verified=1') !== -1) {
    return;
  }

  gate.classList.add('wb-age-gate--visible');

  /* Lock scroll while gate is visible */
  document.body.style.overflow = 'hidden';

  function applyBannerOffset() {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var realHeader = document.getElementById('wb-header');
        if (realHeader) {
          gate.style.paddingTop = Math.max(0, realHeader.getBoundingClientRect().top) + 'px';
        } else {
          var banner = document.getElementById('wb-banner');
          gate.style.paddingTop = (banner ? banner.offsetHeight : 0) + 'px';
        }
      });
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyBannerOffset);
  } else {
    applyBannerOffset();
  }
  window.addEventListener('load', applyBannerOffset);

  function setCookie(name, value, days) {
    var expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = name + '=' + value + '; expires=' + expires + '; path=/; SameSite=Lax; Secure';
  }

  var stopRain = null;

  function dismiss() {
    setCookie('wb_age_verified', '1', 365);
    document.body.style.overflow = '';
    gate.classList.add('wb-age-gate--hidden');
    if (stopRain) stopRain();
    if (parallaxRaf) cancelAnimationFrame(parallaxRaf);
    setTimeout(function () { gate.classList.remove('wb-age-gate--visible'); }, 420);
  }

  function decline() {
    document.getElementById('wb-age-gate-content').style.display = 'none';
    document.getElementById('wb-age-sorry').style.display = 'block';
    setTimeout(function () {
      window.location.href = 'https://www.drinkaware.co.uk';
    }, 2500);
  }

  document.getElementById('wb-age-yes').addEventListener('click', dismiss);
  document.getElementById('wb-age-no').addEventListener('click', decline);

  /* Rain effect */
  var canvas = document.getElementById('wb-age-gate-rain');
  var ctx = canvas.getContext('2d');
  var drops = [];
  var DROP_COUNT = 280;
  var raf;
  var windX = 0;

  function setWind(relX) {
    windX = (relX - 0.5) * 18;
  }

  /* Parallax background — desktop only */
  var isHoverDevice = window.matchMedia('(hover: hover)').matches;
  var bgEl = document.getElementById('wb-age-gate-bg');
  var parallaxCurrent = 0;
  var parallaxTarget = 0;
  var parallaxRaf;

  if (isHoverDevice && bgEl) {
    gate.addEventListener('mousemove', function (e) {
      parallaxTarget = (e.clientX / window.innerWidth - 0.5) * -18;
    });

    (function parallaxLoop() {
      parallaxCurrent += (parallaxTarget - parallaxCurrent) * 0.06;
      bgEl.style.transform = 'scale(1.08) translateX(' + parallaxCurrent + 'px)';
      parallaxRaf = requestAnimationFrame(parallaxLoop);
    })();
  }

  gate.addEventListener('mousemove', function (e) {
    var rect = canvas.getBoundingClientRect();
    setWind((e.clientX - rect.left) / rect.width);
  });

  gate.addEventListener('touchmove', function (e) {
    var rect = canvas.getBoundingClientRect();
    setWind((e.touches[0].clientX - rect.left) / rect.width);
  }, { passive: true });

  function resize() {
    canvas.width = gate.offsetWidth;
    canvas.height = gate.offsetHeight;
  }

  function initDrops() {
    drops = [];
    for (var i = 0; i < DROP_COUNT; i++) {
      drops.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        len: Math.random() * 35 + 18,
        speed: Math.random() * 14 + 14,
        opacity: Math.random() * 0.3 + 0.1,
        width: Math.random() < 0.3 ? 1.5 : 1
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < drops.length; i++) {
      var d = drops[i];
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + windX, d.y + d.len);
      ctx.strokeStyle = 'rgba(180, 200, 220, ' + d.opacity + ')';
      ctx.lineWidth = d.width;
      ctx.stroke();
      d.y += d.speed;
      d.x += windX * 0.5;
      if (d.y > canvas.height + d.len) {
        d.y = -d.len;
        d.x = Math.random() * canvas.width;
      }
    }
    raf = requestAnimationFrame(draw);
  }

  stopRain = function () { cancelAnimationFrame(raf); };

  resize();
  initDrops();
  draw();

  window.addEventListener('resize', function () {
    resize();
    initDrops();
  });
})();
