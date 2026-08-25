@echo off
cd /d D:\course\cit_training_002
call venv\Scripts\activate.bat
start http://127.0.0.1:8000
python manage.py runserver
pause