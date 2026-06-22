from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.generics import get_object_or_404
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from accounts.permissions import IsAdminOwner, IsStaffAdminOwner
from audit.models import AuditLog
from audit.services import create_audit_log

from .models import KycSubmission
from .serializers import (
    KycReviewSerializer,
    KycSubmissionSerializer,
    ResponsibleGamblingControlSerializer,
)
from .services import get_or_create_control


class ResponsibleGamblingView(generics.RetrieveUpdateAPIView):
    """A user views/sets their own deposit & betting limits and self-exclusion."""

    serializer_class = ResponsibleGamblingControlSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return get_or_create_control(self.request.user)


class KycSubmissionListCreateView(generics.ListCreateAPIView):
    """A user submits identity documents and lists their own submissions."""

    serializer_class = KycSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return KycSubmission.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class AdminKycListView(generics.ListAPIView):
    serializer_class = KycSubmissionSerializer
    permission_classes = [IsStaffAdminOwner]

    def get_queryset(self):
        queryset = KycSubmission.objects.select_related("user").all()
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset


@api_view(["POST"])
@permission_classes([IsAdminOwner])
def admin_review_kyc(request, pk):
    submission = get_object_or_404(KycSubmission, pk=pk)
    if submission.status != KycSubmission.Status.PENDING:
        return Response(
            {"detail": "This submission has already been reviewed."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = KycReviewSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    submission.status = serializer.validated_data["status"]
    submission.review_note = serializer.validated_data.get("review_note", "")
    submission.reviewed_by = request.user
    submission.reviewed_at = timezone.now()
    submission.save(update_fields=["status", "review_note", "reviewed_by", "reviewed_at", "updated_at"])

    create_audit_log(
        actor_user=request.user,
        action=AuditLog.ActionType.APPROVE
        if submission.status == KycSubmission.Status.APPROVED
        else AuditLog.ActionType.REJECT,
        target_table="kyc_submissions",
        target_id=submission.id,
        reason=submission.review_note or f"KYC {submission.status}.",
    )

    return Response(KycSubmissionSerializer(submission, context={"request": request}).data)
