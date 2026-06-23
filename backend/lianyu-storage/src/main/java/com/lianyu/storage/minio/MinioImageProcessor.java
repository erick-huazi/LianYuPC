package com.lianyu.storage.minio;

import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.MemoryCacheImageOutputStream;

/**
 * 广场头像缩略图：居中裁切为正方形后缩放。
 */
public final class MinioImageProcessor {

    private static final float JPEG_QUALITY = 0.82f;

    private MinioImageProcessor() {
    }

    public static byte[] cropSquareThumb(byte[] sourceBytes, int targetSize) {
        if (sourceBytes == null || sourceBytes.length == 0) {
            throw new IllegalArgumentException("empty image bytes");
        }
        if (targetSize <= 0) {
            throw new IllegalArgumentException("invalid target size");
        }
        try {
            BufferedImage source = ImageIO.read(new ByteArrayInputStream(sourceBytes));
            if (source == null) {
                throw new IllegalArgumentException("unsupported image format");
            }
            int width = source.getWidth();
            int height = source.getHeight();
            int side = Math.min(width, height);
            int x = (width - side) / 2;
            int y = (height - side) / 2;
            BufferedImage cropped = source.getSubimage(x, y, side, side);

            BufferedImage scaled = new BufferedImage(targetSize, targetSize, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = scaled.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.drawImage(cropped, 0, 0, targetSize, targetSize, null);
            g.dispose();

            return encodeJpeg(scaled);
        } catch (IOException e) {
            throw new IllegalStateException("thumbnail generation failed", e);
        }
    }

    private static byte[] encodeJpeg(BufferedImage image) throws IOException {
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        ImageWriteParam param = writer.getDefaultWriteParam();
        if (param.canWriteCompressed()) {
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(JPEG_QUALITY);
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (MemoryCacheImageOutputStream ios = new MemoryCacheImageOutputStream(out)) {
            writer.setOutput(ios);
            writer.write(null, new IIOImage(image, null, null), param);
        } finally {
            writer.dispose();
        }
        return out.toByteArray();
    }
}
