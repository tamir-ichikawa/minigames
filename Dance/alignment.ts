/** A short energy signature of the canonical decode, avoiding MP3 priming differences. */
export interface AudioSignature { start:number; step:number; window:number; envelope:number[]; }
export interface Alignment { shift:number; correlation:number; }
export function matchEnvelope(reference:number[],measured:number[],radius:number,step:number):Alignment {
  const n=reference.length;if(!n)return {shift:0,correlation:0};
  const mean=reference.reduce((s,x)=>s+x,0)/n,centered=reference.map(x=>x-mean);
  const refPower=centered.reduce((s,x)=>s+x*x,0);
  if(refPower<1e-12)return {shift:0,correlation:0};
  let best=-1,bestShift=0;
  for(let shift=-radius;shift<=radius;shift++){
    let sum=0,square=0,cross=0;
    for(let i=0;i<n;i++){const v=measured[i+radius+shift]??0;sum+=v;square+=v*v;cross+=centered[i]*v;}
    const power=square-sum*sum/n,correlation=power>1e-12?cross/Math.sqrt(refPower*power):0;
    if(correlation>best){best=correlation;bestShift=shift;}
  }
  // Never make a speculative correction if a different asset/signature was supplied.
  return {shift:best>=.98?bestShift*step:0,correlation:best};
}
export function alignDecodedAudio(buffer:Pick<AudioBuffer,'getChannelData'|'sampleRate'|'duration'>,signature:AudioSignature):Alignment {
  const radius=Math.round(.12/signature.step),start=signature.start-radius*signature.step;
  const length=signature.envelope.length+2*radius;
  if(start<0||start+length*signature.step+signature.window>buffer.duration)return {shift:0,correlation:0};
  const channel=buffer.getChannelData(0),rate=buffer.sampleRate;
  const first=Math.floor(start*rate),last=Math.ceil((start+length*signature.step+signature.window)*rate);
  const power=new Float64Array(last-first+1);
  for(let i=first;i<last;i++)power[i-first+1]=power[i-first]+channel[i]*channel[i];
  const envelope=[];
  for(let i=0;i<length;i++){
    const a=Math.round((start+i*signature.step)*rate)-first,b=Math.round((start+i*signature.step+signature.window)*rate)-first;
    envelope.push(Math.sqrt(Math.max(0,(power[b]-power[a])/(b-a))));
  }
  return matchEnvelope(signature.envelope,envelope,radius,signature.step);
}
