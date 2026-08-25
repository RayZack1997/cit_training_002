from django.db import models


class Path(models.Model):
    name = models.CharField(max_length=255, verbose_name="路径名称")
    color = models.CharField(max_length=20, default="#e6194b", verbose_name="显示颜色")
    description = models.CharField(max_length=500, blank=True, null=True, verbose_name="备注")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="导入时间")

    def __str__(self):
        return self.name


class Waypoint(models.Model):
    path = models.ForeignKey(Path, on_delete=models.CASCADE, related_name='waypoints')
    seq = models.IntegerField(verbose_name="顺序号")
    lng = models.DecimalField(max_digits=10, decimal_places=7, verbose_name="经度")
    lat = models.DecimalField(max_digits=10, decimal_places=7, verbose_name="纬度")
    info = models.CharField(max_length=500, blank=True, null=True, verbose_name="轨迹点说明")
    status = models.CharField(max_length=20, choices=[('carrier', '已取'), ('notget', '未取')], default='notget', verbose_name="状态")

    class Meta:
        ordering = ['seq']
        unique_together = ('path', 'seq')

    def __str__(self):
        return f"{self.path.name} - {self.seq}"