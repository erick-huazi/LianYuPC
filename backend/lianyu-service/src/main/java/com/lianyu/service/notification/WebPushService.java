package com.lianyu.service.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lianyu.dao.entity.WebPushSubscription;
import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.net.ssl.SSLException;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import nl.martijndwars.webpush.Encoding;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.apache.http.HttpResponse;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class WebPushService {

    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    @Value("${lianyu.push.enabled:false}")
    private boolean pushEnabled;
    @Value("${lianyu.push.vapid.public-key:}")
    private String vapidPublicKey;
    @Value("${lianyu.push.vapid.private-key:}")
    private String vapidPrivateKey;
    @Value("${lianyu.push.vapid.subject:mailto:admin@lianyu.local}")
    private String vapidSubject;
    @Value("${lianyu.push.connect-timeout-ms:5000}")
    private int connectTimeoutMs;
    @Value("${lianyu.push.socket-timeout-ms:10000}")
    private int socketTimeoutMs;

    private volatile PushService pushService;

    public void sendToUser(Long userId, String title, String body, Long conversationId) {
        if (!isPushReady()) {
            return;
        }
        List<WebPushSubscription> subscriptions = notificationService.listEnabledSubscriptions(userId);
        if (subscriptions.isEmpty()) {
            return;
        }
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("title", title);
        payload.put("body", body);
        payload.put("conversationId", conversationId);
        payload.put("url", notificationService.getPushClickUrlPrefix() + (conversationId == null ? "" : conversationId));

        String json;
        try {
            json = objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            log.warn("web push payload encode failed: {}", e.getMessage());
            return;
        }

        PushService service = resolvePushService();
        if (service == null) {
            return;
        }

        RequestConfig requestConfig = buildRequestConfig();
        try (CloseableHttpClient httpClient = buildHttpClient(requestConfig)) {
            for (WebPushSubscription sub : subscriptions) {
                sendOne(service, httpClient, requestConfig, sub, json);
            }
        } catch (Exception e) {
            log.warn("web push client error: {}", rootMessage(e));
        }
    }

    private void sendOne(
            PushService service,
            CloseableHttpClient httpClient,
            RequestConfig requestConfig,
            WebPushSubscription sub,
            String json
    ) {
        String endpointHost = endpointHost(sub.getEndpoint());
        try {
            Notification notification = new Notification(
                    sub.getEndpoint(),
                    sub.getP256dh(),
                    sub.getAuth(),
                    json.getBytes(StandardCharsets.UTF_8)
            );
            HttpPost post = service.preparePost(notification, Encoding.AESGCM);
            post.setConfig(requestConfig);
            HttpResponse response = httpClient.execute(post);
            int status = response.getStatusLine().getStatusCode();
            if (status == 404 || status == 410) {
                notificationService.disableSubscriptionByEndpoint(sub.getEndpoint());
                log.info("web push subscription disabled: host={}", endpointHost);
            } else if (status < 200 || status >= 300) {
                log.warn("web push non-2xx status={}, host={}", status, endpointHost);
            }
        } catch (Exception e) {
            if (isTransientNetworkError(e)) {
                log.warn(
                        "web push unreachable: host={}, reason={} (check outbound network/proxy to push provider)",
                        endpointHost,
                        rootMessage(e)
                );
                return;
            }
            log.warn("web push send failed: host={}, reason={}", endpointHost, rootMessage(e));
        }
    }

    private PushService resolvePushService() {
        PushService cached = pushService;
        if (cached != null) {
            return cached;
        }
        synchronized (this) {
            if (pushService != null) {
                return pushService;
            }
            try {
                PushService service = new PushService(vapidPublicKey, vapidPrivateKey, vapidSubject);
                pushService = service;
                return service;
            } catch (Exception e) {
                log.warn("web push init failed: {}", e.getMessage());
                return null;
            }
        }
    }

    private RequestConfig buildRequestConfig() {
        return RequestConfig.custom()
                .setConnectTimeout(connectTimeoutMs)
                .setConnectionRequestTimeout(connectTimeoutMs)
                .setSocketTimeout(socketTimeoutMs)
                .build();
    }

    private CloseableHttpClient buildHttpClient(RequestConfig requestConfig) {
        return HttpClients.custom()
                .setDefaultRequestConfig(requestConfig)
                .build();
    }

    private static String endpointHost(String endpoint) {
        if (endpoint == null || endpoint.isBlank()) {
            return "unknown";
        }
        try {
            String host = URI.create(endpoint).getHost();
            return host == null || host.isBlank() ? "unknown" : host;
        } catch (Exception e) {
            return "unknown";
        }
    }

    private static boolean isTransientNetworkError(Throwable error) {
        Throwable current = error;
        while (current != null) {
            if (current instanceof ConnectException
                    || current instanceof SocketTimeoutException
                    || current instanceof SSLException) {
                return true;
            }
            current = current.getCause();
        }
        String message = rootMessage(error).toLowerCase();
        return message.contains("connection timed out")
                || message.contains("connect timed out")
                || message.contains("no route to host")
                || message.contains("network is unreachable");
    }

    private static String rootMessage(Throwable error) {
        Throwable current = error;
        Throwable root = error;
        while (current != null) {
            root = current;
            current = current.getCause();
        }
        String message = root.getMessage();
        return message == null || message.isBlank() ? root.getClass().getSimpleName() : message;
    }

    private boolean isPushReady() {
        return pushEnabled
                && vapidPublicKey != null && !vapidPublicKey.isBlank()
                && vapidPrivateKey != null && !vapidPrivateKey.isBlank();
    }
}
