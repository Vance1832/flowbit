"""Adapters for official/archive Thai lottery sources.

Parsing is kept free of any network access so it can be unit-tested directly;
the download helpers are thin and isolated.
"""

import datetime
import io
import json
import re
import tarfile
import urllib.error
import urllib.request

# vicha-w/thai-lotto-archive — winning numbers since 2007, one file per draw
# named ``lottonumbers/YYYY-MM-DD.txt``. Downloaded once as a tarball.
ARCHIVE_TARBALL_URL = (
    "https://codeload.github.com/vicha-w/thai-lotto-archive/tar.gz/refs/heads/master"
)
ARCHIVE_RAW_BASE = (
    "https://raw.githubusercontent.com/vicha-w/thai-lotto-archive/master/lottonumbers/"
)
_ARCHIVE_FILE_RE = re.compile(r"lottonumbers/(\d{4}-\d{2}-\d{2})\.txt$")

# Official Government Lottery Office (GLO) latest-result API (POST).
GLO_LATEST_URL = "https://www.glo.or.th/api/lottery/getLatestLottery"


def _numbers_for(label: str, text: str) -> list[str]:
    """Return the digit groups on the line whose label is ``label``.

    Tolerant of decoration around the label (``**FIRST:**``, ``FIRST -`` …) and
    anchored at line start so ``FIRST`` never matches inside ``NEAR_FIRST``.
    """
    pattern = re.compile(
        rf"^\W*{re.escape(label)}\b\W*([\d ]+)",
        re.IGNORECASE | re.MULTILINE,
    )
    match = pattern.search(text)
    return match.group(1).split() if match else []


def parse_archive_text(draw_date: datetime.date, text: str) -> dict:
    """Parse one archive draw file into a normalized record.

    Raises ``ValueError`` if no valid 6-digit first prize is present.
    """
    first = _numbers_for("FIRST", text)
    if not first or len(first[0]) != 6 or not first[0].isdigit():
        raise ValueError(f"No valid FIRST prize found for {draw_date}.")

    first_prize = first[0]
    two = _numbers_for("TWO", text)
    three = _numbers_for("THREE", text)

    return {
        "draw_date": draw_date,
        "first_prize": first_prize,
        "three_up": first_prize[-3:],
        "two_down": two[0] if two and len(two[0]) == 2 else None,
        "raw": {
            "first": first_prize,
            "two_down": two[0] if two else None,
            "three_running": three,
        },
    }


def iter_archive_draws(tarball_bytes: bytes):
    """Yield parsed records from a vicha-w archive tarball (bytes).

    Skips any file that fails to parse so one bad entry can't abort the import;
    callers receive ``(record, error)`` tuples — exactly one is non-None.
    """
    with tarfile.open(fileobj=io.BytesIO(tarball_bytes), mode="r:gz") as tar:
        for member in tar.getmembers():
            if not member.isfile():
                continue
            match = _ARCHIVE_FILE_RE.search(member.name)
            if not match:
                continue

            draw_date = datetime.date.fromisoformat(match.group(1))
            extracted = tar.extractfile(member)
            if extracted is None:
                continue
            text = extracted.read().decode("utf-8", errors="replace")

            try:
                yield parse_archive_text(draw_date, text), None
            except ValueError as error:
                yield None, (draw_date, str(error))


def download_archive_tarball(timeout: int = 60) -> bytes:
    """Download the archive repository tarball into memory."""
    request = urllib.request.Request(
        ARCHIVE_TARBALL_URL,
        headers={"User-Agent": "flowbit-lottery-import"},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read()


def fetch_archive_draw(draw_date: datetime.date, timeout: int = 30) -> dict | None:
    """Fetch and parse a single archive draw file. ``None`` if not published yet.

    Used as an independent cross-check source; the archive lags the official
    result by a day or two, so a missing file is expected, not an error.
    """
    url = f"{ARCHIVE_RAW_BASE}{draw_date.isoformat()}.txt"
    request = urllib.request.Request(url, headers={"User-Agent": "flowbit-lottery"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            text = response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as error:
        if error.code == 404:
            return None
        raise
    return parse_archive_text(draw_date, text)


# ---------------------------------------------------------------------------
# Official GLO source
# ---------------------------------------------------------------------------

def parse_glo_response(payload: dict) -> dict:
    """Normalize a GLO ``getLatestLottery`` JSON payload into a draw record.

    Network-free so it can be unit-tested against a captured fixture.
    """
    response = payload.get("response") or {}
    data = response.get("data") or {}

    first_numbers = (data.get("first") or {}).get("number") or []
    if not first_numbers:
        raise ValueError("GLO response has no first prize.")
    first_prize = first_numbers[0]["value"]
    if len(first_prize) != 6 or not first_prize.isdigit():
        raise ValueError(f"GLO first prize is not 6 digits: {first_prize!r}.")

    last2 = (data.get("last2") or {}).get("number") or []

    return {
        "draw_date": datetime.date.fromisoformat(response["date"]),
        "first_prize": first_prize,
        "three_up": first_prize[-3:],
        "two_down": last2[0]["value"] if last2 else None,
        "raw": {
            "first": first_prize,
            "last2": [n["value"] for n in last2],
            "last3f": [n["value"] for n in (data.get("last3f") or {}).get("number", [])],
            "last3b": [n["value"] for n in (data.get("last3b") or {}).get("number", [])],
        },
    }


def fetch_glo_latest(timeout: int = 30) -> dict:
    """Fetch the latest official draw from GLO and return a normalized record."""
    body = json.dumps({}).encode("utf-8")
    request = urllib.request.Request(
        GLO_LATEST_URL,
        data=body,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "flowbit-lottery",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        payload = json.loads(response.read().decode("utf-8"))
    return parse_glo_response(payload)


def cross_check_three_up(primary: dict, secondary: dict | None) -> bool | None:
    """Compare two source records' 3D number.

    Returns ``True`` if they agree, ``False`` on mismatch, and ``None`` when the
    secondary source has no data for the draw (so it can't confirm or deny).
    """
    if secondary is None:
        return None
    return primary["three_up"] == secondary["three_up"]
