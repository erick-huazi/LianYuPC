package com.lianyu.service.character;

import java.util.Base64;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PngCharacterCardCodecTest {

    private static final byte[] ONE_PIXEL_PNG = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=");

    @Test
    void embedsAndExtractsCharacterCardJson() {
        String json = "{\"spec\":\"chara_card_v2\",\"spec_version\":\"2.0\",\"data\":{\"name\":\"LianYu\"}}";

        byte[] encoded = PngCharacterCardCodec.embedJson(ONE_PIXEL_PNG, json);

        assertTrue(encoded.length > ONE_PIXEL_PNG.length);
        assertEquals(json, PngCharacterCardCodec.extractJson(encoded));
    }

    @Test
    void replacesExistingCardChunkInsteadOfDuplicatingIt() {
        byte[] first = PngCharacterCardCodec.embedJson(ONE_PIXEL_PNG, "{\"name\":\"first\"}");
        byte[] second = PngCharacterCardCodec.embedJson(first, "{\"name\":\"second\"}");

        assertEquals("{\"name\":\"second\"}", PngCharacterCardCodec.extractJson(second));
    }
}
