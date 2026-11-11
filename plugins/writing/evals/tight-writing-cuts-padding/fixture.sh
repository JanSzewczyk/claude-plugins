#!/usr/bin/env bash
# Writes ./draft.md: a padded update with stock phrases, a recap ending and two conflicting dates.
set -euo pipefail
cat > draft.md <<'DRAFT'
Hi team,

I hope this message finds you well. I wanted to take a moment to reach out and share an important
update regarding our upcoming release, which plays a pivotal role in our roadmap going forward.

It's worth noting that the release is not just a version bump — it's a testament to our
commitment to quality. After careful consideration, we have made the decision to move the release
to Thursday, March 12. This will allow us to leverage the extra time to streamline our testing
process and ensure a robust, seamless experience for our users.

The reason for the delay: the payment provider's sandbox has been down since Monday, so we could
not run the checkout tests. Once it is back, QA needs two days.

In summary, the release will now happen on Friday, March 13, giving us the time we need. At the
end of the day, quality is what truly matters.

Please don't hesitate to reach out if you have any questions!

Best,
Ola
DRAFT
