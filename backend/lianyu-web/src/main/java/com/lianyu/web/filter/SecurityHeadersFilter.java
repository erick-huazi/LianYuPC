package com.lianyu.web.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * 安全 HTTP 响应头：
 * - X-Content-Type-Options: nosniff（防 MIME sniffing）
 * - X-Frame-Options: DENY（防 clickjacking）
 * - Referrer-Policy: strict-origin-when-cross-origin
 * - Permissions-Policy: 禁用敏感 API
 */
public class SecurityHeadersFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                     FilterChain chain) throws ServletException, IOException {
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("X-Frame-Options", "DENY");
        response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        response.setHeader("Permissions-Policy",
                "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
        chain.doFilter(request, response);
    }
}
