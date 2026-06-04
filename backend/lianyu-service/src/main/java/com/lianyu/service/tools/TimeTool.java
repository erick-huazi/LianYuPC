package com.lianyu.service.tools;

import java.time.format.DateTimeFormatter;
import java.time.ZonedDateTime;
import java.time.ZoneId;
import java.util.Locale;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class TimeTool {

    @Value("${lianyu.tools.time.zone-id:Asia/Shanghai}")
    private String zoneId;

    @Tool(name = "get_current_time", description = """
            获取当前真实日期与时间（应用配置时区）。
            当用户询问现在几点、今天几号、星期几、日期等与「当前时间」相关的问题时调用。""")
    public String getCurrentTime() {
        return readCurrentTimeFact();
    }

    public String readCurrentTimeFact() {
        ZoneId zone = ZoneId.of(zoneId);
        ZonedDateTime now = ZonedDateTime.now(zone);
        String formatted = now.format(DateTimeFormatter.ofPattern(
                "yyyy年MM月dd日 EEEE HH:mm:ss", Locale.CHINESE));
        return "当前真实时间：" + formatted + "（" + zone + "）。如果用户问今天、现在、几点、星期几等时间相关问题，必须以这个时间为准。";
    }
}
