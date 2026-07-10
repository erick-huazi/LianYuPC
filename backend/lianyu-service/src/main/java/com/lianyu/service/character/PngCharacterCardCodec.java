package com.lianyu.service.character;

import com.lianyu.common.base.ErrorCode;
import com.lianyu.common.exception.BusinessException;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Base64;
import java.util.zip.CRC32;
import javax.imageio.ImageIO;

/** Reads and writes the Tavern/SillyTavern base64 JSON stored in a PNG tEXt chunk named "chara". */
public final class PngCharacterCardCodec {

    private static final byte[] PNG_SIGNATURE = new byte[]{
            (byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
    };
    private static final int MAX_CHUNK_BYTES = 16 * 1024 * 1024;
    private static final byte[] CHARA_KEYWORD = "chara".getBytes(StandardCharsets.ISO_8859_1);

    private PngCharacterCardCodec() {
    }

    public static boolean isPng(byte[] bytes) {
        return bytes != null
                && bytes.length >= PNG_SIGNATURE.length
                && Arrays.equals(PNG_SIGNATURE, Arrays.copyOf(bytes, PNG_SIGNATURE.length));
    }

    public static String extractJson(byte[] pngBytes) {
        validatePng(pngBytes);
        try (DataInputStream input = new DataInputStream(new ByteArrayInputStream(
                pngBytes, PNG_SIGNATURE.length, pngBytes.length - PNG_SIGNATURE.length))) {
            while (input.available() > 0) {
                int length = input.readInt();
                validateChunkLength(length, input.available());
                byte[] type = input.readNBytes(4);
                byte[] data = input.readNBytes(length);
                input.readInt();
                String typeName = new String(type, StandardCharsets.US_ASCII);
                String encoded = switch (typeName) {
                    case "tEXt" -> extractTextPayload(data);
                    case "iTXt" -> extractInternationalTextPayload(data);
                    default -> null;
                };
                if (encoded != null) {
                    try {
                        return new String(Base64.getDecoder().decode(encoded.trim()), StandardCharsets.UTF_8);
                    } catch (IllegalArgumentException e) {
                        throw new BusinessException(ErrorCode.BAD_REQUEST, "角色卡 PNG 的 chara 元数据不是有效 Base64");
                    }
                }
                if ("IEND".equals(typeName)) {
                    break;
                }
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "无法读取角色卡 PNG");
        }
        throw new BusinessException(ErrorCode.BAD_REQUEST, "PNG 中未找到 SillyTavern chara 元数据");
    }

    public static byte[] embedJson(byte[] pngBytes, String json) {
        validatePng(pngBytes);
        if (json == null || json.isBlank()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "角色卡 JSON 不能为空");
        }
        byte[] encoded = Base64.getEncoder().encode(json.getBytes(StandardCharsets.UTF_8));
        byte[] textData = new byte[CHARA_KEYWORD.length + 1 + encoded.length];
        System.arraycopy(CHARA_KEYWORD, 0, textData, 0, CHARA_KEYWORD.length);
        System.arraycopy(encoded, 0, textData, CHARA_KEYWORD.length + 1, encoded.length);

        try (DataInputStream input = new DataInputStream(new ByteArrayInputStream(
                pngBytes, PNG_SIGNATURE.length, pngBytes.length - PNG_SIGNATURE.length));
             ByteArrayOutputStream bytes = new ByteArrayOutputStream(pngBytes.length + textData.length + 32);
             DataOutputStream output = new DataOutputStream(bytes)) {
            output.write(PNG_SIGNATURE);
            boolean wroteCard = false;
            while (input.available() > 0) {
                int length = input.readInt();
                validateChunkLength(length, input.available());
                byte[] type = input.readNBytes(4);
                byte[] data = input.readNBytes(length);
                int crc = input.readInt();
                String typeName = new String(type, StandardCharsets.US_ASCII);

                boolean existingCardChunk = ("tEXt".equals(typeName) || "iTXt".equals(typeName))
                        && hasCharaKeyword(data);
                if ("IEND".equals(typeName) && !wroteCard) {
                    writeChunk(output, "tEXt", textData);
                    wroteCard = true;
                }
                if (!existingCardChunk) {
                    output.writeInt(length);
                    output.write(type);
                    output.write(data);
                    output.writeInt(crc);
                }
                if ("IEND".equals(typeName)) {
                    break;
                }
            }
            if (!wroteCard) {
                throw new BusinessException(ErrorCode.BAD_REQUEST, "角色头像 PNG 缺少 IEND 结束块");
            }
            return bytes.toByteArray();
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "生成角色卡 PNG 失败");
        }
    }

    public static byte[] createDefaultAvatar() {
        try {
            BufferedImage image = new BufferedImage(512, 768, BufferedImage.TYPE_INT_ARGB);
            Graphics2D g = image.createGraphics();
            try {
                g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                g.setColor(new Color(25, 28, 36));
                g.fillRect(0, 0, image.getWidth(), image.getHeight());
                g.setColor(new Color(241, 90, 92));
                g.fillOval(136, 264, 240, 240);
                g.setColor(new Color(255, 255, 255, 225));
                g.fillOval(208, 318, 96, 96);
            } finally {
                g.dispose();
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(image, "png", out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "生成默认角色卡头像失败");
        }
    }

    private static String extractTextPayload(byte[] data) {
        int separator = indexOfZero(data, 0);
        if (separator <= 0 || !isCharaKeyword(data, separator)) {
            return null;
        }
        return new String(data, separator + 1, data.length - separator - 1, StandardCharsets.ISO_8859_1);
    }

    private static String extractInternationalTextPayload(byte[] data) {
        int keywordEnd = indexOfZero(data, 0);
        if (keywordEnd <= 0 || !isCharaKeyword(data, keywordEnd) || keywordEnd + 3 >= data.length) {
            return null;
        }
        int compressionFlag = Byte.toUnsignedInt(data[keywordEnd + 1]);
        if (compressionFlag != 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "暂不支持压缩 iTXt 角色卡元数据");
        }
        int languageEnd = indexOfZero(data, keywordEnd + 3);
        int translatedEnd = languageEnd < 0 ? -1 : indexOfZero(data, languageEnd + 1);
        if (translatedEnd < 0 || translatedEnd + 1 > data.length) {
            return null;
        }
        return new String(data, translatedEnd + 1, data.length - translatedEnd - 1, StandardCharsets.UTF_8);
    }

    private static boolean hasCharaKeyword(byte[] data) {
        int separator = indexOfZero(data, 0);
        return separator > 0 && isCharaKeyword(data, separator);
    }

    private static boolean isCharaKeyword(byte[] data, int length) {
        if (length != CHARA_KEYWORD.length) {
            return false;
        }
        String keyword = new String(data, 0, length, StandardCharsets.ISO_8859_1);
        return "chara".equalsIgnoreCase(keyword);
    }

    private static int indexOfZero(byte[] data, int start) {
        for (int i = Math.max(0, start); i < data.length; i++) {
            if (data[i] == 0) {
                return i;
            }
        }
        return -1;
    }

    private static void writeChunk(DataOutputStream output, String typeName, byte[] data) throws Exception {
        byte[] type = typeName.getBytes(StandardCharsets.US_ASCII);
        output.writeInt(data.length);
        output.write(type);
        output.write(data);
        CRC32 crc = new CRC32();
        crc.update(type);
        crc.update(data);
        output.writeInt((int) crc.getValue());
    }

    private static void validatePng(byte[] bytes) {
        if (!isPng(bytes)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "文件不是有效 PNG");
        }
    }

    private static void validateChunkLength(int length, int available) {
        if (length < 0 || length > MAX_CHUNK_BYTES || available < length + 8) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "PNG 数据块长度无效");
        }
    }
}
