from django.db import migrations, models


def backfill_patient_ids(apps, schema_editor):
    Patient = apps.get_model("patients", "Patient")
    for patient in Patient.objects.all().order_by("id"):
        Patient.objects.filter(pk=patient.pk).update(patient_id=f"PAT-{patient.pk:05d}")


class Migration(migrations.Migration):

    dependencies = [
        ("patients", "0001_initial"),
    ]

    operations = [
        # Step 1: Add the field without unique constraint so existing rows can be backfilled
        migrations.AddField(
            model_name="patient",
            name="patient_id",
            field=models.CharField(blank=True, max_length=20, default=""),
            preserve_default=False,
        ),
        # Step 2: Populate existing records
        migrations.RunPython(backfill_patient_ids, migrations.RunPython.noop),
        # Step 3: Now add the unique constraint and index
        migrations.AlterField(
            model_name="patient",
            name="patient_id",
            field=models.CharField(blank=True, db_index=True, max_length=20, unique=True),
        ),
    ]
