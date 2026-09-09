# Excel Category Import — No Artificial Row Limit

The category Excel importer does not impose a 20-row or 5,000-row application limit.
The preview may show a limited number of rows for usability, but the import operation
must process all parsed worksheet rows. The database RPC must not reject the payload
based on row count.

For very large workbooks, the client should send rows in batches to avoid request-size
limits; this is batching for transport reliability, not a row-count restriction.
