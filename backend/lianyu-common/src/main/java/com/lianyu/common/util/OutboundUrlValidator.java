package com.lianyu.common.util;

import com.lianyu.common.base.ErrorCode;
import com.lianyu.common.exception.BusinessException;

import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.util.Locale;
import java.util.Set;

/**
 * 用户可配置的 AI Base URL 出站校验，降低 SSRF 风险。
 */
public final class OutboundUrlValidator {

    private static final Set<String> BLOCKED_HOSTS = Set.of(
            "localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]",
            "metadata.google.internal"
    );

    private OutboundUrlValidator() {
    }

    /**
     * 校验用户 Vault / 出站 HTTP 客户端可用的 Base URL。
     * Ollama 本地端点单独放行（仅本机 11434）。
     */
    public static String validateAndNormalize(String baseUrl, boolean ollamaAllowed) {
        return validateAndNormalize(baseUrl, ollamaAllowed, false);
    }

    /**
     * @param allowPrivateAddresses opt-in for self-hosted local deployments. Cloud deployments must keep this false.
     */
    public static String validateAndNormalize(String baseUrl,
                                              boolean ollamaAllowed,
                                              boolean allowPrivateAddresses) {
        if (baseUrl == null || baseUrl.isBlank()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Base URL 不能为空");
        }
        String trimmed = baseUrl.trim();
        if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Base URL 须以 http:// 或 https:// 开头");
        }
        URI uri;
        try {
            uri = new URI(trimmed);
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Base URL 格式无效");
        }
        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Base URL 缺少主机名");
        }
        String lowerHost = host.toLowerCase(Locale.ROOT);
        if ("metadata.google.internal".equals(lowerHost) || "0.0.0.0".equals(lowerHost)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Base URL 不允许指向元数据或通配地址");
        }
        if (ollamaAllowed && isOllamaLocalEndpoint(trimmed, lowerHost)) {
            return trimmed;
        }
        if (BLOCKED_HOSTS.contains(lowerHost) && !allowPrivateAddresses) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Base URL 不允许指向本机或元数据地址");
        }
        if ((lowerHost.endsWith(".local") || lowerHost.endsWith(".internal")) && !allowPrivateAddresses) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Base URL 主机名不允许使用内网域名");
        }
        try {
            InetAddress[] addresses = InetAddress.getAllByName(host);
            for (InetAddress address : addresses) {
                if (isAlwaysBlockedAddress(address)
                        || (!allowPrivateAddresses && isPrivateAddress(address))) {
                    throw new BusinessException(ErrorCode.BAD_REQUEST,
                            "Base URL 解析到内网或保留地址，不允许访问");
                }
            }
        } catch (UnknownHostException e) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Base URL 主机名无法解析");
        }
        return trimmed;
    }

    public static boolean isPrivateEndpoint(String baseUrl) {
        try {
            URI uri = new URI(baseUrl);
            String host = uri.getHost();
            if (host == null || host.isBlank()) {
                return false;
            }
            String lowerHost = host.toLowerCase(Locale.ROOT);
            if ("localhost".equals(lowerHost) || "127.0.0.1".equals(lowerHost)
                    || "::1".equals(lowerHost) || "host.docker.internal".equals(lowerHost)
                    || lowerHost.endsWith(".local")) {
                return true;
            }
            for (InetAddress address : InetAddress.getAllByName(host)) {
                if (isPrivateAddress(address)) {
                    return true;
                }
            }
            return false;
        } catch (Exception ignored) {
            return false;
        }
    }

    public static boolean isOllamaLocalEndpoint(String baseUrl, String lowerHost) {
        if (baseUrl == null) {
            return false;
        }
        try {
            URI uri = new URI(baseUrl);
            return uri.getPort() == 11434
                    && ("localhost".equals(lowerHost) || "127.0.0.1".equals(lowerHost));
        } catch (Exception ignored) {
            return false;
        }
    }

    private static boolean isAlwaysBlockedAddress(InetAddress address) {
        if (address.isAnyLocalAddress() || address.isLinkLocalAddress()) {
            return true;
        }
        byte[] bytes = address.getAddress();
        if (bytes.length == 4) {
            int b0 = Byte.toUnsignedInt(bytes[0]);
            int b1 = Byte.toUnsignedInt(bytes[1]);
            // 169.254.0.0/16 link-local / cloud metadata
            if (b0 == 169 && b1 == 254) {
                return true;
            }
            // 0.0.0.0/8
            if (b0 == 0) {
                return true;
            }
        }
        return false;
    }

    private static boolean isPrivateAddress(InetAddress address) {
        return address.isLoopbackAddress() || address.isSiteLocalAddress();
    }
}
