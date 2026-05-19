from django.urls import path
from .views import UserResultListView


urlpatterns = [
    path("results/", UserResultListView.as_view(), name="user-results"),
]