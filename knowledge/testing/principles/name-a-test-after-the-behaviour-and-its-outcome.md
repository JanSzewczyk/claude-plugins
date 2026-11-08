---
title: Name each test after the behaviour it checks, the situation and the expected outcome
summary: test_returning_an_overdue_book_charges_a_fine, not test_return_book or test_2.
impact: medium
sources: [https://abseil.io/resources/swe-book/html/ch12.html]
---

## Rule

Name a test case after one behaviour: the situation and the outcome its caller sees
(`test_returning_an_overdue_book_charges_a_fine`, "rejects an empty title"). Never name it after the
method it calls or a number (`test_return_book`, `test_2`).

## Why

A failure line that reads `test_return_book FAILED` does not say what broke, and a test named after
a method grows one more assertion for every behaviour the method gains.
