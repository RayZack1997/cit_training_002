# 人员取物顺序可视化系统

## 项目简介
本系统基于 Django + MySQL + Leaflet 实现，用于导入取物路径数据（txt 文件），在地图上可视化展示人员取物轨迹、轨迹点状态（已取/未取），并支持路径管理（增删改查、同名覆盖）。

## 功能特性
- 数据导入：上传 txt 文件（制表符分隔，4 列格式：经度、纬度、说明信息、状态标识）；
- 同名文件覆盖：上传相同文件名的文件时自动覆盖旧路径（更新轨迹点）；
- 路径列表展示：侧栏显示所有路径，包含路径名称和轨迹点数量；
- 地图可视化：轨迹点按顺序绘制并连线，不同状态用不同颜色圆点区分；
- 多路径叠加：可勾选多条路径同时显示，不同路径颜色不同；
- 轨迹点信息弹窗：鼠标悬停显示序号、说明、状态；
- 轨迹点列表：侧栏显示当前选中路径的轨迹点明细，也可点击“详情”按钮弹出模态框查看；
- 路径管理：单个删除、批量删除、一键清空、替换文件。

## 环境要求
- Windows 10 或更高（其他操作系统兼容，但以下步骤按 Windows 编写）
- Python 3.14+
- MySQL 8.0+
- Git

## 安装步骤

### 1. 克隆代码
```bash
git clone https://github.com/RayZack1997/cit_training_002.git
cd cit_training_002
2. 创建并激活虚拟环境
bash
python -m venv venv
venv\Scripts\activate
3. 安装依赖
bash
pip install -r requirements.txt
4. 创建数据库
sql
CREATE DATABASE IF NOT EXISTS cit_training CHARACTER SET utf8mb4;
CREATE USER IF NOT EXISTS 'cit'@'localhost' IDENTIFIED BY 'cit123';
GRANT ALL PRIVILEGES ON cit_training.* TO 'cit'@'localhost';
FLUSH PRIVILEGES;
5. 配置数据库连接
编辑 config/settings.py，确认 DATABASES 中的 USER、PASSWORD、NAME 与上一步一致。

6. 执行数据库迁移
bash
python manage.py migrate
7. 启动开发服务器
bash
python manage.py runserver
8. 访问系统
打开浏览器访问 http://127.0.0.1:8000/

使用说明
导入路径：在左侧上传区域选择 txt 文件，点击上传。支持同名文件覆盖。

查看路径：在路径列表勾选复选框，地图上显示轨迹；鼠标悬停轨迹点查看详情。

轨迹点列表：侧栏自动显示当前选中路径的轨迹点；点击路径旁的“详情”按钮可弹出模态框查看完整列表。

管理路径：点击“删除选中”批量删除勾选的路径，或点击单个路径的“删”按钮删除；点击“替换”更换轨迹文件；点击“一键清空”删除所有路径（慎用）。

项目结构
config/：Django 项目配置（settings、urls 等）

mapapp/：核心应用

models.py：Path 和 Waypoint 数据模型

services.py：txt 解析与导入逻辑

views.py：页面视图与 API

static/js/map.js：前端地图交互逻辑

templates/mapapp/index.html：主页面

uploads/：上传的轨迹文件存储目录（自动创建）

requirements.txt：Python 依赖列表

注意事项
地图瓦片使用 OpenStreetMap 镜像 tile.openstreetmap.de，需保证网络可访问；

上传的 txt 文件请使用制表符分隔四列：经度、纬度、说明信息、状态标识；

状态标识仅支持 carrier（已取）和 notget（未取）；

同名文件上传将覆盖原路径数据，请谨慎操作。

text

---

保存后，执行提交：

```powershell
git add README.md
git commit -m "docs: update README to match final system"
git push origin master