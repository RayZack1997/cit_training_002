# 人员取物顺序可视化系统

## 项目简介
本系统基于 Django + MySQL + Leaflet 实现，用于导入取物路径数据（txt 文件），在地图上可视化展示人员取物轨迹、轨迹点状态（已取/未取），并支持路径管理（增删改查、筛选、同名覆盖）。

## 功能特性
- 数据导入：上传 txt 文件（制表符分隔），支持元数据（人物、日期、物品）录入；
- 同名文件覆盖：上传相同文件名的文件时自动覆盖旧路径（更新轨迹点和元数据）；
- 路径列表展示：侧栏显示所有路径，包含元数据摘要；
- 地图可视化：轨迹点按顺序绘制并连线，不同状态用不同颜色圆点区分；
- 多路径叠加：可勾选多条路径同时显示，不同路径颜色不同；
- 轨迹点信息弹窗：鼠标悬停显示序号、说明、状态；
- 轨迹点列表：侧栏显示当前选中路径的轨迹点明细；
- 路径管理：单个删除、批量删除、一键清空、替换文件；
- 筛选：按人物、物品、日期范围筛选路径。

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
导入路径：在左侧上传区域选择 txt 文件，填写人物、日期、物品（多个用逗号分隔），点击上传。

查看路径：在路径列表勾选复选框，地图上显示轨迹；鼠标悬停轨迹点查看详情。

管理路径：使用筛选框按条件查询；点击“删除选中”批量删除，或点击单个路径的“删”按钮删除；点击“替换”更换轨迹文件。

清空数据：点击“一键清空”删除所有路径（慎用）。