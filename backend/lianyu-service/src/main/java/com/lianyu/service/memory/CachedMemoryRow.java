package com.lianyu.service.memory;

import com.lianyu.dao.enums.MemoryType;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class CachedMemoryRow {
    private Long id;
    private String summary;
    private MemoryType memoryType;
    private BigDecimal importance;
}
