# Character Inner Space Design

Date: 2026-06-08
Project: LianYu-PC
Status: approved for implementation planning

## 1. Goal

Add an `inner space` presentation to character cards so the frontend visibly reflects the relationship system added on 2026-06-08.

The user-facing goal is not to show scores or mechanics. The goal is to make each character feel like she has a private emotional world that changes with the relationship.

The feature should make the user feel:

- the character is affected by recent interactions
- the character has thoughts she does not always say directly
- relationship changes are visible without turning into a game UI
- the card still feels like the current LianYu visual system

## 2. Chosen Approach

Use the existing character-state list endpoint and add frontend-safe inner-space fields to each character state response.

Endpoint to reuse:

```http
GET /api/character-state/states
```

New fields:

```json
{
  "characterId": 5,
  "statusText": "今天心情很好呢~",
  "innerSpaceHeadline": "她把上次那句话悄悄放在心里。",
  "innerSpaceBody": "她对你仍带着一点试探，但已经开始期待下一次被认真回应。那些小小的承诺，会让她更安心。"
}
```

This keeps the frontend loading path simple because `CharactersPage.vue` already calls `listCharacterStates({ silent: true })` and stores the result by `characterId`.

## 3. Non-Goals

This slice does not add:

- visible affection bars
- visible relationship scores
- relationship dashboards
- raw phase names shown to users
- raw relationship event logs shown to users
- new navigation pages
- group-chat jealousy or public bias behavior

## 4. Product Display

### 4.1 Character List Card

Each list card shows a short inner-space headline below the recent-message preview and above the metadata tags.

Example:

```text
绫香
上次聊天的最后一句话...
✦ 她把上次那句话悄悄放在心里。
京都  温柔
```

Rules:

- max one or two lines
- natural language only
- no scores
- no internal phase labels
- no table names or debug wording
- should degrade to a gentle default if no relationship state exists

### 4.2 Right-Side Spotlight Card

The existing spotlight card keeps its current portrait, name, quote, and CTA. Add a soft note block below the current quote.

Example:

```text
内心空间
她对你仍带着一点试探，但已经开始期待下一次被认真回应。那些小小的承诺，会让她更安心。
```

The block should look like a quiet private note, not a metrics panel.

## 5. Visual Direction

The selected visual approach is `soft note`.

Use the existing dark glass card language in `CharactersPage.vue`:

- translucent dark background
- low-opacity pink border or left accent line
- small pink label
- relaxed line height
- subtle glow only on hover/active cards
- line clamping to prevent layout breakage

The inner-space block should harmonize with these existing classes:

- `.character-card`
- `.char-preview`
- `.meta-tag`
- `.character-spotlight__quote`
- `.character-spotlight__eyebrow`

## 6. Backend Design

### 6.1 Data Source

The backend should derive inner-space text from the relationship system implemented on 2026-06-08:

- `RelationshipStateService`
- `RelationshipSnapshot`
- `RelationshipPhase`
- recent `RelationshipEvent.summary` values

The backend may use numeric dimensions internally, but must not return them to the frontend.

### 6.2 Text Assembler

Add a small service near the relationship package, for example:

```text
RelationshipInnerSpaceAssembler
```

Responsibility:

- accept a `RelationshipSnapshot`
- optionally accept recent relationship event summaries
- produce a frontend-safe `headline` and `body`
- keep the language gentle and non-mechanical

Suggested output model:

```java
public record RelationshipInnerSpace(
        String headline,
        String body
) {}
```

### 6.3 Phase Language Mapping

Use relationship phase as the main branch:

| Phase | Headline/Body tendency |
|---|---|
| `TESTING` | cautious observation, gentle testing, slow approach |
| `FAMILIAR` | familiar warmth, expecting replies, beginning to relax |
| `DEPENDENT` | stronger attachment, caring about companionship |
| `INJURED` | mildly hurt, more careful, not hostile |
| `REPAIRING` | reconnecting, waiting for reassurance, soft recovery |
| `STABLE_INTIMATE` | steady closeness, private rhythm, exclusive warmth |

The text should avoid melodrama. Minor dismissive behavior should not generate extreme wording.

### 6.4 Recent Event Use

Recent event summaries can influence wording, but should not be dumped directly as raw logs.

Safe usage examples:

- a repair-related event can make the body mention `正在重新靠近`
- a ritual-related event can mention `小约定` or `只属于你们的习惯`
- a vulnerable-share event can mention `她记得你认真交给她的心事`

Unsafe usage:

- exposing exact raw user text if it contains sensitive content
- exposing event type names
- exposing event weights
- exposing database or service internals

## 7. API Integration

Extend the DTO used by `/api/character-state/states` with:

```java
private String innerSpaceHeadline;
private String innerSpaceBody;
```

For each character state response:

1. resolve `characterId`
2. load relationship snapshot for the current user and character
3. assemble inner-space text
4. attach headline/body to the response

If relationship lookup fails, use the default inner-space text and do not block the endpoint.

Default headline:

```text
她还在慢慢熟悉与你相处的节奏。
```

Default body:

```text
她对这段关系还保持着温柔的试探，正在从每一次对话里确认与你靠近的方式。
```

## 8. Frontend Design

### 8.1 Data Flow

`CharactersPage.vue` already performs:

```js
const states = await listCharacterStates({ silent: true })
emotionByCharacterId.value = buildEmotionMap(Array.isArray(states) ? states : [])
```

Keep this flow. Add helper functions:

```js
function innerSpaceHeadlineForCharacter(characterId) {}
function innerSpaceBodyForCharacter(characterId) {}
```

These helpers should:

- read from `emotionByCharacterId.value[characterId]`
- trim strings
- fall back to default text if missing
- not throw if state loading failed

### 8.2 List Card Placement

In the `.card-body` area, add the headline after `.char-preview` and before `.char-meta-fields`.

This keeps the card hierarchy:

1. name
2. last message
3. inner-space headline
4. metadata tags

### 8.3 Spotlight Placement

In `.character-spotlight__body`, add the full inner-space block after the existing quote and before the CTA.

This keeps the current quote as the character's outward line, while the new block represents private emotional context.

## 9. Error Handling

Backend:

- relationship lookup failure should not break `/character-state/states`
- log failures with traceable metadata, without leaking sensitive text
- return default inner-space text when unavailable

Frontend:

- keep `listCharacterStates({ silent: true })`
- if the endpoint fails, keep showing characters normally
- use default inner-space text or hide the block only if the character id is invalid
- do not show technical errors in the card UI

## 10. Security Constraints

Apply the project security baseline:

1. User input: do not render raw relationship-event text as system logs. Use assembled summaries only.
2. SQL: use MyBatis-Plus wrappers or parameterized mapper methods. Do not concatenate user-controlled input into SQL.
3. Secrets: no secrets or tokens in response fields, logs, code, or commits.
4. Errors: do not expose stack traces, paths, table names, score names, or internal enum values to users.
5. File upload: not involved in this feature.
6. External URLs: not involved in this feature.

## 11. Testing Strategy

### 11.1 Backend Tests

Add focused tests for:

- each `RelationshipPhase` produces natural language headline/body
- generated text does not contain numeric scores
- generated text does not contain internal dimension names such as `trustScore`, `intimacyScore`, `securityScore`, or `anticipationScore`
- default text is returned when snapshot or events are unavailable
- `/character-state/states` response includes `innerSpaceHeadline` and `innerSpaceBody`

### 11.2 Frontend Tests

Add or update frontend tests if the existing frontend test setup supports the page:

- list card renders the short headline
- spotlight renders the full body for the active/hovered character
- long text clamps without stretching the layout
- missing state data falls back safely

If frontend tests are not practical in the current setup, verify by running the app and checking the page manually.

## 12. Acceptance Criteria

The slice is complete when:

- `/api/character-state/states` returns inner-space headline and body for character states
- role cards show a short inner-space line
- right-side spotlight shows a full inner-space block
- no relationship numbers are visible in the UI or API response fields added for this feature
- missing relationship data degrades gracefully
- focused backend tests pass
- frontend build or relevant frontend tests pass
- visual styling matches the existing character card and spotlight style

## 13. Implementation Scope

Expected backend files:

- `backend/lianyu-service/src/main/java/com/lianyu/service/relationship/RelationshipInnerSpace.java`
- `backend/lianyu-service/src/main/java/com/lianyu/service/relationship/RelationshipInnerSpaceAssembler.java`
- existing character-state response DTO/service files
- focused backend tests

Expected frontend files:

- `frontend/src/pages/CharactersPage.vue`
- possibly frontend tests if present and practical

No changes are expected to database schema for this slice.
