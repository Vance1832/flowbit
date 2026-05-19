from rest_framework import serializers


class UserVisibleResultSerializer(serializers.Serializer):
    result_date = serializers.DateField()
    result_number = serializers.CharField()
    status = serializers.CharField(required=False)