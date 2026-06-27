from django.db import models


class LotteryDraw(models.Model):
    """A single official Thai government lottery draw.

    Kept separate from the operational ``ResultPeriod`` so backfilled history
    can't pollute live betting, settlement, or analytics. The 3D number used by
    Flowbit is the last 3 digits of the first prize (``three_up``).
    """

    class Source(models.TextChoices):
        ARCHIVE = "archive", "Historical Archive"
        GLO = "glo", "GLO Official"
        SANOOK = "sanook", "Sanook"
        MANUAL = "manual", "Manual"

    draw_date = models.DateField(unique=True)

    first_prize = models.CharField(max_length=6)
    # Last 3 digits of the first prize — Flowbit's 3D winning number.
    three_up = models.CharField(max_length=3)

    source = models.CharField(max_length=20, choices=Source.choices)
    # Result of comparing this draw against an independent second source.
    # None = not cross-checked; True = a second source agreed; False = mismatch
    # (a mismatch must block one-tap settlement confirmation downstream).
    cross_check_ok = models.BooleanField(null=True, blank=True)
    # Full parsed prize breakdown, retained for audit / re-derivation.
    raw = models.JSONField(null=True, blank=True)

    fetched_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-draw_date"]
        indexes = [models.Index(fields=["-draw_date"])]

    def __str__(self):
        return f"{self.draw_date} | 3D {self.three_up} (first {self.first_prize})"
