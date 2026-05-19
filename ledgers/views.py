from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import get_user_visible_results


class UserResultListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        results = get_user_visible_results(request.user)
        return Response(results)