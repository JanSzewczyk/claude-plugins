# Java / JVM profile

> **Status: beta, to be tested.** These commands were checked against each tool's documentation but have not been run end-to-end. If one fails or behaves differently than described here, say so in the report instead of quietly working around it.

Covers Maven and Gradle, including Kotlin and Scala projects built with them.

## Tool detection

| Signal                                                                    | Tool   |
| ------------------------------------------------------------------------- | ------ |
| `pom.xml`                                                                 | Maven  |
| `build.gradle`, `build.gradle.kts`, `settings.gradle`, `settings.gradle.kts` | Gradle |

Always prefer the wrapper (`./mvnw`, `./gradlew`) over a global install, since it pins the build tool the project expects. Below, `mvn` and `gradle` stand for whichever applies. If both build systems exist, check which one CI runs and use that; if that doesn't settle it, ask.

## Verification

Use `-B -ntp` with Maven and `--console=plain` with Gradle, so output stays readable. There is no separate type-check on the JVM: compilation is that step.

| Check      | Maven                                                                     | Gradle                                                                    |
| ---------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Type-check | `mvn -B -ntp test-compile`                                                | `gradle testClasses`                                                      |
| Lint       | `spotless:check`, `checkstyle:check`, `pmd:check`, `spotbugs:check`, only if the plugin is in the POM | `spotlessCheck`, `checkstyleMain`, `detekt`, `ktlintCheck`, only if `gradle tasks --all` lists it |
| Build      | `mvn -B -ntp package -DskipTests`                                         | `gradle assemble`                                                         |
| Tests      | `mvn -B -ntp verify`                                                      | `gradle check`                                                            |

## Outdated

**Maven**: the Versions Maven Plugin needs no change to the POM:

```bash
mvn -B -ntp versions:display-dependency-updates versions:display-plugin-updates versions:display-property-updates
```

Output is text only, as `group:artifact … old -> new` lines. To see whether the parent POM has moved (often the most important update, such as `spring-boot-starter-parent`), run `mvn -B -ntp versions:update-parent -DgenerateBackupPoms=false`, read the diff, and restore the file. It has no display goal.

**Gradle**: there is no built-in command. Apply `com.github.ben-manes.versions` from a temporary init script in the scratch directory, so nothing is added to the build:

```groovy
initscript {
  repositories { gradlePluginPortal() }
  dependencies { classpath 'com.github.ben-manes:gradle-versions-plugin:+' }
}
allprojects {
  apply plugin: com.github.benmanes.gradle.versions.VersionsPlugin
}
```

```bash
gradle dependencyUpdates --init-script <tmp>/versions.init.gradle -Drevision=release -DoutputFormatter=json -DoutputDir=<tmp>
```

Read `<tmp>/report.json`. If the project already applies that plugin or `refreshVersions`, use it without the init script.

**Versions:** these listings include pre-releases, so discard `-alpha`, `-beta`, `-rc`, `-cr`, `-m1`, `-ea` and `-SNAPSHOT` candidates. Many JVM versions aren't semver: `33.0-jre`, `2.0.0.Final`, `5.3.39.RELEASE`. Compare the numeric part and keep the same qualifier (a `-jre` version doesn't become `-android`).

## Apply

First find where the version is declared, and change it **there**:

| Declared in                              | How to change it                                                                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Maven `<properties>`                     | `mvn versions:set-property -Dproperty=<name> -DnewVersion=<ver> -DgenerateBackupPoms=false`, which does no sanity checks, or edit the POM   |
| Maven literal `<version>`                | `mvn versions:use-dep-version -Dincludes=<group:artifact> -DdepVersion=<ver> -DforceVersion=true -DgenerateBackupPoms=false`, or edit the POM |
| Maven `<parent>`, plugin `<version>`     | edit the POM                                                                                                                                |
| Gradle `gradle/libs.versions.toml`       | edit the `[versions]` entry                                                                                                                 |
| Gradle `gradle.properties`, `ext`        | edit the property                                                                                                                           |
| Gradle literal in the build script       | edit the build script                                                                                                                       |

**Bump the BOM, not its members.** A dependency without its own version is managed by a parent POM or a BOM (`spring-boot-dependencies`, `jackson-bom`, `junit-bom`, a Gradle `platform(...)`). Update that BOM and don't add a version to the member: an override drifts out of the tested set.

In a multi-module build, change the version in the parent's `dependencyManagement` or the shared catalog, not module by module.

After editing Gradle files that use locking or verification, regenerate them:

- `gradle.lockfile`: `gradle dependencies --write-locks`
- `gradle/verification-metadata.xml`: `gradle --write-verification-metadata sha256 help`

## Rollback

```bash
git checkout -- <changed pom.xml, build scripts, catalog, gradle.properties, lockfiles>
```

Nothing needs reinstalling. The next build resolves the restored versions.

## Audit

There is no auto-fix on the JVM: every fix is a version bump and goes through the normal group path. A fix for a transitive dependency goes through whichever direct dependency or BOM brings it in where possible, and through a `dependencyManagement` entry or a Gradle `constraints` block otherwise.

1. **`osv-scanner scan source -r --format json .`** when installed. It resolves transitive dependencies from `pom.xml`, though not test-scoped ones. For Gradle it reads only `gradle.lockfile` and `gradle/verification-metadata.xml`, so a Gradle project with neither needs the next step.
2. **OWASP dependency-check** otherwise. It's slow, and without an NVD API key the first run can take a very long time, so warn the user before starting and read the key from an environment variable, never from the command line.
   - Maven: `mvn -B -ntp org.owasp:dependency-check-maven:check -Dformat=JSON`, report in `target/dependency-check-report.json`.
   - Gradle: apply `org.owasp.dependencycheck` from a temporary init script, then run `gradle dependencyCheckAnalyze`.
3. If neither can run, record "audit unavailable" in the report. Don't add a scanner to the project's build.

## Families

Match by group and artifact pattern. Detect others by the same logic (shared group ID, shared BOM, a published compatibility matrix).

| Theme label       | Coordinates that move together (patterns)                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| **Spring Boot**   | `spring-boot-starter-parent`, `org.springframework.boot:*`, and the plugin of the same name. Managed versions follow it |
| **Spring Cloud**  | `spring-cloud-dependencies`, `org.springframework.cloud:*`, pinned to Spring Boot by Spring's compatibility matrix |
| **Jackson**       | `jackson-bom`, `com.fasterxml.jackson*:*`                                                                      |
| **JUnit**         | `junit-bom`, `org.junit*:*`                                                                                    |
| **Mockito**       | `org.mockito:*`                                                                                                |
| **Kotlin**        | `org.jetbrains.kotlin:*`, the Kotlin Gradle plugins, `kotlinx-*` where they require that Kotlin version        |
| **Annotation processors** | `org.projectlombok:lombok`, `org.mapstruct:*`, `lombok-mapstruct-binding`                              |
| **Logging**       | `org.slf4j:*`, `ch.qos.logback:*`, `org.apache.logging.log4j:*`                                                |
| **Netty**         | `netty-bom`, `io.netty:*`                                                                                      |
| **Hibernate**     | `org.hibernate*:*`                                                                                             |
| **Testcontainers** | `testcontainers-bom`, `org.testcontainers:*`                                                                  |
| **gRPC**          | `grpc-bom`, `io.grpc:*`, `com.google.protobuf:*`                                                               |
| **AWS SDK**       | `software.amazon.awssdk:bom`, `software.amazon.awssdk:*`                                                       |
| **Build plugins** | Maven `org.apache.maven.plugins:*`, Gradle plugin versions                                                     |

Lowest-risk groups here are Build plugins and test-only libraries.

## Edge cases

- **Java baseline** (`maven.compiler.release`, `java.toolchain`): a new major can require a newer JDK. That is a blocker to report, not a reason to change the JDK.
- **`javax` to `jakarta`**: moving between them, as in Spring Boot 2 to 3, is a source migration across the codebase. Call it out in the confirmation for that major.
- **Build tool wrappers**: updating one is its own group, last among the tooling: `gradle wrapper --gradle-version <ver>`, run twice so the wrapper updates itself, or `mvn wrapper:wrapper -Dmaven=<ver>`.
- **`-SNAPSHOT` dependencies**: leave them alone and record them.
- **Private repositories**: leave the configuration alone, and record artifacts the tool can't reach.
