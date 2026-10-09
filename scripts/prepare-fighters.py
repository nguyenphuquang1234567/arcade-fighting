"""Slice generated 5x4 sheets with shared scale and a fixed foot baseline."""
from PIL import Image
from pathlib import Path
import json,sys
import numpy as np
from scipy import ndimage
mapping={'idle':[0,1],'walk':[2,3,4],'run':[2,3,4],'jump':[5,6],'attack':[7,8,9],'kick':[10,11,12],'sword_attack':[13,14,15],'ground_slide':[16,17],'hurt':[18],'death':[19]}
for name,source in zip(['moon','ember'],sys.argv[1:]):
    sheet=Image.open(source).convert('RGBA')
    dest=Path('assets/characters')/name;dest.mkdir(parents=True,exist_ok=True)
    sheet.save(dest/'source.png')
    w,h=sheet.size
    pixels=np.array(sheet)
    labels,total=ndimage.label(pixels[:,:,3]>12)
    sizes=np.bincount(labels.ravel())
    objects=ndimage.find_objects(labels)
    ids=list(np.argsort(sizes[1:])[-20:]+1)
    # Extract whole silhouettes instead of cutting at nominal grid boundaries.
    # Generated swords and feet can extend a little beyond their requested slot.
    def position(i):
        y,x=objects[i-1]
        return (int(((y.start+y.stop)/2)/(h/4)),(x.start+x.stop)/2)
    ids.sort(key=position)
    cells=[]
    for i in ids:
        y,x=objects[i-1]
        crop=pixels[y,x].copy()
        crop[:,:,3]=np.where(labels[y,x]==i,crop[:,:,3],0)
        cells.append(Image.fromarray(crop))
    # Same scale across all poses. Never independently resize the frames.
    scale=min(420/max(c.height for c in cells[:19]),470/max(c.width for c in cells))
    frames=[]
    for index,c in enumerate(cells):
        c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.LANCZOS)
        frame=Image.new('RGBA',(512,512));frame.alpha_composite(c,((512-c.width)//2,492-c.height))
        frame.save(dest/f'pose-{index:02}.png');frames.append(frame)
    for action,indices in mapping.items():
        strip=Image.new('RGBA',(512*len(indices),512))
        for i,index in enumerate(indices):strip.alpha_composite(frames[index],(i*512,0))
        strip.save(dest/f'{action}.png')
    preview=Image.new('RGBA',(1280,1024))
    for i,frame in enumerate(frames):preview.alpha_composite(frame.resize((256,256)),((i%5)*256,(i//5)*256))
    preview.save(f'output/characters/{name}-preview.png')
    print(json.dumps({'character':name,'source_size':[w,h],'source_alpha_range':sheet.getchannel('A').getextrema(),'scale':scale,'frames':len(frames)}))
