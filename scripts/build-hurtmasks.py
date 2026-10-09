"""Derive source-pixel collision masks without altering sprite artwork.
The alpha boundary is exact; semantic inclusion envelopes are editable seeds.
"""
import json,re,math
from pathlib import Path
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[1]
source=(root/'src/hurtbox-poses.ts').read_text()
counts={'idle':2,'walk':3,'run':8,'jump':2,'attack':10,'kick':10,'sword_attack':6,'ground_slide':2,'hurt':1,'death':1}
# Broad body/cloth envelopes, excluding the long detached weapon/effect area.
# Editor overrides preserve hand-painted semantic decisions on regeneration.
def distance(x,y,a,b):
 dx=b[0]-a[0];dy=b[1]-a[1];t=max(0,min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy or 1)))
 return math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)
data={}; previews=[]
for char in ['moon','ember']:
 block=source.split('const '+char+': PoseSet = {')[1].split('\n};')[0]
 poses={a:json.loads(v) for a,v in re.findall(r' (\w+): (\[.*\]),',block)}
 data[char]={}
 for action,count in counts.items():
  filename='idle-ronin' if char=='ember' and action=='idle' else 'sword_attack-six' if action=='sword_attack' else action+'-v2' if action in ['run','attack','kick'] else action
  strip=Image.open(root/f'assets/characters/{char}/{filename}.png').convert('RGBA')
  frames=[]
  for frame in range(count):
   im=strip.crop((frame*512,0,(frame+1)*512,512)); pixels=im.load();p=poses[action][frame]
   hx,hy,px,py,k1x,k1y,f1x,f1y,k2x,k2y,f2x,f2y=p
   if char=='moon' and action=='kick' and frame in (3,4,5):
    hx,hy=[(59,51),(49,51),(49,53)][frame-3]
   if char=='moon' and action=='jump' and frame==0:hx,hy=110,58
   if char=='moon' and action=='walk':f1x=[43,42,49][frame]
   labels=bytearray(512*512)
   for y in range(512):
    for x in range(512):
     r,g,b,alpha=pixels[x,y]
     if alpha==0 or action=='death':continue
     u,v=x/3.2,y/3.2
     head=math.hypot((u-hx)/13,(v-hy)/15)
     torso=distance(u,v,(hx-4,hy+14),(px,py))
     legs=min(distance(u,v,(px,py),(k1x,k1y)),distance(u,v,(k1x,k1y),(f1x,f1y)),distance(u,v,(px,py),(k2x,k2y)),distance(u,v,(k2x,k2y),(f2x,f2y)))
     # Wider than anatomy to retain trousers, sleeves, hands and hair.
     include=head<=1.2 or torso<34 or legs<22
     # Extended striking arms are included separately from sword/trail pixels.
     if action=='attack':include |= hy+3<v<hy+35 and min(hx,px)-20<u<152
     if action=='sword_attack':include |= hy-8<v<hy+25 and min(hx,px)-12<u<hx+27
     if action=='ground_slide':include |= torso<34
     # A slash arm ends before the separate blade/effect area.
     if action=='sword_attack':
      if frame in (2,3) and u>hx+31 and v<134:include=False
      if frame in (4,5) and u>hx+15 and v<hy+47:include=False
      if frame in (0,1) and ((v<hy-21) or (u>hx+17 and v<hy+18)):include=False
     if not include:continue
     label=1 if head<=1 and v<hy+13 else 3 if legs<torso and v>hy+13 else 2
     # No arm hurtboxes on this branch: retain the central torso,
     # head and legs, instead of the wide arm inclusion seed.
     if label==2 and torso>16:continue
     labels[y*512+x]=label
   runs=[]
   for y in range(512):
    x=0
    while x<512:
     label=labels[y*512+x]
     if not label:x+=1;continue
     start=x;x+=1
     while x<512 and labels[y*512+x]==label:x+=1
     runs.append([y,start,x,label])
   frames.append(runs)
   preview=im.resize((160,160));over=Image.new('RGBA',(512,512));o=over.load();colors={1:(255,209,102,170),2:(86,229,198,170),3:(119,170,255,170)}
   for y,x,end,label in runs:
    for xx in range(x,end):o[xx,y]=colors[label]
   preview=Image.alpha_composite(preview,over.resize((160,160)))
   previews.append((char,action,frame,preview))
  data[char][action]=frames
(root/'src/hurtmasks.json').write_text(json.dumps(data,separators=(',',':')))
for char in data:
 sheet=Image.new('RGB',(1600,160*len(counts)),(45,43,52));draw=ImageDraw.Draw(sheet)
 for who,action,frame,im in previews:
  if who!=char:continue
  row=list(counts).index(action);sheet.paste(im,(frame*160,row*160),im);draw.text((frame*160,row*160),f'{action} {frame}',fill='white')
 sheet.save('/tmp/'+char+'-masks.jpg')
print('Generated',sum(sum(len(fs) for fs in a.values()) for a in data.values()),'frame masks')
