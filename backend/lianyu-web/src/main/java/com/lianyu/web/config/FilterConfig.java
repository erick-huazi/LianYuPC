package com.lianyu.web.config;

import com.lianyu.common.util.TraceIdFilter;
import com.lianyu.service.security.ClientAttestationService;
import com.lianyu.web.filter.ClientAttestationFilter;
import com.lianyu.web.filter.SecurityHeadersFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

@Configuration
public class FilterConfig {

    @Bean
    public FilterRegistrationBean<TraceIdFilter> traceIdFilter() {
        FilterRegistrationBean<TraceIdFilter> bean = new FilterRegistrationBean<>(new TraceIdFilter());
        bean.setOrder(Ordered.HIGHEST_PRECEDENCE);
        bean.addUrlPatterns("/*");
        return bean;
    }

    @Bean
    public FilterRegistrationBean<SecurityHeadersFilter> securityHeadersFilter() {
        FilterRegistrationBean<SecurityHeadersFilter> bean =
                new FilterRegistrationBean<>(new SecurityHeadersFilter());
        bean.setOrder(Ordered.HIGHEST_PRECEDENCE + 1);
        bean.addUrlPatterns("/*");
        return bean;
    }

    /** Runs after Sa-Token servlet filter (default ~ -100) so login context is available. */
    @Bean
    public FilterRegistrationBean<ClientAttestationFilter> clientAttestationFilter(
            ClientAttestationService attestationService, ObjectMapper objectMapper) {
        FilterRegistrationBean<ClientAttestationFilter> bean =
                new FilterRegistrationBean<>(new ClientAttestationFilter(attestationService, objectMapper));
        bean.setOrder(-90);
        bean.addUrlPatterns("/*");
        return bean;
    }
}
