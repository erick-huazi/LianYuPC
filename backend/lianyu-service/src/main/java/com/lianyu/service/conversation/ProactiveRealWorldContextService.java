package com.lianyu.service.conversation;

import cn.hutool.core.util.StrUtil;
import com.lianyu.common.util.CharacterSettingsUtils;
import com.lianyu.dao.entity.Character;
import com.lianyu.service.tools.TimeTool;
import com.lianyu.service.tools.WeatherTool;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * 角色主动开口前，同步拉取真实时间与天气，写入 Prompt 供模型生成更贴合现实的问候。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProactiveRealWorldContextService {

    private final TimeTool timeTool;
    private final WeatherTool weatherTool;

    @Value("${lianyu.tools.default-city:上海}")
    private String defaultCity;

    @Value("${lianyu.chat.proactive.prefetch-realworld-context:true}")
    private boolean prefetchEnabled;

    /**
     * @return 可追加在 system prompt 末尾的环境块；未启用或查询失败时仍保证有时间信息。
     */
    public String buildBlock(Character character) {
        if (!prefetchEnabled) {
            return "";
        }
        String timeFact = timeTool.readCurrentTimeFact();
        String city = CharacterSettingsUtils.resolveCity(
                character != null ? character.getSettings() : null, defaultCity);
        String weatherFact = weatherTool.readCurrentWeatherFact(city);

        StringBuilder sb = new StringBuilder();
        sb.append("\n\n=== 当前真实环境（主动开口前已由系统查询，请自然融入问候，勿逐条朗读） ===\n");
        sb.append(timeFact).append('\n');
        if (StrUtil.isNotBlank(weatherFact)) {
            sb.append(weatherFact).append('\n');
        } else {
            sb.append("（未能获取「").append(city).append("」当前天气，可仅结合时段与季节问候。）\n");
            log.debug("Proactive prefetch: weather empty for city={}", city);
        }
        sb.append("""
                写主动消息时可自然参考以上真实时间与天气（如早晚安、冷暖、是否适合出门等），\
                语气仍须完全符合角色设定；不要像播报员念数据，也不要编造与上述不符的时间或天气。\
                主动开口也要像日常私聊：可关心用户今天过得怎样、累不累、吃了没，不要自顾自讲设定剧情或推进世界观故事。""");
        return sb.toString();
    }
}
