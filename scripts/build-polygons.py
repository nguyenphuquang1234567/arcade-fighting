"""Convert shipped region masks to editable contours without modifying masks."""
import json,math
from pathlib import Path
root=Path(__file__).resolve().parents[1]
def area(p):return sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(p,p[1:]+p[:1]))/2
def valid(p):
 def cross(a,b,c):return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
 for i,a in enumerate(p):
  b=p[(i+1)%len(p)]
  for j in range(i+2,len(p)):
   if i==0 and j==len(p)-1:continue
   c=p[j];d=p[(j+1)%len(p)]
   if cross(a,b,c)*cross(a,b,d)<0 and cross(c,d,a)*cross(c,d,b)<0:return False
 return True
def simplify(points,tolerance=2):
 def rdp(p):
  if len(p)<3:return p
  a,c=p[0],p[-1];dx,dy=c[0]-a[0],c[1]-a[1]
  distances=[]
  for b in p[1:-1]:
   t=max(0,min(1,((b[0]-a[0])*dx+(b[1]-a[1])*dy)/(dx*dx+dy*dy or 1)))
   distances.append(math.hypot(b[0]-a[0]-t*dx,b[1]-a[1]-t*dy))
  d=max(distances);i=distances.index(d)+1
  return rdp(p[:i+1])[:-1]+rdp(p[i:]) if d>tolerance else [a,c]
 split=max(range(1,len(points)),key=lambda i:(points[i][0]-points[0][0])**2+(points[i][1]-points[0][1])**2)
 result=rdp(points[:split+1])[:-1]+rdp(points[split:]+[points[0]])[:-1]
 return result if len(result)>=3 and abs(area(result))>=.1 and valid(result) else simplify(points,tolerance/2) if tolerance>.1 else points
def editable(original,tolerance=4,protect=()):
 # Reduce contour density without crossing existing edges or accumulating drift.
 raw=original;original=simplify(original)
 if any(not contains(p,original) for p in protect):original=simplify(raw,.1)
 indices=list(range(len(original)));changed=True
 while changed and len(indices)>3:
  changed=False
  for i in range(len(indices)):
   prev,nxt=indices[i-1],indices[(i+1)%len(indices)];a,b=original[prev],original[nxt]
   dx,dy=b[0]-a[0],b[1]-a[1];k=(prev+1)%len(original);error=0
   while k!=nxt:
    p=original[k];t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy or 1)))
    error=max(error,math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy));k=(k+1)%len(original)
   if error>tolerance:continue
   candidate=indices[:i]+indices[i+1:];points=[original[j] for j in candidate]
   if abs(area(points))>.1 and valid(points) and all(contains(p,points) for p in protect):indices=candidate;changed=True;break
 return [original[i] for i in indices]
def inside(point,p):
 x,y=point;hit=False
 for a,b in zip(p,p[1:]+p[:1]):
  if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:hit=not hit
 return hit
def contains(p,ring):
 if inside(p,ring):return True
 for a,b in zip(ring,ring[1:]+ring[:1]):
  dx,dy=b[0]-a[0],b[1]-a[1];cross=dx*(p[1]-a[1])-dy*(p[0]-a[0])
  if abs(cross)<1e-6 and min(a[0],b[0])<=p[0]<=max(a[0],b[0]) and min(a[1],b[1])<=p[1]<=max(a[1],b[1]):return True
 return False
def contours(runs,region):
 pixels={(x,y) for y,start,end,r in runs if r==region for x in range(start,end)};edges={}
 def add(a,b):edges.setdefault(a,[]).append(b)
 for x,y in pixels:
  if (x,y-1) not in pixels:add((x,y),(x+1,y))
  if (x+1,y) not in pixels:add((x+1,y),(x+1,y+1))
  if (x,y+1) not in pixels:add((x+1,y+1),(x,y+1))
  if (x-1,y) not in pixels:add((x,y+1),(x,y))
 loops=[]
 while edges:
  start=min(edges);p=[start];current=start;previous=(start[0]-1,start[1])
  for _ in range(100000):
   choices=edges.get(current)
   if not choices:break
   dx,dy=current[0]-previous[0],current[1]-previous[1]
   def turn(b):
    bx,by=b[0]-current[0],b[1]-current[1];cross=dx*by-dy*bx;dot=dx*bx+dy*by
    return 0 if cross>0 else 1 if dot>0 else 2 if cross<0 else 3
   nxt=min(choices,key=turn);choices.remove(nxt)
   if not choices:del edges[current]
   previous,current=current,nxt
   if current==start:
    if abs(area(p))>=30:loops.append(p)
    break
   p.append(current)
 return loops
output={}
for who,actions in json.loads((root/'src/hurtmasks.json').read_text()).items():
 output[who]={}
 for action,frames in actions.items():
  out=[]
  for runs in frames:
   polygons=[]
   for r,name in [(1,'head'),(2,'body'),(3,'legs')]:
    loops=contours(runs,r);outer=[p for p in loops if area(p)>0];holes=[p for p in loops if area(p)<0]
    for p in outer:
     h=[q for q in holes if inside(q[0],p)]
     polygon={'region':name,'points':[{'x':x,'y':y} for x,y in editable(p,protect=[v for q in h for v in q])]}
     if h:polygon['holes']=[[{'x':x,'y':y} for x,y in simplify(q,.1)] for q in h]
     polygons.append(polygon)
   out.append(polygons)
  output[who][action]=out
(root/'src/hurtpolygons.json').write_text(json.dumps(output,separators=(',',':')))
print('Generated editable polygon contours for',sum(len(fs) for a in output.values() for fs in a.values()),'frames')
