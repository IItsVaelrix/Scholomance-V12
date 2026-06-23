package divtube.download;

public interface DownloadProgressListener {
    void onProgress(double percent, String speed, String eta);
}
