package divtube.youtube.analysis;

public class YouTubeQuotaLedger {
    private int quotaUsedToday = 0;
    private static final int DAILY_LIMIT = 10000;

    public void addCost(int cost) {
        this.quotaUsedToday += cost;
    }

    public int getRemaining() {
        return DAILY_LIMIT - quotaUsedToday;
    }

    public boolean isApproachingLimit() {
        return quotaUsedToday > (DAILY_LIMIT * 0.9);
    }
    
    public int getUsed() {
        return quotaUsedToday;
    }
}
