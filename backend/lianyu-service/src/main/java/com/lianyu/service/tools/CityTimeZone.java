package com.lianyu.service.tools;

import java.time.ZoneId;
import java.util.Map;

/**
 * 根据中文城市名映射到 Java ZoneId。
 */
public final class CityTimeZone {

    private static final Map<String, ZoneId> MAP = Map.ofEntries(
            Map.entry("上海", ZoneId.of("Asia/Shanghai")),
            Map.entry("北京", ZoneId.of("Asia/Shanghai")),
            Map.entry("广州", ZoneId.of("Asia/Shanghai")),
            Map.entry("深圳", ZoneId.of("Asia/Shanghai")),
            Map.entry("杭州", ZoneId.of("Asia/Shanghai")),
            Map.entry("南京", ZoneId.of("Asia/Shanghai")),
            Map.entry("成都", ZoneId.of("Asia/Shanghai")),
            Map.entry("重庆", ZoneId.of("Asia/Shanghai")),
            Map.entry("武汉", ZoneId.of("Asia/Shanghai")),
            Map.entry("西安", ZoneId.of("Asia/Shanghai")),
            Map.entry("郑州", ZoneId.of("Asia/Shanghai")),
            Map.entry("长沙", ZoneId.of("Asia/Shanghai")),
            Map.entry("天津", ZoneId.of("Asia/Shanghai")),
            Map.entry("苏州", ZoneId.of("Asia/Shanghai")),
            Map.entry("厦门", ZoneId.of("Asia/Shanghai")),
            Map.entry("青岛", ZoneId.of("Asia/Shanghai")),
            Map.entry("哈尔滨", ZoneId.of("Asia/Shanghai")),
            Map.entry("沈阳", ZoneId.of("Asia/Shanghai")),
            Map.entry("大连", ZoneId.of("Asia/Shanghai")),
            Map.entry("昆明", ZoneId.of("Asia/Shanghai")),
            Map.entry("合肥", ZoneId.of("Asia/Shanghai")),
            Map.entry("福州", ZoneId.of("Asia/Shanghai")),
            Map.entry("济南", ZoneId.of("Asia/Shanghai")),
            Map.entry("太原", ZoneId.of("Asia/Shanghai")),
            Map.entry("石家庄", ZoneId.of("Asia/Shanghai")),
            Map.entry("乌鲁木齐", ZoneId.of("Asia/Urumqi")),
            Map.entry("拉萨", ZoneId.of("Asia/Shanghai")),
            Map.entry("呼和浩特", ZoneId.of("Asia/Shanghai")),
            Map.entry("南宁", ZoneId.of("Asia/Shanghai")),
            Map.entry("贵阳", ZoneId.of("Asia/Shanghai")),
            Map.entry("兰州", ZoneId.of("Asia/Shanghai")),
            Map.entry("海口", ZoneId.of("Asia/Shanghai")),
            Map.entry("银川", ZoneId.of("Asia/Shanghai")),
            Map.entry("西宁", ZoneId.of("Asia/Shanghai")),
            Map.entry("台北", ZoneId.of("Asia/Taipei")),
            Map.entry("香港", ZoneId.of("Asia/Hong_Kong")),
            Map.entry("澳门", ZoneId.of("Asia/Macau")),
            Map.entry("东京", ZoneId.of("Asia/Tokyo")),
            Map.entry("大阪", ZoneId.of("Asia/Tokyo")),
            Map.entry("首尔", ZoneId.of("Asia/Seoul")),
            Map.entry("新加坡", ZoneId.of("Asia/Singapore")),
            Map.entry("曼谷", ZoneId.of("Asia/Bangkok")),
            Map.entry("伦敦", ZoneId.of("Europe/London")),
            Map.entry("巴黎", ZoneId.of("Europe/Paris")),
            Map.entry("柏林", ZoneId.of("Europe/Berlin")),
            Map.entry("纽约", ZoneId.of("America/New_York")),
            Map.entry("洛杉矶", ZoneId.of("America/Los_Angeles")),
            Map.entry("芝加哥", ZoneId.of("America/Chicago")),
            Map.entry("多伦多", ZoneId.of("America/Toronto")),
            Map.entry("悉尼", ZoneId.of("Australia/Sydney")),
            Map.entry("墨尔本", ZoneId.of("Australia/Melbourne")),
            Map.entry("莫斯科", ZoneId.of("Europe/Moscow")),
            Map.entry("迪拜", ZoneId.of("Asia/Dubai")),
            Map.entry("天宫市", ZoneId.of("Asia/Tokyo")),
            Map.entry("冬木市", ZoneId.of("Asia/Tokyo")),
            Map.entry("学园都市", ZoneId.of("Asia/Tokyo"))
    );

    private CityTimeZone() {
    }

    public static ZoneId fromCity(String city) {
        if (city == null || city.isBlank()) return ZoneId.of("Asia/Shanghai");
        ZoneId matched = MAP.get(city.trim());
        if (matched != null) return matched;
        // 尝试部分匹配（如"东京都"→"东京"）
        for (Map.Entry<String, ZoneId> e : MAP.entrySet()) {
            if (city.contains(e.getKey())) return e.getValue();
        }
        return ZoneId.of("Asia/Shanghai");
    }
}
