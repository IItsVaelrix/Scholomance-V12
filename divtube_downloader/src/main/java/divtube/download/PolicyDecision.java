package divtube.download;

public class PolicyDecision {
    private final boolean allowed;
    private final String reason;

    private PolicyDecision(boolean allowed, String reason) {
        this.allowed = allowed;
        this.reason = reason;
    }

    public static PolicyDecision allowed() { return new PolicyDecision(true, null); }
    public static PolicyDecision blocked(String reason) { return new PolicyDecision(false, reason); }

    public boolean isAllowed() { return allowed; }
    public String getReason() { return reason; }
}
