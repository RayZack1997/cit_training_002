import re
from django.core.exceptions import ValidationError
from .models import Path, Waypoint

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

    path = Path.objects.create(name=name)

    for idx, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) < 4:
            raise ValidationError(f"第{idx+1}行数据格式错误，需要4列")

        lng = float(parts[0])
        lat = float(parts[1])
        info = parts[2]
        status = parts[3].lower()

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