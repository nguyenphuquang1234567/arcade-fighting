"""Extract ten full silhouettes, preserve alpha, and normalize with one shared scale."""
from PIL import Image
from scipy import ndimage
from pathlib import Path
import numpy as np
import sys,json
name,source=sys.argv[1:]
action="sword_attack"
dest=Path('assets/characters')/name
sheet=Image.open(source).convert('RGBA');pixels=np.array(sheet)
labels,n=ndimage.label(pixels[:,:,3]>12);sizes=np.bincount(labels.ravel());objects=ndimage.find_objects(labels)
ids=list(np.argsort(sizes[1:])[-6:]+1)
def position(i):
 y,x=objects[i-1];return(int(((y.start+y.stop)/2)/(sheet.height/2)),(x.start+x.stop)/2)
ids.sort(key=position)
assert len(set(position(i)[0] for i in ids))==2,'Expected two rows'
assert all(sizes[i]>1000 for i in ids),'Missing or merged figure'
cells=[]
for i in ids:
 y,x=objects[i-1];crop=pixels[y,x].copy();crop[:,:,3]=np.where(labels[y,x]==i,crop[:,:,3],0);cells.append(Image.fromarray(crop))
idle=Image.open(dest/'pose-00.png');b=idle.getbbox();height=b[3]-b[1]
scale=min(height/cells[0].height,430/max(c.height for c in cells),470/max(c.width for c in cells))
strip=Image.new('RGBA',(3072,512));preview=Image.new('RGBA',(768,512));frames=[]
for i,c in enumerate(cells):
 c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.LANCZOS)
 f=Image.new('RGBA',(512,512));f.alpha_composite(c,((512-c.width)//2,492-c.height));frames.append(f);strip.alpha_composite(f,(i*512,0));preview.alpha_composite(f.resize((256,256)),((i%3)*256,(i//3)*256));f.save(dest/f'{action}-six-{i:02}.png')
assert sheet.getchannel('A').getextrema()[0]==0,'Missing transparency'
assert len(set(f.tobytes() for f in frames))==6,'Repeated frame'
sheet.save(dest/f'{action}-six-source.png');strip.save(dest/f'{action}-six.png');preview.save(f'output/characters/{name}-{action}-six-preview.png')
print(json.dumps({'character':name,'action':action,'size':strip.size,'frames':6,'alpha':strip.getchannel('A').getextrema(),'scale':scale}))
