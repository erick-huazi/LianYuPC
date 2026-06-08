package com.lianyu.service.relationship;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class RelationshipStateServiceTest {

    @Test
    void derivePhase_marksInjuredWhenSecurityIsLowAndRecentInjuryExists() {
        RelationshipSnapshot snapshot = RelationshipSnapshot.builder()
                .trustScore(42)
                .intimacyScore(48)
                .securityScore(18)
                .anticipationScore(33)
                .phase(RelationshipPhase.FAMILIAR)
                .build();

        assertEquals(RelationshipPhase.INJURED,
                RelationshipStateService.derivePhase(snapshot, true, false));
    }
}
