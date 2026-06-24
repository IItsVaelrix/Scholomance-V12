package divtube.download;

public final class LegalPolicyGuard {
    public PolicyDecision validate(DownloadRequest request) {
        if (!request.userConfirmedRights()) {
            return PolicyDecision.blocked("Please confirm you have the right to download this content.");
        }

        if (request.urlRequiresLoginKnown()) {
            return PolicyDecision.blocked("This content appears restricted. The app will not bypass access controls.");
        }

        return PolicyDecision.allowed();
    }
}
