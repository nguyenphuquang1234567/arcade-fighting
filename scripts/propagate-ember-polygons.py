"""Fit Ronin references to every Ember animation frame."""
import json,re,math
from pathlib import Path
root=Path(__file__).resolve().parents[1]
path=root/'src/polygon-overrides.json';data=json.loads(path.read_text())
block=(root/'src/hurtbox-poses.ts').read_text().split('const moon: PoseSet = {')[1].split('\n};')[0]
poses={a:json.loads(v) for a,v in re.findall(r' (\w+): (\[.*\]),',block)}
ember_block=(root/'src/hurtbox-poses.ts').read_text().split('const ember: PoseSet = {')[1].split('\n};')[0]
ember_poses={a:json.loads(v) for a,v in re.findall(r' (\w+): (\[.*\]),',ember_block)}
def ember_landmarks(action,i):
 p=ember_poses[action][i]
 return [(p[j]*3.2,p[j+1]*3.2) for j in range(0,12,2)]
def landmarks(action,i):
 p=poses[action][i][:]
 if action=='kick' and i in (3,4,5):p[:2]=[(59,51),(49,51),(49,53)][i-3]
 if action=='jump' and i==0:p[:2]=(110,58)
 if action=='sword_attack' and i==5:p[:4]=(75,68,66,110)
 if action=='walk':p[6]=[43,42,49][i]
 return [(p[j]*3.2,p[j+1]*3.2) for j in range(0,12,2)]
def area(p):return abs(sum(a['x']*b['y']-b['x']*a['y'] for a,b in zip(p,p[1:]+p[:1])))/2
def valid(p):
 if area(p)<.1:return False
 def cross(a,b,c):return (b['x']-a['x'])*(c['y']-a['y'])-(b['y']-a['y'])*(c['x']-a['x'])
 for i,a in enumerate(p):
  b=p[(i+1)%len(p)]
  for j in range(i+2,len(p)):
   if i==0 and j==len(p)-1:continue
   c=p[j];d=p[(j+1)%len(p)]
   if cross(a,b,c)*cross(a,b,d)<0 and cross(c,d,a)*cross(c,d,b)<0:return False
 return True
changed=[]
for action,frames in poses.items():
 key=f'moon/{action}/0'
 if key not in data:continue
 source=data[key];before=landmarks(action,0)
 for frame in range(len(ember_poses[action])):
  after=ember_landmarks(action,frame)
  def transform(point):
   weights=[1/(math.hypot(point['x']-x,point['y']-y)**2+25**2)**2 for x,y in before];total=sum(weights)
   dx=sum(w*(b[0]-a[0]) for w,a,b in zip(weights,before,after))/total;dy=sum(w*(b[1]-a[1]) for w,a,b in zip(weights,before,after))/total
   return {'x':round(max(0,min(512,point['x']+dx)),3),'y':round(max(0,min(512,point['y']+dy)),3)}
  out=[]
  for polygon in source:
   cx=sum(v['x'] for v in polygon['points'])/len(polygon['points']);cy=sum(v['y'] for v in polygon['points'])/len(polygon['points'])
   head_piece=math.hypot(cx-before[0][0],cy-before[0][1])<55
   def fitted(v):
    if head_piece:return {'x':round(max(0,min(512,v['x']+after[0][0]-before[0][0])),3),'y':round(max(0,min(512,v['y']+after[0][1]-before[0][1])),3)}
    return transform(v)
   p={**polygon,'points':[fitted(v) for v in polygon['points']]}
   if not valid(p['points']):
    center=(sum(v['x'] for v in p['points'])/len(p['points']),sum(v['y'] for v in p['points'])/len(p['points']))
    p['points'].sort(key=lambda v:math.atan2(v['y']-center[1],v['x']-center[0]))
   if not valid(p['points']):raise ValueError(f'Cannot fit {action}/{frame}')
   if polygon.get('holes'):p['holes']=[[transform(v) for v in h] for h in polygon['holes']]
   out.append(p)
  target=f'ember/{"idle-ronin" if action=="idle" else action}/{frame}';data[target]=out;changed.append(target)
path.write_text(json.dumps(data,indent=2)+'\n')
print('Fitted',len(changed),'Ember frames:',', '.join(changed))
