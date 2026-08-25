import re
from django.core.exceptions import ValidationError
from .models import Path, Waypoint

# 调色板，用于给不同路径分配不同颜色
PALETTE = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6']

def parse_txt_file(file_path, path_name=None):
    """
    解析 txt 文件，创建 Path 和 Waypoint 记录。
    返回新创建的 Path 对象。
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    if not lines:
        raise ValidationError("文件为空")

    # 使用文件名作为路径名称（可覆盖）
    name = path_name or file_path.split('\\')[-1].split('.')[0]

    # 分配颜色（根据当前路径数量循环使用调色板）
    existing_count = Path.objects.count()
    color = PALETTE[existing_count % len(PALETTE)]

    path = Path.objects.create(name=name, color=color)

    for idx, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue

        # 优先使用制表符分割
        parts = line.split('\t')
        if len(parts) != 4:
            # 回退到按任意空白分割，但限制为4部分（要求第三列无空格）
            parts = line.split(None, 3)
            if len(parts) != 4:
                raise ValidationError(f"第{idx+1}行数据格式错误，需要4列（制表符分隔）")

        # 清理每个字段的前后空白
        lng = float(parts[0].strip())
        lat = float(parts[1].strip())
        info = parts[2].strip()
        status = parts[3].strip().lower()

        if status not in ('carrier', 'notget'):
            raise ValidationError(f"第{idx+1}行状态标识非法：{status}")

        Waypoint.objects.create(
            path=path,
            seq=idx+1,
            lng=lng,
            lat=lat,
            info=info,
            status=status
        )

    return path