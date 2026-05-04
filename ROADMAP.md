# ROADMAP.md

## Near-Term Product Work

### Stay request prerequisites

Stay requests are intentionally disabled today, even if a share policy is
named for trusted friends.

Before enabling them in the viewer UI, the app should have at least one of:

- owner-facing notifications so submitted requests are seen reliably ([#22](https://github.com/508-dev/house-calendar/issues/22))
- requester authentication, likely through Google OAuth, so submissions have a real identity boundary ([#23](https://github.com/508-dev/house-calendar/issues/23))

Until then, the product should stay read-only for viewers and continue treating
requests as roadmap work rather than a live capability.
