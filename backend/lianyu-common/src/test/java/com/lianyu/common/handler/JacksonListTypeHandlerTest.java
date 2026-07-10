package com.lianyu.common.handler;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;

import java.util.List;
import org.junit.jupiter.api.Test;

class JacksonListTypeHandlerTest {

    private final JacksonListTypeHandler handler = new JacksonListTypeHandler();

    @Test
    void parseAlwaysReturnsLongElements() {
        List<Long> values = handler.parse("[1,2147483648]");

        assertEquals(List.of(1L, 2147483648L), values);
        values.forEach(value -> assertInstanceOf(Long.class, value));
    }

    @Test
    void roundTripsLongValues() {
        List<Long> values = List.of(1L, 2147483648L);

        assertEquals(values, handler.parse(handler.toJson(values)));
    }
}
