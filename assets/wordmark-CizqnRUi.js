var e=(e,t=0,n=1)=>Math.min(n,Math.max(t,e)),t=`https://sfrc-radio.jontoews.com/ffr`,n=`
class Feed extends AudioWorkletProcessor {
  constructor(o) {
    super();
    const p = o.processorOptions || {};
    this.lead = p.lead || 0.4; this.most = p.most || 4;
    this.q = []; this.pos = 0; this.held = 0; this.rate = 1; this.speed = 1; this.playing = false; this.prev = 0; this.last = 0;
    this.port.onmessage = (e) => {
      const m = e.data;
      if (m.pcm) {
        this.q.push(m.pcm); this.held += m.pcm.length / m.sr; this.rate = m.sr / sampleRate;
        // too much in hand (a slow listener, or a burst): let the oldest go
        while (this.held > this.most && this.q.length > 1) { const d = this.q.shift(); this.held -= (d.length - this.pos) / (this.rate * sampleRate); this.pos = 0; }
      }
      if (m.speed) this.speed = m.speed;
      if (m.clear) { this.q = []; this.held = 0; this.pos = 0; this.playing = false; }
    };
  }
  process(_, outputs) {
    const out = outputs[0][0];
    if (!this.playing && this.held >= this.lead) this.playing = true;
    if (!this.playing || !this.q.length) {
      this.playing = false;
      // fade to silence rather than stop dead
      for (let i = 0; i < out.length; i++) { this.prev *= 0.995; out[i] = this.prev; }
    } else {
      // keep the amount in hand near the lead: a touch faster when it builds up, slower when it runs low
      const drift = this.speed < 1 ? 1 : this.held > this.lead * 2 ? 1.004 : this.held < this.lead * 0.5 ? 0.996 : 1;
      const step = this.rate * this.speed * drift;
      for (let i = 0; i < out.length; i++) {
        let d = this.q[0];
        if (!d) { this.prev *= 0.995; out[i] = this.prev; continue; }
        const k = this.pos | 0, f = this.pos - k;
        const a = d[k], b = k + 1 < d.length ? d[k + 1] : (this.q[1] ? this.q[1][0] : a);
        this.prev = out[i] = a + (b - a) * f;
        this.pos += step;
        while (d && this.pos >= d.length) { this.pos -= d.length; this.q.shift(); d = this.q[0]; }
      }
      this.held = Math.max(0, this.held - (out.length * step) / (this.rate * sampleRate));
    }
    if (currentTime - this.last > 0.25) { this.last = currentTime; this.port.postMessage({ held: this.held, playing: this.playing }); }
    return true;
  }
}
registerProcessor('ff-feed', Feed);
`,r=new WeakMap;function i(e){let t=r.get(e);if(!t){let i=URL.createObjectURL(new Blob([n],{type:`text/javascript`}));t=e.audioWorklet.addModule(i).then(()=>!0,()=>!1),r.set(e,t)}return t}var a=class{out;node=null;held=0;playing=!1;waiting=[];constructor(e,t={}){this.out=e.createGain(),i(e).then(n=>{if(!n)return;let r=new AudioWorkletNode(e,`ff-feed`,{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[1],processorOptions:t});r.port.onmessage=e=>{this.held=e.data.held,this.playing=e.data.playing},r.connect(this.out),this.node=r;for(let e of this.waiting)r.port.postMessage(e,[e.pcm.buffer]);this.waiting=[]})}push(e,t){this.node?this.node.port.postMessage({pcm:e,sr:t},[e.buffer]):this.waiting.push({pcm:e,sr:t})}speed(t){this.node?.port.postMessage({speed:e(t,.1,1)})}clear(){this.waiting=[],this.node?.port.postMessage({clear:!0}),this.held=0,this.playing=!1}dispose(){this.node?.disconnect(),this.node=null,this.out.disconnect()}};function o(e){if(!e)return``;if(e.loc&&!/^\s*\(?-?\d/.test(e.loc))return e.loc;let t=e.name.split(`|`).map(e=>e.trim()).filter(e=>e&&!/^(\d+\s*-\s*\d+\s*[mk]hz|kiwisdr)/i.test(e));return t[t.length-1]||e.name||e.id}async function s(e){let t=new AbortController,n=setTimeout(()=>t.abort(),12e3);try{return(await(await fetch(`https://sfrc-radio.jontoews.com/ffr/receivers?kind=${e}`,{signal:t.signal})).json()).receivers??[]}finally{clearTimeout(n)}}var c=class{feed;ws=null;state=`off`;why=``;rx=null;rate=12e3;f=0;mode=`am`;rssi=-127;heardAt=0;constructor(e,t={}){this.feed=new a(e,{lead:.45,most:3,...t})}open(e,n,r){this.close(),this.rx=e,this.f=n,this.mode=r,this.state=`tuning`,this.why=``;let i=new WebSocket(`${t.replace(/^http/,`ws`)}/listen?rx=${encodeURIComponent(e.id)}&f=${n.toFixed(3)}&m=${r}`);i.binaryType=`arraybuffer`,i.onmessage=e=>{if(i!==this.ws)return;if(typeof e.data==`string`){let t=JSON.parse(e.data);t.t===`hello`?(this.rate=t.rate??12e3,this.state=`live`):t.t===`level`?this.rssi=t.rssi??-127:t.t===`end`&&(this.state=`lost`,this.why=t.why?.startsWith(`unreachable`)?`that receiver did not answer`:l[t.why??``]??t.why??`closed`);return}let t=new Int16Array(e.data),n=new Float32Array(t.length);for(let e=0;e<t.length;e++)n[e]=t[e]/32768;this.feed.push(n,this.rate),this.heardAt=performance.now(),this.state===`tuning`&&(this.state=`live`)},i.onclose=()=>{i===this.ws&&this.state!==`off`&&(this.state!==`lost`&&(this.state=`lost`,this.why=this.why||`the line dropped`),this.ws=null)},this.ws=i,setTimeout(()=>{i===this.ws&&this.state===`tuning`&&(this.why=`that receiver did not answer`,this.state=`lost`,this.ws=null,i.onmessage=null,i.onclose=null,i.close())},2e4)}tune(e,t=this.mode){this.rx&&(this.f=e,this.mode=t,this.ws?.readyState===WebSocket.OPEN?this.ws.send(JSON.stringify({t:`tune`,rx:this.rx.id,f:+e.toFixed(3),m:t})):this.state!==`lost`&&this.ws||this.open(this.rx,e,t))}close(){let e=this.ws;this.ws=null,e&&(e.onmessage=null,e.onclose=null,e.close()),this.state=`off`,this.rssi=-127,this.feed.clear()}},l={too_busy:`that receiver is full`,busy:`farfield is using all its receivers`,"receiver in use":`that receiver is busy here`,time:`half an hour is up`,down:`that receiver is down`,inactivity_timeout:`it timed out`,closed:`it hung up`,"not a receiver we can use":`not a receiver it can use`};function u(e){let t=[],n=-1,r=0;for(let i=0;i+188<=e.length;i+=188){if(e[i]!==71)continue;let a=(e[i+1]&31)<<8|e[i+2],o=e[i+1]&64,s=e[i+3]>>4&3;if(s===2||a===0||a===8191)continue;let c=i+4;s===3&&(c+=1+e[i+4]),n<0&&o&&e[c]===0&&e[c+1]===0&&e[c+2]===1&&(e[c+3]&224)==192&&(n=a),a===n&&(o&&(c+=9+e[c+8]),c<i+188&&(t.push(e.subarray(c,i+188)),r+=i+188-c))}let i=new Uint8Array(r),a=0;for(let e of t)i.set(e,a),a+=e.length;return i}function d(e){let t=[];for(let n=0;n+7<=e.length;){if(e[n]!==255||(e[n+1]&240)!=240){n++;continue}let r=(e[n+3]&3)<<11|e[n+4]<<3|e[n+5]>>5;r<7?n++:(t.push(n),n+=r)}return t}var f=class{feed;state=`off`;node=``;recordedAt=0;rms=0;c;gen=0;tail=null;constructor(e){this.c=e,this.feed=new a(e,{lead:9,most:40})}open(e,t){this.close(),this.node=e,this.state=`opening`;let n=++this.gen;this.follow(n,`${t}/${e}`)}close(){this.gen++,this.state=`off`,this.tail=null,this.feed.clear()}async follow(e,t){let n=``,r=``,i=0;for(;e===this.gen;){try{(!n||i>6)&&(n=`${t}/hls/${(await(await fetch(`${t}/latest.txt`,{cache:`no-store`})).text()).trim()}`,i=0);let a=await(await fetch(`${n}/live.m3u8`,{cache:`no-store`})).text();if(e!==this.gen)return;let o=a.split(`
`),s=[],c=0;for(let e of o)e.startsWith(`#EXT-X-PROGRAM-DATE-TIME:`)?c=Date.parse(e.slice(25)):e.trim().endsWith(`.ts`)&&s.push({name:e.trim(),at:c});let l=s[s.length-1];if(!l||Date.now()-l.at>3e5){this.state=`quiet`,i++,await p(2e4);continue}let d=r?s.findIndex(e=>e.name===r):-1,f=d>=0?s.slice(d+1):s.slice(-2);for(let t of f){if(e!==this.gen)return;r=t.name;let i=new Uint8Array(await(await fetch(`${n}/${t.name}`)).arrayBuffer());await this.take(u(i),t.at,e)}i=f.length?0:i+1}catch{if(e!==this.gen)return;this.state=this.state===`live`?`live`:`lost`,i++}await p(4e3)}}async take(e,t,n){let r=d(e);if(!r.length)return;let i=this.tail,a=i?new Uint8Array(i.length+e.length):e;i&&(a.set(i),a.set(e,i.length)),this.tail=e.slice(r[Math.max(0,r.length-4)]);let o;try{o=await this.c.decodeAudioData(a.buffer.slice(a.byteOffset,a.byteOffset+a.byteLength))}catch{return}if(n!==this.gen)return;let s=Math.min(o.length,r.length*1024),c=o.length-s,l=new Float32Array(s),u=o.getChannelData(0),f=o.numberOfChannels>1?o.getChannelData(1):null,p=0;for(let e=0;e<s;e++){let t=f?(u[c+e]+f[c+e])*.5:u[c+e];l[e]=t,p+=t*t}this.rms=Math.sqrt(p/Math.max(1,s)),this.recordedAt=t,this.feed.push(l,o.sampleRate),this.state=`live`}},p=e=>new Promise(t=>setTimeout(t,e)),m={x0:45,x1:5473,cap:700,d:`M660 -515V-700H45V0H279V-258H660V-443H279V-515ZM1203 0H1446L1242 -700H874L670 0H913L932 -71H1184ZM982 -258 1050 -515H1066L1134 -258ZM1983 0H2237L2069 -277C2152 -310 2214 -385 2214 -478C2214 -618 2128 -700 1986 -700H1491V0H1725V-259H1835ZM1725 -516H1942C1964 -516 1980 -505 1980 -480C1980 -457 1964 -442 1942 -442H1725ZM2917 -515V-700H2302V0H2536V-258H2917V-443H2536V-515ZM3007 0H3241V-700H3007ZM3964 -516V-700H3346V0H3964V-184H3580V-258H3964V-443H3580V-516ZM4288 -185V-700H4054V0H4652V-185ZM5137 -700H4712V0H5129C5276 0 5473 -125 5473 -355C5473 -569 5309 -700 5137 -700ZM5066 -185H4946V-515H5058C5166 -515 5237 -469 5237 -356C5237 -251 5164 -185 5066 -185Z`};export{o as a,c as i,f as n,s as o,t as r,m as t};