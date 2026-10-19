import wave,json,numpy as np
songs=json.load(open('Dance/songs.json'))
for s in songs:
 w=wave.open('/tmp/dance-'+s['id']+'.wav'); sr=w.getframerate();x=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(float)/32768
 hop=128;n=1024;frames=np.lib.stride_tricks.sliding_window_view(x,n)[::hop]; spec=abs(np.fft.rfft(frames*np.hanning(n),axis=1));freq=np.fft.rfftfreq(n,1/sr)
 # Positive spectral differences, timestamps at window center.
 bands={}
 for name,mask in [('full',freq>30),('low',(freq>30)&(freq<250)),('high',freq>2000)]:
  flux=np.maximum(0,np.diff(spec[:,mask],axis=0)).sum(axis=1);t=(np.arange(len(flux))*hop+n/2+hop)/sr
  bands[name]=(flux,t)
 print('\n',s['id'],'duration',len(x)/sr,'bpm',s['bpm'],'offset',s['offset'])
 for name,(flux,t) in bands.items():
  for lo,hi in [(12,45),(45,90),(90,135),(135,len(x)/sr-2)]:
   beats=np.arange(s['offset'],hi,60/s['bpm']);beats=beats[beats>=lo]; offsets=np.arange(-.2,.201,.002)
   vals=np.array([np.mean(np.interp(beats+d,t,flux)) for d in offsets]); idx=vals.argmax();print(name,lo,hi,'best_ms',round(offsets[idx]*1000),'ratio',round(vals[idx]/np.mean(vals),2))
 np.savez('/tmp/dance-'+s['id']+'-flux.npz',**{name:v[0] for name,v in bands.items()},t=t)
