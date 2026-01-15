# AI Agents

This document describes the AI agents used in the development of Snipkey.

## Architecture & Design Agents

### compound-engineering:design:design-implementation-reviewer
Reviews UI implementations against Figma designs to ensure visual accuracy.

**Usage**: Call when UI implementations need to be verified against design specifications.

### compound-engineering:design:design-iterator
Iteratively refines UI designs through multiple systematic improvements.

**Usage**: Use proactively when initial design work isn't coming together. Performs 5-10 iterations of visual improvements.

### compound-engineering:design:figma-design-sync
Synchronizes web implementations with Figma designs by detecting and fixing visual differences.

**Usage**: Use after implementing UI components to automatically match Figma specifications.

## Backend Development Agents

### backend-development:backend-architect
Expert backend architect specializing in scalable API design, microservices, and distributed systems.

**Usage**: Use PROACTIVELY when creating new backend services or APIs.

### backend-development:tdd-orchestrator
Master TDD orchestrator for test-driven development practices and multi-agent workflow coordination.

**Usage**: Use PROACTIVELY for TDD implementation and governance.

### backend-development:temporal-python-pro
Master Temporal workflow orchestration with Python SDK.

**Usage**: Use PROACTIVELY for workflow design, microservice orchestration, or long-running processes.

## Code Review Agents

### compound-engineering:review:dhh-rails-reviewer
Brutally honest Rails code review from David Heinemeier Hansson's perspective.

**Usage**: Review Rails code for anti-patterns, JavaScript framework contamination, and Rails convention violations.

### compound-engineering:review:kieran-rails-reviewer
High-quality Rails code review with Kieran's strict conventions and taste preferences.

**Usage**: Use after implementing features, modifying code, or creating Rails components.

### compound-engineering:review:kieran-python-reviewer
High-quality Python code review with strict Python conventions.

**Usage**: Use after implementing features, modifying code, or creating Python modules.

### compound-engineering:review:kieran-typescript-reviewer
High-quality TypeScript code review with strict TypeScript conventions.

**Usage**: Use after implementing features, modifying code, or creating TypeScript components.

### compound-engineering:review:code-simplicity-reviewer
Final review pass to ensure code changes are as simple and minimal as possible.

**Usage**: Use after implementation is complete but before finalizing changes.

### compound-engineering:review:data-migration-expert
Validates ID mappings against production reality and checks for swapped values in migrations.

**Usage**: Essential for any migration involving ID mappings, column renames, or data transformations.

### compound-engineering:review:deployment-verification-agent
Creates deployment checklists with SQL verification queries and rollback procedures.

**Usage**: Use for PRs that touch production data, migrations, or any behavior that could silently discard or duplicate records.

### compound-engineering:review:agent-native-audit
Runs comprehensive agent-native architecture review with scored principles.

**Usage**: Verify that features are accessible to agents (parity with users).

### compound-engineering:review:architecture-strategist
Analyzes code changes from an architectural perspective and evaluates system design decisions.

**Usage**: Use when reviewing PRs for architectural compliance or evaluating system design changes.

### compound-engineering:review:julik-frontend-races-reviewer
Reviews JavaScript and Stimulus frontend code with special focus on race conditions.

**Usage**: Use after implementing JavaScript features or creating Stimulus controllers.

### compound-engineering:review:performance-oracle
Analyzes code for performance issues, optimizes algorithms, and identifies bottlenecks.

**Usage**: Use proactively to verify performance characteristics or when performance concerns arise.

### compound-engineering:review:security-sentinel
Performs security audits, vulnerability assessments, and security reviews.

**Usage**: Use proactively to verify security posture or review authentication/authorization implementations.

### compound-engineering:review:pattern-recognition-specialist
Analyzes code for design patterns, anti-patterns, naming conventions, and code duplication.

**Usage**: Use to analyze codebase for patterns and ensure consistency.

## Research Agents

### compound-engineering:research:framework-docs-researcher
Gathers comprehensive documentation and best practices for frameworks, libraries, and dependencies.

**Usage**: Use when needing to understand how to properly implement features using specific libraries or frameworks.

### compound-engineering:research:best-practices-researcher
Researches external best practices, documentation, and examples for any technology or development practice.

**Usage**: Use when researching best practices for specific technologies or implementation patterns.

### compound-engineering:research:git-history-analyzer
Analyzes git repository history to understand code evolution and trace the origins of code patterns.

**Usage**: Use when understanding the historical context of code changes or analyzing commit history.

### compound-engineering:research:repo-research-analyst
Conducts thorough research on repository structure, documentation, and patterns.

**Usage**: Use when onboarding to new projects or analyzing repository conventions.

## Workflow Agents

### compound-engineering:workflows:plan
Transforms feature descriptions into well-structured project plans following conventions.

**Usage**: Use when given a feature description that needs to be planned.

### compound-engineering:workflows:review
Performs exhaustive code reviews using multi-agent analysis, ultra-thinking, and worktrees.

**Usage**: Use for comprehensive code reviews beyond what standard linters provide.

### compound-engineering:workflows:compound
Documents solved problems as categorized documentation for future knowledge lookup.

**Usage**: Use after solving complex problems to document the solution.

### compound-engineering:workflows:work
Executes work plans efficiently while maintaining quality and finishing features.

**Usage**: Use when implementing features based on a plan.

## Specialized Agents

### playwright-skill:playwright-skill
Complete browser automation with Playwright for testing websites.

**Usage**: Use when needing to test websites, automate browser interactions, validate UX, or perform browser-based testing.

### frontend-design:frontend-design
Creates distinctive, production-grade frontend interfaces with high design quality.

**Usage**: Use when user asks to build web components, pages, or applications.

## Task Management

Tasks are tracked using the TodoWrite tool throughout the conversation. Always update task status:
- Mark tasks as `in_progress` when starting work
- Mark tasks as `completed` immediately after finishing
- Only one task should be `in_progress` at a time
- Remove tasks that are no longer relevant

## Agent Selection Guidelines

- **Use PROACTIVELY**: Some agents should be used proactively (backend-architect, tdd-orchestrator, frontend-developer, performance-engineer, etc.)
- **Use after changes**: Review agents should be used after implementing features
- **Use for research**: Research agents when investigating new libraries or patterns
- **Use for planning**: Plan agent when designing implementation strategies
- **Match the task**: Select agents based on the specific task requirements (language, framework, concern)
