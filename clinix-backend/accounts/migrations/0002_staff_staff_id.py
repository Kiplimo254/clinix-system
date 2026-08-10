from django.db import migrations, models


def backfill_staff_ids(apps, schema_editor):
    Staff = apps.get_model("accounts", "Staff")
    for staff in Staff.objects.all().order_by("id"):
        Staff.objects.filter(pk=staff.pk).update(staff_id=f"STF-{staff.pk:05d}")


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        # Step 1: Add the field without unique constraint so existing rows can be backfilled
        migrations.AddField(
            model_name="staff",
            name="staff_id",
            field=models.CharField(blank=True, max_length=20, default=""),
            preserve_default=False,
        ),
        # Step 2: Populate existing records
        migrations.RunPython(backfill_staff_ids, migrations.RunPython.noop),
        # Step 3: Now add the unique constraint and index
        migrations.AlterField(
            model_name="staff",
            name="staff_id",
            field=models.CharField(blank=True, db_index=True, max_length=20, unique=True),
        ),
    ]
