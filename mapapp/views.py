import os
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from .models import Path, Waypoint
from .services import parse_txt_file


# 首页视图
def index(request):
    return render(request, 'mapapp/index.html')


# 路径列表 API（无筛选，返回所有路径）
def api_paths(request):
    paths = Path.objects.all()
    data = []
    for p in paths:
        data.append({
            'id': p.id,
            'name': p.name,
            'color': p.color,
            'point_count': p.waypoints.count(),
        })
    return JsonResponse(data, safe=False)


# 轨迹点列表 API
def api_waypoints(request, path_id):
    try:
        path = Path.objects.get(pk=path_id)
    except Path.DoesNotExist:
        return JsonResponse({'error': 'Path not found'}, status=404)
    waypoints = path.waypoints.all()
    data = []
    for w in waypoints:
        data.append({
            'seq': w.seq,
            'lng': float(w.lng),
            'lat': float(w.lat),
            'info': w.info,
            'status': w.status,
        })
    return JsonResponse(data, safe=False)


# 上传文件并导入路径（支持同名覆盖）
@csrf_exempt
def upload_file(request):
    if request.method == 'POST' and request.FILES.get('file'):
        file = request.FILES['file']

        # 生成路径名称（去掉扩展名）
        base_name = file.name.rsplit('.', 1)[0] if '.' in file.name else file.name
        existing_path = Path.objects.filter(name=base_name).first()

        # 保存文件（如果存在同名路径，覆盖原文件）
        upload_dir = os.path.join(settings.BASE_DIR, 'uploads')
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, file.name)
        with open(file_path, 'wb+') as destination:
            for chunk in file.chunks():
                destination.write(chunk)

        try:
            if existing_path:
                path = parse_txt_file(file_path, path_name=base_name, existing_path=existing_path)
                message = f"路径 {base_name} 已覆盖更新"
            else:
                path = parse_txt_file(file_path, path_name=base_name)
                message = f"导入成功：{path.name}"
            return JsonResponse({'success': True, 'path_id': path.id, 'name': path.name, 'message': message})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)
    return JsonResponse({'success': False, 'message': '请上传文件'}, status=400)


# 删除路径（支持单个或批量）
@csrf_exempt
def delete_paths(request):
    if request.method == 'POST':
        ids = request.POST.getlist('ids[]')
        if ids:
            Path.objects.filter(id__in=ids).delete()
            return JsonResponse({'success': True})
        single_id = request.POST.get('id')
        if single_id:
            Path.objects.filter(id=single_id).delete()
            return JsonResponse({'success': True})
        return JsonResponse({'success': False, 'message': '未提供路径ID'}, status=400)
    return JsonResponse({'success': False, 'message': '请求方法错误'}, status=405)


# 清空所有路径
@csrf_exempt
def clear_paths(request):
    if request.method == 'POST':
        Path.objects.all().delete()
        return JsonResponse({'success': True})
    return JsonResponse({'success': False, 'message': '请求方法错误'}, status=405)


# 替换指定路径的轨迹文件
@csrf_exempt
def replace_path_file(request, path_id):
    if request.method == 'POST' and request.FILES.get('file'):
        try:
            path = Path.objects.get(pk=path_id)
        except Path.DoesNotExist:
            return JsonResponse({'success': False, 'message': '路径不存在'}, status=404)

        file = request.FILES['file']

        # 保存新文件（覆盖原文件）
        upload_dir = os.path.join(settings.BASE_DIR, 'uploads')
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, file.name)
        with open(file_path, 'wb+') as destination:
            for chunk in file.chunks():
                destination.write(chunk)

        try:
            parse_txt_file(file_path, existing_path=path)
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)
    return JsonResponse({'success': False, 'message': '请上传文件'}, status=400)