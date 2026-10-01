# ADR 0007: Mobile navigation hierarchy

## Status
Accepted

## Decision
Use the persistent five-tab bottom bar as the only mobile primary navigation surface. Keep the sticky mobile header focused on marketplace discovery: brand, listing search, and the categories trigger.

Profile, Home, Saved, Post, and Inbox stay in the bottom navigation. Do not duplicate those actions in the mobile header.

Desktop navigation is unchanged.

## Rationale
This follows familiar high-frequency mobile application patterns, reduces duplicated controls and competing navigation surfaces, preserves search context, and keeps the primary marketplace actions reachable with one thumb.

## Verification
Regression coverage asserts that the legacy mobile header utilities and action dock are hidden below the `md` breakpoint while brand, search, and categories remain present.
