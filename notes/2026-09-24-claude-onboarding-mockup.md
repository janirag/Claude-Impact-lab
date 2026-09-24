# Claude AI interface design and onboarding tutorial mockup

**Date:** 2026-09-24, 11:40 (Berlin)
**Source:** [Granola note](https://notes.granola.ai/d/78865f1d-b82d-434b-b752-5d2b773aa70b)

## Core concept

- Mockup website with Claude running in the background
  - Clippy-style mascot icon appearing on the side
  - Triggers when the system detects the user repeating themselves or not using a skill
  - Speech bubble prompts: "you've done this a few times, want to personalize me?"
- Mascot chosen deliberately: people resist being taught by other humans
  - Avoids the awkwardness of admitting limited AI knowledge
  - Nostalgia angle (Clippy reference) makes it feel harmless and approachable

## Onboarding tutorial design

- Converged on a gamified, personalized 15-minute tutorial
  - Not time-based: framed as 5 to 10 interactions (stages)
  - Could realistically finish in 5 minutes
- Landing page flow: Claude greets the user, asks what problem they're tackling, guides from there
  - Example: user says "I'm a pensioner with a letter I don't understand", Claude walks them through sending an image step by step
- Personalization at the start: ask role, use case (personal vs. professional)
  - Personal: diets, routines, everyday tasks
  - Professional: connectors, Figma, domain-specific tools

## Claude MD and memory education

- Tutorial should teach Claude memory levels progressively
  - User-level Claude MD vs. project-level memory
  - Users learn vocabulary naturally through use
- Goal: users eventually know to say "store this at project level"
- Addresses the common pattern of users needing to guide Claude through workarounds
  - These workarounds are worth saving as skills or memory

## UX considerations

- Interface must offer skip, "do later," and "never show again" options
  - Users choose when to customize, not forced into it
- Claude's default interface can feel overwhelming
  - "Added to memory," web search notices, walls of text feel like gibberish to new users
- Allow users to customize output style: visual responses vs. idea-challenging mode
- One-line prompters are a key target user
  - After completing a task, Claude can suggest: "next time, give me a reference structure for better results"
  - Non-pushy: informational, not prescriptive

## Entry point and profile setup

- Web users are a natural entry point: already comfortable navigating online
  - Tutorial lives on a standalone webpage, not requiring a Claude account to start
  - As users advance, offer a path to connect to the full Claude app
- Profile/initial setup is the core value add
  - Almost nobody does this setup today, yet it dramatically reduces the "AI slop"
  - Making it interactive and fun is the differentiator
- Key tension to manage: adding one more step before users get what they came for
  - Detect user intent: do they want to learn, or just complete a task?
  - Adjust pushiness accordingly

## Next steps

- [ ] **Build a first-version mockup of the interface:** start with the landing page, mascot icon, and onboarding flow before expanding further
