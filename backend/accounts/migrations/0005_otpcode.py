from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_passwordresetotp"),
    ]

    operations = [
        migrations.RenameModel(
            old_name="PasswordResetOTP",
            new_name="OtpCode",
        ),
        migrations.AddField(
            model_name="otpcode",
            name="purpose",
            field=models.CharField(
                choices=[
                    ("password_reset", "Password Reset"),
                    ("phone_verification", "Phone Verification"),
                ],
                default="password_reset",
                max_length=30,
            ),
        ),
    ]
