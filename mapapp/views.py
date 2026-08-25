from django.shortcuts import render
from django.http import JsonResponse
from .models import Path
from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import FileSystemStorage
import os
from django.conf import settings
# Create your views here.


def index(request):
    return render(request, 'mapapp/index.html')


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



@csrf_exempt  # 简化处理，生产环境应使用CSRF token
def upload_file(request):
    if request.method == 'POST' and request.FILES.get('file'):
        file = request.FILES['file']
        # 保存到临时目录
        fs = FileSystemStorage(location=os.path.join(settings.BASE_DIR, 'uploads'))
        filename = fs.save(file.name, file)
        file_path = fs.path(filename)
        try:
            path = parse_txt_file(file_path)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)
        return JsonResponse({'success': True, 'path_id': path.id, 'name': path.name})
    return JsonResponse({'success': False, 'message': '请上传文件'}, status=400)