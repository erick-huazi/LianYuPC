package com.lianyu.service.tools;

import cn.hutool.core.collection.CollUtil;
import com.lianyu.service.memory.MemoryRetriever;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

/**
 * Agentic 长期记忆：由模型在需要时调用，走 Redis → Milvus → MySQL → Rerank。
 * 结构化 profile（姓名/爱好等）仍由 {@link MemoryRetriever#retrieveProfileContext} 预注入 system prompt。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MemorySearchTool {

    private final MemoryRetriever memoryRetriever;

    @Tool(name = "memory_search", description = """
            按语义检索与当前用户相关的长期对话记忆（向量库）。
            当用户提到「还记得吗」「上次说过」「以前」「之前聊过」或需要回忆具体往事时调用。
            寒暄、纯表情、无需回忆时不要调用。query 用简短中文关键词或问句。""")
    public String memorySearch(
            @ToolParam(description = "检索 query，例如：用户喜欢的食物、上次聊的工作烦恼") String query) {
        ChatToolContext.Scope scope = ChatToolContext.require();
        List<String> lines = memoryRetriever.searchSemantic(
                scope.characterId(), scope.userId(), query, MemoryRetriever.DEFAULT_TOOL_TOP_K);
        if (CollUtil.isEmpty(lines)) {
            log.debug("memory_search empty: userId={}, characterId={}, query={}",
                    scope.userId(), scope.characterId(), query);
            return "（未找到相关长期记忆）";
        }
        log.info("memory_search hit: userId={}, characterId={}, query={}, count={}",
                scope.userId(), scope.characterId(), query, lines.size());
        return String.join("\n", lines);
    }
}
