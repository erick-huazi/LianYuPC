package com.lianyu.service.auth;

import com.lianyu.common.base.ErrorCode;
import com.lianyu.common.exception.BusinessException;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AuthRateLimiter {

    private static final String IP_PREFIX = "auth:rate:ip:";
    private static final String USER_PREFIX = "auth:rate:user:";

    private final StringRedisTemplate redisTemplate;

    @Value("${lianyu.auth.rate-limit.per-ip-per-minute:30}")
    private int perIpPerMinute;

    @Value("${lianyu.auth.rate-limit.per-username-per-minute:10}")
    private int perUsernamePerMinute;

    public void checkLoginOrRegister(String clientIp, String username) {
        if (clientIp != null && !clientIp.isBlank()) {
            incrementOrThrow(IP_PREFIX + clientIp.trim(), perIpPerMinute,
                    Duration.ofMinutes(1), "请求过于频繁，请稍后再试");
        }
        if (username != null && !username.isBlank()) {
            incrementOrThrow(USER_PREFIX + username.trim().toLowerCase(), perUsernamePerMinute,
                    Duration.ofMinutes(1), "该账号尝试次数过多，请稍后再试");
        }
    }

    private void incrementOrThrow(String key, int max, Duration ttl, String message) {
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1L) {
            redisTemplate.expire(key, ttl);
        }
        if (count != null && count > max) {
            throw new BusinessException(ErrorCode.AUTH_RATE_LIMITED, message);
        }
    }

    /**
     * 通用限流：指定 key、最大次数、窗口时间。
     * @param rateKey Redis key 前缀
     * @param identity 限流对象标识（user ID / IP）
     * @param max 窗口内最大请求数
     * @param ttl 窗口时长
     * @param message 超出时的提示语
     */
    public void checkRateLimit(String rateKey, String identity, int max, Duration ttl, String message) {
        if (identity == null || identity.isBlank()) return;
        incrementOrThrow(rateKey + identity.trim(), max, ttl, message);
    }
}
