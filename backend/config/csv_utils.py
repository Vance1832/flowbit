import csv

from django.http import StreamingHttpResponse


class _Echo:
    """A file-like object that returns what it is given (for streaming CSV)."""

    def write(self, value):
        return value


def csv_response(filename, header, rows):
    """Stream a list/iterable of row-tuples as a downloadable CSV file."""
    writer = csv.writer(_Echo())

    def generate():
        yield writer.writerow(header)
        for row in rows:
            yield writer.writerow(["" if value is None else value for value in row])

    response = StreamingHttpResponse(generate(), content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
