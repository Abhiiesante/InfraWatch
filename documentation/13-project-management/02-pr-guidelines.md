# Pull Request Guidelines

> **IEKB Section:** 14 — Project Management  
> **Document:** 02-pr-guidelines.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Tech Lead  
> **Status:** Approved

---

## Table of Contents

1. [The PR Template](#the-pr-template)
2. [Reviewer Expectations](#reviewer-expectations)
3. [Author Expectations](#author-expectations)
4. [Related Documents](#related-documents)

---

## The PR Template

Every Pull Request must use the standard template. This ensures reviewers have the context they need without having to hunt down Jira tickets.

```markdown
## Jira Ticket
[INFRA-123](https://jira.infrawatch.com/browse/INFRA-123)

## Description
A brief description of what this PR does and why it is needed.

## Type of Change
- [ ] Bug fix
- [x] New feature
- [ ] Refactoring / Tech Debt
- [ ] Documentation update

## Testing Performed
- [x] Unit Tests added/updated
- [x] E2E Tests added/updated
- [ ] Manually tested in local environment

## Screenshots (if UI change)
[Insert Image Here]
```

---

## Reviewer Expectations

1. **Timeliness:** Reviews are a priority. Aim to review a PR within 24 hours of being assigned.
2. **Be Constructive, Not Pedantic:** Let the automated linters handle formatting issues. Focus on architecture, security, performance, and business logic flaws.
3. **Nitpicks:** If a comment is purely a stylistic preference, prefix it with `Nit:`. The author is not required to fix nitpicks before merging.
4. **Approval:** Do not approve a PR unless you fully understand what the code is doing. "Looks good to me" (LGTM) without actually reading the code is unacceptable.

---

## Author Expectations

1. **Keep it Small:** A PR should ideally be under 400 lines of code (excluding auto-generated files like `package-lock.json` or Prisma schemas).
2. **Self-Review:** Before assigning a reviewer, read through your own diff in GitHub. Ensure no `console.log`s were left behind.
3. **CI Passes:** Do not ask for a review if the CI pipeline is failing. Fix the tests first.
4. **Respond to Feedback:** Address every comment. If you disagree, politely explain your reasoning. Once all feedback is addressed, re-request a review.

---

## Related Documents

- **Git Strategy:** [Git Workflow](./01-git-workflow.md)
- **Tickets:** [Jira Ticket Lifecycle](./03-jira-ticket-lifecycle.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
