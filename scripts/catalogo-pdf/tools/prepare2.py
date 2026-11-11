import json
B=[(1,37),(38,72),(73,109),(110,147),(148,184),(185,222),(223,257),(258,295),(296,335),(336,372),(373,413),(414,444),(445,479),(480,513),(514,549),(550,585),(586,626),(627,662),(663,698),(699,718)]
P=json.load(open("extraccion/pages.json",encoding="utf-8"))
I=json.load(open("extraccion/images.json",encoding="utf-8"))
G=json.load(open("extraccion/geom.json"))
for n,(a,b) in enumerate(B,1):
    out=[]
    for p in P[a-1:b]:
        out.append(f'## PAGINA {p["page"]}')
        for l in p["lines"]:
            out.append(f'  T {l["bbox"]} {l["t"]}')
        for g in G[str(p["page"])]:
            m=I[str(g["xref"])]
            v=[round(x) for x in g["vis"]]
            out.append(f'  IMG x{g["xref"]} zona={v} original={m["w"]}x{m["h"]}px' + ('' if g["ok"] else ' (NO VISIBLE)'))
    open(f"extraccion/in/batch-{n:02d}.txt","w",encoding="utf-8").write("\n".join(out)+"\n")
json.dump(B,open("extraccion/batches.json","w"))
