(function(){
  document.body.classList.add('js-ready');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function cssVar(name, fb){ var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fb; }
  function lerp(a,b,t){ return a+(b-a)*t; }
  function fitCanvas(c){
    var rect = c.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    c.width = Math.max(1, rect.width*dpr);
    c.height = Math.max(1, rect.height*dpr);
    var ctx = c.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
    return ctx;
  }
  // Pause offscreen canvases: calls onEnter/onExit as a canvas' container crosses the viewport.
  function watchVisible(el, onChange){
    if (!('IntersectionObserver' in window)){ onChange(true); return; }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){ onChange(e.isIntersecting); });
    }, { threshold:0.1 });
    io.observe(el);
  }

  /* ================= scroll reveal ================= */
  (function(){
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)){ els.forEach(function(el){ el.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold:0.14, rootMargin:'0px 0px -8% 0px' });
    els.forEach(function(el){ io.observe(el); });
  })();

  /* ================= HUD: scroll-spy, scrub bar, scroll-driven frame counter ================= */
  (function(){
    var links = Array.prototype.slice.call(document.querySelectorAll('.hud-nav a'));
    var sections = links.map(function(l){ return document.getElementById(l.dataset.target); }).filter(Boolean);
    var scrubFill = document.getElementById('scrubfill');
    var fc = document.getElementById('framecount');

    function onScroll(){
      var y = window.scrollY + window.innerHeight * 0.3;
      var current = null;
      sections.forEach(function(s){ if (s.offsetTop <= y) current = s; });
      links.forEach(function(l){ l.classList.toggle('active', current && l.dataset.target === current.id); });

      var doc = document.documentElement;
      var pct = (window.scrollY) / Math.max(1, (doc.scrollHeight - window.innerHeight));
      pct = Math.min(1, Math.max(0, pct));
      scrubFill.style.width = (pct*100) + '%';
      fc.textContent = 'F ' + String(Math.floor(pct*48200)+1200).padStart(6,'0');
    }
    document.addEventListener('scroll', onScroll, { passive:true });
    onScroll();
  })();

  /* ================= confidence tag jitter (hero) ================= */
  (function(){
    var tag = document.getElementById('conf-tag');
    var labels = ['open_palm','peace_sign','thumbs_up','pointing'];
    var li = 0;
    setInterval(function(){
      var v = (0.88 + Math.random()*0.11).toFixed(2);
      tag.textContent = 'gesture: ' + labels[li % labels.length] + ' · ' + v;
      li++;
    }, 2800);
  })();

  /* ================= reusable: hand skeleton ================= */
  var HAND_POSES = {
    open_palm: [
      [0.50,0.90],
      [0.40,0.78],[0.32,0.66],[0.26,0.56],[0.21,0.48],
      [0.41,0.60],[0.39,0.42],[0.38,0.28],[0.37,0.16],
      [0.51,0.58],[0.51,0.38],[0.51,0.22],[0.51,0.09],
      [0.61,0.60],[0.62,0.41],[0.63,0.26],[0.64,0.14],
      [0.70,0.66],[0.72,0.50],[0.74,0.38],[0.75,0.28]
    ],
    point: [
      [0.50,0.90],
      [0.42,0.76],[0.40,0.70],[0.44,0.66],[0.48,0.64],
      [0.41,0.60],[0.39,0.42],[0.38,0.28],[0.37,0.16],
      [0.51,0.58],[0.50,0.54],[0.47,0.56],[0.45,0.60],
      [0.61,0.60],[0.59,0.56],[0.55,0.57],[0.52,0.61],
      [0.70,0.66],[0.67,0.62],[0.62,0.62],[0.58,0.65]
    ],
    pinch: [
      [0.50,0.90],
      [0.42,0.76],[0.40,0.66],[0.39,0.54],[0.40,0.42],
      [0.41,0.60],[0.39,0.44],[0.38,0.36],[0.40,0.38],
      [0.51,0.58],[0.52,0.44],[0.51,0.34],[0.50,0.28],
      [0.61,0.60],[0.61,0.46],[0.60,0.36],[0.58,0.30],
      [0.70,0.66],[0.70,0.52],[0.67,0.44],[0.63,0.40]
    ]
  };
  var HAND_BONES = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [5,9],[9,10],[10,11],[11,12],
    [9,13],[13,14],[14,15],[15,16],
    [13,17],[17,18],[18,19],[19,20],
    [0,17]
  ];
  var HAND_TIPS = [4,8,12,16,20];

  function makeHandSkeleton(canvas, opts){
    opts = opts || {};
    var ctx = fitCanvas(canvas);
    window.addEventListener('resize', function(){ ctx = fitCanvas(canvas); });
    var current = HAND_POSES.open_palm.map(function(p){ return p.slice(); });
    var target = 'open_palm';
    var t = Math.random()*10;
    var active = true;

    watchVisible(canvas, function(vis){ active = vis; if (vis) requestAnimationFrame(frame); });

    if (opts.autoCycle){
      var order = ['open_palm','point','pinch'];
      var oi = 0;
      setInterval(function(){ oi = (oi+1)%order.length; target = order[oi]; }, opts.cycleMs || 2600);
    }

    function frame(){
      if (!active) return;
      var w = canvas.getBoundingClientRect().width, h = canvas.getBoundingClientRect().height;
      ctx.clearRect(0,0,w,h);
      var ink = cssVar('--ink-soft','#8B9296');
      var accent = cssVar('--accent','#E3A73C');
      var accent2 = cssVar('--accent-2','#C15B7C');

      var goal = HAND_POSES[target];
      for (var i=0;i<current.length;i++){
        current[i][0] = lerp(current[i][0], goal[i][0], 0.1);
        current[i][1] = lerp(current[i][1], goal[i][1], 0.1);
      }
      var pts = current.map(function(p,i){
        var jitter = i===0 ? 0 : 0.006;
        var dx = Math.sin(t*1.1+i*0.7)*jitter;
        var dy = Math.cos(t*0.9+i*1.1)*jitter*0.7;
        return [ (p[0]+dx)*w, (p[1]+dy)*h ];
      });

      ctx.lineWidth = 2; ctx.strokeStyle = ink; ctx.globalAlpha = 0.55;
      HAND_BONES.forEach(function(b){
        ctx.beginPath(); ctx.moveTo(pts[b[0]][0],pts[b[0]][1]); ctx.lineTo(pts[b[1]][0],pts[b[1]][1]); ctx.stroke();
      });
      ctx.globalAlpha = 1;
      pts.forEach(function(p,i){
        ctx.beginPath();
        var r = i===0?5:(HAND_TIPS.indexOf(i)>=0?4:3);
        ctx.arc(p[0],p[1],r,0,Math.PI*2);
        ctx.fillStyle = HAND_TIPS.indexOf(i)>=0 ? accent2 : accent;
        ctx.fill();
      });

      if (!reduceMotion){ t += 0.02; requestAnimationFrame(frame); }
    }
    frame();
    return { setGesture:function(g){ target = g; } };
  }

  /* ================= reusable: foot channel (belt cam, looking down) ================= */
  var FOOT_ANGLES = { forward:-Math.PI/2, back:Math.PI/2, left:Math.PI, right:0 };

  function makeFootChannel(canvas, opts){
    opts = opts || {};
    var ctx = fitCanvas(canvas);
    window.addEventListener('resize', function(){ ctx = fitCanvas(canvas); });
    var t = Math.random()*10;
    var curAngle = FOOT_ANGLES.forward, activeAmt = 0.6;
    var footTarget = 'forward';
    var active = true;

    watchVisible(canvas, function(vis){ active = vis; if (vis) requestAnimationFrame(frame); });

    if (opts.autoCycle){
      var order = ['forward','right','back','left','up'];
      var oi = 0;
      setInterval(function(){ oi = (oi+1)%order.length; footTarget = order[oi]; }, opts.cycleMs || 2200);
    }

    function footShape(cx,cy,w,h,rot){
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(rot||0);
      ctx.beginPath(); ctx.ellipse(0,0,w*0.5,h*0.5,0,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }

    function frame(){
      if (!active) return;
      var w = canvas.getBoundingClientRect().width, h = canvas.getBoundingClientRect().height;
      ctx.clearRect(0,0,w,h);
      var ink = cssVar('--ink-soft','#8B9296');
      var accent = cssVar('--accent','#E3A73C');
      var accent2 = cssVar('--accent-2','#C15B7C');

      var cx = w/2, cy = h/2, R = Math.min(w,h)*0.48;
      ctx.save();
      ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.clip();

      var isLift = footTarget === 'up';
      var goalAngle = (!isLift) ? FOOT_ANGLES[footTarget] : curAngle;
      var da = goalAngle - curAngle;
      while (da > Math.PI) da -= Math.PI*2;
      while (da < -Math.PI) da += Math.PI*2;
      curAngle += da * 0.15;
      activeAmt = lerp(activeAmt, 1, 0.06);

      ctx.globalAlpha = 0.55; ctx.fillStyle = ink;
      var liftGrow = isLift ? 1 + 0.2*Math.max(0,Math.sin(t*4)) : 1;
      footShape(cx - R*0.24, cy + R*0.32, R*0.28*liftGrow, R*0.62*liftGrow, -0.18);
      footShape(cx + R*0.24, cy + R*0.32, R*0.28*liftGrow, R*0.62*liftGrow, 0.18);
      ctx.globalAlpha = 1;

      var cols=6, rows=5;
      for (var i=0;i<cols;i++){
        for (var j=0;j<rows;j++){
          var x = cx + (R*1.5)*((i/(cols-1))-0.5);
          var y = cy + (R*1.5)*((j/(rows-1))-0.5);
          if (Math.hypot(x-cx,y-cy) > R*1.05) continue;
          var jitter = Math.sin(t*1.6+i*1.3+j*0.9)*0.15;
          var a = isLift ? Math.atan2(y-cy,x-cx)+jitter*0.4 : curAngle+jitter;
          var len = (8 + 3*Math.sin(t*2+i+j)) * activeAmt;
          var dx = Math.cos(a)*len, dy = Math.sin(a)*len;
          ctx.strokeStyle = (i+j)%2===0 ? accent : accent2;
          ctx.globalAlpha = 0.85; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(x-dx*0.5,y-dy*0.5); ctx.lineTo(x+dx*0.5,y+dy*0.5); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      var grad = ctx.createRadialGradient(cx,cy,R*0.4,cx,cy,R);
      grad.addColorStop(0,'rgba(0,0,0,0)'); grad.addColorStop(1,'rgba(0,0,0,0.18)');
      ctx.fillStyle = grad; ctx.fillRect(cx-R,cy-R,R*2,R*2);
      ctx.restore();

      ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2);
      ctx.strokeStyle = ink; ctx.globalAlpha=0.5; ctx.lineWidth=1.1; ctx.stroke(); ctx.globalAlpha=1;

      if (!reduceMotion){ t += 0.03; requestAnimationFrame(frame); }
    }
    frame();
    return { setDirection:function(d){ footTarget = d; } };
  }

  /* ================= mini research-card visuals (ambient, auto-cycling) ================= */
  document.querySelectorAll('canvas.mv-hand').forEach(function(c){ makeHandSkeleton(c, {autoCycle:true, cycleMs:2400}); });
  document.querySelectorAll('canvas.mv-foot').forEach(function(c){ makeFootChannel(c, {autoCycle:true, cycleMs:1900}); });

  document.querySelectorAll('canvas.mv-compass').forEach(function(canvas){
    var ctx = fitCanvas(canvas);
    window.addEventListener('resize', function(){ ctx = fitCanvas(canvas); });
    var t = 0, active = true, activeSpoke = 0;
    watchVisible(canvas, function(vis){ active = vis; if (vis) requestAnimationFrame(frame); });
    setInterval(function(){ activeSpoke = (activeSpoke+1)%5; }, 900);
    function frame(){
      if (!active) return;
      var w = canvas.getBoundingClientRect().width, h = canvas.getBoundingClientRect().height;
      ctx.clearRect(0,0,w,h);
      var cx=w/2, cy=h/2, R = Math.min(w,h)*0.42;
      var ink = cssVar('--ink-soft','#8B9296');
      var accent = cssVar('--accent','#E3A73C');
      var accent2 = cssVar('--accent-2','#C15B7C');
      var line = cssVar('--line-strong','rgba(0,0,0,.2)');

      // 10 faint original spokes
      for (var i=0;i<10;i++){
        var a = (i/10)*Math.PI*2 - Math.PI/2;
        ctx.strokeStyle = line; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(a)*R*0.7, cy+Math.sin(a)*R*0.7); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // 5 kept spokes, one highlighted in turn
      for (var k=0;k<5;k++){
        var ak = (k/5)*Math.PI*2 - Math.PI/2;
        var isActive = k === activeSpoke;
        var x2 = cx+Math.cos(ak)*R, y2 = cy+Math.sin(ak)*R;
        ctx.strokeStyle = isActive ? accent : ink;
        ctx.globalAlpha = isActive ? 1 : 0.55;
        ctx.lineWidth = isActive ? 2.2 : 1.4;
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(x2,y2); ctx.stroke();
        ctx.beginPath(); ctx.arc(x2,y2, isActive?4:2.6, 0, Math.PI*2);
        ctx.fillStyle = isActive ? accent2 : ink; ctx.globalAlpha=1; ctx.fill();
      }
      t += 0.02;
      if (!reduceMotion) requestAnimationFrame(frame);
    }
    frame();
  });

  /* ================= hero hand skeleton ================= */
  makeHandSkeleton(document.getElementById('hand'), { autoCycle:true, cycleMs:3000 });

  /* ================= Grab, Then Walk — embedded interactive concept ================= */
  (function(){
    var handRig = makeHandSkeleton(document.getElementById('c-hand'), {});
    var footRig = makeFootChannel(document.getElementById('c-foot'), {});

    var handState = 'open_palm', grabbed = false, liftPulse = 0;
    var velX=0, velY=0, posX=0, posY=0, rotY=0;
    var ROT_SPEED = { open_palm:0.006, pinch:0.0, point:0.028 };

    var handStateEl = document.getElementById('c-hand-state');
    var footStateEl = document.getElementById('c-foot-state');
    var grabTag = document.getElementById('c-grab-tag');
    var ruleText = document.getElementById('c-rule');

    document.querySelectorAll('[data-chand]').forEach(function(btn){
      btn.addEventListener('click', function(){
        document.querySelectorAll('[data-chand]').forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
        handState = btn.dataset.chand;
        handRig.setGesture(handState);
        grabbed = handState === 'pinch';
        handStateEl.textContent = grabbed ? 'grabbed' : 'released';
        grabTag.textContent = grabbed ? 'GRABBED' : 'RELEASED';
        ruleText.textContent = grabbed
          ? 'Grabbed — steps relocate the object and a lift raises it; both stay wherever you leave them.'
          : 'Released — a step or lift nudges the object, but it settles back to center.';
      });
    });
    document.querySelectorAll('[data-cfoot]').forEach(function(btn){
      btn.addEventListener('click', function(){
        document.querySelectorAll('[data-cfoot]').forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
        var f = btn.dataset.cfoot;
        footRig.setDirection(f);
        footStateEl.textContent = f === 'up' ? 'lift-up' : 'step-' + f;
        if (f === 'up'){ liftPulse = grabbed ? 1 : 0.3; return; }
        var v = { forward:[0,-1], back:[0,1], left:[-1,0], right:[1,0] }[f];
        velX += v[0]*46; velY += v[1]*46;
      });
    });

    var canvas = document.getElementById('c-cube');
    var ctx = fitCanvas(canvas);
    window.addEventListener('resize', function(){ ctx = fitCanvas(canvas); });
    var active = true;
    watchVisible(canvas, function(vis){ active = vis; if (vis) requestAnimationFrame(frame); });

    var verts = [
      [-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],
      [-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]
    ];
    var edges = [
      [0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]
    ];
    var posXsmooth=0, posYsmooth=0;

    function project(p, w, h, scale, rot){
      var x=p[0], y=p[1], z=p[2];
      var cosr = Math.cos(rot), sinr = Math.sin(rot);
      var x1 = x*cosr - z*sinr;
      var z1 = x*sinr + z*cosr;
      var y1 = y*0.94 + z1*0.22;
      var liftOffset = liftPulse * Math.min(w,h) * 0.16;
      return [ w/2 + posXsmooth*1.1 + x1*scale, h/2 + posYsmooth*1.1 + y1*scale - liftOffset ];
    }

    function frame(){
      if (!active) return;
      var w = canvas.getBoundingClientRect().width, h = canvas.getBoundingClientRect().height;
      ctx.clearRect(0,0,w,h);
      var ink = cssVar('--ink-soft','#8B9296');
      var accent = cssVar('--accent','#E3A73C');
      var accent2 = cssVar('--accent-2','#C15B7C');
      var line = cssVar('--line','rgba(0,0,0,.12)');

      posX += velX*0.016; posY += velY*0.016;
      velX *= 0.92; velY *= 0.92;
      if (!grabbed){ posX += (0-posX)*0.05; posY += (0-posY)*0.05; }
      var maxOff = Math.min(w,h)*0.26;
      posX = Math.max(-maxOff, Math.min(maxOff, posX));
      posY = Math.max(-maxOff, Math.min(maxOff, posY));
      posXsmooth = lerp(posXsmooth, posX, 0.2);
      posYsmooth = lerp(posYsmooth, posY, 0.2);
      liftPulse *= 0.94;
      rotY += ROT_SPEED[handState];

      ctx.strokeStyle = line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(w*0.5-maxOff-16, h*0.5+(h*0.24)); ctx.lineTo(w*0.5+maxOff+16, h*0.5+(h*0.24)); ctx.stroke();
      ctx.beginPath(); ctx.arc(w/2,h/2,3,0,Math.PI*2); ctx.strokeStyle = ink; ctx.globalAlpha=.4; ctx.stroke(); ctx.globalAlpha=1;

      var scale = Math.min(w,h)*0.15*(1+liftPulse*0.22);
      var pts2d = verts.map(function(v){ return project(v, w, h, scale, rotY); });

      ctx.lineWidth = grabbed ? 2.2 : 1.7;
      ctx.strokeStyle = grabbed ? accent2 : accent;
      edges.forEach(function(e){
        ctx.beginPath(); ctx.moveTo(pts2d[e[0]][0],pts2d[e[0]][1]); ctx.lineTo(pts2d[e[1]][0],pts2d[e[1]][1]); ctx.stroke();
      });
      if (grabbed){
        ctx.beginPath();
        ctx.arc(w/2+posXsmooth*1.1, h/2+posYsmooth*1.1, scale*1.7, 0, Math.PI*2);
        ctx.strokeStyle = accent2; ctx.globalAlpha = 0.35+0.15*Math.sin(rotY*8); ctx.lineWidth=1.1; ctx.stroke(); ctx.globalAlpha=1;
      }
      requestAnimationFrame(frame);
    }
    frame();
  })();
})();
