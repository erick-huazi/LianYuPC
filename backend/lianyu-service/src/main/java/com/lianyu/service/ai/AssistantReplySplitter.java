package com.lianyu.service.ai;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/**
 * 将 AI 一次输出按换行拆成多条聊天气泡（单聊 / 群聊共用）。
 * 模型只回复一次；程序端按行切分，每非空行一条气泡。
 */
@Component
public class AssistantReplySplitter {

    private static final int SENTENCE_SPLIT_MIN_CHARS = 40;
    private static final Pattern CJK_SENTENCE_BOUNDARY =
            Pattern.compile("(?<=[。！？!?])(?=[^。！？!?\\s])");
    private static final Pattern EN_SENTENCE_BOUNDARY =
            Pattern.compile("(?<=[.!?])\\s+");

    public List<String> split(String fullContent, int maxRepliesPerTurn) {
        if (fullContent == null || fullContent.isBlank()) {
            return List.of();
        }
        String normalized = fullContent.replace("\r\n", "\n").trim();

        List<String> pieces = Arrays.stream(normalized.split("\\n"))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .collect(Collectors.toCollection(ArrayList::new));

        if (pieces.isEmpty()) {
            pieces.add(normalized);
        }

        int limit = Math.max(1, maxRepliesPerTurn);
        if (pieces.size() == 1 && pieces.get(0).length() >= SENTENCE_SPLIT_MIN_CHARS) {
            List<String> sentencePieces = splitBySentenceBoundary(pieces.get(0));
            if (sentencePieces.size() > 1) {
                pieces = sentencePieces;
            }
        }

        if (pieces.size() > limit) {
            List<String> merged = new ArrayList<>(pieces.subList(0, limit - 1));
            String tail = String.join("\n", pieces.subList(limit - 1, pieces.size()));
            merged.add(tail.trim());
            return merged;
        }
        return pieces;
    }

    private List<String> splitBySentenceBoundary(String text) {
        List<String> cjk = splitWithPattern(text, CJK_SENTENCE_BOUNDARY);
        if (cjk.size() > 1) {
            return cjk;
        }
        List<String> en = splitWithPattern(text, EN_SENTENCE_BOUNDARY);
        if (en.size() > 1) {
            return en;
        }
        return List.of(text.trim());
    }

    private static List<String> splitWithPattern(String text, Pattern pattern) {
        String[] parts = pattern.split(text);
        List<String> result = new ArrayList<>();
        for (String part : parts) {
            String trimmed = part == null ? "" : part.trim();
            if (!trimmed.isBlank()) {
                result.add(trimmed);
            }
        }
        return result.isEmpty() ? List.of(text.trim()) : result;
    }

    /** @deprecated 按行切分后不再需要合并段内软换行；保留供测试或外部引用 */
    public String collapseSoftLineBreaks(String text) {
        if (text == null || text.isBlank()) {
            return text == null ? "" : text.trim();
        }
        return text.replace("\r\n", "\n").trim();
    }
}
