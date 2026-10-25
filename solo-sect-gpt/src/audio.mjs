// Original procedural sound palette; no external audio samples.
export class AudioPalette{
 constructor(){this.context=null;this.muted=false;this.volume=.3;this.lastEvent=null;this.lastStep=0;this.active=0;}
 async unlock(){if(!this.context)this.context=new(window.AudioContext||window.webkitAudioContext)();if(this.context.state==='suspended')await this.context.resume();}
 tone(frequency,duration=.08,type='sine',gain=.1){if(!this.context||this.muted||this.active>=8)return;const c=this.context,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(frequency,c.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(40,frequency*.6),c.currentTime+duration);g.gain.setValueAtTime(gain*this.volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+duration);this.active++;o.onended=()=>this.active--;}
 update(w){if(!w)return;const last=this.lastEvent;let events=last?w.journal.slice(w.journal.findIndex(e=>e.id===last)+1):[];this.lastEvent=w.journal.at(-1)?.id||null;
 for(const e of events){if(['building-complete','story-complete','chapter-complete'].includes(e.type)){this.tone(550,.24,'sine',.3);this.tone(825,.3,'sine',.15);}else if(e.type==='hit')this.tone(95,.07,'triangle',.17);else if(e.type==='action-start')this.tone(240,.06,'triangle',.1);else if(e.type==='harvest'||e.type==='recipe-complete')this.tone(180,.07,'square',.03);}
 if(w.tick-this.lastStep>=5&&Object.values(w.people).some(p=>p.moving&&p.residence==='resident')){this.lastStep=w.tick;this.tone(65,.035,'triangle',.025);}
 }
}
