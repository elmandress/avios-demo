"""Región VISIBLE de cada foto en cada página (bbox ∩ recorte de PowerPoint ∩ página)."""
import pymupdf, re, json, sys
PDF = r"D:\PhoneLink\New folder\42a358d347c94227aad51bab45698767.pdf"
TOK = re.compile(rb'/[^\s/\[\]()<>]+|[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?|[A-Za-z\*\'"]+')

def mul(m, n):  # m aplicado primero, después n  (convención PDF: nuevo = m × ctm)
    a,b,c,d,e,f = m; A,B,C,D,E,F = n
    return (a*A+b*C, a*B+b*D, c*A+d*C, c*B+d*D, e*A+f*C+E, e*B+f*D+F)
def ap(m, x, y):
    a,b,c,d,e,f = m
    return (a*x+c*y+e, b*x+d*y+f)
def inter(r, s):
    if r is None: return s
    if s is None: return r
    return (max(r[0],s[0]), max(r[1],s[1]), min(r[2],s[2]), min(r[3],s[3]))

def page_images(doc, page):
    H = page.rect.height; W = page.rect.width
    names = {i[7]: i[0] for i in page.get_images(full=True)}
    s = page.read_contents()
    s = re.sub(rb'BT.*?ET', b' ', s, flags=re.S)
    s = re.sub(rb'\((?:\.|[^\)])*\)', b' ', s)
    ctm = (1,0,0,1,0,0); clip = None; stack = []; nums = []; pts = []; pending = False; out = []; last_name = None
    for t in TOK.findall(s):
        c = t[:1]
        if c == b'/': last_name = t[1:].decode('latin1'); continue
        if c in b'0123456789+-.':
            nums.append(float(t)); continue
        op = t.decode('latin1')
        if op == 'q': stack.append((ctm, clip))
        elif op == 'Q':
            if stack: ctm, clip = stack.pop()
        elif op == 'cm' and len(nums) >= 6: ctm = mul(tuple(nums[-6:]), ctm)
        elif op in ('m', 'l') and len(nums) >= 2: pts.append(ap(ctm, nums[-2], nums[-1]))
        elif op == 're' and len(nums) >= 4:
            x,y,w,h = nums[-4:]
            pts += [ap(ctm,x,y), ap(ctm,x+w,y), ap(ctm,x+w,y+h), ap(ctm,x,y+h)]
        elif op in ('W', 'W*'): pending = True
        elif op in ('n','f','F','f*','S','s','B','b','B*','b*'):
            if pending and pts:
                xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
                clip = inter(clip, (min(xs), min(ys), max(xs), max(ys)))
            pending = False; pts = []
        elif op == 'Do' and last_name in names:
            c4 = [ap(ctm,0,0), ap(ctm,1,0), ap(ctm,1,1), ap(ctm,0,1)]
            xs = [p[0] for p in c4]; ys = [p[1] for p in c4]
            bb = (min(xs), min(ys), max(xs), max(ys))
            v = inter(inter(bb, clip), (0,0,W,H))
            # a coordenadas con origen arriba-izquierda
            vis = (v[0], H - v[3], v[2], H - v[1])
            rot = round(__import__('math').degrees(__import__('math').atan2(ctm[1], ctm[0])))
            out.append({"xref": names[last_name], "vis": [round(x,1) for x in vis], "rot": rot,
                        "ok": vis[2]-vis[0] > 4 and vis[3]-vis[1] > 4})
        nums = []
    return out

if __name__ == "__main__":
    d = pymupdf.open(PDF); G = {}
    bad = 0; rots = {}
    for i, p in enumerate(d):
        g = page_images(d, p); G[i+1] = g
        info = {x["xref"] for x in p.get_image_info(xrefs=True)}
        if {x["xref"] for x in g} != info: bad += 1; print("mismatch", i+1, len(g), len(info))
        for x in g: rots[x["rot"]] = rots.get(x["rot"], 0) + 1
    json.dump(G, open("extraccion/geom.json", "w"))
    print("pages", len(G), "mismatch", bad, "rots", rots, "no visibles", sum(1 for g in G.values() for x in g if not x["ok"]))
    print(G[38]); print(G[2])
