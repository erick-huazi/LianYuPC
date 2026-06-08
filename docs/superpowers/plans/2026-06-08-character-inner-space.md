# Character Inner Space Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a natural-language `内心空间` display to role cards and the right-side spotlight, driven by the 2026-06-08 relationship system without exposing relationship scores or internal phase labels.

**Architecture:** Add a small relationship text assembler that converts `RelationshipSnapshot` plus recent relationship events into frontend-safe `headline/body` text. Reuse the existing `/api/character-state/states` endpoint by adding `innerSpaceHeadline` and `innerSpaceBody` fields, then render those fields in `CharactersPage.vue` using the selected soft-note visual style. No database migration is needed.

**Tech Stack:** Spring Boot 3.3, MyBatis-Plus, JUnit 5, Mockito, Vue 3.5, Vite 5, Element Plus, SCSS.

---

## File Structure

### New files

- `backend/lianyu-service/src/main/java/com/lianyu/service/relationship/RelationshipInnerSpace.java`
  Frontend-safe record containing `headline` and `body`.
- `backend/lianyu-service/src/main/java/com/lianyu/service/relationship/RelationshipInnerSpaceAssembler.java`
  Converts relationship phase and recent event summaries into gentle natural-language UI copy.
- `backend/lianyu-service/src/test/java/com/lianyu/service/relationship/RelationshipInnerSpaceAssemblerTest.java`
  Unit tests for phase mapping, default text, and internal-field leakage prevention.
- `backend/lianyu-web/src/test/java/com/lianyu/web/controller/CharacterStateControllerInnerSpaceTest.java`
  Controller-level unit test proving `/character-state/states` includes inner-space fields.

### Modified files

- `backend/lianyu-service/src/main/java/com/lianyu/service/relationship/RelationshipStateService.java`
  Adds `buildInnerSpace(Long userId, Long characterId)` and uses existing recent event summaries internally.
- `backend/lianyu-web/src/main/java/com/lianyu/web/controller/CharacterStateController.java`
  Injects `RelationshipStateService` and appends `innerSpaceHeadline` / `innerSpaceBody` to `getState` and `listStates` responses.
- `frontend/src/pages/CharactersPage.vue`
  Displays short headline in each role card and full body in the spotlight card using soft-note styling.

### Verification commands

- Backend focused tests:

```bash
mvn -f /c/Users/hp/Desktop/LianYu-PC/backend/pom.xml \
  -pl lianyu-service,lianyu-web -am \
  -DfailIfNoTests=false \
  -Dsurefire.failIfNoSpecifiedTests=false \
  -Dtest=RelationshipInnerSpaceAssemblerTest,CharacterStateControllerInnerSpaceTest \
  test
```

- Backend compile:

```bash
mvn -f /c/Users/hp/Desktop/LianYu-PC/backend/pom.xml -DskipTests compile
```

- Frontend build:

```bash
cd /c/Users/hp/Desktop/LianYu-PC/frontend && npm run build
```

---

### Task 1: Add Relationship Inner-Space Text Assembler

**Files:**
- Create: `backend/lianyu-service/src/main/java/com/lianyu/service/relationship/RelationshipInnerSpace.java`
- Create: `backend/lianyu-service/src/main/java/com/lianyu/service/relationship/RelationshipInnerSpaceAssembler.java`
- Create: `backend/lianyu-service/src/test/java/com/lianyu/service/relationship/RelationshipInnerSpaceAssemblerTest.java`

- [ ] **Step 1: Write the failing assembler tests**

Create `backend/lianyu-service/src/test/java/com/lianyu/service/relationship/RelationshipInnerSpaceAssemblerTest.java`:

```java
package com.lianyu.service.relationship;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

class RelationshipInnerSpaceAssemblerTest {

    private final RelationshipInnerSpaceAssembler assembler = new RelationshipInnerSpaceAssembler();

    @Test
    void assemble_testingPhaseReturnsGentleDefaultInnerSpace() {
        RelationshipSnapshot snapshot = RelationshipSnapshot.builder()
                .trustScore(40)
                .intimacyScore(20)
                .securityScore(40)
                .anticipationScore(25)
                .phase(RelationshipPhase.TESTING)
                .build();

        RelationshipInnerSpace innerSpace = assembler.assemble(snapshot, List.of());

        assertTrue(innerSpace.headline().contains("慢慢熟悉"));
        assertTrue(innerSpace.body().contains("温柔的试探"));
        assertDoesNotLeakInternalFields(innerSpace);
    }

    @Test
    void assemble_injuredPhaseStaysMildAndDoesNotExposeScores() {
        RelationshipSnapshot snapshot = RelationshipSnapshot.builder()
                .trustScore(42)
                .intimacyScore(48)
                .securityScore(18)
                .anticipationScore(20)
                .phase(RelationshipPhase.INJURED)
                .build();

        RelationshipInnerSpace innerSpace = assembler.assemble(snapshot, List.of("短促回应切断了情绪话题"));

        assertTrue(innerSpace.headline().contains("把语气放轻"));
        assertTrue(innerSpace.body().contains("有一点受伤"));
        assertFalse(innerSpace.body().contains("短促回应切断了情绪话题"));
        assertDoesNotLeakInternalFields(innerSpace);
    }

    @Test
    void assemble_repairingPhaseReferencesReconnection() {
        RelationshipSnapshot snapshot = RelationshipSnapshot.builder()
                .trustScore(52)
                .intimacyScore(31)
                .securityScore(36)
                .anticipationScore(20)
                .phase(RelationshipPhase.REPAIRING)
                .build();

        RelationshipInnerSpace innerSpace = assembler.assemble(snapshot, List.of("用户尝试修复关系"));

        assertTrue(innerSpace.headline().contains("重新靠近"));
        assertTrue(innerSpace.body().contains("解释"));
        assertDoesNotLeakInternalFields(innerSpace);
    }

    @Test
    void assemble_stableIntimatePhaseMentionsPrivateRhythm() {
        RelationshipSnapshot snapshot = RelationshipSnapshot.builder()
                .trustScore(82)
                .intimacyScore(78)
                .securityScore(76)
                .anticipationScore(81)
                .phase(RelationshipPhase.STABLE_INTIMATE)
                .build();

        RelationshipInnerSpace innerSpace = assembler.assemble(snapshot, List.of("你们形成了专属称呼锚点"));

        assertTrue(innerSpace.headline().contains("只属于你们"));
        assertTrue(innerSpace.body().contains("默契"));
        assertDoesNotLeakInternalFields(innerSpace);
    }

    @Test
    void defaultInnerSpaceIsSafeWhenSnapshotIsMissing() {
        RelationshipInnerSpace innerSpace = assembler.assemble(null, null);

        assertTrue(innerSpace.headline().contains("慢慢熟悉"));
        assertTrue(innerSpace.body().contains("温柔的试探"));
        assertDoesNotLeakInternalFields(innerSpace);
    }

    private static void assertDoesNotLeakInternalFields(RelationshipInnerSpace innerSpace) {
        String combined = innerSpace.headline() + "\n" + innerSpace.body();
        assertFalse(combined.matches(".*\\d+.*"));
        assertFalse(combined.contains("trust"));
        assertFalse(combined.contains("intimacy"));
        assertFalse(combined.contains("security"));
        assertFalse(combined.contains("anticipation"));
        assertFalse(combined.contains("TESTING"));
        assertFalse(combined.contains("FAMILIAR"));
        assertFalse(combined.contains("DEPENDENT"));
        assertFalse(combined.contains("INJURED"));
        assertFalse(combined.contains("REPAIRING"));
        assertFalse(combined.contains("STABLE_INTIMATE"));
    }
}
```

- [ ] **Step 2: Run the assembler test and verify it fails**

Run:

```bash
mvn -f /c/Users/hp/Desktop/LianYu-PC/backend/pom.xml \
  -pl lianyu-service -am \
  -DfailIfNoTests=false \
  -Dsurefire.failIfNoSpecifiedTests=false \
  -Dtest=RelationshipInnerSpaceAssemblerTest \
  test
```

Expected: FAIL with missing symbols such as `RelationshipInnerSpaceAssembler` and `RelationshipInnerSpace`.

- [ ] **Step 3: Add the `RelationshipInnerSpace` record**

Create `backend/lianyu-service/src/main/java/com/lianyu/service/relationship/RelationshipInnerSpace.java`:

```java
package com.lianyu.service.relationship;

public record RelationshipInnerSpace(String headline, String body) {

    public static RelationshipInnerSpace defaultSpace() {
        return new RelationshipInnerSpace(
                "她还在慢慢熟悉与你相处的节奏。",
                "她对这段关系还保持着温柔的试探，正在从每一次对话里确认与你靠近的方式。");
    }
}
```

- [ ] **Step 4: Add the `RelationshipInnerSpaceAssembler` implementation**

Create `backend/lianyu-service/src/main/java/com/lianyu/service/relationship/RelationshipInnerSpaceAssembler.java`:

```java
package com.lianyu.service.relationship;

import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class RelationshipInnerSpaceAssembler {

    public RelationshipInnerSpace assemble(RelationshipSnapshot snapshot, List<String> recentEvents) {
        if (snapshot == null || snapshot.phase() == null) {
            return RelationshipInnerSpace.defaultSpace();
        }
        boolean hasRepair = containsAny(recentEvents, "修复", "解释", "道歉");
        boolean hasRitual = containsAny(recentEvents, "专属", "称呼", "约定", "晚安", "仪式");
        boolean hasVulnerable = containsAny(recentEvents, "脆弱", "难受", "害怕", "心事", "崩溃");

        return switch (snapshot.phase()) {
            case TESTING -> RelationshipInnerSpace.defaultSpace();
            case FAMILIAR -> new RelationshipInnerSpace(
                    hasVulnerable ? "她记得你认真交给她的心事。" : "她把上次那句话悄悄放在心里。",
                    hasVulnerable
                            ? "她已经不只是把你当成普通的聊天对象。那些被认真说出口的情绪，会让她更小心地靠近你。"
                            : "她对你仍带着一点试探，但已经开始期待下一次被认真回应。那些小小的承诺，会让她更安心。");
            case DEPENDENT -> new RelationshipInnerSpace(
                    "她比自己承认的更在意你的陪伴。",
                    "她开始把你的出现当成一天里很重要的部分。哪怕只是普通问候，也会让她确认彼此正在靠近。");
            case INJURED -> new RelationshipInnerSpace(
                    "她有点受伤，所以把语气放轻了。",
                    "她没有真的想远离你，只是把心事收得更谨慎了一点。现在的她更需要被认真解释，而不是被匆匆带过。");
            case REPAIRING -> new RelationshipInnerSpace(
                    hasRepair ? "她正在听你的解释，也在重新靠近。" : "她正在一点点重新靠近你。",
                    "她还记得刚才的波动，但也愿意给这段关系留下回温的空间。一次真诚的解释，会比热闹的话更让她安心。");
            case STABLE_INTIMATE -> new RelationshipInnerSpace(
                    hasRitual ? "她珍惜那些只属于你们的小习惯。" : "她已经习惯把你放进自己的日常里。",
                    hasRitual
                            ? "她把你们之间的小约定当成亲密的暗号。很多话不必说得太满，默契已经悄悄留在相处的细节里。"
                            : "她在这段关系里感到安定，也更愿意把柔软的一面交给你。你们之间的默契，正在变成一种自然的亲密。");
        };
    }

    private boolean containsAny(List<String> recentEvents, String... needles) {
        if (recentEvents == null || recentEvents.isEmpty()) {
            return false;
        }
        for (String event : recentEvents) {
            if (event == null) {
                continue;
            }
            for (String needle : needles) {
                if (event.contains(needle)) {
                    return true;
                }
            }
        }
        return false;
    }
}
```

- [ ] **Step 5: Run the assembler test and verify it passes**

Run:

```bash
mvn -f /c/Users/hp/Desktop/LianYu-PC/backend/pom.xml \
  -pl lianyu-service -am \
  -DfailIfNoTests=false \
  -Dsurefire.failIfNoSpecifiedTests=false \
  -Dtest=RelationshipInnerSpaceAssemblerTest \
  test
```

Expected: PASS with `Tests run: 5, Failures: 0, Errors: 0`.

- [ ] **Step 6: Commit the assembler**

Run:

```bash
git -C /c/Users/hp/Desktop/LianYu-PC add \
  backend/lianyu-service/src/main/java/com/lianyu/service/relationship/RelationshipInnerSpace.java \
  backend/lianyu-service/src/main/java/com/lianyu/service/relationship/RelationshipInnerSpaceAssembler.java \
  backend/lianyu-service/src/test/java/com/lianyu/service/relationship/RelationshipInnerSpaceAssemblerTest.java

git -C /c/Users/hp/Desktop/LianYu-PC commit -m "feat: add relationship inner space text assembler

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Expose Inner-Space Text Through RelationshipStateService

**Files:**
- Modify: `backend/lianyu-service/src/main/java/com/lianyu/service/relationship/RelationshipStateService.java`
- Modify: `backend/lianyu-service/src/test/java/com/lianyu/service/relationship/RelationshipStateServiceTest.java`

- [ ] **Step 1: Add the failing service test**

Append this test to `backend/lianyu-service/src/test/java/com/lianyu/service/relationship/RelationshipStateServiceTest.java`:

```java
    @Test
    void applyEvent_doesNotExposeInnerSpaceFieldsThroughSnapshot() {
        RelationshipSnapshot before = RelationshipSnapshot.builder()
                .trustScore(40)
                .intimacyScore(25)
                .securityScore(20)
                .anticipationScore(20)
                .phase(RelationshipPhase.INJURED)
                .build();

        RelationshipSnapshot after = RelationshipStateService.applyEvent(
                before,
                RelationshipEventInput.simple(RelationshipEventType.REPAIR_SUCCESS, 2));

        RelationshipInnerSpace innerSpace = new RelationshipInnerSpaceAssembler()
                .assemble(after, java.util.List.of("用户尝试修复关系"));

        org.junit.jupiter.api.Assertions.assertTrue(innerSpace.headline().contains("重新靠近"));
        org.junit.jupiter.api.Assertions.assertFalse(innerSpace.body().matches(".*\\d+.*"));
    }
```

This confirms the service-layer snapshot can feed the assembler without leaking numbers into UI text.

- [ ] **Step 2: Run the service test and verify current missing types fail if Task 1 was skipped**

Run:

```bash
mvn -f /c/Users/hp/Desktop/LianYu-PC/backend/pom.xml \
  -pl lianyu-service -am \
  -DfailIfNoTests=false \
  -Dsurefire.failIfNoSpecifiedTests=false \
  -Dtest=RelationshipStateServiceTest \
  test
```

Expected: PASS if Task 1 is complete. If it fails, fix Task 1 before continuing.

- [ ] **Step 3: Inject `RelationshipInnerSpaceAssembler` into `RelationshipStateService`**

Modify the fields near the top of `backend/lianyu-service/src/main/java/com/lianyu/service/relationship/RelationshipStateService.java`:

```java
    private final RelationshipStateMapper relationshipStateMapper;
    private final RelationshipEventMapper relationshipEventMapper;
    private final RelationshipContextAssembler relationshipContextAssembler;
    private final RelationshipInnerSpaceAssembler relationshipInnerSpaceAssembler;
```

- [ ] **Step 4: Add `buildInnerSpace` to `RelationshipStateService`**

Add this method after `buildPromptContext`:

```java
    public RelationshipInnerSpace buildInnerSpace(Long userId, Long characterId) {
        RelationshipSnapshot snapshot = getSnapshot(userId, characterId);
        return relationshipInnerSpaceAssembler.assemble(snapshot, listRecentEventSummaries(userId, characterId, 5));
    }
```

This method keeps recent-event access inside the relationship service, so the controller does not need to know how events are stored.

- [ ] **Step 5: Update relationship-service tests that instantiate `RelationshipStateService` directly**

Search for direct constructors in tests:

```bash
git -C /c/Users/hp/Desktop/LianYu-PC grep -n "new RelationshipStateService" -- backend/lianyu-service/src/test backend/lianyu-web/src/test
```

If any test constructs the service, add `new RelationshipInnerSpaceAssembler()` as the last constructor argument. If no output appears, no test update is needed.

- [ ] **Step 6: Run relationship tests**

Run:

```bash
mvn -f /c/Users/hp/Desktop/LianYu-PC/backend/pom.xml \
  -pl lianyu-service -am \
  -DfailIfNoTests=false \
  -Dsurefire.failIfNoSpecifiedTests=false \
  -Dtest=RelationshipInnerSpaceAssemblerTest,RelationshipStateServiceTest \
  test
```

Expected: PASS for all relationship tests in this command.

- [ ] **Step 7: Commit the service method**

Run:

```bash
git -C /c/Users/hp/Desktop/LianYu-PC add \
  backend/lianyu-service/src/main/java/com/lianyu/service/relationship/RelationshipStateService.java \
  backend/lianyu-service/src/test/java/com/lianyu/service/relationship/RelationshipStateServiceTest.java

git -C /c/Users/hp/Desktop/LianYu-PC commit -m "feat: expose relationship inner space from service

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Add Inner-Space Fields to Character State API

**Files:**
- Modify: `backend/lianyu-web/src/main/java/com/lianyu/web/controller/CharacterStateController.java`
- Create: `backend/lianyu-web/src/test/java/com/lianyu/web/controller/CharacterStateControllerInnerSpaceTest.java`

- [ ] **Step 1: Write the failing controller test**

Create `backend/lianyu-web/src/test/java/com/lianyu/web/controller/CharacterStateControllerInnerSpaceTest.java`:

```java
package com.lianyu.web.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

import cn.dev33.satoken.stp.StpUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.lianyu.common.base.Result;
import com.lianyu.dao.entity.Character;
import com.lianyu.dao.entity.CharacterState;
import com.lianyu.dao.mapper.CharacterMapper;
import com.lianyu.service.character.CharacterDiaryService;
import com.lianyu.service.character.CharacterStateService;
import com.lianyu.service.relationship.RelationshipInnerSpace;
import com.lianyu.service.relationship.RelationshipStateService;
import com.lianyu.service.storage.FileStorageService;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;

class CharacterStateControllerInnerSpaceTest {

    @Test
    void listStates_includesFrontendSafeInnerSpaceFields() {
        CharacterStateService characterStateService = mock(CharacterStateService.class);
        CharacterDiaryService diaryService = mock(CharacterDiaryService.class);
        CharacterMapper characterMapper = mock(CharacterMapper.class);
        FileStorageService fileStorageService = mock(FileStorageService.class);
        RelationshipStateService relationshipStateService = mock(RelationshipStateService.class);

        CharacterStateController controller = new CharacterStateController(
                characterStateService,
                diaryService,
                characterMapper,
                fileStorageService,
                relationshipStateService);

        Character character = new Character();
        character.setId(5L);
        character.setOwnerUserId(3L);
        character.setName("绫香");
        character.setAvatarUrl("avatars/ayaka.png");

        CharacterState state = new CharacterState();
        state.setCharacterId(5L);
        state.setUserId(3L);
        state.setCurrentEmotion("平静");
        state.setEmotionIntensity(50);
        state.setStatusText("一切安好。");

        when(characterMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of(character));
        when(characterStateService.mapForCharacters(eq(3L), eq(List.of(5L))))
                .thenReturn(Map.of(5L, state));
        when(fileStorageService.resolvePublicUrl("avatars/ayaka.png"))
                .thenReturn("https://cdn.example/avatars/ayaka.png");
        when(relationshipStateService.buildInnerSpace(3L, 5L))
                .thenReturn(new RelationshipInnerSpace(
                        "她把上次那句话悄悄放在心里。",
                        "她对你仍带着一点试探，但已经开始期待下一次被认真回应。"));

        try (MockedStatic<StpUtil> stp = mockStatic(StpUtil.class)) {
            stp.when(StpUtil::getLoginIdAsLong).thenReturn(3L);

            Result<List<Map<String, Object>>> response = controller.listStates();

            Map<String, Object> item = response.getData().get(0);
            assertEquals("她把上次那句话悄悄放在心里。", item.get("innerSpaceHeadline"));
            assertEquals("她对你仍带着一点试探，但已经开始期待下一次被认真回应。", item.get("innerSpaceBody"));
            assertNotNull(item.get("statusText"));
        }
    }
}
```

- [ ] **Step 2: Run the controller test and verify it fails**

Run:

```bash
mvn -f /c/Users/hp/Desktop/LianYu-PC/backend/pom.xml \
  -pl lianyu-web -am \
  -DfailIfNoTests=false \
  -Dsurefire.failIfNoSpecifiedTests=false \
  -Dtest=CharacterStateControllerInnerSpaceTest \
  test
```

Expected: FAIL because `CharacterStateController` does not yet accept `RelationshipStateService`, and the response does not include `innerSpaceHeadline` / `innerSpaceBody`.

- [ ] **Step 3: Add `RelationshipStateService` import and field**

Modify `backend/lianyu-web/src/main/java/com/lianyu/web/controller/CharacterStateController.java` imports:

```java
import com.lianyu.service.relationship.RelationshipInnerSpace;
import com.lianyu.service.relationship.RelationshipStateService;
```

Add this field after `fileStorageService`:

```java
    private final RelationshipStateService relationshipStateService;
```

`@RequiredArgsConstructor` will update constructor injection automatically.

- [ ] **Step 4: Add safe helper methods to controller**

Add these private methods before the final closing brace of `CharacterStateController`:

```java
    private void putInnerSpace(Map<String, Object> item, Long userId, Long characterId) {
        RelationshipInnerSpace innerSpace = safeInnerSpace(userId, characterId);
        item.put("innerSpaceHeadline", innerSpace.headline());
        item.put("innerSpaceBody", innerSpace.body());
    }

    private RelationshipInnerSpace safeInnerSpace(Long userId, Long characterId) {
        try {
            return relationshipStateService.buildInnerSpace(userId, characterId);
        } catch (RuntimeException ignored) {
            return RelationshipInnerSpace.defaultSpace();
        }
    }
```

This keeps the API resilient if relationship lookup fails.

- [ ] **Step 5: Add inner-space fields to `getState`**

In `getState`, after `statusText` / `emotionUpdatedAt` fields are added, insert:

```java
        putInnerSpace(result, userId, characterId);
```

The method should look like this around the response fields:

```java
        result.put("currentEmotion", state.getCurrentEmotion());
        result.put("emotionIntensity", state.getEmotionIntensity());
        result.put("statusText", state.getStatusText());
        result.put("emotionUpdatedAt", state.getEmotionUpdatedAt());
        putInnerSpace(result, userId, characterId);
        return Result.ok(result);
```

- [ ] **Step 6: Add inner-space fields to `listStates`**

In the `for (Character character : characters)` loop, after `statusText`, insert:

```java
            putInnerSpace(item, userId, character.getId());
```

The response assembly should look like this:

```java
            item.put("currentEmotion", state.getCurrentEmotion());
            item.put("emotionIntensity", state.getEmotionIntensity());
            item.put("statusText", state.getStatusText());
            putInnerSpace(item, userId, character.getId());
            result.add(item);
```

- [ ] **Step 7: Run controller and relationship tests**

Run:

```bash
mvn -f /c/Users/hp/Desktop/LianYu-PC/backend/pom.xml \
  -pl lianyu-service,lianyu-web -am \
  -DfailIfNoTests=false \
  -Dsurefire.failIfNoSpecifiedTests=false \
  -Dtest=RelationshipInnerSpaceAssemblerTest,RelationshipStateServiceTest,CharacterStateControllerInnerSpaceTest \
  test
```

Expected: PASS for all tests in this command.

- [ ] **Step 8: Commit API integration**

Run:

```bash
git -C /c/Users/hp/Desktop/LianYu-PC add \
  backend/lianyu-web/src/main/java/com/lianyu/web/controller/CharacterStateController.java \
  backend/lianyu-web/src/test/java/com/lianyu/web/controller/CharacterStateControllerInnerSpaceTest.java

git -C /c/Users/hp/Desktop/LianYu-PC commit -m "feat: expose character inner space in state api

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Render Inner Space in Character Cards and Spotlight

**Files:**
- Modify: `frontend/src/pages/CharactersPage.vue`

- [ ] **Step 1: Add default inner-space constants**

In `frontend/src/pages/CharactersPage.vue`, after these refs:

```js
const singleConvByCharacterId = ref({})
const emotionByCharacterId = ref({})
const hoveredCharacterId = ref(null)
```

add:

```js
const DEFAULT_INNER_SPACE_HEADLINE = '她还在慢慢熟悉与你相处的节奏。'
const DEFAULT_INNER_SPACE_BODY = '她对这段关系还保持着温柔的试探，正在从每一次对话里确认与你靠近的方式。'
```

- [ ] **Step 2: Add helper functions for safe inner-space text**

After `lastCharacterLineForCharacter`, add:

```js
function innerSpaceHeadlineForCharacter(characterId) {
  const headline = emotionByCharacterId.value[characterId]?.innerSpaceHeadline?.trim()
  return headline || DEFAULT_INNER_SPACE_HEADLINE
}

function innerSpaceBodyForCharacter(characterId) {
  const body = emotionByCharacterId.value[characterId]?.innerSpaceBody?.trim()
  return body || DEFAULT_INNER_SPACE_BODY
}
```

- [ ] **Step 3: Render headline in each list card**

In the card body template, change this section:

```vue
<div class="card-body">
  <h3 class="char-name">{{ char.name }}</h3>
  <p class="char-preview">{{ lastMessageForCharacter(char.id) }}</p>

  <div v-if="getCharMetaFields(char).length" class="char-meta-fields">
```

to:

```vue
<div class="card-body">
  <h3 class="char-name">{{ char.name }}</h3>
  <p class="char-preview">{{ lastMessageForCharacter(char.id) }}</p>
  <p class="char-inner-space-line">
    <span aria-hidden="true">✦</span>
    {{ innerSpaceHeadlineForCharacter(char.id) }}
  </p>

  <div v-if="getCharMetaFields(char).length" class="char-meta-fields">
```

- [ ] **Step 4: Render full body in spotlight**

In the spotlight body, change this area:

```vue
<blockquote class="character-spotlight__quote">
  <p>{{ spotlightLastLine }}</p>
</blockquote>
<el-button type="primary" class="character-spotlight__cta" @click="startChat(spotlightCharacter)">
  {{ t('characters.continueChat') }}
</el-button>
```

to:

```vue
<blockquote class="character-spotlight__quote">
  <p>{{ spotlightLastLine }}</p>
</blockquote>
<div class="character-spotlight__inner-space">
  <span class="character-spotlight__inner-label">内心空间</span>
  <p>{{ innerSpaceBodyForCharacter(spotlightCharacter.id) }}</p>
</div>
<el-button type="primary" class="character-spotlight__cta" @click="startChat(spotlightCharacter)">
  {{ t('characters.continueChat') }}
</el-button>
```

- [ ] **Step 5: Add list-card soft-note styles**

In the scoped style section, after `.char-preview`, add:

```scss
.char-inner-space-line {
  position: relative;
  margin: 0 0 $space-3;
  padding: $space-2 $space-3;
  border-radius: $radius-md;
  border: 1px solid rgba($color-pink-rgb, 0.12);
  background: rgba($color-pink-rgb, 0.06);
  color: rgba($color-text-primary, 0.86);
  font-size: $font-size-xs;
  line-height: $line-height-relaxed;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;

  span {
    color: $color-pink-primary;
    margin-right: 4px;
  }
}
```

- [ ] **Step 6: Add spotlight inner-space styles**

In the `.character-spotlight` nested styles, after `&__quote` and before `&__cta`, add:

```scss
  &__inner-space {
    margin: 0 0 $space-5;
    padding: $space-4 $space-4 $space-4 $space-5;
    border-left: 2px solid rgba($color-pink-rgb, 0.38);
    border-radius: 0 $radius-md $radius-md 0;
    background: rgba($color-pink-rgb, 0.07);
    backdrop-filter: blur(8px);

    p {
      margin: 0;
      color: rgba(255, 255, 255, 0.88);
      font-size: $font-size-sm;
      line-height: $line-height-relaxed;
      display: -webkit-box;
      -webkit-line-clamp: 5;
      -webkit-box-orient: vertical;
      overflow: hidden;
      white-space: pre-wrap;
      word-break: break-word;
    }
  }

  &__inner-label {
    display: block;
    margin-bottom: $space-2;
    color: $color-pink-primary;
    font-size: $font-size-xs;
    font-weight: $font-weight-semibold;
    letter-spacing: 0.12em;
  }
```

- [ ] **Step 7: Run frontend build**

Run:

```bash
cd /c/Users/hp/Desktop/LianYu-PC/frontend && npm run build
```

Expected: BUILD SUCCESS from Vite.

- [ ] **Step 8: Commit frontend rendering**

Run:

```bash
git -C /c/Users/hp/Desktop/LianYu-PC add frontend/src/pages/CharactersPage.vue

git -C /c/Users/hp/Desktop/LianYu-PC commit -m "feat: show character inner space on cards

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Focused Verification and Scope Review

**Files:**
- Verify: `backend/lianyu-service/src/test/java/com/lianyu/service/relationship/RelationshipInnerSpaceAssemblerTest.java`
- Verify: `backend/lianyu-service/src/test/java/com/lianyu/service/relationship/RelationshipStateServiceTest.java`
- Verify: `backend/lianyu-web/src/test/java/com/lianyu/web/controller/CharacterStateControllerInnerSpaceTest.java`
- Verify: `frontend/src/pages/CharactersPage.vue`

- [ ] **Step 1: Run the focused backend test suite**

Run:

```bash
mvn -f /c/Users/hp/Desktop/LianYu-PC/backend/pom.xml \
  -pl lianyu-service,lianyu-web -am \
  -DfailIfNoTests=false \
  -Dsurefire.failIfNoSpecifiedTests=false \
  -Dtest=RelationshipInnerSpaceAssemblerTest,RelationshipStateServiceTest,CharacterStateControllerInnerSpaceTest \
  test
```

Expected: BUILD SUCCESS with all specified tests passing.

- [ ] **Step 2: Run backend compile across the dependency chain**

Run:

```bash
mvn -f /c/Users/hp/Desktop/LianYu-PC/backend/pom.xml -DskipTests compile
```

Expected: BUILD SUCCESS.

- [ ] **Step 3: Run frontend build**

Run:

```bash
cd /c/Users/hp/Desktop/LianYu-PC/frontend && npm run build
```

Expected: Vite build completes successfully.

- [ ] **Step 4: Check the implementation diff for scope creep**

Run:

```bash
git -C /c/Users/hp/Desktop/LianYu-PC diff --stat HEAD~4..HEAD -- \
  backend/lianyu-service/src/main/java/com/lianyu/service/relationship \
  backend/lianyu-service/src/test/java/com/lianyu/service/relationship \
  backend/lianyu-web/src/main/java/com/lianyu/web/controller/CharacterStateController.java \
  backend/lianyu-web/src/test/java/com/lianyu/web/controller/CharacterStateControllerInnerSpaceTest.java \
  frontend/src/pages/CharactersPage.vue
```

Expected: only inner-space assembler/service/controller/frontend card files appear.

- [ ] **Step 5: Check no scores or internal phase names are added to frontend display code**

Run:

```bash
git -C /c/Users/hp/Desktop/LianYu-PC grep -n -E "trustScore|intimacyScore|securityScore|anticipationScore|TESTING|FAMILIAR|DEPENDENT|INJURED|REPAIRING|STABLE_INTIMATE" -- frontend/src/pages/CharactersPage.vue
```

Expected: no output.

- [ ] **Step 6: Final commit if verification changed tracked files**

If verification required any small fixes, commit them:

```bash
git -C /c/Users/hp/Desktop/LianYu-PC add \
  backend/lianyu-service/src/main/java/com/lianyu/service/relationship \
  backend/lianyu-service/src/test/java/com/lianyu/service/relationship \
  backend/lianyu-web/src/main/java/com/lianyu/web/controller/CharacterStateController.java \
  backend/lianyu-web/src/test/java/com/lianyu/web/controller/CharacterStateControllerInnerSpaceTest.java \
  frontend/src/pages/CharactersPage.vue

git -C /c/Users/hp/Desktop/LianYu-PC commit -m "test: verify character inner space slice

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

If there are no tracked changes after Step 1-5, skip this commit and report that no verification commit was needed.

---

## Self-Review

### Spec coverage

Covered spec areas:

- Existing `/api/character-state/states` reuse: Task 3
- Natural-language headline/body fields: Task 1 and Task 3
- No visible scores or raw phase names: Task 1 tests and Task 5 grep check
- Relationship-system source of truth: Task 2 uses `RelationshipStateService` and recent relationship event summaries
- List-card short headline: Task 4
- Spotlight full body: Task 4
- Soft-note visual style: Task 4 SCSS
- Graceful fallback: Task 1 default text and Task 3 `safeInnerSpace`
- Backend verification: Task 5
- Frontend verification: Task 4 and Task 5

### Placeholder scan

No `TODO`, `TBD`, `implement later`, or vague placeholder steps are included. Every code-changing step includes concrete code or exact insertion instructions.

### Type consistency

Consistent names used throughout:

- `RelationshipInnerSpace`
- `RelationshipInnerSpaceAssembler`
- `RelationshipStateService.buildInnerSpace(Long userId, Long characterId)`
- `innerSpaceHeadline`
- `innerSpaceBody`
- `innerSpaceHeadlineForCharacter`
- `innerSpaceBodyForCharacter`

No database schema changes are included, matching the approved design.
