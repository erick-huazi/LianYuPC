package com.lianyu.storage.minio;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MinioConfigTest {

    @Test
    void createsMissingBucketWhileBuildingClientBean() throws Exception {
        MinioClient client = mock(MinioClient.class);
        when(client.bucketExists(any(BucketExistsArgs.class))).thenReturn(false);
        MinioConfig config = configUsing(client);

        assertSame(client, config.minioClient());

        verify(client).bucketExists(any(BucketExistsArgs.class));
        verify(client).makeBucket(any(MakeBucketArgs.class));
    }

    @Test
    void keepsExistingBucketWhileBuildingClientBean() throws Exception {
        MinioClient client = mock(MinioClient.class);
        when(client.bucketExists(any(BucketExistsArgs.class))).thenReturn(true);
        MinioConfig config = configUsing(client);

        assertSame(client, config.minioClient());

        verify(client).bucketExists(any(BucketExistsArgs.class));
        verify(client, never()).makeBucket(any(MakeBucketArgs.class));
    }

    private MinioConfig configUsing(MinioClient client) {
        return new MinioConfig() {
            @Override
            MinioClient createClient() {
                return client;
            }
        };
    }
}
