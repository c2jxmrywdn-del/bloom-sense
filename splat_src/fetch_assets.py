import os, sys, time
from remotezip import RemoteZip
URL='https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/datasets/pretrained/models.zip'
items = [
    ('flowers/point_cloud/iteration_30000/point_cloud.ply', 'splat_src/flowers.ply'),
    ('garden/point_cloud/iteration_7000/point_cloud.ply', 'splat_src/garden.ply'),
    ('bonsai/point_cloud/iteration_30000/point_cloud.ply', 'splat_src/bonsai.ply'),
]
for src, dst in items:
    if os.path.exists(dst) and os.path.getsize(dst) > 10_000_000:
        print('SKIP', dst, os.path.getsize(dst), flush=True); continue
    print('START', src, flush=True)
    for attempt in range(4):
        try:
            with RemoteZip(URL, timeout=120) as z:
                info = z.getinfo(src)
                print('SIZE', round(info.file_size/1048576,1), 'MB', flush=True)
                t0=time.time()
                with z.open(src) as f, open(dst+'.part','wb') as out:
                    total=0
                    while True:
                        chunk=f.read(1024*1024*4)
                        if not chunk: break
                        out.write(chunk); total+=len(chunk)
                        if total % (64*1024*1024) < 4*1024*1024:
                            print('PROGRESS', dst, round(total/1048576,1), 'MB', round(total/1048576/max(1,time.time()-t0),2),'MB/s', flush=True)
                os.replace(dst+'.part', dst)
                print('DONE', dst, os.path.getsize(dst), flush=True)
                break
        except Exception as e:
            print('RETRY', attempt, type(e).__name__, str(e)[:300], flush=True)
            time.sleep(3)
    else:
        print('FAILED', src, flush=True)
        sys.exit(1)
