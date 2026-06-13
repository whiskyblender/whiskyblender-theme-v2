(function () {
  if (!/\/collections\/[^/]*birthday/.test(window.location.pathname)) return;

  var style = document.createElement('style');
  style.textContent = [
    '#wb-balloon-stage{position:fixed;left:0;bottom:0;width:100%;height:100vh;pointer-events:none;z-index:9999;overflow:visible}',
    '.wb-balloon{position:absolute;bottom:0}',
    '.wb-balloon-inner{transform-origin:bottom center}',
    '.wb-balloon-body{width:var(--wb-size);height:calc(var(--wb-size) * 1.22);border-radius:50% 50% 50% 50%/55% 55% 45% 45%;background:var(--wb-color);position:relative;box-shadow:inset -5px -8px 0 rgba(0,0,0,.1)}',
    '.wb-balloon-body::before{content:"";position:absolute;top:18%;left:18%;width:26%;height:18%;border-radius:50%;background:rgba(255,255,255,.38);transform:rotate(-40deg)}',
    '.wb-balloon-body::after{content:"";position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);border-left:4px solid transparent;border-right:4px solid transparent;border-top:8px solid var(--wb-color)}',
    '.wb-balloon-string{width:1px;height:55px;background:rgba(80,80,80,.28);margin:0 auto}',
    '@keyframes wb-balloon-rise{0%{transform:translateY(0);opacity:0}8%{opacity:1}85%{opacity:1}100%{transform:translateY(-120vh);opacity:0}}',
    '@keyframes wb-balloon-sway{from{transform:rotate(-8deg)}to{transform:rotate(8deg)}}'
  ].join('');
  document.head.appendChild(style);

  var stage = document.createElement('div');
  stage.id = 'wb-balloon-stage';
  stage.setAttribute('aria-hidden', 'true');
  document.body.appendChild(stage);

  var colors = ['#ff6b6b','#ff69b4','#ffd166','#74b9ff','#a29bfe','#55efc4','#fd79a8','#fdcb6e','#6c5ce7'];

  function spawn() {
    var color = colors[Math.floor(Math.random() * colors.length)];
    var size  = Math.round(Math.random() * 22 + 36) + 'px';
    var left  = (Math.random() * 86 + 5).toFixed(1) + '%';
    var dur   = (Math.random() * 4 + 7).toFixed(1) + 's';
    var sway  = (Math.random() * 2 + 1.6).toFixed(1) + 's';

    var el = document.createElement('div');
    el.className = 'wb-balloon';
    el.style.left = left;
    el.style.animation = 'wb-balloon-rise ' + dur + ' ease-in forwards';

    var inner = document.createElement('div');
    inner.className = 'wb-balloon-inner';
    inner.style.animation = 'wb-balloon-sway ' + sway + ' ease-in-out infinite alternate';

    var balloonBody = document.createElement('div');
    balloonBody.className = 'wb-balloon-body';
    balloonBody.style.setProperty('--wb-color', color);
    balloonBody.style.setProperty('--wb-size', size);

    var string = document.createElement('div');
    string.className = 'wb-balloon-string';

    inner.appendChild(balloonBody);
    inner.appendChild(string);
    el.appendChild(inner);
    stage.appendChild(el);

    setTimeout(function () { el.remove(); }, parseFloat(dur) * 1000 + 600);
  }

  for (var i = 0; i < 14; i++) {
    (function (d) { setTimeout(spawn, d); })(Math.random() * 10000);
  }
})();
