"""Normalize an ImageGen 4x2 running cycle using whole silhouettes."""
from PIL import Image
from scipy import ndimage
from pathlib import Path
import numpy as np
import sys,json
name,source=sys.argv[1:]
dest=Path('assets/characters')/name
sheet=Image.open(source).convert('RGBA');pixels=np.array(sheet)
labels,n=ndimage.label(pixels[:,:,3]>12);sizes=np.bincount(labels.ravel());objects=ndimage.find_objects(labels)
ids=list(np.argsort(sizes[1:])[-8:]+1)
def position(i):
 y,x=objects[i-1];return (int(((y.start+y.stop)/2)/(sheet.height/2)),(x.start+x.stop)/2)
ids.sort(key=position)
cells=[]
for i in ids:
 y,x=objects[i-1];crop=pixels[y,x].copy();crop[:,:,3]=np.where(labels[y,x]==i,crop[:,:,3],0);cells.append(Image.fromarray(crop))
# Match the shipped running silhouette height with ONE scale for the entire cycle.
old=Image.open(dest/'run.png')
old_heights=[]
for i in range(old.width//512):
 bbox=old.crop((i*512,0,(i+1)*512,512)).getbbox();old_heights.append(bbox[3]-bbox[1])
scale=min(max(old_heights)/max(c.height for c in cells),470/max(c.width for c in cells))
strip=Image.new('RGBA',(4096,512));preview=Image.new('RGBA',(1024,512));frames=[]
for i,c in enumerate(cells):
 c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.LANCZOS)
 f=Image.new('RGBA',(512,512));f.alpha_composite(c,((512-c.width)//2,492-c.height));frames.append(f);strip.alpha_composite(f,(i*512,0));preview.alpha_composite(f.resize((256,256)),((i%4)*256,(i//4)*256))
 # Distinct names; original poses remain useful as character references.
 f.save(dest/f'run-v2-{i:02}.png')
assert sheet.getchannel('A').getextrema()[0]==0,'Missing transparency'
assert len(frames)==8
sheet.save(dest/'run-v2-source.png');strip.save(dest/'run-v2.png')
preview.save(f'output/characters/{name}-run-v2-preview.png')
frames[0].save(f'output/characters/{name}-run-v2.gif',save_all=True,append_images=frames[1:],duration=200,loop=0,disposal=2)
print(json.dumps({'character':name,'size':strip.size,'frames':8,'fps':5,'scale':scale,'heights':[f.getbbox()[3]-f.getbbox()[1] for f in frames]}))
