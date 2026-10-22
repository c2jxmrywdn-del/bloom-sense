#!/usr/bin/env python3
"""
按需从 INRIA 3DGS 预训练包中抽取场景点云与 cameras.json。

用法：
  pip install remotezip
  python fetch_models.py --out splat_src --scene flowers:30000 --scene bonsai:30000 --scene garden:7000

默认下载：
  <scene>/point_cloud/iteration_<iter>/point_cloud.ply  -> <out>/<scene>.ply
  <scene>/cameras.json                                  -> <out>/<scene>_cameras.json

特性：HTTP Range 只取需要的条目、.part 断点文件、失败自动重试、已存在则跳过。
注意：单个 .ply 通常 0.3–1.1GB，确保磁盘空间充足。
"""
import argparse
import os
import sys
import time

URL = "https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/datasets/pretrained/models.zip"


def fetch(z, member: str, dst: str, min_bytes: int, retries: int = 4) -> bool:
    if os.path.exists(dst) and os.path.getsize(dst) >= min_bytes:
        print(f"SKIP  {dst}  {os.path.getsize(dst)/1048576:.1f}MB", flush=True)
        return True
    print(f"START {member}", flush=True)
    info = z.getinfo(member)
    print(f"SIZE  {info.file_size/1048576:.1f}MB", flush=True)
    t0 = time.time()
    tmp = dst + ".part"
    with z.open(member) as f, open(tmp, "wb") as out:
        total = 0
        while True:
            chunk = f.read(4 * 1024 * 1024)
            if not chunk:
                break
            out.write(chunk)
            total += len(chunk)
            if total % (64 * 1024 * 1024) < 4 * 1024 * 1024:
                mb = total / 1048576
                rate = mb / max(1e-3, time.time() - t0)
                print(f"  {mb:.1f}MB  {rate:.2f}MB/s", flush=True)
    os.replace(tmp, dst)
    print(f"DONE  {dst}  {os.path.getsize(dst)/1048576:.1f}MB", flush=True)
    return True


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="splat_src", help="输出目录")
    ap.add_argument("--url", default=URL, help="models.zip 地址")
    ap.add_argument(
        "--scene",
        action="append",
        required=True,
        metavar="NAME:ITER",
        help="场景名与 iteration，可重复，如 flowers:30000",
    )
    ap.add_argument("--skip-cameras", action="store_true", help="不下载 cameras.json")
    args = ap.parse_args()

    try:
        from remotezip import RemoteZip
    except ImportError:
        sys.exit("缺少依赖：pip install remotezip")

    os.makedirs(args.out, exist_ok=True)
    scenes = []
    for spec in args.scene:
        name, _, it = spec.partition(":")
        scenes.append((name.strip(), (it or "30000").strip()))

    ok = True
    for attempt in range(4):
        try:
            with RemoteZip(args.url, timeout=120) as z:
                for name, it in scenes:
                    ply = f"{name}/point_cloud/iteration_{it}/point_cloud.ply"
                    dst = os.path.join(args.out, f"{name}.ply")
                    if not fetch(z, ply, dst, 10_000_000):
                        ok = False
                    if not args.skip_cameras:
                        cams = f"{name}/cameras.json"
                        cdst = os.path.join(args.out, f"{name}_cameras.json")
                        try:
                            fetch(z, cams, cdst, 1000)
                        except KeyError:
                            print(f"WARN  {cams} 不存在，跳过", flush=True)
            if ok:
                break
        except Exception as e:  # 网络抖动重试
            print(f"RETRY {attempt} {type(e).__name__}: {str(e)[:200]}", flush=True)
            time.sleep(3)
    else:
        sys.exit("下载失败，请检查网络后重试")

    print("\n资产就绪：")
    for name, _ in scenes:
        p = os.path.join(args.out, f"{name}.ply")
        c = os.path.join(args.out, f"{name}_cameras.json")
        print(f"  {name}: {os.path.getsize(p)/1048576:.1f}MB"
              f"  cameras={'yes' if os.path.exists(c) else 'no'}")


if __name__ == "__main__":
    main()
