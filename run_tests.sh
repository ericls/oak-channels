#!/usr/bin/env bash
deno test --allow-all --no-check --unstable --coverage=.cov tests/*_test.ts
deno coverage --exclude="(test|test_utils)\.(ts|js)" .cov