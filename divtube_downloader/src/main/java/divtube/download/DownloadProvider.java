package divtube.download;

public interface DownloadProvider {
    VideoMetadata analyze(String url) throws DownloadException;
    void download(DownloadRequest request, DownloadProgressListener listener) throws DownloadException;
    void cancel();
}
