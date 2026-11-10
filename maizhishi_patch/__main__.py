from pathlib import Path
import argparse

from .installer import PatchInstaller


def main():
    parser = argparse.ArgumentParser(description='麦之诗补丁恢复工具；请先停止宿主实例')
    parser.add_argument('action', choices=['recover'])
    parser.add_argument('--static-root', type=Path, required=True)
    parser.add_argument('--data-dir', type=Path, required=True, help='含patch-state.json的私有备份目录')
    args = parser.parse_args()
    installer = PatchInstaller(args.static_root, args.data_dir, Path.cwd())
    print(installer.recover())


if __name__ == '__main__':
    main()
