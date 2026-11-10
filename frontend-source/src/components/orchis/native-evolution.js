/* Native cmn_deckedit_evo_1 textures, reconstructed for the live browser card.
   No continuous render loop: only draw while a requested transition is active. */

  'use strict';
  const clamp = value => Math.max(0, Math.min(1, value));
  const bell = (value, center, width) => Math.exp(-Math.pow((value - center) / width, 2));
  const textureNames = ['native-runes','rainbow-halo','flare','twinkle','rays','rainbow-rays','glow'];
  export const createOrchisEvolution = (display, button) => {
    let disposed=false;
    const textures = {};
    let native = null;
    const textureReady = Promise.all(textureNames.map(name => new Promise(resolve => {
      const image = new Image();
      image.onload = () => { textures[name] = image; resolve(true); };
      image.onerror = () => resolve(false);
      image.src = `/themes/orchis/native/assets/evolution/${name}.png`;
    }))).then(results => results.every(Boolean));
    const nativeReady = typeof fetch==='function' ? fetch('/themes/orchis/native/assets/evolution/native-rune-system.json').then(response=>{if(!response.ok)throw new Error('Native geometry unavailable');return response.json();}).then(data=>{native=data;return true;}).catch(()=>false) : Promise.resolve(false);
    const ready=Promise.all([textureReady,nativeReady]).then(results=>results.every(Boolean));
    const stage=document.createElement('div');stage.className='evolution-layer';stage.setAttribute('aria-hidden','true');stage.hidden=true;document.body.append(stage);
    const layers = ['back','front'].map(side => {
      const canvas = document.createElement('canvas');
      canvas.className = `evolution-canvas evolution-${side}`;
      canvas.setAttribute('aria-hidden','true');
      stage.append(canvas);
      return {canvas,context:canvas.getContext('2d')};
    });
    const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
    let generation = 0, frame = 0, pending = null, waiting = null, restoreFocus = false;
    const busy = value => {
      if(value&&document.activeElement===button)restoreFocus=true;
      button.disabled = value;
      display.setAttribute('aria-busy', String(value));
      display.classList.toggle('is-evolving', value);
      stage.hidden=!value;
      if(!value&&restoreFocus) {
        if(document.activeElement===document.body)button.focus({preventScroll:true});
        restoreFocus=false;
      }
    };
    function clear() {
      for (const {canvas,context} of layers) context?.clearRect(0,0,canvas.width,canvas.height);
      display.style.removeProperty('--evolution-flash');
      delete display.dataset.evolutionProgress;
      delete display.dataset.evolutionRuneFaces;
      delete display.dataset.evolutionStage;
      busy(false);
    }
    function cancel() {
      generation++;
      cancelAnimationFrame(frame);
      frame = 0;
      waiting?.(false);
      const previous = pending;
      pending = null;
      clear();
      previous?.resolve(false);
    }
    // Map a small strip of the original rune texture onto a projected ribbon.
    function triangle(context, image, source, destination, sourceY=0) {
      const [a,b,c] = source, [p,q,r] = destination;
      const denominator = a[0]*(b[1]-c[1])+b[0]*(c[1]-a[1])+c[0]*(a[1]-b[1]);
      const solve = axis => [
        (p[axis]*(b[1]-c[1])+q[axis]*(c[1]-a[1])+r[axis]*(a[1]-b[1]))/denominator,
        (p[axis]*(c[0]-b[0])+q[axis]*(a[0]-c[0])+r[axis]*(b[0]-a[0]))/denominator,
        (p[axis]*(b[0]*c[1]-c[0]*b[1])+q[axis]*(c[0]*a[1]-a[0]*c[1])+r[axis]*(a[0]*b[1]-b[0]*a[1]))/denominator
      ];
      const x=solve(0), y=solve(1);
      context.save();
      context.beginPath(); context.moveTo(...p); context.lineTo(...q); context.lineTo(...r); context.closePath(); context.clip();
      context.transform(x[0],y[0],x[1],y[1],x[2],y[2]);
      context.drawImage(image,0,sourceY,image.width,64,0,0,image.width,64);
      context.restore();
    }
    // Unity animation curves use cubic Hermite tangents; angular velocity is
    // integrated over particle lifetime rather than spinning only the UV strip.
    function polynomial(a,b) {
      const h=b.time-a.time, m0=h*a.outSlope, m1=h*b.inSlope;
      return [a.value,m0,-3*a.value-2*m0+3*b.value-m1,2*a.value+m0-2*b.value+m1];
    }
    function curveValue(curve,time) {
      const keys=curve.keys;
      if(!keys.length)return curve.scalar;
      if(time<=keys[0].time)return keys[0].value*curve.scalar;
      for(let index=1;index<keys.length;index++)if(time<keys[index].time){
        const a=keys[index-1],b=keys[index],t=(time-a.time)/(b.time-a.time),c=polynomial(a,b);
        return (c[0]+t*(c[1]+t*(c[2]+t*c[3])))*curve.scalar;
      }
      return keys[keys.length-1].value*curve.scalar;
    }
    function curveIntegral(curve,time) {
      const keys=curve.keys;
      if(!keys.length)return curve.scalar*time;
      let area=keys[0].value*Math.min(time,keys[0].time);
      for(let index=1;index<keys.length;index++){
        const a=keys[index-1],b=keys[index];if(time<=a.time)break;
        const h=b.time-a.time,t=Math.min(1,(time-a.time)/h),c=polynomial(a,b);
        area+=h*(c[0]*t+c[1]*t*t/2+c[2]*t*t*t/3+c[3]*t*t*t*t/4);
      }
      const last=keys[keys.length-1];if(time>last.time)area+=(time-last.time)*last.value;
      return area*curve.scalar;
    }
    function gradient(keys,time) {
      if(time<=keys[0][0])return keys[0][1];
      for(let index=1;index<keys.length;index++)if(time<=keys[index][0]){
        const a=keys[index-1],b=keys[index],t=(time-a[0])/(b[0]-a[0]);return a[1]+(b[1]-a[1])*t;
      }
      return keys[keys.length-1][1];
    }
    function quaternion(vector,q) {
      const [x,y,z]=vector,tx=2*(q.y*z-q.z*y),ty=2*(q.z*x-q.x*z),tz=2*(q.x*y-q.y*x);
      return [x+q.w*tx+q.y*tz-q.z*ty,y+q.w*ty+q.z*tx-q.x*tz,z+q.w*tz+q.x*ty-q.y*tx];
    }
    function euler(vector,angles) {
      let [x,y,z]=vector;const [rx,ry,rz]=angles;
      [x,y]=[x*Math.cos(rz)-y*Math.sin(rz),x*Math.sin(rz)+y*Math.cos(rz)];
      [y,z]=[y*Math.cos(rx)-z*Math.sin(rx),y*Math.sin(rx)+z*Math.cos(rx)];
      return [x*Math.cos(ry)+z*Math.sin(ry),y,-x*Math.sin(ry)+z*Math.cos(ry)];
    }
    function draw(progress) {
      if(!native)return;
      const rect=display.getBoundingClientRect(),width=rect.width,height=rect.height;
      const W=width*1.6,H=height*1.45,cx=W/2,cy=H/2,seconds=progress*native.duration;
      const ratio=Math.min(devicePixelRatio||1,2);
      const headerBottom=document.querySelector('[data-dashboard-header]')?.getBoundingClientRect().bottom||0;
      stage.style.clipPath=`inset(${Math.max(0,headerBottom)}px 0 0 0)`;
      for(const {canvas,context} of layers){
        canvas.style.left=`${rect.left-width*.3}px`;canvas.style.top=`${rect.top-height*.225}px`;
        canvas.style.width=`${W}px`;canvas.style.height=`${H}px`;
        const pixelWidth=Math.round(W*ratio),pixelHeight=Math.round(H*ratio);
        if(canvas.width!==pixelWidth||canvas.height!==pixelHeight){canvas.width=pixelWidth;canvas.height=pixelHeight;}
        context.setTransform(ratio,0,0,ratio,0,0);context.clearRect(0,0,W,H);
      }
      const back=layers[0].context,front=layers[1].context;
      const sprite=(context,name,x,y,w,h,opacity,angle=0)=>{
        context.save();context.globalAlpha=clamp(opacity);context.translate(x,y);context.rotate(angle);
        context.drawImage(textures[name],-w/2,-h/2,w,h);context.restore();
      };
      // Native halo life=.3s, crossing rings=1s, final dust/fog extends to1.2s.
      const halo=seconds<.3?Math.sin(Math.PI*seconds/.3):0;
      const flash=bell(seconds,.17,.065),rays=seconds<.5?Math.sin(Math.PI*seconds/.5):0;
      sprite(back,'rays',cx,cy,width*1.4,height*1.08,rays*.8,seconds*.3);
      sprite(back,'rainbow-halo',cx,cy,width*1.15,height*.95,halo*.94,-seconds*.8);
      sprite(back,'rainbow-rays',cx,cy,width*1.22,height*.94,rays*.8,seconds);
      const center=rect.left+width/2;
      const safeHalf=Math.max(1,Math.min(center,document.documentElement.clientWidth-center)-6);
      const worldScale=Math.min(width/.68,safeHalf/.373);
      const mesh=native.mesh,pieces=[];
      for(const instance of native.instances){
        const life=seconds/instance.lifetime;if(life>=1)continue;
        const size=curveValue(instance.size,life);
        const angles=instance.velocity.map((curve,index)=>instance.startRotation[index]+curveIntegral(curve,life)*instance.lifetime);
        const points=mesh.vertices.map(vertex=>{
          const local=vertex.map((value,index)=>value*instance.scale[index]*[instance.localScale.x,instance.localScale.y,instance.localScale.z][index]*size);
          const value=quaternion(euler(local,angles),instance.rotation);
          return [cx+value[0]*worldScale,cy-value[1]*worldScale,value[2]];
        });
        const row=Math.min(native.sheetFrames-1,Math.floor(life*(native.sheetFrames-1)));
        for(const face of mesh.triangles){
          const destination=face.map(index=>points[index]);
          pieces.push({destination,source:face.map(index=>[mesh.uv[index][0]*textures['native-runes'].width,(1-mesh.uv[index][1])*64]),row,opacity:instance.initialAlpha*gradient(instance.alpha,life),depth:destination.reduce((sum,p)=>sum+p[2],0)/3});
        }
      }
      pieces.sort((a,b)=>a.depth-b.depth);
      front.globalCompositeOperation='lighter';
      for(const piece of pieces){
        front.globalAlpha=piece.opacity;
        triangle(front,textures['native-runes'],piece.source,piece.destination.map(point=>point.slice(0,2)),piece.row*64);
      }
      front.globalCompositeOperation='source-over';front.globalAlpha=1;
      for(let index=0;index<34;index++){
        const seed=Math.abs((Math.sin(index*91.17)*43758.54)%1),delay=(index%4)*.055,life=.7+seed*.25;
        const age=(seconds-delay)/life;if(age<0||age>1)continue;
        const angle=index*2.39996,radius=.78+age*.3;
        const x=cx+Math.cos(angle)*width*.48*radius,y=cy+Math.sin(angle)*height*.45*radius-age*height*.035;
        const size=width*(index%7===0?.07:.016+seed*.016),opacity=Math.sin(Math.PI*age)*(.4+.6*seed);
        sprite(front,index%7===0?'flare':'twinkle',x,y,size,size,opacity,age*.4);
      }
      for(const [x,y] of [[-.42,-.4],[.42,-.4],[-.42,.4],[.42,.4]])sprite(front,'glow',cx+width*x,cy+height*y,width*.25,width*.25,flash*.65);
      display.style.setProperty('--evolution-flash',String(flash*.82));
      display.dataset.evolutionProgress=progress.toFixed(3);
      display.dataset.evolutionRuneFaces=String(pieces.length);
      display.dataset.evolutionStage=seconds<.08?'gather':seconds<.3?'flash':seconds<1?'orbit':'settle';
    }
    async function play(commit) {
      if(disposed)return false;
      cancel();
      const ticket=++generation;
      if(motionPreference.matches||document.hidden||!display.getClientRects().length||layers.some(x=>!x.context)) {commit();return false;}
      busy(true);
      const loaded=await new Promise(resolve=>{
        let settled=false;
        const done=value=>{
          if(settled)return;
          settled=true;clearTimeout(timer);
          if(waiting===done)waiting=null;
          resolve(value);
        };
        const timer=setTimeout(()=>done(false),1800);
        waiting=done;
        ready.then(done);
      });
      if(!loaded) {if(ticket===generation){commit();clear();}return false;}
      if(ticket!==generation)return false;
      if(document.hidden||motionPreference.matches||!display.getClientRects().length){commit();clear();return false;}
      return new Promise(resolve=>{
        pending={resolve,commit,committed:false};
        const start=performance.now(), duration=native.duration*1000;
        const tick=now=>{
          if(ticket!==generation)return;
          const progress=clamp((now-start)/duration);
          draw(progress);
          if(now-start>=native.commitAt*1000&&!pending.committed){pending.committed=true;commit();}
          if(progress<1)frame=requestAnimationFrame(tick);
          else {pending=null;frame=0;clear();resolve(true);}
        };
        frame=requestAnimationFrame(tick);
      });
    }
    const onVisibility=()=>{
      if(document.hidden&&pending){const {commit,committed}=pending;cancel();if(!committed)commit();}
    };
    document.addEventListener('visibilitychange',onVisibility);
    const dispose=()=>{disposed=true;cancel();document.removeEventListener('visibilitychange',onVisibility);stage.remove();};
    return {play,cancel,dispose,ready,renderFrame:progress=>{if(native){busy(true);draw(clamp(progress));}}};
  };

/* Native CRI se_sys_mypage_evolve (preinstall.acb, cue29). A single voice, started synchronously
   from the header gesture; blocked or missing sound never blocks the UI. */

  'use strict';
  export const createOrchisEvolutionAudio = media => {
    let disposed=false;
    if (media) media.volume = 0.1;
    let generation = 0, loadTimer = 0;
    function stop() {
      generation++;
      clearTimeout(loadTimer); loadTimer = 0;
      media?.pause();
      try { if (media) media.currentTime = 0; } catch { /* Not seekable yet. */ }
    }
    function play() {
      stop();
      if (disposed || !media || document.hidden) return Promise.resolve(false);
      const ticket = generation;
      loadTimer = setTimeout(() => { if (ticket === generation) stop(); }, 1800);
      let request;
      try { request = media.play(); }
      catch { stop(); return Promise.resolve(false); }
      return Promise.resolve(request).then(() => {
        if (ticket !== generation) return false;
        clearTimeout(loadTimer); loadTimer = 0;
        return true;
      }, () => {
        if (ticket === generation) stop();
        return false;
      });
    }
    media?.addEventListener('error', stop);
    const onVisibility=()=>{if(document.hidden)stop();};
    document.addEventListener('visibilitychange',onVisibility);
    window.addEventListener('pagehide', stop);
    return { play, stop, dispose(){disposed=true;stop();media?.removeEventListener('error',stop);document.removeEventListener('visibilitychange',onVisibility);window.removeEventListener('pagehide',stop);} };
  };
