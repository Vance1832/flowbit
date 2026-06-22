from django.urls import path

from .views import LotteryDrawListView


urlpatterns = [
    path("draws/", LotteryDrawListView.as_view(), name="lottery-draws"),
]
