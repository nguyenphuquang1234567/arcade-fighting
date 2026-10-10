from pathlib import Path
import argparse, json, shutil
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import label, find_objects, binary_dilation

ROOT = Path(__file__).resolve().parent
SEED = ROOT / 'an-idle-01-reference.png'

def components(img, count):
    arr = np.asarray(img)
    labels, _ = label(arr[:, :, 3] > 12)
    found = []
    for ident, slices in enumerate(find_objects(labels), 1):
        if slices:
            size = int((labels[slices] == ident).sum())
            found.append((size, ident, slices))
    selected = sorted(found, reverse=True)[:count]
    selected.sort(key=lambda item: item[2][0].start)
    return sorted(selected[:3], key=lambda item: item[2][1].start) + sorted(selected[3:], key=lambda item: item[2][1].start), labels, arr

def bounds(img):
    y, x = np.where(np.asarray(img)[:, :, 3] > 12)
    return [int(x.min()), int(y.min()), int(x.max()+1), int(y.max()+1)]

def cut(raw, kind, hips=None):
    source = Image.open(raw).convert('RGBA')
    count = 6 if kind == 'kneel' else 5
    ordered, labels, arr = components(source, count)
    seed = Image.open(SEED if kind == 'kneel' else ROOT/'death-06.png').convert('RGBA')
    sb = bounds(seed)
    first = ordered[0][2]
    scale = (sb[3]-sb[1]) / (first[0].stop-first[0].start)
    baseline = 491
    metadata = []
    for index, (_, ident, s) in enumerate(ordered):
        x0, y0 = max(0, s[1].start-3), max(0, s[0].start-3)
        x1, y1 = min(source.width, s[1].stop+3), min(source.height, s[0].stop+3)
        part = arr[y0:y1,x0:x1].copy()
        mask = binary_dilation(labels[y0:y1,x0:x1] == ident, iterations=3)
        part[:,:,3] = np.where(mask, part[:,:,3], 0)
        crop = Image.fromarray(part).resize((round((x1-x0)*scale),round((y1-y0)*scale)), Image.Resampling.LANCZOS)
        if kind == 'kneel':
            foot_y, foot_x = np.where((labels == ident) & (np.indices(labels.shape)[0] >= s[0].stop-14))
            anchor = float((foot_x.min()+foot_x.max())/2)
            target = 269.5
        else:
            anchor = hips[index]
            target = 268
        px, py = round(target-(anchor-x0)*scale), round(baseline-(s[0].stop-y0)*scale)
        out = Image.new('RGBA',(512,512))
        out.alpha_composite(crop,(px,py))
        frame = index+1 if kind == 'kneel' else index+7
        if frame == 1:
            out = Image.open(SEED).convert('RGBA')
        out.save(ROOT/f'death-{frame:02}.png')
        metadata.append(dict(frame=frame,sourceBounds=[x0,y0,x1,y1],sourceAnchor=anchor,scale=scale,position=[px,py],lockedToIdle=frame==1))
    shutil.copy2(raw, ROOT/f'{kind}-source.png')
    (ROOT/f'{kind}-alignment.json').write_text(json.dumps(dict(sharedScale=scale,baseline=baseline,frames=metadata),indent=2))
    print(json.dumps(dict(kind=kind,scale=scale,frames=count,sourceSize=source.size)))

def assemble():
    frames = [Image.open(ROOT/f'death-{i:02}.png').convert('RGBA') for i in range(1,12)]
    strip = Image.new('RGBA',(512*11,512))
    sheet = Image.new('RGB',(512*4,552*3),(35,36,44))
    draw = ImageDraw.Draw(sheet)
    previews=[]
    for i,frame in enumerate(frames):
        strip.alpha_composite(frame,(i*512,0))
        sheet.paste(frame,((i%4)*512,(i//4)*552),frame)
        draw.text(((i%4)*512+16,(i//4)*552+515),f'An - frame {i+1}',fill='white')
        bg=Image.new('RGB',(512,512),(35,36,44)); bg.paste(frame,(0,0),frame);previews.append(bg)
    strip.save(ROOT/'death.png');sheet.save(ROOT/'contact-sheet.png')
    for name,timing in [('preview.gif',100),('preview-slow.gif',180)]:
        previews[0].save(ROOT/name,save_all=True,append_images=previews[1:],duration=[timing]*10+[700],loop=0,disposal=2)
    destination=Path('/Users/quangvictornguyen/Downloads/An/death-complete-v2')
    shutil.copytree(ROOT,destination,dirs_exist_ok=True)
    print(str(destination))

if __name__ == '__main__':
    parser=argparse.ArgumentParser();parser.add_argument('mode',choices=['kneel','fall','assemble']);parser.add_argument('--source');parser.add_argument('--hips',type=float,nargs=5)
    args=parser.parse_args()
    if args.mode=='assemble': assemble()
    else: cut(args.source,args.mode,args.hips)
