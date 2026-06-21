import datetime
import io
import tarfile

from django.test import TestCase

from lottery.models import LotteryDraw
from lottery.sources import (
    cross_check_three_up,
    iter_archive_draws,
    parse_archive_text,
    parse_glo_response,
)


# Trimmed real GLO getLatestLottery payload (2026-06-16).
GLO_PAYLOAD = {
    "status": True,
    "response": {
        "date": "2026-06-16",
        "data": {
            "first": {"number": [{"round": 1, "value": "287184"}]},
            "last2": {"number": [{"value": "48"}]},
            "last3f": {"number": [{"value": "434"}, {"value": "758"}]},
            "last3b": {"number": [{"value": "007"}, {"value": "721"}]},
        },
    },
}


# A real archive file body (2007-02-01), trimmed. The label decoration varies
# between plain "FIRST: x" and markdown "**FIRST:** x", so both are exercised.
SAMPLE_PLAIN = """FIRST: 769925
THREE: 239 287 865 893
TWO: 56
NEAR_FIRST: 769924 769926
SECOND: 200035 307893 308306
"""

SAMPLE_MARKDOWN = """**FIRST:** 112233
**THREE:** 111 222 333 444
**TWO:** 99
**NEAR_FIRST:** 112232 112234
"""


class ParseArchiveTextTests(TestCase):
    def test_parses_three_up_from_first_prize(self):
        record = parse_archive_text(datetime.date(2007, 2, 1), SAMPLE_PLAIN)

        self.assertEqual(record["first_prize"], "769925")
        self.assertEqual(record["three_up"], "925")  # last 3 of the first prize
        self.assertEqual(record["two_down"], "56")
        self.assertEqual(record["raw"]["three_running"], ["239", "287", "865", "893"])

    def test_tolerates_markdown_decoration(self):
        record = parse_archive_text(datetime.date(2007, 3, 1), SAMPLE_MARKDOWN)

        self.assertEqual(record["three_up"], "233")
        self.assertEqual(record["two_down"], "99")

    def test_near_first_is_not_mistaken_for_first(self):
        # FIRST must anchor at line start so NEAR_FIRST never wins.
        record = parse_archive_text(datetime.date(2007, 2, 1), SAMPLE_PLAIN)
        self.assertEqual(record["first_prize"], "769925")

    def test_missing_first_prize_raises(self):
        with self.assertRaises(ValueError):
            parse_archive_text(datetime.date(2007, 2, 1), "TWO: 56\nTHREE: 111 222")


def _make_tarball(files: dict[str, str]) -> bytes:
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w:gz") as tar:
        for name, body in files.items():
            data = body.encode("utf-8")
            info = tarfile.TarInfo(name=name)
            info.size = len(data)
            tar.addfile(info, io.BytesIO(data))
    return buffer.getvalue()


class IterArchiveDrawsTests(TestCase):
    def test_iterates_only_dated_files_and_reports_failures(self):
        tarball = _make_tarball(
            {
                "thai-lotto-archive-master/lottonumbers/2007-02-01.txt": SAMPLE_PLAIN,
                "thai-lotto-archive-master/lottonumbers/2007-02-16.txt": SAMPLE_MARKDOWN,
                "thai-lotto-archive-master/lottonumbers/bad.txt": "no date",
                "thai-lotto-archive-master/README.md": "ignore me",
                "thai-lotto-archive-master/lottonumbers/2007-03-01.txt": "TWO: 10",
            }
        )

        records, failures = [], []
        for record, error in iter_archive_draws(tarball):
            (records if record else failures).append(record or error)

        # Two good draws; the dated-but-unparseable file reports a failure;
        # non-dated files (bad.txt, README) are ignored entirely.
        self.assertEqual(len(records), 2)
        self.assertEqual({r["draw_date"] for r in records},
                         {datetime.date(2007, 2, 1), datetime.date(2007, 2, 16)})
        self.assertEqual(len(failures), 1)
        self.assertEqual(failures[0][0], datetime.date(2007, 3, 1))


class ParseGloResponseTests(TestCase):
    def test_parses_three_up_and_two_down(self):
        record = parse_glo_response(GLO_PAYLOAD)

        self.assertEqual(record["draw_date"], datetime.date(2026, 6, 16))
        self.assertEqual(record["first_prize"], "287184")
        self.assertEqual(record["three_up"], "184")  # last 3 of first prize
        self.assertEqual(record["two_down"], "48")
        self.assertEqual(record["raw"]["last3f"], ["434", "758"])

    def test_missing_first_prize_raises(self):
        payload = {"response": {"date": "2026-06-16", "data": {}}}
        with self.assertRaises(ValueError):
            parse_glo_response(payload)


class CrossCheckTests(TestCase):
    def test_agreement_returns_true(self):
        primary = {"three_up": "184"}
        secondary = {"three_up": "184"}
        self.assertIs(cross_check_three_up(primary, secondary), True)

    def test_mismatch_returns_false(self):
        primary = {"three_up": "184"}
        secondary = {"three_up": "999"}
        self.assertIs(cross_check_three_up(primary, secondary), False)

    def test_missing_secondary_returns_none(self):
        # Archive not published yet — can neither confirm nor deny.
        self.assertIsNone(cross_check_three_up({"three_up": "184"}, None))


class ImportCommandUpsertTests(TestCase):
    def test_update_or_create_is_idempotent(self):
        # Simulate what the command does, without network.
        for _ in range(2):
            LotteryDraw.objects.update_or_create(
                draw_date=datetime.date(2007, 2, 1),
                defaults={
                    "first_prize": "769925",
                    "three_up": "925",
                    "two_down": "56",
                    "source": LotteryDraw.Source.ARCHIVE,
                },
            )
        self.assertEqual(LotteryDraw.objects.count(), 1)
        self.assertEqual(LotteryDraw.objects.get().three_up, "925")
