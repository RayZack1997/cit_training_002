import re
from django.core.exceptions import ValidationError
from .models import Path, Waypoint

PALETTE = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6']

def parse_txt_file(file_path, path_name=None, person_name=None, pickup_date=None, items=None, existing_path=None):
    """
    解析 txt 文件并保存轨迹点。
    若 existing_path 不为 None，则更新该路径（先删除旧轨迹点），否则创建新路径。
    返回 Path 对象。
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    if not lines:
        raise ValidationError("文件为空")

    # 处理 items
    if isinstance(items, str):
        items = [item.strip() for item in items.split(',') if item.strip()]
    if items is None:
        items = []

    if existing_path:
        path = existing_path
        # 更新元数据（可选）
        if person_name is not None:
            path.person_name = person_name
        if pickup_date is not None:
            path.pickup_date = pickup_date
        if items is not None:
            path.items = items
        path.save()
        # 清除旧轨迹点
        path.waypoints.all().delete()
    else:
        name = path_name or file_path.split('\\')[-1].split('.')[0]
        color = PALETTE[Path.objects.count() % len(PALETTE)]
        path = Path.objects.create(
            name=name,
            color=color,
            person_name=person_name,
            pickup_date=pickup_date,
            items=items
        )

    for idx, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        parts = line.split('\t')
        if len(parts) != 4:
            parts = line.split(None, 3)
            if len(parts) != 4:
                raise ValidationError(f"第{idx+1}行数据格式错误，需要4列（制表符分隔）")
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