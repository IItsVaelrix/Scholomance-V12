package divtube.process;

import divtube.download.DownloadProgressListener;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.IOException;

public class ProcessRunner {
    
    public ProcessResult runSync(String[] command) throws IOException, InterruptedException {
        ProcessBuilder pb = new ProcessBuilder(command);
        Process process = pb.start();
        
        StringBuilder stdOut = new StringBuilder();
        StringBuilder stdErr = new StringBuilder();
        
        Thread outThread = new Thread(() -> {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    stdOut.append(line).append("\\n");
                }
            } catch (IOException ignored) {}
        });
        
        Thread errThread = new Thread(() -> {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getErrorStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    stdErr.append(line).append("\\n");
                }
            } catch (IOException ignored) {}
        });
        
        outThread.start();
        errThread.start();
        
        int exitCode = process.waitFor();
        outThread.join();
        errThread.join();
        
        return new ProcessResult(exitCode, stdOut.toString(), stdErr.toString());
    }

    public Process runAsync(String[] command, DownloadProgressListener listener) throws IOException {
        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(true); // merge stderr into stdout for parsing progress
        Process process = pb.start();
        
        Thread parserThread = new Thread(() -> {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    ProcessEventParser.parseDownloadProgress(line, listener);
                }
            } catch (IOException ignored) {}
        });
        parserThread.setDaemon(true);
        parserThread.start();
        
        return process;
    }
}
