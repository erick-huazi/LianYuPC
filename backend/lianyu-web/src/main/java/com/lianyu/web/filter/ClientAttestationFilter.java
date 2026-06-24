package com.lianyu.web.filter;

import cn.dev33.satoken.stp.StpUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lianyu.common.base.Result;
import com.lianyu.common.web.CachedBodyHttpServletRequest;
import com.lianyu.service.security.ClientAttestationService;
import com.lianyu.service.security.ClientAttestationService.VerifyResult;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

@RequiredArgsConstructor
public class ClientAttestationFilter extends OncePerRequestFilter {

    private static final Set<String> SKIP_PREFIXES = Set.of(
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/captcha",
            "/api/public/",
            "/actuator/",
            "/doc.html",
            "/v3/api-docs",
            "/webjars/",
            "/swagger-ui",
            "/swagger-ui.html");

    private final ClientAttestationService attestationService;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (!attestationService.isEnforced() || shouldSkip(request)) {
            if (!attestationService.isEnforced() && StpUtil.isLogin()) {
                request.setAttribute(ClientAttestationService.REQUEST_ATTR_ATTESTED, Boolean.TRUE);
            }
            filterChain.doFilter(request, response);
            return;
        }

        HttpServletRequest effective = request;
        byte[] body = new byte[0];
        if (needsBodyCache(request)) {
            CachedBodyHttpServletRequest cached = new CachedBodyHttpServletRequest(request);
            body = cached.getCachedBody();
            effective = cached;
        }

        if (!StpUtil.isLogin()) {
            filterChain.doFilter(effective, response);
            return;
        }

        long userId = StpUtil.getLoginIdAsLong();
        String path = request.getRequestURI();
        VerifyResult result = attestationService.verifyAuthenticatedRequest(
                userId,
                request.getMethod(),
                path,
                body,
                request.getHeader(ClientAttestationService.HEADER_CLIENT),
                request.getHeader(ClientAttestationService.HEADER_DEVICE),
                request.getHeader(ClientAttestationService.HEADER_TIMESTAMP),
                request.getHeader(ClientAttestationService.HEADER_NONCE),
                request.getHeader(ClientAttestationService.HEADER_SIGNATURE));

        if (!result.ok()) {
            writeUnauthorized(response);
            return;
        }
        if (result.attested()) {
            effective.setAttribute(ClientAttestationService.REQUEST_ATTR_ATTESTED, Boolean.TRUE);
        }
        filterChain.doFilter(effective, response);
    }

    private boolean shouldSkip(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (path == null) {
            return true;
        }
        for (String prefix : SKIP_PREFIXES) {
            if (path.startsWith(prefix)) {
                return true;
            }
        }
        return !path.startsWith("/api/");
    }

    private static boolean needsBodyCache(HttpServletRequest request) {
        String method = request.getMethod();
        return "POST".equalsIgnoreCase(method)
                || "PUT".equalsIgnoreCase(method)
                || "PATCH".equalsIgnoreCase(method);
    }

    private void writeUnauthorized(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), Result.fail(401, "未授权的请求"));
    }
}
