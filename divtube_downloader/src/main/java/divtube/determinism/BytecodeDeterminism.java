package divtube.determinism;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

public final class BytecodeDeterminism {
    public static final String BUILD_PROFILE = "DIVTUBE_DETERMINISTIC_V1";

    private BytecodeDeterminism() {}

    public static String stableId(String namespace, String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String input = namespace + ":" + value;
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder(2 * hash.length);
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString().substring(0, 16);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Determinism failure", e);
        }
    }
}
