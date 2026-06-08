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
                    "她有一点受伤，所以把语气放轻了。",
                    "她有一点受伤，却没有真的想远离你，只是把心事收得更谨慎了一点。现在的她更需要被认真解释，而不是被匆匆带过。");
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
