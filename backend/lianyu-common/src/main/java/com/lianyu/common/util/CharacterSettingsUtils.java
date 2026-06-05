package com.lianyu.common.util;

import cn.hutool.core.map.MapUtil;
import cn.hutool.core.util.StrUtil;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 从角色 settings 解析常用字段（city / location）。
 */
public final class CharacterSettingsUtils {

    private CharacterSettingsUtils() {
    }

    public static String resolveCity(Map<String, Object> settings, String defaultCity) {
        if (MapUtil.isEmpty(settings)) {
            return defaultCity;
        }
        String city = MapUtil.getStr(settings, "city");
        if (StrUtil.isNotBlank(city)) {
            return city.trim();
        }
        String location = MapUtil.getStr(settings, "location");
        if (StrUtil.isNotBlank(location)) {
            return location.trim();
        }
        return defaultCity;
    }

    public static String resolveCity(String requestedCity, Map<String, Object> settings, String defaultCity) {
        if (StrUtil.isNotBlank(requestedCity)) {
            return requestedCity.trim();
        }
        return resolveCity(settings, defaultCity);
    }

    /**
     * 修复 UTF-8 字节被误按 Latin-1 解码导致的乱码（如「女」→「å¥³」）。
     */
    public static String fixUtf8Mojibake(String value) {
        if (StrUtil.isBlank(value) || !looksLikeUtf8Mojibake(value)) {
            return value;
        }
        byte[] bytes = value.getBytes(StandardCharsets.ISO_8859_1);
        String decoded = new String(bytes, StandardCharsets.UTF_8);
        if (StrUtil.isBlank(decoded) || decoded.contains("\uFFFD")) {
            return value;
        }
        return decoded;
    }

    public static Map<String, Object> sanitizeSettingsForResponse(Map<String, Object> settings) {
        if (MapUtil.isEmpty(settings)) {
            return settings;
        }
        Map<String, Object> sanitized = new LinkedHashMap<>(settings.size());
        for (Map.Entry<String, Object> entry : settings.entrySet()) {
            Object value = entry.getValue();
            if (value instanceof String str) {
                sanitized.put(entry.getKey(), fixUtf8Mojibake(str));
            } else {
                sanitized.put(entry.getKey(), value);
            }
        }
        return sanitized;
    }

    private static boolean looksLikeUtf8Mojibake(String value) {
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (c >= 0x00C0 && c <= 0x00FF) {
                return true;
            }
        }
        return false;
    }
}
