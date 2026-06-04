package com.lianyu.common.util;

import cn.hutool.core.map.MapUtil;
import cn.hutool.core.util.StrUtil;
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
}
