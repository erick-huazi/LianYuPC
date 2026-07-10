package com.lianyu.service.character;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lianyu.common.base.ErrorCode;
import com.lianyu.common.exception.BusinessException;
import com.lianyu.service.dto.CharacterResponse;
import com.lianyu.service.dto.CreateCharacterRequest;
import com.lianyu.service.dto.UpdateCharacterRequest;
import com.lianyu.service.storage.FileStorageService;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class CharacterCardService {

    private static final long MAX_CARD_BYTES = 8L * 1024 * 1024;
    private static final int MAX_FIELD_CHARS = 200_000;
    private static final String RAW_CARD_KEY = "sillyTavernCardV2";

    private final CharacterService characterService;
    private final FileStorageService fileStorageService;
    private final ObjectMapper objectMapper;

    @Transactional
    public CharacterResponse importCard(Long userId, MultipartFile file, String cityMode, String city) {
        validateUpload(file);
        try {
            byte[] bytes = file.getBytes();
            boolean png = PngCharacterCardCodec.isPng(bytes);
            String json = png
                    ? PngCharacterCardCodec.extractJson(bytes)
                    : new String(bytes, StandardCharsets.UTF_8);
            ObjectNode card = normalizeV2Card(objectMapper.readTree(json));
            ObjectNode data = (ObjectNode) card.get("data");

            String name = requiredText(data, "name", 128);
            Map<String, Object> settings = buildSettings(card, data, cityMode, city);

            CreateCharacterRequest request = new CreateCharacterRequest();
            request.setName(name);
            request.setPromptTemplate(buildPromptTemplate(data));
            request.setSettings(settings);
            CharacterResponse created = characterService.create(userId, request);

            if (png) {
                String avatarUrl = fileStorageService.uploadAvatar(file);
                UpdateCharacterRequest avatarUpdate = new UpdateCharacterRequest();
                avatarUpdate.setAvatarUrl(avatarUrl);
                created = characterService.update(userId, created.getId(), avatarUpdate);
            }
            return created;
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "角色卡解析失败：请确认文件为 Character Card V1/V2 JSON 或 PNG");
        }
    }

    public ExportedCard exportCard(Long userId, Long characterId, String format) {
        CharacterResponse character = characterService.get(userId, characterId);
        ObjectNode card = buildExportCard(character);
        try {
            String json = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(card);
            String safeName = safeFilename(character.getName());
            if ("json".equalsIgnoreCase(format)) {
                return new ExportedCard((safeName + ".json"), "application/json",
                        json.getBytes(StandardCharsets.UTF_8));
            }
            if (!"png".equalsIgnoreCase(format)) {
                throw new BusinessException(ErrorCode.BAD_REQUEST, "导出格式仅支持 json 或 png");
            }
            byte[] avatar = loadAvatar(character.getAvatarUrl());
            return new ExportedCard((safeName + ".png"), "image/png",
                    PngCharacterCardCodec.embedJson(avatar, json));
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "导出角色卡失败");
        }
    }

    private Map<String, Object> buildSettings(ObjectNode card,
                                              ObjectNode data,
                                              String cityMode,
                                              String city) {
        Map<String, Object> settings = new LinkedHashMap<>();
        String normalizedMode = CharacterCitySettingsService.MODE_FICTIONAL.equalsIgnoreCase(cityMode)
                ? CharacterCitySettingsService.MODE_FICTIONAL
                : CharacterCitySettingsService.MODE_REAL;
        settings.put("city_mode", normalizedMode);
        if (CharacterCitySettingsService.MODE_REAL.equals(normalizedMode)) {
            settings.put("city", city == null ? "" : city.trim());
        }
        putIfNotBlank(settings, "personality", text(data, "personality"));
        putIfNotBlank(settings, "backstory", text(data, "description"));
        putIfNotBlank(settings, "scenario", text(data, "scenario"));
        putIfNotBlank(settings, "firstMessage", text(data, "first_mes"));
        putIfNotBlank(settings, "exampleMessages", text(data, "mes_example"));
        putIfNotBlank(settings, "postHistoryInstructions", text(data, "post_history_instructions"));
        if (data.path("alternate_greetings").isArray()) {
            settings.put("alternateGreetings", objectMapper.convertValue(
                    data.get("alternate_greetings"), new TypeReference<List<String>>() {}));
        }
        if (data.path("tags").isArray()) {
            settings.put("tags", objectMapper.convertValue(data.get("tags"), new TypeReference<List<String>>() {}));
        }
        settings.put(RAW_CARD_KEY, objectMapper.convertValue(card, new TypeReference<Map<String, Object>>() {}));
        return settings;
    }

    private String buildPromptTemplate(ObjectNode data) {
        List<String> sections = new ArrayList<>();
        addSection(sections, "角色描述", text(data, "description"));
        addSection(sections, "性格", text(data, "personality"));
        addSection(sections, "当前场景", text(data, "scenario"));
        addSection(sections, "系统指令", text(data, "system_prompt"));
        addSection(sections, "历史后指令", text(data, "post_history_instructions"));
        addSection(sections, "示例对话", text(data, "mes_example"));
        String result = String.join("\n\n", sections).trim();
        if (result.isBlank()) {
            result = requiredText(data, "name", 128) + " 的角色设定";
        }
        if (result.length() > MAX_FIELD_CHARS) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "角色卡人设内容过长");
        }
        return result;
    }

    private ObjectNode buildExportCard(CharacterResponse character) {
        ObjectNode root = null;
        Map<String, Object> settings = character.getSettings() != null ? character.getSettings() : Map.of();
        Object stored = settings.get(RAW_CARD_KEY);
        if (stored != null) {
            JsonNode storedNode = objectMapper.valueToTree(stored);
            if (storedNode.isObject()) {
                root = normalizeV2Card(storedNode).deepCopy();
            }
        }
        if (root == null) {
            root = objectMapper.createObjectNode();
            root.put("spec", "chara_card_v2");
            root.put("spec_version", "2.0");
            root.set("data", objectMapper.createObjectNode());
        }
        ObjectNode data = (ObjectNode) root.get("data");
        data.put("name", character.getName());
        setTextFromSetting(data, "description", settings, "backstory", character.getPromptTemplate());
        setTextFromSetting(data, "personality", settings, "personality", "");
        setTextFromSetting(data, "scenario", settings, "scenario", "");
        setTextFromSetting(data, "first_mes", settings, "firstMessage", "");
        setTextFromSetting(data, "mes_example", settings, "exampleMessages", "");
        ensureText(data, "creator_notes");
        ensureText(data, "system_prompt");
        setTextFromSetting(data, "post_history_instructions", settings, "postHistoryInstructions", "");
        ensureArray(data, "alternate_greetings", settings.get("alternateGreetings"));
        ensureArray(data, "tags", settings.get("tags"));
        ensureText(data, "creator");
        ensureText(data, "character_version");
        if (!data.path("extensions").isObject()) {
            data.set("extensions", objectMapper.createObjectNode());
        }
        ObjectNode extensions = (ObjectNode) data.get("extensions");
        ObjectNode lianyu = extensions.withObject("lianyu");
        lianyu.put("exported_at", Instant.now().toString());
        lianyu.put("format", "character-card-v2");
        return root;
    }

    private ObjectNode normalizeV2Card(JsonNode input) {
        if (input == null || !input.isObject()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "角色卡 JSON 顶层必须是对象");
        }
        ObjectNode root = ((ObjectNode) input).deepCopy();
        JsonNode dataNode = root.get("data");
        if (!dataNodeIsV2(root, dataNode)) {
            ObjectNode data = objectMapper.createObjectNode();
            copyV1Field(root, data, "name");
            copyV1Field(root, data, "description");
            copyV1Field(root, data, "personality");
            copyV1Field(root, data, "scenario");
            copyV1Field(root, data, "first_mes");
            copyV1Field(root, data, "mes_example");
            root.remove(List.of("name", "description", "personality", "scenario", "first_mes", "mes_example"));
            root.set("data", data);
        }
        root.put("spec", "chara_card_v2");
        root.put("spec_version", "2.0");
        ObjectNode data = (ObjectNode) root.get("data");
        for (String field : List.of("name", "description", "personality", "scenario", "first_mes",
                "mes_example", "creator_notes", "system_prompt", "post_history_instructions",
                "creator", "character_version")) {
            ensureText(data, field);
        }
        ensureArray(data, "alternate_greetings", null);
        ensureArray(data, "tags", null);
        if (!data.path("extensions").isObject()) {
            data.set("extensions", objectMapper.createObjectNode());
        }
        return root;
    }

    private boolean dataNodeIsV2(ObjectNode root, JsonNode dataNode) {
        return "chara_card_v2".equals(root.path("spec").asText()) && dataNode != null && dataNode.isObject();
    }

    private void copyV1Field(ObjectNode source, ObjectNode target, String field) {
        JsonNode value = source.get(field);
        target.put(field, value != null && value.isTextual() ? value.asText() : "");
    }

    private void ensureText(ObjectNode data, String field) {
        if (!data.path(field).isTextual()) {
            data.put(field, "");
        }
    }

    private void ensureArray(ObjectNode data, String field, Object fallback) {
        if (fallback instanceof List<?> list) {
            data.set(field, objectMapper.valueToTree(list));
        } else if (!data.path(field).isArray()) {
            data.putArray(field);
        }
    }

    private void setTextFromSetting(ObjectNode data,
                                    String cardField,
                                    Map<String, Object> settings,
                                    String settingKey,
                                    String fallback) {
        Object value = settings.get(settingKey);
        if (value instanceof String text && !text.isBlank()) {
            data.put(cardField, text);
        } else if (!data.path(cardField).isTextual() || data.path(cardField).asText().isBlank()) {
            data.put(cardField, fallback != null ? fallback : "");
        }
    }

    private byte[] loadAvatar(String avatarUrl) {
        String objectKey = FileStorageService.extractObjectKey(avatarUrl);
        return objectKey != null ? fileStorageService.readObjectBytes(objectKey) : PngCharacterCardCodec.createDefaultAvatar();
    }

    private void validateUpload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "请选择角色卡文件");
        }
        if (file.getSize() > MAX_CARD_BYTES) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "角色卡文件不能超过 8MB");
        }
        String name = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        if (!name.endsWith(".json") && !name.endsWith(".png")) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "仅支持 SillyTavern PNG 或 JSON 角色卡");
        }
    }

    private String requiredText(ObjectNode data, String field, int maxChars) {
        String value = text(data, field).trim();
        if (value.isBlank()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "角色卡缺少 " + field);
        }
        if (value.length() > maxChars) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "角色卡字段 " + field + " 过长");
        }
        return value;
    }

    private String text(ObjectNode data, String field) {
        JsonNode value = data.get(field);
        return value != null && value.isTextual() ? value.asText() : "";
    }

    private void putIfNotBlank(Map<String, Object> settings, String key, String value) {
        if (value != null && !value.isBlank()) {
            if (value.length() > MAX_FIELD_CHARS) {
                throw new BusinessException(ErrorCode.BAD_REQUEST, "角色卡字段 " + key + " 过长");
            }
            settings.put(key, value);
        }
    }

    private void addSection(List<String> sections, String label, String value) {
        if (value != null && !value.isBlank()) {
            sections.add("[" + label + "]\n" + value.trim());
        }
    }

    private String safeFilename(String raw) {
        String safe = raw == null ? "character" : raw.replaceAll("[\\\\/:*?\"<>|\\r\\n]", "_").trim();
        return safe.isBlank() ? "character" : safe;
    }

    public record ExportedCard(String filename, String contentType, byte[] bytes) {}
}
