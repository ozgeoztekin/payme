#!/usr/bin/env bash
set -o pipefail

rm -rf blob-report playwright-report

REPORTER="blob,list"
if [ "$CI" = "true" ]; then
  REPORTER="blob,list,github"
fi

# Each invocation gets its own output dir because the blob reporter
# wipes its target directory on start.
PLAYWRIGHT_BLOB_OUTPUT_DIR=blob-report/parallel \
  npx playwright test --project=parallel --reporter="$REPORTER"
parallel_exit=$?

PLAYWRIGHT_BLOB_OUTPUT_DIR=blob-report/serial \
  npx playwright test --project=serial-financial --workers=1 --reporter="$REPORTER"
serial_exit=$?

# merge-reports only reads top-level zip files, so flatten first
mv blob-report/parallel/*.zip blob-report/ 2>/dev/null
mv blob-report/serial/*.zip blob-report/ 2>/dev/null

npx playwright merge-reports --reporter=html ./blob-report

if [ $parallel_exit -ne 0 ] || [ $serial_exit -ne 0 ]; then
  exit 1
fi
