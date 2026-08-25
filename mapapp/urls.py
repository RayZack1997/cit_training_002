from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/paths/', views.api_paths, name='api_paths'),
    path('api/paths/<int:path_id>/waypoints/', views.api_waypoints, name='api_waypoints'),
    path('upload/', views.upload_file, name='upload'),
    path('delete-paths/', views.delete_paths, name='delete_paths'),
    path('clear-paths/', views.clear_paths, name='clear_paths'),
    path('replace-path/<int:path_id>/', views.replace_path_file, name='replace_path'),
]