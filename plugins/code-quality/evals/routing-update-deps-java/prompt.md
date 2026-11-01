---
name: routing-update-deps-java
description: update-deps should also pick up a request about a Maven or Gradle project's dependencies.
tags: [routing]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

The libraries in this Spring Boot project's pom.xml are way behind. Move them to current versions and make sure the Maven build still passes.
