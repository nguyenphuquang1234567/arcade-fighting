from PIL import Image,ImageDraw
import numpy as np
from scipy.ndimage import gaussian_filter
from pathlib import Path
src=Path('/Users/quangvictornguyen/Downloads/An-ulti-preview-4s/frames')
def key(im):
 a=np.array(im.convert('RGB')).astype(float)/255;r,g,b=a.transpose(2,0,1);bg=np.median(a[:50,:100],axis=(0,1));ratio=(g-np.maximum(r,b))/np.maximum(g,.001);old=np.clip((.35-ratio)/.2,0,1)
 # Red VFX is mixed with the green screen, including pixels outside the old matte.
 # Preserve the neutral/skin palette of the character; remove green from saturated red light.
 red=np.clip((r-b-.07)/.15,0,1)
 # Skin has substantial blue, unlike the red flame; protect the figure's skin/clothes.
 skin=(b>.35)&(g-b<.23)&(r-g<.25)
 red=np.where(skin,0,red)
 alphaFx=np.clip(1-(g-b)/max(bg[1]-bg[2],.01),0,1)
 alpha=old*(1-red)+alphaFx*red
 fg=np.clip((a-(1-alpha[:,:,None])*bg)/np.maximum(alpha[:,:,None],.001),0,1)
 # Neutral green-spill suppression only where the key produced partial transparency.
 fg[:,:,1]=np.where((alpha>0)&(alpha<.999),np.minimum(fg[:,:,1],np.maximum(fg[:,:,0],fg[:,:,2])),fg[:,:,1])
 return Image.fromarray(np.dstack([fg*255,alpha*255]).astype('uint8'))
if __name__=='__main__':
 out=Image.new('RGB',(1536,864),(50,50,60))
 for j,n in enumerate([25,50,75,100]):
  im=Image.open(src/f'frame-{n:03d}.png');new=key(im).resize((768,432));out.paste(new,((j%2)*768,(j//2)*432),new)
 out.save('/tmp/aura-test.jpg')
