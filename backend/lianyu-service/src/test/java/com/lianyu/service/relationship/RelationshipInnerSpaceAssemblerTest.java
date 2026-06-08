package com.lianyu.service.relationship;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

class RelationshipInnerSpaceAssemblerTest {

    private final RelationshipInnerSpaceAssembler assembler = new RelationshipInnerSpaceAssembler();

    @Test
    void assemble_testingPhaseReturnsGentleDefaultInnerSpace() {
        RelationshipSnapshot snapshot = RelationshipSnapshot.builder()
                .trustScore(40)
                .intimacyScore(20)
                .securityScore(40)
                .anticipationScore(25)
                .phase(RelationshipPhase.TESTING)
                .build();

        RelationshipInnerSpace innerSpace = assembler.assemble(snapshot, List.of());

        assertTrue(innerSpace.headline().contains("慢慢熟悉"));
        assertTrue(innerSpace.body().contains("温柔的试探"));
        assertDoesNotLeakInternalFields(innerSpace);
    }

    @Test
    void assemble_injuredPhaseStaysMildAndDoesNotExposeScores() {
        RelationshipSnapshot snapshot = RelationshipSnapshot.builder()
                .trustScore(42)
                .intimacyScore(48)
                .securityScore(18)
                .anticipationScore(20)
                .phase(RelationshipPhase.INJURED)
                .build();

        RelationshipInnerSpace innerSpace = assembler.assemble(snapshot, List.of("短促回应切断了情绪话题"));

        assertTrue(innerSpace.headline().contains("把语气放轻"));
        assertTrue(innerSpace.body().contains("有一点受伤"));
        assertFalse(innerSpace.body().contains("短促回应切断了情绪话题"));
        assertDoesNotLeakInternalFields(innerSpace);
    }

    @Test
    void assemble_repairingPhaseReferencesReconnection() {
        RelationshipSnapshot snapshot = RelationshipSnapshot.builder()
                .trustScore(52)
                .intimacyScore(31)
                .securityScore(36)
                .anticipationScore(20)
                .phase(RelationshipPhase.REPAIRING)
                .build();

        RelationshipInnerSpace innerSpace = assembler.assemble(snapshot, List.of("用户尝试修复关系"));

        assertTrue(innerSpace.headline().contains("重新靠近"));
        assertTrue(innerSpace.body().contains("解释"));
        assertDoesNotLeakInternalFields(innerSpace);
    }

    @Test
    void assemble_stableIntimatePhaseMentionsPrivateRhythm() {
        RelationshipSnapshot snapshot = RelationshipSnapshot.builder()
                .trustScore(82)
                .intimacyScore(78)
                .securityScore(76)
                .anticipationScore(81)
                .phase(RelationshipPhase.STABLE_INTIMATE)
                .build();

        RelationshipInnerSpace innerSpace = assembler.assemble(snapshot, List.of("你们形成了专属称呼锚点"));

        assertTrue(innerSpace.headline().contains("只属于你们"));
        assertTrue(innerSpace.body().contains("默契"));
        assertDoesNotLeakInternalFields(innerSpace);
    }

    @Test
    void defaultInnerSpaceIsSafeWhenSnapshotIsMissing() {
        RelationshipInnerSpace innerSpace = assembler.assemble(null, null);

        assertTrue(innerSpace.headline().contains("慢慢熟悉"));
        assertTrue(innerSpace.body().contains("温柔的试探"));
        assertDoesNotLeakInternalFields(innerSpace);
    }

    private static void assertDoesNotLeakInternalFields(RelationshipInnerSpace innerSpace) {
        String combined = innerSpace.headline() + "\n" + innerSpace.body();
        assertFalse(combined.matches(".*\\d+.*"));
        assertFalse(combined.contains("trust"));
        assertFalse(combined.contains("intimacy"));
        assertFalse(combined.contains("security"));
        assertFalse(combined.contains("anticipation"));
        assertFalse(combined.contains("TESTING"));
        assertFalse(combined.contains("FAMILIAR"));
        assertFalse(combined.contains("DEPENDENT"));
        assertFalse(combined.contains("INJURED"));
        assertFalse(combined.contains("REPAIRING"));
        assertFalse(combined.contains("STABLE_INTIMATE"));
    }
}
