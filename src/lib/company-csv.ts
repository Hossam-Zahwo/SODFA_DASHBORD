export function companyCsv(rows: readonly (readonly string[])[]) {
  return (
    "\ufeff" +
    rows
      .map((row) =>
        row
          .map((value) => {
            const safe = /^[\s\uFEFF]*[=+\-@]|^[\t\r\n]/u.test(value) ? "'" + value : value;
            return '"' + safe.replaceAll('"', '""') + '"';
          })
          .join(","),
      )
      .join("\r\n")
  );
}
